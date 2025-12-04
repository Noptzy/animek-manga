const cache = require('../config/memoryCache');

const cacheable = async (key, ttl, dataFetcher) => {
    const cachedData = cache.get(key);
    if (cachedData) {
        return cachedData;
    }

    const freshData = await dataFetcher();

    if (freshData) {
        cache.set(key, freshData, ttl);
    }

    return freshData;
};

module.exports = {
    cacheable,
};
