require('dotenv').config();
const AnimeRepository = require('../repositories/animeRepository');
const kuramanimeScrap = require('../scrap/anime/kuramanimScrap');
const logger = require('../utils/logger');
const prisma = require('../config/prisma');

const SERVER_ID = 1;
const SERVER_NAME = 'Kuramanime';
const CATEGORIES = ['ongoing', 'finished', 'movie'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runUnifiedAnimeScrape() {
    logger.info(`[ANIME-WORKER] STARTING Unified Scrape for Server: ${SERVER_NAME}`);

    for (const cat of CATEGORIES) {
        logger.info(`[ANIME-WORKER] Processing Category: ${cat.toUpperCase()}`);

        try {
            await kuramanimeScrap.scrapeMassSeed(cat, async (animeData) => {
                let animeLog;
                try {
                    // Step 1: Save main anime data
                    const result = await AnimeRepository.upsertAnime(animeData, SERVER_ID);
                    const status = result.status;
                    const animeServer = result.data;
                    
                    animeLog = { source: SERVER_NAME, endpoint: cat, slug: animeData.slug };

                    if (status === 'skipped') {
                        logger.info(`[ANIME-WORKER] Skipped: ${animeData.title} (No Updates)`);
                        await prisma.scrapeLog.create({ data: { ...animeLog, status: 'skipped', response: { message: 'No new episodes.' } } });
                        return; // Stop processing this anime
                    }
                    
                    logger.info(`[ANIME-WORKER] Saved: ${animeData.title} (Status: ${status})`);

                    // Step 2: Process all episodes for this anime
                    if (animeData.episodeList && animeData.episodeList.length > 0) {
                        logger.info(`[ANIME-WORKER] Found ${animeData.episodeList.length} episodes for ${animeData.title}. Processing streams...`);

                        for (const episode of animeData.episodeList) {
                            try {
                                const streams = await kuramanimeScrap.getStreamEpsKuramanime(episode.url);
                                if (streams.length > 0) {
                                    await AnimeRepository.upsertEpisodeWithStreams(animeServer.id, episode, streams);
                                    logger.info(`  -> Saved streams for Ep. ${episode.episodeNumber}`);
                                } else {
                                    logger.warn(`  -> No streams found for Ep. ${episode.episodeNumber}. Skipping.`);
                                }
                            } catch (epError) {
                                logger.error(`  -> Failed to process Ep. ${episode.episodeNumber}: ${epError.message}`);
                            } finally {
                                await sleep(200); // Delay per-episode
                            }
                        }
                    }

                    await prisma.scrapeLog.create({ data: { ...animeLog, status: 'finished', response: { status: status, episodes_processed: animeData.episodeList.length } } });

                } catch (error) {
                    logger.error(`[ANIME-WORKER] CRITICAL FAILURE on: ${animeData.title} | Error: ${error.message}`);
                    if (animeLog) {
                        await prisma.scrapeLog.create({ data: { ...animeLog, status: 'failed', error: error.message } });
                    }
                }
            });
        } catch (error) {
            logger.error(`[ANIME-WORKER] CRITICAL: Failed to scrape category ${cat.toUpperCase()}. Error: ${error.message}`);
        }

        logger.info(`[ANIME-WORKER] Finished category: ${cat.toUpperCase()}. Pausing for a moment.`);
        await sleep(1000);
    }

    logger.info(`[ANIME-WORKER] COMPLETED Unified Scrape for Server: ${SERVER_NAME}`);
    if (require.main === module) {
        process.exit(0);
    }
}

if (require.main === module) {
    runUnifiedAnimeScrape().catch(err => {
        logger.error('[ANIME-WORKER] Unhandled fatal error in scrape process.', err);
        process.exit(1);
    });
}

module.exports = { runUnifiedAnimeScrape };
