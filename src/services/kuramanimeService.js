const KuramanimeRepository = require('../repositories/kuramanimeRepository');
const KuramanimScrap = require('../scrap/anime/kuramanimScrap');
const logger = require('../utils/logger');
const cacheHandler = require('../cache/cacheHandler');
const { TTL } = require('../utils/cacheConstants');
const qs = require('qs');

const KEYS = {
    STATS: 'anime:server1:stats',
    ONGOING: (page, limit) => `anime:server1:ongoing:${page}:${limit}`,
    ONGOING_ALL: 'anime:server1:ongoing:all',
    FINISHED: (page, limit) => `anime:server1:finished:${page}:${limit}`,
    FINISHED_ALL: 'anime:server1:finished:all',
    MOVIES: (page, limit) => `anime:server1:movies:${page}:${limit}`,
    MOVIES_ALL: 'anime:server1:movies:all',
    DETAIL: (slug) => `anime:server1:detail:${slug}`,
    SEARCH: (query) => `anime:server1:search:${query}`,
    RANDOM_ANIME: (page, limit) => `anime:server1:random:${page}:${limit}`,
    STREAM_SOURCE: (url) => `anime:server1:stream_source:${Buffer.from(url).toString('base64')}`,
};

class KuramanimeService {
    async getAnimeStats() {
        return cacheHandler.remember(KEYS.STATS, TTL.SHORT, async () => {
            return KuramanimeRepository.countAll();
        });
    }

    async getOngoingAnime(page, limit) {
        const cacheKey = KEYS.ONGOING(page, limit);
        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            return KuramanimeRepository.getOngoingAnime(Number(page), Number(limit));
        });
    }

    async getAllOngoingAnime() {
        return cacheHandler.remember(KEYS.ONGOING_ALL, TTL.MEDIUM, async () => {
            return KuramanimeRepository.getAllOngoingAnime();
        });
    }

    async getFinishedAnime(page, limit) {
        const cacheKey = KEYS.FINISHED(page, limit);
        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            return KuramanimeRepository.getFinishedAnime(Number(page), Number(limit));
        });
    }

    async getAllFinishedAnime() {
        return cacheHandler.remember(KEYS.FINISHED_ALL, TTL.MEDIUM, async () => {
            return KuramanimeRepository.getAllFinishedAnime();
        });
    }

    async getMovieAnime(page, limit) {
        const cacheKey = KEYS.MOVIES(page, limit);
        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            return KuramanimeRepository.getMovieAnime(Number(page), Number(limit));
        });
    }

    async getAllMovieAnime() {
        return cacheHandler.remember(KEYS.MOVIES_ALL, TTL.MEDIUM, async () => {
            return KuramanimeRepository.getAllMovieAnime();
        });
    }

    async getAnimeBySlug(slug) {
        const cacheKey = KEYS.DETAIL(slug);
        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            const anime = await KuramanimeRepository.getAnimeBySlug(slug);
            if (anime && anime.genres) {
                anime.genres = anime.genres.map((g) => g.serverGenre);
            }
            return anime;
        });
    }

    async scrapeEpisodeStreams(episodeUrl) {
        return cacheHandler.remember(KEYS.STREAM_SOURCE(episodeUrl), TTL.MEDIUM, async () => {
            return KuramanimScrap.getStreamEpsKuramanime(episodeUrl);
        });
    }

    async searchAnime(filters) {
        const queryString = qs.stringify(filters);
        const cacheKey = KEYS.SEARCH(queryString);
        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            return KuramanimeRepository.searchAnime(filters);
        });
    }

    async getRandomAnime(page = 1, limit = 15) {
        const cacheKey = KEYS.RANDOM_ANIME(page, limit);
        return cacheHandler.remember(cacheKey, TTL.SHORT, async () => {
            const [ongoing, finished, movies] = await Promise.all([
                KuramanimeRepository.getOngoingAnime(1, 20),
                KuramanimeRepository.getFinishedAnime(1, 20),
                KuramanimeRepository.getMovieAnime(1, 20),
            ]);

            const combined = [...ongoing.anime, ...finished.anime, ...movies.anime];
            for (let i = combined.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [combined[i], combined[j]] = [combined[j], combined[i]];
            }

            const total = combined.length;
            const paginatedAnime = combined.slice((page - 1) * limit, page * limit);

            return { anime: paginatedAnime, total };
        });
    }
}

module.exports = new KuramanimeService();
