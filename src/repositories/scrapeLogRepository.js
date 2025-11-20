const prisma = require('../config/prisma');
const logger = require('../utils/logger');

class ScrapeLogRepository {
    async createLog({ source, endpoint, slug, status, response, error }) {
        try {
            return await prisma.scrapeLog.create({  
                data: {
                    source,
                    endpoint,
                    slug: slug || null,
                    status,
                    response: response ? JSON.parse(JSON.stringify(response)) : null,
                    error: error || null,
                    scrapedAt: new Date(),
                },
            });
        } catch (error) {
            logger.error(`Gagal menulis ScrapeLog ke DB: ${error.message}`, { source, slug, status });
        }
    }
}

module.exports = new ScrapeLogRepository();
