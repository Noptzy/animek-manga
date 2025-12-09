require('dotenv').config();
const scraper = require('../../../../scrap/anime/kuramanimScrap');
const animeRepo = require('../../../../repositories/animeRepository');
const logger = require('../../../../utils/logger');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SERVER_ID = 1;

async function processCategory(category) {
    logger.info(`\n>>> START: Scraping Category '${category.toUpperCase()}'`);
    
    try {
        const processSingleAnime = async (animeData) => {
            let logEntry = null;
            try {
                logger.info(`[DB] Saving: ${animeData.title}...`);
                
                logEntry = await animeRepo.createScrapeLog({
                    source: 'Kuramanime',
                    endpoint: category,
                    slug: animeData.slug,
                    status: 'started'
                });

                await animeRepo.upsertAnime(animeData, SERVER_ID);

                await animeRepo.updateScrapeLog(logEntry.id, { status: 'finished' });
                logger.info(`[DB] ✅ Success: ${animeData.title}`);
            } catch (err) {
                logger.error(`[DB] ❌ Failed ${animeData.title}: ${err.message}`);
                if (logEntry) {
                    await animeRepo.updateScrapeLog(logEntry.id, { status: 'failed', error: err.message });
                }
            }
        };

        await scraper.scrapeMassSeed(category, processSingleAnime);

    } catch (err) {
        logger.error(`!!! Failed to scrape category ${category}: ${err.message}`);
    }

    logger.info(`>>> FINISHED '${category}'.`);
}

async function runFullSeeding() {
    const categories = ['ongoing', 'finished', 'movie'];

    logger.info(`=== WORKER STARTED (Server ID: ${SERVER_ID}) ===`);

    for (const cat of categories) {
        await processCategory(cat);
        await sleep(1000);
    }

    logger.info('\n=== WORKER COMPLETED ===');
    process.exit(0);
}

if (require.main === module) {
    runFullSeeding().catch((err) => {
        logger.error('FATAL WORKER ERROR:', err);
        process.exit(1);
    });
}