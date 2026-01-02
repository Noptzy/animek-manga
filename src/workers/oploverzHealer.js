const oploverzService = require('../services/oploverzService');
const oploverzRepository = require('../repositories/oploverzRepository');
const logger = require('../utils/logger');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class OploverzHealer {
    constructor() {
        this.isWorking = false;
        this.totalProcessed = 0;
        this.totalFailed = 0;
    }

    async healAllAnime() {
        if (this.isWorking) {
             logger.warning('[HEALER] Process already running!');
             return { message: 'Process already running' };
        }

        this.isWorking = true;
        this.totalProcessed = 0;
        this.totalFailed = 0;

        // Run in background (Fire and Forget)
        this._processHealing();

        return { message: 'Mass healing started in background' };
    }

    async _processHealing() {
        try {
            logger.info('[HEALER] Starting mass healing...');
            
            // 1. Get ALL Slugs from DB
            const slugs = await oploverzRepository.getAllSlugs();
            logger.info(`[HEALER] Found ${slugs.length} anime to heal.`);

            for (let i = 0; i < slugs.length; i++) {
                const slug = slugs[i];
                logger.info(`[HEALER] Processing ${i + 1}/${slugs.length}: ${slug}`);

                try {
                    // Trigger getAnimeDetail which contains the "Lazy Healing" logic
                    // This will check metadata, compare episodes, and scrape if missing/empty
                    await oploverzService.getAnimeDetail(slug);
                    this.totalProcessed++;
                } catch (error) {
                    logger.error(`[HEALER] Failed to heal ${slug}: ${error.message}`);
                    this.totalFailed++;
                }

                // Delay to be polite to the source server
                await sleep(3000); // 3 seconds delay
            }

            logger.info(`[HEALER] Completed. Processed: ${this.totalProcessed}, Failed: ${this.totalFailed}`);
        } catch (error) {
            logger.error(`[HEALER] Critical Error: ${error.message}`);
        } finally {
            this.isWorking = false;
        }
    }
}

module.exports = new OploverzHealer();
