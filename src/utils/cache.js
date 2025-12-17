const cacheHandler = require('../cache/cacheHandler');

const cacheable = async (key, ttl, dataFetcher) => {
    return cacheHandler.remember(key, ttl, dataFetcher);
};

module.exports = {
    cacheable,
};
