const logger = require('../config/logger');
const resHandler = require('../utils/resHandler');

const globalErrorHandler = (err, req, res, next) => {
    logger.error('Unhandled Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    // Handle SyntaxError (e.g. invalid JSON)
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json(resHandler.error('Invalid JSON payload').toJSON());
    }

    // Handle Prisma Specific Errors (checking by code or name generally)
    if (err.code && err.code.startsWith('P')) {
        return res.status(500).json(resHandler.error('Database Operation Failed').toJSON());
    }

    // Default Error
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : err.message;
    
    // In production, we might not want to send stack traces or detailed error messages for 500s
    // But for "Project Iseng", maybe it's fine or we hide it. Let's keep it safe.
    
    return res.status(statusCode).json(resHandler.error(message).toJSON());
};

module.exports = globalErrorHandler;
