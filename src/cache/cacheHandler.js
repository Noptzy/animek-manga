const redis = require('../config/RedisUpstash.js');
// const redis = require('../config/redisLocal.js');
const logger = require('../utils/logger.js');

class CacheHandler {
    async remember(key, ttl, fetchFunction) {
        try {

            const cachedData = await redis.get(key);

            if (cachedData) {
                const parsedData = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;

                logger.debug('[CACHE HIT]', { key });
                return parsedData;
            }

            logger.debug('[CACHE MISS]', { key });
            const freshData = await fetchFunction();

            if (freshData) {

                const dataString = JSON.stringify(freshData);

                await redis.set(key, dataString, { ex: ttl });
            }

            return freshData;
        } catch (error) {
            logger.error(`[CACHE ERROR] Key: ${key}`, error);
            return await fetchFunction();
        }
    }
    async invalidate(key) {
        try {
            await redis.del(key);
            logger.debug(`[CACHE INVALIDATED] ${key}`);
        } catch (error) {
            logger.error(`[CACHE DEL ERROR] ${key}`, error);
        }
    }

    async deletePattern(pattern) {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(keys);
                logger.debug(`[CACHE PATTERN INVALIDATED] ${pattern} (${keys.length} keys)`);
            }
        } catch (error) {
            logger.error(`[CACHE PATTERN DEL ERROR] ${pattern}`, error);
        }
    }
}

module.exports = new CacheHandler();
