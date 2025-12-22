const logger = require('../utils/logger');
const OploverzRepository = require('../repositories/oploverzRepository');
const cacheHandler = require('../cache/cacheHandler');
const { TTL } = require('../utils/cacheConstants');
const oploverzRepository = require('../repositories/oploverzRepository');

// Import Scraper
const oploverzScrap = require('../scrap/anime/oploverzScrap');

const KEYS = {
    ONGOING: (page, limit) => `anime:server2:ongoing:${page}:${limit}`,
    COMPLETED: (page, limit) => `anime:server2:completerd:${page}:${limit}`,
    MOVIES: (page, limit) => `anime:server2:movie:${page}:${limit}`,
    SEARCH: (q, page, limit, status, type) => `anime:server2:search:${q}:${status}:${type}:${page}:${limit}`,
    DETAIL: (slug) => `anime:server2:detail:${slug}`,
    ALL: (page, limit) => `anime:server2:all:${page}:${limit}`,
    GENRES: () => `anime:server2:genres`,
    EPISODE: (slug, ep) => `anime:server2:episode:${slug}:${ep}`,
};

class OploverzService {
    async getOngoingAnime(page = 1, limit = 10) {
        const cacheKey = KEYS.ONGOING(page, limit);

        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            const { data, total } = await oploverzRepository.getOngoingAnime(page, limit);

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        });
    }

    async getCompletedAnime(page = 1, limit = 10) {
        const cacheKey = KEYS.COMPLETED(page, limit);

        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            const { data, total } = await oploverzRepository.getCompletedAnime(page, limit);

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        });
    }

    async getMovieAnime(page = 1, limit = 10) {
        const cacheKey = KEYS.MOVIES(page, limit);

        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            const { data, total } = await oploverzRepository.getMovieAnime(page, limit);

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        });
    }

    async searchAnime(filters) {
        const { q = '', status, type, page = 1, limit = 10 } = filters;

        const cacheKey = KEYS.SEARCH(q, page, limit, status, type);

        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            const { data, total } = await oploverzRepository.searchAnime({
                q,
                status,
                type,
                page,
                limit,
            });

            return {
                data,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            };
        });
    }

    async getAnimeDetail(slug) {
        const cacheKey = KEYS.DETAIL(slug);

        return cacheHandler.remember(cacheKey, TTL.LONG, async () => {
            // 1. Ambil data dari Database
            const anime = await oploverzRepository.getAnimeBySlug(slug);

            // 2. Jika tidak ditemukan di DB, kembalikan null
            if (!anime) {
                // Opsional: Logger info jika data tidak ketemu
                // logger.warn(`Anime not found in DB: ${slug}`);
                return null;
            }

            // 3. Format dan kembalikan data
            return this._formatDetailResponse(anime);
        });
    }

    _formatDetailResponse(anime) {
        if (!anime) return null;
        return {
            title: anime.title,
            slug: anime.slug,
            altTitle: anime.altTitle,
            posterUrl: anime.posterUrl,
            synopsis: anime.synopsis,
            status: anime.status,
            season: anime.season,
            type: anime.type,
            duration: anime.duration,
            rating: anime.rating,
            score: anime.score,
            studio: anime.studio,
            totalEpisodes: anime.totalEpisodes,
            genres: anime.animeServerGenres ? anime.animeServerGenres.map((g) => g.serverGenre) : [],
            episodes: anime.episodes.map((ep) => ({
                episodeNumber: ep.episodeNumber,
                title: ep.title,
                sourceUrl: ep.sourceUrl,
                streams: ep.streams.map((s) => ({
                    host: s.host,
                    quality: s.quality,
                    url: s.url,
                })),
                downloads: ep.downloads.map((d) => ({
                    format: d.format,
                    resolutions: d.resolutions,
                    host: d.host,
                    url: d.url,
                })),
            })),
        };
    }

    async getAllAnime(page = 1, limit = 10) {
        const cacheKey = KEYS.ALL(page, limit);

        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            const { data, total } = await oploverzRepository.getAllAnime(page, limit);

            return {
                data,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            };
        });
    }

    async getGenres() {
        const cacheKey = KEYS.GENRES();

        return cacheHandler.remember(cacheKey, TTL.LONG, async () => {
            return await oploverzRepository.getGenres();
        });
    }

    
}

module.exports = new OploverzService();
