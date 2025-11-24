const prisma = require('../config/prisma');
const komikIndoScrap = require('../scrap/manga/komikIndoScrap');
const mangaRepository = require('../repositories/mangaRepository');
const logger = require('../utils/logger');
require('dotenv').config();

const BATCH_SIZE = 10;
const DELAY_MS = 2000; // 2 seconds delay between requests

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function syncMissingChapters() {
    logger.info('Starting sync for mangas with missing chapters...');

    try {

        const mangasMissingChapters = await prisma.manga.findMany({
            where: {
                chapters: {
                    none: {}
                }
            },
            select: {
                id: true,
                slug: true,
                title: true
            }
        });

        logger.info(`Found ${mangasMissingChapters.length} mangas with 0 chapters.`);

        if (mangasMissingChapters.length === 0) {
            logger.info('No mangas to sync.');
            return;
        }

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < mangasMissingChapters.length; i++) {
            const manga = mangasMissingChapters[i];
            logger.info(`[${i + 1}/${mangasMissingChapters.length}] Syncing chapters for: ${manga.title} (${manga.slug})`);

            try {
                const detail = await komikIndoScrap.getKomikIndoDetail(manga.slug);
                
                if (detail) {

                    await mangaRepository.upsertManga(detail);
                    logger.info(`Successfully synced ${manga.slug}. Found ${detail.chapters ? detail.chapters.length : 0} chapters.`);
                    successCount++;
                } else {
                    logger.warn(`Failed to scrape details for ${manga.slug}.`);
                    failCount++;
                }

            } catch (error) {
                logger.error(`Error syncing ${manga.slug}: ${error.message}`);
                failCount++;
            }

            await sleep(DELAY_MS);
        }

        logger.info(`Sync completed. Success: ${successCount}, Failed: ${failCount}`);

    } catch (error) {
        logger.error(`Fatal error in syncMissingChapters: ${error.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    syncMissingChapters();
}

module.exports = syncMissingChapters;
