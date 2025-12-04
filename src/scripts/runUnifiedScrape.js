require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const komikIndoScrap = require('../scrap/manga/komikIndoScrap');
const mangaRepository = require('../repositories/mangaRepository');
const logger = require('../utils/logger');

const RECENT_MANGA_SCRAP = process.env.RECENT_MANGA_SCRAP || 5;
const MANGA_MAX_PAGES = process.env.MANGA_MAX_PAGES || 2;

async function runUnifiedScrape() {
    logger.info('Starting Unified Scrape Process...');

    await scrapeRecentManga();

    await scrapeAllGenres();

    await checkOngoingMangaChapters();

    logger.info('Unified Scrape Process Completed.');
    process.exit(0);
}

async function checkOngoingMangaChapters() {
    logger.info('Starting check for new chapters of ongoing manga...');
    try {
        const ongoingMangas = await mangaRepository.findOngoingManga();
        logger.info(`Found ${ongoingMangas.length} ongoing mangas to check.`);

        for (const manga of ongoingMangas) {
            try {
                logger.info(`Checking for new chapters: ${manga.slug}`);
                const scrapedData = await komikIndoScrap.getKomikIndoDetail(manga.slug);

                if (scrapedData && scrapedData.chapters) {
                    const scrapedChapterCount = scrapedData.chapters.length;
                    const dbChapterCount = manga.chapterCount;

                    if (scrapedChapterCount > dbChapterCount) {
                        logger.info(`New chapters found for ${manga.slug}. DB: ${dbChapterCount}, Scraped: ${scrapedChapterCount}. Updating...`);
                        await mangaRepository.upsertManga(scrapedData);
                    } else {
                        logger.info(`No new chapters for ${manga.slug}. DB: ${dbChapterCount}, Scraped: ${scrapedChapterCount}.`);
                    }
                } else {
                    logger.warn(`Could not retrieve scraped data or chapters for ${manga.slug}.`);
                }
            } catch (err) {
                logger.error(`Error processing ongoing manga ${manga.slug}: ${err.message}`);
            }
        }
        logger.info('Finished checking for new chapters of ongoing manga.');
    } catch (error) {
        logger.error(`Failed to check ongoing manga chapters: ${error.message}`);
    }
}


async function scrapeRecentManga() {
    const logId = uuidv4();
    const logData = {
        id: logId,
        source: 'KomikIndo',
        endpoint: 'Recent Manga Scrape',
        slug: 'recent-manga',
        status: 'started',
        response: { message: 'Starting recent manga scrape' },
    };

    try {
        await mangaRepository.createScrapeLog(logData);
        logger.info('Scraping recent manga...');

        const recentResponse = await komikIndoScrap.getKomikIndoManga(1); // Page 1 aja
        const recentMangas = recentResponse.data || [];
        let processedCount = 0;

        for (const manga of recentMangas) {
            if (processedCount >= RECENT_MANGA_SCRAP) break;

            logger.info(`Processing recent manga: ${manga.title}`);

            try {
                const detailManga = await komikIndoScrap.getKomikIndoDetail(manga.slug);
                if (detailManga) {
                    await mangaRepository.upsertManga(detailManga);
                 }
            } catch (err) {
                logger.error(`Failed to process recent manga ${manga.slug}: ${err.message}`);
            }
            
            processedCount++;
        }

        await mangaRepository.updateScrapeLog(logId, {
            status: 'finished',
            response: { message: `Successfully scraped ${processedCount} recent mangas` },
        });

    } catch (error) {
        logger.error(`Recent manga scrape failed: ${error.message}`);
        await mangaRepository.updateScrapeLog(logId, {
            status: 'failed',
            error: error.message,
        });
    }
}

async function scrapeAllGenres() {
    try {

        const genres = await mangaRepository.getGenres(); 
        
        if (!genres || genres.length === 0) {
            logger.warn('No genres found in database. Skipping genre scrape.');
            return;
        }

        for (const genre of genres) {
            await scrapeGenre(genre);
        }

    } catch (error) {
        logger.error(`Error in scrapeAllGenres: ${error.message}`);
    }
}

async function scrapeGenre(genre) {
    const logId = uuidv4();
    const logData = {
        id: logId,
        source: 'KomikIndo',
        endpoint: `Genre Scrape: ${genre.name}`,
        slug: genre.slug,
        status: 'started',
        response: { message: `Starting scrape for genre ${genre.name}` },
    };

    try {
        await mangaRepository.createScrapeLog(logData);
        logger.info(`Scraping genre: ${genre.name} (${genre.slug})`);

        let totalProcessed = 0;
        for (let page = 1; page <= MANGA_MAX_PAGES; page++) {
            const response = await komikIndoScrap.getKomikindoMangaByFilter(page, { genre: [genre.slug] });
            const mangas = response.mangaList || [];
            
            if (!mangas || mangas.length === 0) break;

            for (const manga of mangas) {
                try {
                    const detailManga = await komikIndoScrap.getKomikIndoDetail(manga.slug);
                    if (detailManga) {
                        await mangaRepository.upsertManga(detailManga);
                        totalProcessed++;
                    }
                } catch (err) {
                    logger.error(`Failed to process manga ${manga.slug} in genre ${genre.name}: ${err.message}`);
                }
            }
        }

        await mangaRepository.updateScrapeLog(logId, {
            status: 'finished',
            response: { message: `Successfully scraped ${totalProcessed} mangas for genre ${genre.name}` },
        });

    } catch (error) {
        logger.error(`Failed to scrape genre ${genre.name}: ${error.message}`);
        await mangaRepository.updateScrapeLog(logId, {
            status: 'failed',
            error: error.message,
        });
    }
}

runUnifiedScrape();
