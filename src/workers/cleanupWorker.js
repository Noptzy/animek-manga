const cron = require('node-cron');
const logger = require('../utils/logger');
const { exec } = require('child_process');

// Cron schedule to run at 00:00 on the 1st day of every month
const CRON_SCHEDULE = '0 0 1 * *';

let task = null;
let isRunning = false;

function runCleanup() {
    if (isRunning) {
        logger.warn('Database cleanup process is already running. Skipping this scheduled run.');
        return;
    }

    logger.info('Starting scheduled database cleanup...');
    isRunning = true;

    exec('npm run db:cleanup', (error, stdout, stderr) => {
        if (error) {
            logger.error(`Error during scheduled db:cleanup: ${error.message}`);
            isRunning = false;
            return;
        }
        if (stderr) {
            logger.warn(`db:cleanup stderr: ${stderr}`);
        }
        logger.info(`db:cleanup stdout: ${stdout}`);
        logger.info('Scheduled database cleanup finished.');
        isRunning = false;
    });
}

function start() {
    if (task) {
        logger.info('Database cleanup worker is already scheduled.');
        return;
    }

    logger.info(`Scheduling database cleanup worker with schedule: ${CRON_SCHEDULE}`);
    task = cron.schedule(CRON_SCHEDULE, runCleanup, {
        scheduled: true,
        timezone: "Asia/Jakarta"
    });
}

function stop() {
    if (task) {
        task.stop();
        task = null;
        logger.info('Database cleanup worker stopped.');
    }
}

module.exports = { start, stop };
