const { fork } = require('child_process');
const path = require('path');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');

const runScraping = () => {
    logger.info('Starting scraping process...');
    const scriptPath = path.resolve(__dirname, '../scripts/runUnifiedScrape.js');
    console.log('[DEBUG] Forking script at:', scriptPath);
    logger.info(`Forking script at: ${scriptPath}`);
    const child = fork(scriptPath);

    child.on('message', (message) => {
        logger.info(`Message from worker: ${message}`);
    });

    child.on('error', (error) => {
        logger.error(`Error in scraping process: ${error.message}`);
    });

    child.on('exit', (code) => {
        if (code === 0) {
            logger.info('Scraping process finished successfully.');
        } else {
            logger.error(`Scraping process exited with code ${code}`);
        }
    });
};

const checkAndSeedDatabase = async () => {
    try {
        const mangaCount = await prisma.manga.count();
        if (mangaCount === 0) {
            logger.info('Manga table is empty. Starting initial data seeding...');
            runScraping();
        } else {
            logger.info('Manga table is not empty. Skipping initial data seeding.');
        }
    } catch (error) {
        logger.error(`Error checking manga table: ${error.message}`);
    }
};

module.exports = {
    runScraping,
    checkAndSeedDatabase,
};
