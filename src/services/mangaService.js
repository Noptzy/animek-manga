const mangaRepository = require('../repositories/mangaRepository');
const { cacheable } = require('../utils/cache');
const qs = require('qs');

const DEFAULT_TTL = 300; // 5 minutes

const getAllMangas = async ({ page, limit, sort, order }) => {
    const cacheKey = `mangas:all:${qs.stringify({ page, limit, sort, order })}`;
    const orderBy = {};
    if (sort) {
        orderBy[sort] = order || 'asc';
    } else {
        orderBy.updatedAt = 'desc';
    }

    return cacheable(cacheKey, DEFAULT_TTL, () => mangaRepository.findAll({ page, limit, order: orderBy }));
};

const getMangaDetailBySlug = async (slug, options) => {
    const cacheKey = `manga:detail:${slug}:${qs.stringify(options)}`;
    return cacheable(cacheKey, DEFAULT_TTL, () => mangaRepository.findMangaBySlug(slug, options));
};

const searchMangas = async ({ q, page = 1, limit = 20 }) => {
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 20;

    if (!q || q.trim() === '') {
        return { mangas: [], total: 0, page: pageInt, totalPages: 0 };
    }

    const searchKeyword = q.trim();

    const cacheKey = `mangas:search:${qs.stringify({ q: searchKeyword, page: pageInt, limit: limitInt })}`;

    return cacheable(cacheKey, DEFAULT_TTL, async () => {
        try {
            const skip = (pageInt - 1) * limitInt;

            const where = {
                OR: [
                    { title: { contains: searchKeyword, mode: 'insensitive' } },
                    { altTitle: { contains: searchKeyword, mode: 'insensitive' } },
                ],
            };

            const { mangas, total } = await mangaRepository.search({
                where,
                skip,
                take: limitInt,
                orderBy: { title: 'asc' }
            });

            const mappedMangas = mangas.map((m) => ({
                ...m,
                totalChapters: m._count ? m._count.chapters : 0,
                _count: undefined,
            }));

            return {
                mangas: mappedMangas,
                total,
                page: pageInt,
                limit: limitInt,
                totalPages: Math.ceil(total / limitInt),
            };
        } catch (error) {
            
            throw error;
        }
    });
};

const getFilteredMangas = async ({ filters, page, limit }) => {
    const cacheKey = `mangas:filter:${qs.stringify({ filters, page, limit })}`;
    return cacheable(cacheKey, DEFAULT_TTL, () => mangaRepository.filter({ filters, page, limit }));
};

const getCountAllMangas = async () => {
    const cacheKey = 'mangas:count:all';
    // Use a longer TTL for counts as they change less frequently
    return cacheable(cacheKey, DEFAULT_TTL * 2, () => mangaRepository.countAllMangasInDB());
};

const getCountAllChapterMangas = async () => {
    const cacheKey = 'mangas:count:chapters';
    // Use a longer TTL for counts
    return cacheable(cacheKey, DEFAULT_TTL * 2, () => mangaRepository.countAllChapterMangaInDB());
};

const getGenres = async () => {
    const cacheKey = 'genres:all';
    // Genres change very rarely, use a much longer TTL
    return cacheable(cacheKey, DEFAULT_TTL * 12, () => mangaRepository.getGenres());
};

module.exports = {
    getAllMangas,
    getMangaDetailBySlug,
    searchMangas,
    getFilteredMangas,
    getCountAllMangas,
    getCountAllChapterMangas,
    getGenres,
};