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

const searchMangas = async (queryParams) => {
    const cacheKey = `mangas:search:${qs.stringify(queryParams)}`;
    const { s, page, limit, sort } = queryParams;
    const where = {};
    let orderBy = {};

    if (s) {
        where.OR = [
            {
                title: {
                    contains: s,
                    mode: 'insensitive',
                },
            },
            {
                altTitle: {
                    contains: s,
                    mode: 'insensitive',
                },
            },
        ];
    }

    switch (sort) {
        case 'newest':
            orderBy = { updatedAt: 'desc' };
            break;
        case 'oldest':
            orderBy = { createdAt: 'asc' };
            break;
        case 'asc':
            orderBy = { createdAt: 'asc' };
            break;
        case 'desc':
            orderBy = { createdAt: 'desc' };
            break;
        case 'updated':
            orderBy = { updatedAt: 'desc' };
            break;
        case 'updated_oldest':
            orderBy = { updatedAt: 'asc' };
            break;
        case 'a-z':
            orderBy = { title: 'asc' };
            break;
        case 'z-a':
            orderBy = { title: 'desc' };
            break;
        default:
            orderBy = { updatedAt: 'desc' };
            break;
    }

    return cacheable(cacheKey, DEFAULT_TTL, () => mangaRepository.search({ where, orderBy, page, limit }));
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