const prisma = require('../../config/prisma');
const redis = require('../../config/RedisUpstash');
const resHandler = require('../../utils/resHandler');
const logger = require('../../config/logger');

exports.checkHealth = async (req, res, next) => {
    const healthStatus = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        services: {
            database: 'unknown',
            redis: 'unknown'
        }
    };

    let isHealthy = true;

    try {
        await prisma.$queryRaw`SELECT 1`;
        healthStatus.services.database = 'connected';
    } catch (error) {
        healthStatus.services.database = 'disconnected';
        healthStatus.message = 'Service Unavailable';
        isHealthy = false;
        logger.error('Health Check - Database Error:', error);
    }

    try {
        await redis.ping();
        healthStatus.services.redis = 'connected';
    } catch (error) {
        healthStatus.services.redis = 'disconnected';
        healthStatus.message = 'Service Unavailable';
        isHealthy = false;
        logger.error('Health Check - Redis Error:', error);
    }

    if (isHealthy) {
        return res.status(200).json(resHandler.success('System is healthy', healthStatus).toJSON());
    } else {
        return res.status(503).json(resHandler.error('System is unhealthy', healthStatus).toJSON());
    }
};
