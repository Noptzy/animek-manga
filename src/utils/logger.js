const baseLogger = require('../config/logger.js');
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

class Logger {
    getContext() {
        return asyncLocalStorage.getStore() || {};
    }

    setContext(context) {
        const currentContext = this.getContext();
        return { ...currentContext, ...context };
    }

    info(message, meta = {}) {
        const context = this.getContext();
        if (typeof baseLogger.info === 'function') {
            baseLogger.info(message, { ...meta, ...context });
        } else {
            console.log('[info]', message, { ...meta, ...context });
        }
    }

    warning(message, meta = {}) {
        const context = this.getContext();
        if (typeof baseLogger.warning === 'function') {
            baseLogger.warning(message, { ...meta, ...context });
        } else if (typeof baseLogger.warn === 'function') {
            baseLogger.warn(message, { ...meta, ...context });
        } else {
            console.warn('[warn]', message, { ...meta, ...context });
        }
    }

    error(message, error = null, meta = {}) {
        const context = this.getContext();
        const errorMeta = {
            ...meta,
            ...context,
            ...(error && {
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                },
            }),
        };
        if (typeof baseLogger.error === 'function') {
            baseLogger.error(message, errorMeta);
        } else {
            console.error('[error]', message, errorMeta);
        }
    }

    debug(message, meta = {}) {
        if (process.env.NODE_ENV === 'development') {
            const context = this.getContext();
            if (typeof baseLogger.debug === 'function') {
                baseLogger.debug(message, { ...meta, ...context });
            } else {
                console.debug('[debug]', message, { ...meta, ...context });
            }
        }
    }

    runWithContext(context, fn) {
        return asyncLocalStorage.run(context, fn);
    }
}

module.exports = new Logger();
module.exports.asyncLocalStorage = asyncLocalStorage;
