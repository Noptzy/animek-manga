const logger = require('./logger');

const withRetry = async (fn, retries = 3, delay = 1000, context = '') => {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            logger.warn(`[Retry] Attempt ${attempt}/${retries} failed for ${context}. Error: ${error.message}`);
            if (attempt < retries) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                logger.error(`[Retry] All ${retries} attempts failed for ${context}. Final error: ${error.message}`);
                throw error;
            }
        }
    }
};

module.exports = { withRetry };
