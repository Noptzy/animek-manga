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
    const { q, page, limit, sort, order } = queryParams;
    const where = {};
    const orderBy = {};

    if (q) {
        where.title = {
            contains: q,
            mode: 'insensitive',
        };
    }

    if (sort) {
        orderBy[sort] = order || 'asc';
    } else {
        orderBy.updatedAt = 'desc';
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