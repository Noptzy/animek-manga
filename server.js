const app = require('./app');
const logger = require('./src/config/logger');
const recentMangaWorker = require('./src/workers/recentMangaWorker.js');
const cleanupWorker = require('./src/workers/cleanupWorker.js');

const port = process.env.PORT ?? 3000;

const server = app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});

recentMangaWorker.start();
cleanupWorker.start();

module.exports = server;
