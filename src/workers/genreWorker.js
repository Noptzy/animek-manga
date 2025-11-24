const cron = require('node-cron');
const logger = require('../utils/logger.js');
const komikIndoScrap = require('../scrap/manga/komikIndoScrap.js');
const mangaRepository = require('../repositories/mangaRepository.js');

const CRON_SCHEDULE = process.env.GENRE_WORKER_SCHEDULE || '0 */5 * * *';
const MANGA_MAX_PAGES = parseInt(process.env.MANGA_MAX_PAGES || '5');

async function seedGenres() {
    try {
        logger.info('Starting genre seeding...');

        const genres = await komikIndoScrap.getGenreList();
        if (!genres || genres.length === 0) {
            logger.warn('No genres found to seed.');
            return;
        }

        await mangaRepository.upsertGenres(genres);
        logger.info(`Synced ${genres.length} genres to database.`);

        for (const genre of genres) {
            logger.info(`Scraping manga for genre: ${genre.name} (${genre.slug})`);
            
            for (let page = 1; page <= MANGA_MAX_PAGES; page++) {
                try {
                   
                    const filters = {
                        genre: [genre.slug],
                    };

                    logger.info(`Scraping genre ${genre.slug} page ${page}...`);
                    const scrapedData = await komikIndoScrap.getKomikindoMangaByFilter(page, filters);

                    if (scrapedData && scrapedData.mangaList && scrapedData.mangaList.length > 0) {
                        const mangasToUpsert = scrapedData.mangaList.map(m => ({
                            ...m,
                            genres: [genre.name] 
                        }));

                        for (const manga of mangasToUpsert) {
                            try {

                                const detail = await komikIndoScrap.getKomikIndoDetail(manga.slug);
                                if (detail) {

                                    await mangaRepository.upsertManga(detail);
                                } else {
                                    logger.warn(`Failed to scrape details for ${manga.slug}, using basic info.`);
                                    await mangaRepository.upsertManga(manga);
                                }
                            } catch (error) {
                                logger.error(`Failed to upsert manga ${manga.slug}: ${error.message}`);
                            }
                        }
                        logger.info(`Upserted ${scrapedData.mangaList.length} mangas for genre ${genre.slug} page ${page}`);
                    } else {
                        logger.info(`No manga found for genre ${genre.slug} page ${page}`);
                        break; 
                    }

                } catch (err) {
                    logger.error(`Error scraping genre ${genre.slug} page ${page}: ${err.message}`);
                }
            }
        }

        logger.info('Genre seeding completed.');

    } catch (error) {
        logger.error(`Error in genre seeding worker: ${error.message}`);
    }
}

if (require.main === module) {
    cron.schedule(CRON_SCHEDULE, () => {
        logger.info('Running scheduled genre worker...');
        seedGenres();
    });
}

module.exports = { seedGenres };
