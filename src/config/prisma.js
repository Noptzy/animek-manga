const { PrismaClient } = require('@prisma/client');

const logger = require('../utils/logger'); 

const prisma = new PrismaClient({
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'stdout',
            level: 'error',
        },
        {
            emit: 'stdout',
            level: 'info',
        },
        {
            emit: 'stdout',
            level: 'warn',
        },
    ],
});


prisma.$on('query', (e) => {
    const duration = e.duration;
    if (duration > 200) {
        logger.warning(`[SLOW QUERY] detected: ${duration}ms`, {
            query: e.query,
            params: e.params,
            duration: duration,
            timestamp: e.timestamp
        });
    } else {
        // logger.debug(`[Prisma Query] executed in ${duration}ms`, {
        //     query: e.query,
        //     duration: duration
        // });
    }
});

module.exports = prisma;