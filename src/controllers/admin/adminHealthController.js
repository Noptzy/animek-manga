const systemHealthService = require('../../services/systemHealthService');
const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');

exports.getSystemHealth = async (req, res) => {
    try {
        const stats = await systemHealthService.getHealthStats();
        return res.status(200).json(resHandler.success('System Health Stats', stats).toJSON());
    } catch (error) {
        logger.error('System Health Check Error', error);
        return res.status(500).json(resHandler.error('Failed to get system health').toJSON());
    }
};
