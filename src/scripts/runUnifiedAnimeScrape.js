require('dotenv').config();
const AnimeRepository = require('../repositories/kuramanimeRepository'); // Sesuaikan path
const kuramanimeScrap = require('../scrap/anime/kuramanimScrap');   // Sesuaikan path
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
            // Callback ini dipanggil setiap kali 1 anime ditemukan oleh scraper
            await kuramanimeScrap.scrapeMassSeed(cat, async (animeData) => {
                let animeLog;
                try {
                    // 1. Simpan Data Master Anime & AnimeServer
                    const result = await AnimeRepository.upsertAnime(animeData, SERVER_ID);
                    const { status, data: animeServer, episodesToProcess } = result;
                    
                    animeLog = { source: SERVER_NAME, endpoint: cat, slug: animeData.slug };

                    if (status === 'skipped') {
                        // logger.info(`[ANIME-WORKER] Skipped: ${animeData.title} (No Updates)`);
                        return; 
                    }
                    
                    logger.info(`[ANIME-WORKER] ${status === 'updated' ? 'Updating' : 'Processing'}: ${animeData.title} - Found ${episodesToProcess.length} new episodes.`);

                    // 2. Loop hanya episode BARU untuk ambil Stream URL
                    if (episodesToProcess && episodesToProcess.length > 0) {
                        for (const episode of episodesToProcess) {
                            try {
                                logger.info(`  -> Fetching stream: Ep. ${episode.episodeNumber}...`);
                                
                                const streams = await kuramanimeScrap.getStreamEpsKuramanime(episode.url);
                                
                                if (streams.length > 0) {
                                    await AnimeRepository.upsertEpisodeWithStreams(animeServer.id, episode, streams);
                                    logger.info(`  -> Saved streams for Ep. ${episode.episodeNumber}`);
                                } else {
                                    logger.warn(`  -> No streams found for Ep. ${episode.episodeNumber}`);
                                }
                            } catch (epError) {
                                logger.error(`  -> Failed Ep. ${episode.episodeNumber}: ${epError.message}`);
                            } finally {
                                await sleep(500);
                            }
                        }
                    }

                    // Log Success
                    await prisma.scrapeLog.create({ 
                        data: { 
                            ...animeLog, 
                            status: 'finished', 
                            response: JSON.stringify({ status, processedEpisodes: episodesToProcess.length }) 
                        } 
                    });

                } catch (error) {
                    logger.error(`[ANIME-WORKER] CRITICAL FAILURE on: ${animeData.title} | Error: ${error.message}`);
                    if (animeLog) {
                        await prisma.scrapeLog.create({ 
                            data: { ...animeLog, status: 'failed', error: error.message } 
                        });
                    }
                }
            });
        } catch (error) {
            logger.error(`[ANIME-WORKER] CRITICAL: Failed to scrape category ${cat.toUpperCase()}. Error: ${error.message}`);
        }

        logger.info(`[ANIME-WORKER] Finished category: ${cat.toUpperCase()}. Pausing...`);
        await sleep(2000);
    }

    logger.info(`[ANIME-WORKER] COMPLETED Unified Scrape.`);
    if (require.main === module) process.exit(0);
}

if (require.main === module) {
    runUnifiedAnimeScrape().catch(err => {
        logger.error('[ANIME-WORKER] Unhandled fatal error.', err);
        process.exit(1);
    });
}

module.exports = { runUnifiedAnimeScrape };