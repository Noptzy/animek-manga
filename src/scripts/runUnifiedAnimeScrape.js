require('dotenv').config();

const kuramanimeScrap = require('../scrap/anime/kuramanimScrap');
const AnimeRepository = require('../repositories/kuramanimeRepository');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');

const SERVER_ID = 1;
const SERVER_NAME = 'Kuramanime';
const CATEGORIES = ['ongoing', 'finished', 'movie'];
const MAX_PAGES = 300;
const MAX_CONSECUTIVE_EMPTY_PAGES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runUnifiedAnimeScrape() {
    logger.info(`[WORKER] START ${SERVER_NAME}`);

    for (const category of CATEGORIES) {
        logger.info(`[WORKER] CATEGORY ${category}`);
        let consecutiveEmptyPages = 0;

        for (let page = 1; page <= MAX_PAGES; page++) {
            logger.info(`[WORKER] Scraping page ${page} for ${category}...`);

            const links = await kuramanimeScrap.scrapeAnimeListPage(category, page);

            if (links.size === 0) {
                consecutiveEmptyPages++;
                logger.info(`[WORKER] Page ${page} is empty. Consecutive empty pages: ${consecutiveEmptyPages}`);
            } else {
                consecutiveEmptyPages = 0; // Reset counter
            }

            if (consecutiveEmptyPages >= MAX_CONSECUTIVE_EMPTY_PAGES) {
                logger.info(
                    `[WORKER] Found ${consecutiveEmptyPages} consecutive empty pages. Moving to next category.`,
                );
                break; // Exit page loop for this category
            }

            if (links.size === 0) {
                continue; // Skip to next page if no links found
            }

            for (const link of links) {
                try {
                    const animeData = await kuramanimeScrap.getDetailAnimeKuramanime(link);

                    // Filtering logic
                    if (animeData.category !== 'anime') {
                        logger.info(`[FILTER] Skipping non-anime category: ${animeData.title}`);
                        continue;
                    }
                    if (animeData.title?.toLowerCase().includes('[18+]')) {
                        logger.info(`[FILTER] Skipping 18+ anime: ${animeData.title}`);
                        continue;
                    }
                    if (
                        Array.isArray(animeData.genres) &&
                        animeData.genres.some((g) => g.toLowerCase().includes('hentai'))
                    ) {
                        logger.info(`[FILTER] Skipping hentai anime: ${animeData.title}`);
                        continue;
                    }

                    // Database and episode processing logic
                    let logPayload = {
                        source: SERVER_NAME,
                        endpoint: category,
                        slug: animeData.slug,
                    };

                    try {
                        const {
                            status,
                            data: animeServer,
                            episodesToProcess,
                        } = await AnimeRepository.upsertAnime(animeData, SERVER_ID);

                        if (status === 'skipped') {
                            // This status means the anime exists and has no new episodes or status changes.
                            // We can consider this a form of "no new updates" for the early exit logic.
                            logger.info(`[SKIP] ${animeData.title} (no updates)`);
                            continue; // Continue to the next anime link
                        }

                        if (!episodesToProcess || episodesToProcess.length === 0) {
                            logger.info(`[NO EP UPDATE] ${animeData.title}`);
                            continue;
                        }

                        logger.info(`[UPDATE] ${animeData.title} found ${episodesToProcess.length} new episodes.`);

                        for (const ep of episodesToProcess) {
                            try {
                                if (!ep?.url) {
                                    logger.warn(`Skip episode ${ep?.episodeNumber} (no url)`);
                                    continue;
                                }

                                const createdEpisode = await AnimeRepository.upsertEpisodeOnly(animeServer.id, ep);
                                await sleep(200); // Small delay before fetching streams

                                const streams = await kuramanimeScrap.getStreamEpsKuramanime(ep.url);
                                if (streams && streams.length > 0) {
                                    await AnimeRepository.upsertEpisodeStreams(createdEpisode.id, streams);
                                    logger.info(`[+STREAM] Episode ${ep.episodeNumber} for ${animeData.title}`);
                                } else {
                                    logger.warn(`[NO STREAM] Episode ${ep.episodeNumber} for ${animeData.title}`);
                                }
                                await sleep(200); // Small delay after fetching streams
                            } catch (epError) {
                                logger.error(
                                    `Failed to process episode ${ep?.episodeNumber} for ${animeData.title}: ${epError.message}`,
                                );
                            }
                        }

                        await prisma.scrapeLog.create({
                            data: {
                                ...logPayload,
                                status: 'finished',
                                response: JSON.stringify({
                                    newEpisodes: episodesToProcess.length,
                                }),
                            },
                        });

                        logger.info(`[DONE] ${animeData.title} (+${episodesToProcess.length} ep)`);
                    } catch (err) {
                        await prisma.scrapeLog.create({
                            data: {
                                ...logPayload,
                                status: 'failed',
                                error: err.message,
                            },
                        });
                        logger.error(`[FAIL] DB upsert for ${animeData.title} → ${err.message}`);
                    }
                } catch (e) {
                    logger.error(`[FAIL] Scraping detail for ${link}: ${e.message}`);
                }
                await sleep(500); // Delay between processing each anime
            }
            await sleep(1000); // Delay between each page
        }
        await sleep(2000); // Delay between each category
    }

    logger.info('[WORKER] FINISHED');
    process.exit(0);
}

if (require.main === module) {
    runUnifiedAnimeScrape().catch((err) => {
        logger.error(err);
        process.exit(1);
    });
}

module.exports = { runUnifiedAnimeScrape };
