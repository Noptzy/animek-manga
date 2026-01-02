const logger = require('../../utils/logger.js');
const statsService = require('../../services/StatsService.js');
const resHandler = require('../../utils/resHandler.js');

exports.getServer2Stats = async (req, res) => {
    try {
        const stats = await statsService.getServer2Stats();
        return res.json(resHandler.success('Success get server 2 stats', stats).toJSON());
    } catch (error) {
        logger.error('Error fetching server 2 stats:', error);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.getMangaStats = async (req, res) => {
    try {
        const stats = await statsService.getMangaStats();
        return res.json(resHandler.success('Success get manga stats', stats).toJSON());
    } catch (error) {
        logger.error('Error fetching manga stats:', error);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.getAllStats = async (req, res) => {
    try {
        const stats = await statsService.getAllStats();
        return res.json(resHandler.success('Success get all stats', stats).toJSON());
    } catch (error) {
        logger.error('Error fetching all stats:', error);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};
