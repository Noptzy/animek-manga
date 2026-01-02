const mangaRepository = require('../repositories/mangaRepository');
const komikIndoScrap = require('../scrap/manga/komikIndoScrap');
const logger = require('../utils/logger');
const qs = require('qs');
const cacheHandler = require('../cache/cacheHandler');
const { TTL } = require('../utils/cacheConstants');

const KEYS = {
    LIST: (query) => `manga:list:${query}`,
    DETAIL: (slug, options) => `manga:detail:${slug}:${qs.stringify(options)}`,
    SEARCH: (query) => `manga:search:${query}`,
    GENRES: 'manga:genres:all',
    CHAPTER_IMAGES: (path) => `chapter:images:${path}`,
};

const getCountAllMangas = async () => {
    return mangaRepository.countAllMangasInDB();
};

const getCountAllChapterMangas = async () => {
    return mangaRepository.countAllChapterMangaInDB();
};

const getAllMangas = async ({ page, limit, sort, order }) => {
    const queryString = qs.stringify({ page, limit, sort, order });
    const cacheKey = KEYS.LIST(queryString);

    return await cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
        const orderBy = {};
        if (sort) {
            orderBy[sort] = order || 'asc';
        } else {
            orderBy.updatedAt = 'desc';
        }

        const [total, mangas] = await Promise.all([
            getCountAllMangas(),
            mangaRepository.getMangaList({ page, limit, order: orderBy }),
        ]);

        return {
            mangas,
            total,
            page,
            limit,
        };
    });
};

const scrapeAndCheckForUpdate = async (slug) => {
    try {
        const scrapedData = await komikIndoScrap.getKomikIndoDetail(slug);

        if (!scrapedData) return;

        const existingManga = await mangaRepository.findMangaBySlug(slug, { chapterOrder: 'asc' });
        let needsUpdate = false;

        if (!existingManga) {
            await mangaRepository.upsertManga(scrapedData);
            needsUpdate = true;
        } else {
            const currentStatus = existingManga.status;
            const currentChapterCount = existingManga.chapters ? existingManga.chapters.length : 0;
            const scrapedStatus = scrapedData.status;
            const scrapedChapterCount = scrapedData.chapters ? scrapedData.chapters.length : 0;

            if (currentStatus !== scrapedStatus || currentChapterCount !== scrapedChapterCount) {
                await mangaRepository.upsertManga(scrapedData);
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            logger.info(`Manga ${slug} updated in DB.`);
        }
    } catch (error) {
        logger.error(`Error background scrape ${slug}: ${error.message}`, { error });
    }
};

const getMangaDetailBySlug = async (slug, options = {}) => {
    const cacheKey = KEYS.DETAIL(slug, options);

    const manga = await cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
        return await mangaRepository.findMangaBySlug(slug, options);
    });

    setImmediate(() => {
        scrapeAndCheckForUpdate(slug).catch((err) => logger.error('Background scrape error', err));
    });

    return manga;
};

const getMangaDetailById = async (id) => {
    const cacheKey = `manga:detail:id:${id}`;
    return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
        return await mangaRepository.getMangaById(id);
    });
};

const searchMangas = async ({ q, genre, status, author, page = 1, limit = 20 }) => {
    const searchParams = { q, genre, status, author, page, limit };

    if (!q && !genre && !status && !author) {
        return { mangas: [], total: 0, page, limit, totalPages: 0 };
    }

    const queryString = qs.stringify(searchParams);
    const cacheKey = KEYS.SEARCH(queryString);

    return await cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
        return await mangaRepository.findAndFilter({
            ...searchParams,
            q: q ? q.trim() : undefined,
        });
    });
};

const getGenres = async () => {
    const cacheKey = KEYS.GENRES;
    return await cacheHandler.remember(cacheKey, TTL.VERY_LONG, async () => {
        return await mangaRepository.getGenres();
    });
};

const getChapterImages = async (chapterPath) => {
    const cacheKey = KEYS.CHAPTER_IMAGES(chapterPath);
    return await cacheHandler.remember(cacheKey, TTL.VERY_LONG, async () => {
        return await komikIndoScrap.getKomikIndoChapterImages(chapterPath);
    });
};

module.exports = {
    getAllMangas,
    getMangaDetailBySlug,
    getMangaDetailById,
    searchMangas,
    getCountAllMangas,
    getCountAllChapterMangas,
    getGenres,
    scrapeAndCheckForUpdate,
    getChapterImages,
    async updateMangaManual(slug, data) {
        const result = await mangaRepository.updateMangaManual(slug, data);

        // Invalidate Cache
        cacheHandler.invalidate(KEYS.DETAIL(slug, { chapterOrder: 'asc' }));
        cacheHandler.invalidate(KEYS.DETAIL(slug, { chapterOrder: 'desc' }));
        cacheHandler.deletePattern('manga:search:*');
        cacheHandler.deletePattern('manga:list:*');

        return result;
    },

    async createMangaManual(data) {
        if (!data.slug) {
             data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }

        const exists = await mangaRepository.findMangaBySlug(data.slug);
        if (exists) throw new Error('Manga with this slug already exists');

        const result = await mangaRepository.createManga(data);
        cacheHandler.deletePattern('manga:list:*');
        cacheHandler.deletePattern('manga:search:*');
        return result;
    },

    async deleteChapter(slug, chapterIndex) {
        const manga = await mangaRepository.findMangaBySlug(slug);
        if (!manga) throw new Error('Manga not found');

        await mangaRepository.deleteChapter(manga.id, chapterIndex);
        
        cacheHandler.invalidate(KEYS.DETAIL(slug, { chapterOrder: 'asc' }));
        cacheHandler.invalidate(KEYS.DETAIL(slug, { chapterOrder: 'desc' }));
        return { message: 'Chapter deleted successfully' };
    },

    async upsertChapterManual(slug, chapterData) {
        const result = await mangaRepository.upsertChapterManual(slug, chapterData);

        // Invalidate Cache
        cacheHandler.invalidate(KEYS.DETAIL(slug, { chapterOrder: 'asc' }));
        cacheHandler.invalidate(KEYS.DETAIL(slug, { chapterOrder: 'desc' }));
        return result;
    },

    async deleteManga(slug) {
        // 1. Delete from DB
        try {
             await mangaRepository.deleteManga(slug);
        } catch (error) {
             throw error;
        }

        // 2. Invalidate Cache
        cacheHandler.invalidate(KEYS.DETAIL(slug, { chapterOrder: 'asc' }));
        cacheHandler.invalidate(KEYS.DETAIL(slug, { chapterOrder: 'desc' }));
        cacheHandler.deletePattern('manga:search:*');
        cacheHandler.deletePattern('manga:list:*');

        return { message: 'Manga deleted successfully' };
    },
};
