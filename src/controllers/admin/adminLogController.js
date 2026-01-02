const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');
const ScrapeLogRepository = require('../../repositories/scrapeLogRepository');

exports.getLogs = async (req, res) => {
    try {
        const { page = 1, limit = 20, source, status, search } = req.query;

        const result = await ScrapeLogRepository.getLogs({
            page: parseInt(page),
            limit: parseInt(limit),
            source,
            status,
            search
        });

        return res.status(200).json(resHandler.success('Successfully retrieved logs', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-LOGS] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve logs').toJSON());
    }
};
