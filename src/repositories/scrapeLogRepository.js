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
                    response: response || null, 
                    error: error || null,
                    scrapedAt: new Date(),
                },
            });
        } catch (error) {
            logger.error(`Gagal menulis ScrapeLog ke DB: ${error.message}`, { source, slug, status });
        }
    }
    async getLogs({ page = 1, limit = 20, source, status, search }) {
        const skip = (page - 1) * limit;
        const where = {};

        if (source) where.source = source;
        if (status) where.status = status;
        if (search) {
             where.OR = [
                 { slug: { contains: search, mode: 'insensitive' } },
                 { error: { contains: search, mode: 'insensitive' } }
             ];
        }

        const [data, total] = await Promise.all([
            prisma.scrapeLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { scrapedAt: 'desc' },
            }),
            prisma.scrapeLog.count({ where }),
        ]);

        // Fix double stringification issue: Parse if string, otherwise fallback
        const parsedData = data.map(log => {
            let parsedResponse = log.response;
            if (typeof log.response === 'string') {
                try {
                    parsedResponse = JSON.parse(log.response);
                    // Handle rare case where it might be double stringified in DB (Legacy)
                    if (typeof parsedResponse === 'string') {
                        parsedResponse = JSON.parse(parsedResponse);
                    }
                } catch (e) {
                    parsedResponse = log.response;
                }
            }
            return { ...log, response: parsedResponse };
        });

        return { data: parsedData, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
}

module.exports = new ScrapeLogRepository();
