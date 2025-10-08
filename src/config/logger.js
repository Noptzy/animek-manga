const winston = require('winston');
const dailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
);

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

const errorFileTransport = new dailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-WW',
    maxSize: '20m',
    maxFiles: '52w',
    level: 'error',
    format: logFormat,
    handleExceptions: true,
    handleRejections: true,
});

transports.push(errorFileTransport);

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: logFormat,
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