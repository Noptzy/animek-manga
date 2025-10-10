const winston = require('winston');

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

transports.push(
    new winston.transports.Console({
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        format: consoleFormat,
        handleExceptions: false,
    }),
);

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
