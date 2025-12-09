const { fork } = require('child_process');
const path = require('path');
const AnimeRepository = require('../repositories/animeRepository');
const logger = require('../utils/logger');

let isRunning = false;

const runScraping = () => {
    if (isRunning) {
        logger.warn('[AnimeScrapingService] A scraping process is already running.');
        return;
    }

    logger.info('[AnimeScrapingService] Starting anime scraping process...');
    isRunning = true;

    const scriptPath = path.resolve(__dirname, '../scripts/runUnifiedAnimeScrape.js');
    const child = fork(scriptPath, [], { stdio: 'inherit' }); // Inherit stdio to see logs in main process

    child.on('error', (error) => {
        logger.error(`[AnimeScrapingService] Error in child process: ${error.message}`);
    });

    child.on('exit', (code) => {
        isRunning = false;
        if (code === 0) {
            logger.info('[AnimeScrapingService] Scraping child process finished successfully.');
        } else {
            logger.error(`[AnimeScrapingService] Scraping child process exited with code ${code}`);
        }
    });
};

const checkAndSeedDatabase = async () => {
    try {
        const animeCount = await AnimeRepository.countAll();
        if (animeCount === 0) {
            logger.info('[AnimeScrapingService] Anime table is empty. Starting initial data seeding...');
            runScraping();
        } else {
            logger.info(`[AnimeScrapingService] Anime table contains ${animeCount} records. Skipping initial seed.`);
        }
    } catch (error) {
        logger.error(`[AnimeScrapingService] Error checking anime table: ${error.message}`);
    }
};

const getStatus = () => {
    return { isScraping: isRunning };
};

module.exports = {
    runScraping,
    checkAndSeedDatabase,
    getStatus,
};
