const recentMangaWorker = require('../../workers/recentMangaWorker');
const logger = require('../../utils/logger');
const resHandler = require('../../utils/resHandler');

exports.runRecentMangaScrape = (req, res) => {
    logger.info('Manual trigger for recent manga scrape received.');

    recentMangaWorker.runWorker();
    
    res.status(202).json(resHandler.success('Accepted', { message: 'Scraping process for recent manga has been initiated.' }).toJSON());
};
