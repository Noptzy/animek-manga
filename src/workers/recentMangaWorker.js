const cron = require('node-cron');
const logger = require('../utils/logger.js');
const { fork } = require('child_process');
const path = require('path');

const CRON_SCHEDULE = process.env.RECENT_WORKER_CRON_SCHEDULE || '0 */5 * * *';

let task = null;
let isRunning = false;

function runWorker() {
    if (isRunning) {
        logger.warn('Recent manga scrape is already running. Skipping this scheduled run.');
        return;
    }

    logger.info('Starting recent manga scrape worker...');
    isRunning = true;

    const scriptPath = path.resolve(__dirname, '../scripts/runUnifiedScrape.js');
    const child = fork(scriptPath, [], { stdio: 'inherit' });

    child.on('exit', (code) => {
        isRunning = false;
        if (code === 0) {
            logger.info('Recent manga scrape worker finished successfully.');
        } else {
            logger.error(`Recent manga scrape worker exited with code ${code}.`);
        }
    });

    child.on('error', (err) => {
        isRunning = false;
        logger.error('Failed to start recent manga scrape worker:', err);
    });
}

function start() {
    if (task) {
        logger.info('Recent manga scrape worker is already scheduled.');
        return;
    }

    logger.info(`Scheduling recent manga scrape worker with schedule: ${CRON_SCHEDULE}`);
    task = cron.schedule(CRON_SCHEDULE, runWorker, {
        scheduled: true,
        timezone: "Asia/Jakarta"
    });

    runWorker();
}

function stop() {
    if (task) {
        task.stop();
        task = null;
        logger.info('Recent manga scrape worker stopped.');
    }
}

module.exports = { start, stop, runWorker };
