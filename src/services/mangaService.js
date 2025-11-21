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

            // Lazy Scraping: If manga not found OR has no chapters, try to scrape
            if (!manga || !manga.chapters || manga.chapters.length === 0) {
                logger.info(`Manga '${slug}' missing or has no chapters. Initiating lazy scrape...`);
                const scrapedData = await komikIndoScrap.getKomikIndoDetail(slug);

                if (scrapedData) {
                    await mangaRepository.upsertManga(scrapedData);
                    // Fetch again after upsert
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
            });

            let result = await mangaRepository.search({
                where,
                orderBy,
                page,
                limit,
            });

            // Fallback Search: If no results in DB and searching by keyword
            if (result.total === 0 && queryParams.s) {
                logger.info(`No results in DB for '${queryParams.s}'. Initiating fallback scrape...`);
                const scrapedData = await komikIndoScrap.getKomikIndoSearch(queryParams.s);

                if (scrapedData && scrapedData.data && scrapedData.data.length > 0) {
                    logger.info(`Found ${scrapedData.data.length} results from scraper. Upserting...`);
                    
                    // Upsert all found mangas
                    // Note: Search results only have partial data (title, slug, poster). 
                    // Full details will be fetched when user clicks on them (via getMangaDetailBySlug lazy scrape)
                    await Promise.all(scrapedData.data.map(manga => mangaRepository.upsertManga(manga)));

                    // Search again in DB to get formatted result
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
            return await mangaRepository.filter({ filters, page, limit });
        } catch (error) {
            logger.error(`Error in getFilteredMangas service: ${error.message}`);
            throw error;
        }
    }

    async getCountAllMangas(){
        try {
            return await mangaRepository.countAllMangasInDB();
        } catch (error) {
            logger.error(`Error in getCountAllMangas service: ${error.message}`);
            throw error;
        }
    }

    async getCountAllChapterMangas(){
        try {
            return await mangaRepository.countAllChapterMangaInDB();
        } catch (error) {
            logger.error(`Error in getCountAllChapterMangas service: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new MangaService();
