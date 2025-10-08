const rateLimit = require('express-rate-limit');
const logger = require('./loggerUtils');
const responseHandler = require('../utils/resHandler');

const requestLogger = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info(`Request: ${req.method} ${req.originalUrl} - IP: ${ip}`);
    next();
};

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later',
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        return res
            .status(429)
            .json(responseHandler
                .error('Too many requests, please try again later')
                .toJSON());
    },
});

module.exports = { requestLogger, limiter };
