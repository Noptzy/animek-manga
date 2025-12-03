const cron = require('node-cron');
const logger = require('../utils/logger.js');
const scrapingService = require('../services/scrapingService');

const CRON_SCHEDULE = process.env.RECENT_WORKER_CRON_SCHEDULE || '0 */5 * * *';

let task = null;
let isRunning = false;

function runWorker() {
    if (isRunning) {
        logger.warn('Scraping process is already running. Skipping this scheduled run.');
        return;
    }

    isRunning = true;
    try {
        scrapingService.runScraping();
    } catch (error) {
        logger.error('An error occurred during the scraping run:', error);
    } finally {
        isRunning = false;
    }
}

function start() {
    if (task) {
        logger.info('Recent manga scrape worker is already scheduled.');
        return;
    }

    logger.info(`Scheduling recent manga scrape worker with sdchedule: ${CRON_SCHEDULE}`);
    task = cron.schedule(CRON_SCHEDULE, runWorker, {
        scheduled: true,
        timezone: "Asia/Jakarta"
    });
``
    scrapingService.checkAndSeedDatabase();
}

function stop() {
    if (task) {
        task.stop();
        task = null;
        logger.info('Recent manga scrape worker stopped.');
    }
}

module.exports = { start, stop, runWorker };
