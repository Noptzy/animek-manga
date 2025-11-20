const mangaRepository = require('../repositories/mangaRepository');
const komikIndoScrap = require('../scrap/manga/komikIndoScrap');
const logger = require('../utils/logger');
const delay = require('../utils/delayScrap');
const scrapeLogRepository = require('../repositories/scrapeLogRepository');
require('dotenv').config();

async function runRecentScrape() {
    logger.info('Starting KomikIndo recent scrape process...');
    const RECENT_PAGES = process.env.RECENT_MANGA_SCRAP || 2;
    const SOURCE = 'KomikIndo';
    const ENDPOINT = 'Recent Manga Scrape';

    for (let page = 1; page <= RECENT_PAGES; page++) {
        try {
            logger.info(`Fetching manga list from recent page ${page} of ${RECENT_PAGES}...`);
            const mangaListPage = await komikIndoScrap.getKomikIndoManga(page);

            if (!mangaListPage || mangaListPage.data.length === 0) {
                logger.warn(`No manga found on recent page ${page}.`);
                if (!mangaListPage.hasNext) {
                    logger.info('No more pages found from source. Stopping process.');
                    break;
                }
                continue;
            }

            logger.info(`Found ${mangaListPage.data.length} manga to process from recent page ${page}.`);

            for (const mangaSummary of mangaListPage.data) {
                const { slug, latest_chapter } = mangaSummary;
                if (!slug) {
                    logger.warn('Found a manga summary without a slug, skipping.', mangaSummary);
                    continue;
                }

                let logStatus = 'failed';
                let logResponse = null;
                let logError = null;
                let action = 'unknown';

                try {
                    await scrapeLogRepository.createLog({
                        source: SOURCE,
                        endpoint: ENDPOINT,
                        slug: slug,
                        status: 'started',
                        response: { message: `Attempting to scrape details for ${slug}` }
                    });

                    const existingManga = await mangaRepository.findMangaBySlug(slug);

                    if (!existingManga) {
                        // New manga - scrape everything
                        logger.info(`[NEW] Found new manga '${slug}'. Scraping all details...`);
                        const mangaDetail = await komikIndoScrap.getKomikIndoDetail(slug);

                        if (mangaDetail) {
                            await mangaRepository.upsertManga(mangaDetail);
                            logger.info(`[SUCCESS] Created new manga '${slug}' with ${mangaDetail.chapters.length} chapters.`);
                            logStatus = 'success';
                            action = 'created';
                            logResponse = {
                                message: `New manga ${slug} created with ${mangaDetail.chapters.length} chapters`,
                                totalChapters: mangaDetail.chapters.length,
                                action: action
                            };
                        } else {
                            logger.error(`[FAILED] Could not retrieve details for new manga: ${slug}`);
                            logStatus = 'failed';
                            logError = `Could not retrieve details for new manga: ${slug}`;
                        }
                    } else {
                        const latestChapterUrl = latest_chapter ? latest_chapter.url : null;

                        if (!latestChapterUrl) {
                            logger.warn(`[SKIP] Manga '${slug}' has no latest chapter information. Skipping.`);
                            logStatus = 'skipped';
                            action = 'skipped';
                            logResponse = {
                                message: `Manga '${slug}' has no latest chapter information.`,
                                action: action
                            };
                        } else {
                            const chapterExists = await mangaRepository.checkChapterExists(slug, latestChapterUrl);

                            if (chapterExists) {
                                logger.info(`[SKIP] Manga '${slug}' is up-to-date. Latest chapter '${latestChapterUrl}' already exists.`);
                                logStatus = 'skipped';
                                action = 'skipped';
                                logResponse = {
                                    message: `Manga '${slug}' is up-to-date. No new chapters.`,
                                    latestChapter: latestChapterUrl,
                                    action: action
                                };
                            } else {

                                logger.info(`[UPDATE] Manga '${slug}' has new chapters. Last known chapter not found. Scraping details...`);
                                const mangaDetail = await komikIndoScrap.getKomikIndoDetail(slug);

                                if (mangaDetail) {
                                    const oldChapterCount = existingManga.chapters ? existingManga.chapters.length : 0;
                                    const newChapterCount = mangaDetail.chapters.length;
                                    const addedCount = newChapterCount - oldChapterCount;

                                    await mangaRepository.upsertManga(mangaDetail);
                                    
                                    logger.info(`[SUCCESS] Updated manga '${slug}'. Added ${addedCount} new chapter(s). Total: ${newChapterCount}.`);
                                    logStatus = 'success';
                                    action = 'updated';
                                    logResponse = {
                                        message: `Manga ${slug} updated. Added: ${addedCount} new chapters.`,
                                        oldChapterCount: oldChapterCount,
                                        newChapterCount: newChapterCount,
                                        addedChapters: addedCount,
                                        action: action
                                    };
                                } else {
                                    logger.error(`[FAILED] Could not retrieve details for manga update: ${slug}`);
                                    logStatus = 'failed';
                                    logError = `Could not retrieve details for manga update: ${slug}`;
                                }
                            }
                        }
                    }

                    const waitTime = Math.floor(Math.random() * (2500 - 1000 + 1)) + 1000;
                    logger.info(`Waiting for ${waitTime}ms before next request.`);
                    await delay(waitTime);

                } catch (detailError) {
                    logger.error(`An error occurred while processing slug ${slug}: ${detailError.message}`);
                    logStatus = 'failed';
                    logError = detailError.message;
                } finally {
                    await scrapeLogRepository.createLog({
                        source: SOURCE,
                        endpoint: ENDPOINT,
                        slug: slug,
                        status: logStatus,
                        response: logResponse,
                        error: logError
                    });
                }
            }

            if (!mangaListPage.hasNext) {
                logger.info('Reached the last page according to the source. Stopping scrape.');
                break;
            }

        } catch (pageError) {
            logger.error(`A critical error occurred on recent page ${page}: ${pageError.message}. Moving to next page.`);
            await scrapeLogRepository.createLog({
                source: SOURCE,
                endpoint: ENDPOINT,
                slug: `page-${page}`,
                status: 'failed',
                error: `Critical error on page ${page}: ${pageError.message}`
            });
        }
    }
    logger.info(`Recent scrape process finished after checking up to ${RECENT_PAGES} pages.`);
}

runRecentScrape()
    .then(() => {
        logger.info('KomikIndo recent scrape script finished successfully.');
    })
    .catch((err) => {
        logger.error('Recent scrape script failed with an unhandled error:', err);
    })
    .finally(() => {
        logger.info('Script execution complete.');
    });
