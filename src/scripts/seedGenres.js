const { seedGenres } = require('../workers/genreWorker');
const syncMissingChapters = require('./syncMissingChapters');
const logger = require('../utils/logger');
require('dotenv').config();

async function runSeed() {
    logger.info('Starting manual genre seeding...');
    try {
        await seedGenres();
        logger.info('Genre seeding completed.');

        logger.info('Starting missing chapter sync...');
        await syncMissingChapters();
        logger.info('Missing chapter sync completed.');

        logger.info('All seeding and syncing operations completed successfully.');
    } catch (error) {
        logger.error(`Manual genre seeding failed: ${error.message}`);
    } finally {
        const prisma = require('../config/prisma');
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    runSeed();
}
