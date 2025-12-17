const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

module.exports = cache;
