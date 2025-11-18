const mangaRepository = require('../repositories/mangaRepository');
const logger = require('../utils/logger');

class MangaService {
    async getAllMangas({ page, limit }) {
        try {
            return await mangaRepository.findAll({ page, limit });
        } catch (error) {
            logger.error(`Error in getAllMangas service: ${error.message}`);
            throw error;
        }
    }

    async getMangaDetailBySlug(slug) {
        try {
            const manga = await mangaRepository.findMangaBySlug(slug);
            if (!manga) {
                logger.warn(`Manga with slug '${slug}' not found in database.`);
            }
            return manga;
        } catch (error) {
            logger.error(`Error in getMangaDetailBySlug for slug '${slug}': ${error.message}`);
            throw error;
        }
    }

    async searchMangas({ query, page, limit }) {
        try {
            return await mangaRepository.search({ query, page, limit });
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
}

module.exports = new MangaService();