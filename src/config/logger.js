// logger.js - Corrected code for serverless/read-only environments

const winston = require('winston');
// Removed: const dailyRotateFile = require('winston-daily-rotate-file');
// Removed: const path = require('path');
// Removed: const fs = require('fs'); 

// The console is the only reliable output in a read-only system like AWS Lambda.
// Everything written to the console (stdout/stderr) is captured by CloudWatch Logs.

// --- Logging Formats ---

// Log format for Console (for human readability)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, userId, requestId, ...meta }) => {
        let logMessage = `${timestamp} [${level}]`;
        if (requestId) logMessage += ` [${requestId}]`;
        if (userId) logMessage += ` [User: ${userId}]`;
        logMessage += `: ${message}`;
        
        // Include remaining metadata (excluding internal 'error' if present)
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

// --- Transports ---

const transports = [];

// Push the Console Transport - This is the essential part for serverless
transports.push(
    new winston.transports.Console({
        // Set log level based on environment
        level: process.env.NODE_ENV === 'development' ? 'debug' : 'info', 
        format: consoleFormat,
        handleExceptions: false, // Exceptions will be handled by the runtime
    }),
);

// --- Logger Setup ---

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    
    // We can still keep the logFormat for future transports if needed, 
    // but the Console transport will use consoleFormat
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    ), 
    
    transports, // Only the Console transport is included now
    
    levels: {
        error: 0,
        warning: 1,
        info: 2,
        debug: 3,
    },
    exitOnError: false, // Do not exit the process on uncaught exceptions
});

// --- Colors (Optional, for development console) ---

winston.addColors({
    error: 'red',
    warning: 'yellow',
    info: 'cyan',
    debug: 'blue',
});

module.exports = logger;