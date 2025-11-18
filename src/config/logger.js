const winston = require('winston');
const fs = require('fs');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, userId, requestId, ...meta }) => {
        let logMessage = `${timestamp} [${level}]`;
        if (requestId) logMessage += ` [${requestId}]`;
        if (userId) logMessage += ` [User: ${userId}]`;
        logMessage += `: ${message}`;

        if (Object.keys(meta).length > 0) {
            logMessage += ` ${JSON.stringify(meta)}`;
        }
        if (meta.error && meta.error.stack) {
            logMessage += `\n${meta.error.stack}`;
        }
        return logMessage;
    }),
);

const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let logMessage = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            logMessage += ` ${JSON.stringify(meta)}`;
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

if (!isProduction) {
    const logDir = process.env.LOG_DIR || path.join(__dirname, '..', '..', 'logs');
    
    try {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        transports.push(
            new winston.transports.File({
                filename: path.join(logDir, 'error.log'),
                level: 'error',
                format: fileFormat,
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
                format: fileFormat,
                handleExceptions: false,
                maxsize: 5 * 1024 * 1024,
                maxFiles: 3,
                tailable: true,
            }),
        );
    } catch (error) {
        console.error('Gagal membuat direktori log (Abaikan jika di serverless):', error.message);
    }
}

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