const mangaRepository = require('../repositories/mangaRepository');
const logger = require('../utils/logger');
const { buildOrder, buildOrderBy, buildWhereClause } = require('../utils/ParamFilters');
const komikIndoScrap = require('../scrap/manga/komikIndoScrap');

const dataCache = new Map();
const DATA_CACHE_TTL = 5 * 60 * 1000; // 5 menit

const checkStatusCache = new Map();
const CHECK_THROTTLE_TTL = 30 * 60 * 1000; // 30 menit

async function _updateMangaInBackground(slug, chapterOrder) {
    try {
        logger.info(`[BG] Checking for updates for manga '${slug}'.`);
        const scrapedData = await komikIndoScrap.getKomikIndoDetail(slug);

        if (!scrapedData) {
            logger.warn(`[BG] Scraping failed for slug '${slug}'.`);
            return;
        }

        const existingManga = await mangaRepository.findMangaBySlug(slug, { chapterOrder });
        
        if (!existingManga) {
            logger.info(`[BG] Manga '${slug}' not found in DB. Performing initial upsert.`);
            const newManga = await mangaRepository.upsertManga(scrapedData);
            dataCache.set(slug, { data: newManga, timestamp: Date.now() });
            return;
        }

        const isStatusChanged = existingManga.status !== scrapedData.status;
        const existingChapterUrls = new Set(existingManga.chapters.map(c => c.url));
        const newChapters = scrapedData.chapters.filter(c => !existingChapterUrls.has(c.url));
        const hasNewChapters = newChapters.length > 0;

        if (isStatusChanged || hasNewChapters) {
            let logReason = [];
            if (isStatusChanged) logReason.push(`status changed to '${scrapedData.status}'`);
            if (hasNewChapters) logReason.push(`${newChapters.length} new chapter(s) found`);
            
            logger.info(`[BG] Changes detected for '${slug}' (${logReason.join(', ')}). Updating database.`);

            const updatedManga = await mangaRepository.upsertManga(scrapedData);
            dataCache.set(slug, { data: updatedManga, timestamp: Date.now() });
        } else {
            logger.info(`[BG] No new data for '${slug}'. Database is up to date.`);
        }
    } catch (error) {
        logger.error(`[BG] Error during update for slug '${slug}': ${error.message}`);
    }
}


class MangaService {
    async getAllMangas({ page, limit, sort, order }) {
        try {
            const prismaOrder = buildOrder(sort, order);
            return await mangaRepository.findAll({ page, limit, order: prismaOrder });
        } catch (error) {
            logger.error(`Error in getAllMangas service: ${error.message}`);
            throw error;
        }
    }

    async getMangaDetailBySlug(slug, { chapterOrder = 'asc' } = {}) {
        try {
            const cachedData = dataCache.get(slug);
            if (cachedData && Date.now() - cachedData.timestamp < DATA_CACHE_TTL) {
                logger.info(`Serving manga '${slug}' from HOT CACHE.`);
                return cachedData.data;
            }

            const mangaFromDb = await mangaRepository.findMangaBySlug(slug, { chapterOrder });

            if (mangaFromDb) {
                logger.info(`Serving manga '${slug}' from DB.`);

                dataCache.set(slug, { data: mangaFromDb, timestamp: Date.now() });

                const lastCheck = checkStatusCache.get(slug);
                if (!lastCheck || Date.now() - lastCheck > CHECK_THROTTLE_TTL) {
                    logger.info(`Throttle cache expired for '${slug}'. Triggering background check.`);
                    checkStatusCache.set(slug, Date.now());
                    _updateMangaInBackground(slug, chapterOrder); 
                }
                
                return mangaFromDb;
            } else {
                logger.info(`Manga '${slug}' not in cache or DB. Performing initial blocking scrape.`);
                const scrapedData = await komikIndoScrap.getKomikIndoDetail(slug);

                if (scrapedData) {
                    const newManga = await mangaRepository.upsertManga(scrapedData);
                    dataCache.set(slug, { data: newManga, timestamp: Date.now() });
                    checkStatusCache.set(slug, Date.now());
                    return newManga;
                } else {
                    logger.error(`Initial scrape for slug '${slug}' failed. Manga not found.`);
                    return null;
                }
            }
        } catch (error) {
            logger.error(`Error in getMangaDetailBySlug for slug '${slug}': ${error.message}`);
            throw error;
        }
    }
    
    async searchMangas(queryParams) {
        try {
            const page = parseInt(queryParams.page) || 1;
            const limit = parseInt(queryParams.limit) || 20;
            const orderBy = buildOrderBy(queryParams.sort);
            const where = buildWhereClause({
                q: queryParams.s,
                status: queryParams.status,
                author: queryParams.author,
                illustrator: queryParams.illustrator,
                genre: queryParams.genre,
            });

            let result = await mangaRepository.search({
                where,
                orderBy,
                page,
                limit,
            });

            if (result.total === 0 && queryParams.s) {
                logger.info(`No results in DB for '${queryParams.s}'. Initiating fallback scrape...`);
                const scrapedData = await komikIndoScrap.getKomikIndoSearch(queryParams.s);

                if (scrapedData && scrapedData.data && scrapedData.data.length > 0) {
                    logger.info(`Found ${scrapedData.data.length} results from scraper. Upserting...`);

                    await Promise.all(scrapedData.data.map((manga) => mangaRepository.upsertManga(manga)));

                    result = await mangaRepository.search({
                        where,
                        orderBy,
                        page,
                        limit,
                    });
                }
            }

            return result;
        } catch (error) {
            logger.error(`Error in searchMangas service: ${error.message}`);
            throw error;
        }
    }

    async getFilteredMangas({ filters, page, limit }) {
        try {
            let result = await mangaRepository.filter({ filters, page, limit });
            if (result.total === 0 && filters.genre && filters.genre.length > 0) {
                logger.info(`No mangas found in DB for genres: ${filters.genre}. Initiating on-demand scrape...`);
                const scrapedData = await komikIndoScrap.getKomikindoMangaByFilter(page, filters);

                if (scrapedData && scrapedData.mangaList && scrapedData.mangaList.length > 0) {
                    logger.info(`Found ${scrapedData.mangaList.length} mangas from scraper. Upserting...`);

                    for (const manga of scrapedData.mangaList) {
                        try {
                            await mangaRepository.upsertManga(manga);
                        } catch (error) {
                            logger.error(`Failed to upsert manga ${manga.slug} in on-demand scrape: ${error.message}`);
                        }
                    }

                    result = await mangaRepository.filter({ filters, page, limit });
                }
            }

            return result;
        } catch (error) {
            logger.error(`Error in getFilteredMangas service: ${error.message}`);
            throw error;
        }
    }

    async getCountAllMangas() {
        try {
            return await mangaRepository.countAllMangasInDB();
        } catch (error) {
            logger.error(`Error in getCountAllMangas service: ${error.message}`);
            throw error;
        }
    }

    async getCountAllChapterMangas() {
        try {
            return await mangaRepository.countAllChapterMangaInDB();
        } catch (error) {
            logger.error(`Error in getCountAllChapterMangas service: ${error.message}`);
            throw error;
        }
    }

    async getGenres() {
        try {
            return await mangaRepository.getGenres();
        } catch (error) {
            logger.error(`Error in getGenres service: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new MangaService();
