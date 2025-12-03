const cache = require('../config/memoryCache');

/**
 * A higher-order function to add caching to any data-fetching operation.
 * @param {string} key - The unique key for the cache.
 * @param {number} ttl - Time-To-Live in seconds for this specific cache entry.
 * @param {Function} dataFetcher - An async function that fetches the data if it's not in the cache.
 * @returns {Promise<any>} The cached or freshly fetched data.
 */
const cacheable = async (key, ttl, dataFetcher) => {
    const cachedData = cache.get(key);
    if (cachedData) {
        // console.log(`Cache HIT for key: ${key}`);
        return cachedData;
    }

    // console.log(`Cache MISS for key: ${key}`);
    const freshData = await dataFetcher();

    if (freshData) {
        cache.set(key, freshData, ttl);
    }

    return freshData;
};

module.exports = {
    cacheable,
};
