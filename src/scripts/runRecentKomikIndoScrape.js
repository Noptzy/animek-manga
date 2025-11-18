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
                const { slug } = mangaSummary;
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
                    const mangaDetail = await komikIndoScrap.getKomikIndoDetail(slug);

                    if (mangaDetail) {
                        logger.info(`[SAVING/UPDATING] Saving details for manga '${slug}'.`);
                        await mangaRepository.upsertManga(mangaDetail);
                        logger.info(`[SUCCESS] Successfully saved/updated '${slug}'.`);

                        logStatus = 'success';
                        action = existingManga ? 'updated' : 'created';
                        logResponse = {
                            message: `Manga ${slug} ${action}. Chapters: ${mangaDetail.chapters.length}`,
                            totalChapters: mangaDetail.chapters.length,
                            action: action
                        };
                    } else {
                        logger.error(`[FAILED] Could not retrieve details for manga: ${slug}`);
                        logStatus = 'failed';
                        logError = `Could not retrieve details for manga: ${slug}`;
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
