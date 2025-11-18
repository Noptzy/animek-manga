const cron = require('node-cron');
const logger = require('../utils/logger.js');
const komikIndoScrap = require('../scrap/manga/komikIndoScrap.js');
const mangaRepository = require('../repositories/mangaRepository.js');

const CRON_SCHEDULE = process.env.WORKER_CRON_SCHEDULE || '0 */6 * * *';
const DELAY_MS = parseInt(process.env.WORKER_DELAY_MS || '800');
const page = process.env.MANGA_MAX_PAGES;

let task = null;

async function makeSeedMangaSeed() {
    const mangaCount = await mangaRepository.countAll();

    if (mangaCount === 0) {
        logger.info(`DB Manga Kosong, Start Scraping for ${page}`);
        await komikIndoScrap.getKomikIndoManga(page);
        logger.info(`finished scrap for ${page} page`);
    } else {
        logger.error(`Error: ${error.message}`, error);
    }
}
