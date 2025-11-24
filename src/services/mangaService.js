const mangaRepository = require('../repositories/mangaRepository');
const logger = require('../utils/logger');
const { buildOrder, buildOrderBy, buildWhereClause } = require('../utils/ParamFilters');
const komikIndoScrap = require('../scrap/manga/komikIndoScrap');

class MangaService {
    // async getAllMangas({ page, limit }) {
    //     try {
    //         return await mangaRepository.findAll({ page, limit });
    //     } catch (error) {
    //         logger.error(`Error in getAllMangas service: ${error.message}`);
    //         throw error;
    //     }
    // }

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
            let manga = await mangaRepository.findMangaBySlug(slug, { chapterOrder });

            if (!manga || !manga.chapters || manga.chapters.length === 0) {
                logger.info(`Manga '${slug}' missing or has no chapters. Initiating lazy scrape...`);
                const scrapedData = await komikIndoScrap.getKomikIndoDetail(slug);

                if (scrapedData) {
                    await mangaRepository.upsertManga(scrapedData);
                    manga = await mangaRepository.findMangaBySlug(slug, { chapterOrder });
                }
            }

            if (!manga) logger.warn(`Manga with slug '${slug}' not found in database and scrape failed.`);
            return manga;
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
