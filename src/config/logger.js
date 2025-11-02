const winston = require('winston');
const fs = require('fs');
const path = require('path');

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, userId, requestId, ...meta }) => {
        let logMessage = `${timestamp} [${level}]`;
        if (requestId) logMessage += ` [${requestId}]`;
        if (userId) logMessage += ` [User: ${userId}]`;
        logMessage += `: ${message}`;

        if (Object.keys(meta).length > 0 && Object.keys(meta).some((key) => key !== 'error')) {
            const metaWithoutError = { ...meta };
            delete metaWithoutError.error;
            if (Object.keys(metaWithoutError).length > 0) {
                logMessage += ` ${JSON.stringify(metaWithoutError)}`;
            }
        }
        return logMessage;
    }),
);

const transports = [];
const logDir = process.env.LOG_DIR || path.join('/tmp', 'logs');
try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
} catch (error) {
    console.error('Could not create log directory', error);
}

transports.push(
    new winston.transports.Console({
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        format: consoleFormat,
        handleExceptions: false,
    }),
);

transports.push(
    new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        handleExceptions: true,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 3,
        tailable: true,
    }),
);

transports.push(
    new winston.transports.File({
        filename: path.join(logDir, 'warn.log'),
        level: 'warning',
        handleExceptions: false,
        maxsize: 5 * 1024 * 1024,
        maxFiles: 3,
        tailable: true,
    }), 
)

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',

    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    ),

    transports,

    levels: {
        error: 0,
        warning: 1,
        info: 2,
        debug: 3,
    },
    exitOnError: false,
});

winston.addColors({
    error: 'red',
    warning: 'yellow',
    info: 'cyan',
    debug: 'blue',
});

module.exports = logger;
