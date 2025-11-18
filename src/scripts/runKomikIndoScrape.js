const mangaRepository = require('../repositories/mangaRepository');
const komikIndoScrap = require('../scrap/manga/komikIndoScrap');
const logger = require('../utils/logger');
const delay = require('../utils/delayScrap');
const scrapeLogRepository = require('../repositories/scrapeLogRepository');
require('dotenv').config()

async function runFullScrape() {
    logger.info('Starting KomikIndo full scrape and seed process...');
    const MAX_PAGES = process.env.MANGA_MAX_PAGES;
    const SOURCE = 'KomikIndo';
    const ENDPOINT = 'Full Scrape';

    for (let page = 1; page <= MAX_PAGES; page++) {
        try {
            logger.info(`Fetching manga list from page ${page} of ${MAX_PAGES}...`);
            const mangaListPage = await komikIndoScrap.getKomikIndoManga(page);

            if (!mangaListPage || mangaListPage.data.length === 0) {
                logger.warn(`No manga found on page ${page}.`);
                if (!mangaListPage.hasNext) {
                    logger.info('No more pages found from source. Stopping process.');
                    break;
                }
                continue;
            }

            logger.info(`Found ${mangaListPage.data.length} manga to process from page ${page}.`);

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
                    if (existingManga) {
                        logger.info(`[SKIP] Manga '${slug}' already exists in the database.`);
                        logStatus = 'skipped';
                        action = 'skipped';
                        logResponse = { message: `Manga ${slug} already exists.`, action: action };
                        await scrapeLogRepository.createLog({
                            source: SOURCE,
                            endpoint: ENDPOINT,
                            slug: slug,
                            status: logStatus,
                            response: logResponse,
                            error: logError
                        });
                        continue;
                    }

                    logger.info(`[NEW] Found new manga: '${slug}'. Scraping details...`);
                    const mangaDetail = await komikIndoScrap.getKomikIndoDetail(slug);

                    if (mangaDetail) {
                        logger.info(`[SAVING] Saving details for new manga '${slug}'.`);
                        await mangaRepository.upsertManga(mangaDetail);
                        logger.info(`[SUCCESS] Successfully saved '${slug}'.`);

                        logStatus = 'success';
                        action = 'created';
                        logResponse = {
                            message: `Manga ${slug} ${action}. Chapters: ${mangaDetail.chapters.length}`,
                            totalChapters: mangaDetail.chapters.length,
                            action: action
                        };
                    } else {
                        logger.error(`[FAILED] Could not retrieve details for new manga: ${slug}`);
                        logStatus = 'failed';
                        logError = `Could not retrieve details for new manga: ${slug}`;
                    }

                    const waitTime = Math.floor(Math.random() * (2500 - 1000 + 1)) + 1000;
                    logger.info(`Waiting for ${waitTime}ms before next request.`);
                    await delay(waitTime);

                } catch (detailError) {
                    logger.error(`An error occurred while processing new slug ${slug}: ${detailError.message}`);
                    logStatus = 'failed';
                    logError = detailError.message;
                } finally {
                    if (logStatus !== 'skipped') {
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
            }

            if (!mangaListPage.hasNext) {
                logger.info('Reached the last page according to the source. Stopping scrape.');
                break;
            }

        } catch (pageError) {
            logger.error(`A critical error occurred on page ${page}: ${pageError.message}. Moving to next page.`);
            await scrapeLogRepository.createLog({
                source: SOURCE,
                endpoint: ENDPOINT,
                slug: `page-${page}`,
                status: 'failed',
                error: `Critical error on page ${page}: ${pageError.message}`
            });
        }
    }
    logger.info(`Scrape process finished after checking up to ${MAX_PAGES} pages.`);
}

runFullScrape()
    .then(() => {
        logger.info('KomikIndo scrape script finished successfully.');
    })
    .catch((err) => {
        logger.error('Scrape script failed with an unhandled error:', err);
    })
    .finally(() => {
        logger.info('Script execution complete.');
    });
