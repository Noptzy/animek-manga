const NodeCache = require('node-cache');

/**
 * Shared instance of the in-memory cache.
 * stdTTL: (Standard Time-To-Live) the default time in seconds that a key will be kept in the cache.
 * checkperiod: The period in seconds to check for expired keys.
 */
const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

module.exports = cache;
