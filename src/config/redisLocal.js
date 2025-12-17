// Hapus file ini saat di prod ntr ya
const { createClient } = require('redis');
require('dotenv').config();

const redis = new createClient({
    url: process.env.REDIS_LOCAL_URL,
});

redis.connect();

redis.on('connect', () => {
    console.log('Redis client connected');
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = redis;
