const mangaRepository = require('../repositories/mangaRepository');
const { cacheable } = require('../utils/cache');
const qs = require('qs');
const komikIndoScrap = require('../scrap/manga/komikIndoScrap');
const logger = require('../utils/logger'); 

const DEFAULT_TTL = 300; // 30 minutes

const getCountAllMangas = async () => {
    // Direct DB count for now to verify speed. 8000 rows should be fast.
    return mangaRepository.countAllMangasInDB();
};

const getCountAllChapterMangas = async () => {
    return mangaRepository.countAllChapterMangaInDB();
};

const getAllMangas = async ({ page, limit, sort, order }) => {
    const cacheKey = `mangas:all:${qs.stringify({ page, limit, sort, order })}`;

    return cacheable(cacheKey, DEFAULT_TTL, async () => {
        const orderBy = {};
        if (sort) {
            orderBy[sort] = order || 'asc';
        } else {
            orderBy.updatedAt = 'desc';
        }

        const total = await getCountAllMangas();
        const mangas = await mangaRepository.getMangaList({ page, limit, order: orderBy });

        return {
            mangas,
            total,
            page,
            limit
        };
    });
};

const scrapeAndCheckForUpdate = async (slug) => {
    try {
        logger.info(`Starting background scrape for ${slug}...`);
        const scrapedData = await komikIndoScrap.getKomikIndoDetail(slug);

        if (!scrapedData) {
            logger.warn(`No scraped data returned for ${slug}.`);
            return;
        }

        const existingManga = await mangaRepository.findMangaBySlug(slug, { chapterOrder: 'asc' });

        let needsUpdate = false;
        if (!existingManga) {
            logger.info(`Manga ${slug} not found in DB, performing initial upsert.`);
            await mangaRepository.upsertManga(scrapedData);
            needsUpdate = true;
        } else {

            const currentStatus = existingManga.status;
            const currentChapterCount = existingManga.chapters ? existingManga.chapters.length : 0;

            const scrapedStatus = scrapedData.status;
            const scrapedChapterCount = scrapedData.chapters ? scrapedData.chapters.length : 0;

            if (currentStatus !== scrapedStatus || currentChapterCount !== scrapedChapterCount) {
                logger.info(`Changes detected for ${slug}. Updating DB. Current Status: ${currentStatus}, Scraped Status: ${scrapedStatus}. Current Chapters: ${currentChapterCount}, Scraped Chapters: ${scrapedChapterCount}.`);
                await mangaRepository.upsertManga(scrapedData);
                needsUpdate = true;
            } else {
                logger.info(`No significant changes for ${slug}. Status: ${currentStatus}, Chapters: ${currentChapterCount}.`);
            }
        }

        if (needsUpdate) {
            logger.info(`Manga ${slug} updated in DB.`);
        }
    } catch (error) {
        logger.error(`Error during background scrape and update check for ${slug}: ${error.message}`, { error });
    }
};

const getMangaDetailBySlug = async (slug, options) => {
    const cacheKey = `manga:detail:${slug}:${qs.stringify(options)}`;
    
    const manga = await cacheable(cacheKey, DEFAULT_TTL, () => mangaRepository.findMangaBySlug(slug, options));

    (async () => {
        await scrapeAndCheckForUpdate(slug);
    })();

    return manga; 
};

const searchMangas = async ({ q, genre, status, author, page = 1, limit = 20 }) => {
    const searchParams = { q, genre, status, author, page, limit };

    if (!q && !genre && !status && !author) {
        return { mangas: [], total: 0, page, limit, totalPages: 0 };
    }

    const cacheKey = `mangas:search:${qs.stringify(searchParams)}`;

    return cacheable(cacheKey, DEFAULT_TTL, () => {
        return mangaRepository.findAndFilter({
            ...searchParams,
            q: q ? q.trim() : undefined,
        });
    });
};

const getGenres = async () => {
    const cacheKey = 'genres:all';
    return cacheable(cacheKey, DEFAULT_TTL * 12, () => mangaRepository.getGenres());
};

const getChapterImages = async (chapterPath) => {
    const cacheKey = `chapter:images:${chapterPath}`;
    const ONE_DAY = 3600 * 24;
    return cacheable(cacheKey, ONE_DAY, () => komikIndoScrap.getKomikIndoChapterImages(chapterPath));
};

module.exports = {
    getAllMangas,
    getMangaDetailBySlug,
    searchMangas,
    getCountAllMangas,
    getCountAllChapterMangas,
    getGenres,
    scrapeAndCheckForUpdate,
    getChapterImages,
};

