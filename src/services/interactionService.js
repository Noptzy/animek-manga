const favoriteRepository = require('../repositories/favoriteRepository');
const historyRepository = require('../repositories/historyRepository');
const prisma = require('../config/prisma');
const cacheHandler = require('../cache/cacheHandler');
const { TTL } = require('../utils/cacheConstants'); 
const logger = require('../utils/logger'); 

class InteractionService {
    _getKeys(userId) {
        return {
            FAVORITES: (type, page, limit) => `user:${userId}:favorites:${type || 'all'}:${page}:${limit}`,
            HISTORY: (type, page, limit) => `user:${userId}:history:${type || 'all'}:${page}:${limit}`,
            STATS: () => `user:${userId}:stats`,
            FAVORITES_PATTERN: `user:${userId}:favorites:*`,
            HISTORY_PATTERN: `user:${userId}:history:*`,
        };
    }

    async toggleFavorite(userId, type, itemId) {
        if (!['anime', 'manga'].includes(type)) throw new Error("Invalid type (anime/manga)");

        const existing = await favoriteRepository.checkFavorite(userId, type, itemId);
        let result;
        if (existing) {
            await favoriteRepository.removeFavorite(existing.id);
            result = { status: 'removed', message: `${type} removed from favorites` };
        } else {
            await favoriteRepository.addFavorite(userId, type, itemId);
            result = { status: 'added', message: `${type} added to favorites` };
        }

        const keys = this._getKeys(userId);
        cacheHandler.deletePattern(keys.FAVORITES_PATTERN);
        cacheHandler.invalidate(keys.STATS());

        return result;
    }

    async removeFavorite(userId, type, itemId) {
        if (!['anime', 'manga'].includes(type)) throw new Error("Invalid type (anime/manga)");

        const existing = await favoriteRepository.checkFavorite(userId, type, itemId);
        if (existing) {
            await favoriteRepository.removeFavorite(existing.id);

            const keys = this._getKeys(userId);
            cacheHandler.deletePattern(keys.FAVORITES_PATTERN);
            cacheHandler.invalidate(keys.STATS());

            return { status: 'removed', message: `${type} removed from favorites` };
        }
        
        return { status: 'not_found', message: `${type} was not in favorites` };
    }

    async getFavorites(userId, type, page, limit) {
        const key = this._getKeys(userId).FAVORITES(type, page, limit);
        return await cacheHandler.remember(key, TTL.SHORT, async () => {
             return await favoriteRepository.getFavorites(userId, type, page, limit);
        });
    }

    async addHistory(userId, payload) {
        const { type, id, progress, totalDuration } = payload; // id is episodeId or chapterId
        
        logger.info(`[AddHistory] User: ${userId}, Payload:`, payload); // Debug Log

        let data = { progress, totalDuration };
        
        if (type === 'anime') {
            const episode = await prisma.episode.findUnique({ where: { id }, select: { animeId: true } });
            if (!episode) throw new Error("Episode not found");
            
            data.animeId = episode.animeId;
            data.episodeId = id;
        } else if (type === 'manga') {
            const chapter = await prisma.chapter.findUnique({ where: { id }, select: { mangaId: true } });
            if (!chapter) throw new Error("Chapter not found");

            data.mangaId = chapter.mangaId;
            data.chapterId = id;
        } else {
            throw new Error("Invalid type (anime/manga)");
        }

        const result = await historyRepository.upsertHistory(userId, data);
        
        const keys = this._getKeys(userId);
        cacheHandler.deletePattern(keys.HISTORY_PATTERN);
        cacheHandler.invalidate(keys.STATS());

        return result;
    }

    async getHistory(userId, type, page, limit) {
        const key = this._getKeys(userId).HISTORY(type, page, limit);
        return await cacheHandler.remember(key, TTL.SHORT, async () => {
            return await historyRepository.getUserHistory(userId, type, page, limit);
        });
    }

    async getUserStats(userId) {
        const key = this._getKeys(userId).STATS();
        
        return await cacheHandler.remember(key, TTL.SHORT, async () => {
            const [favCount, episodesWatched, chaptersRead, totalWatchSeconds] = await Promise.all([
                favoriteRepository.countUserFavorites(userId),
                historyRepository.countEpisodesWatched(userId),
                historyRepository.countChaptersRead(userId),
                historyRepository.getTotalWatchTime(userId)
            ]);
    
            return {
                totalFavorites: favCount,
                episodesWatched,
                chaptersRead,
                watchTime: totalWatchSeconds // Frontend can format this to HH:MM:SS or Hours
            };
        });
    }

    // --- Admin Stats ---

    async getPopularContent(type) {
        // type: 'anime' or 'manga' or undefined (all)
        
        if (type && type !== 'all') {
            const [mostFavorited, mostViewed] = await Promise.all([
                favoriteRepository.getMostFavorited(type, 10),
                historyRepository.getMostViewed(type, 10)
            ]);
            return { mostFavorited, mostViewed };
        }

        // Check All
        const [favAnime, favManga, viewAnime, viewManga] = await Promise.all([
            favoriteRepository.getMostFavorited('anime', 10),
            favoriteRepository.getMostFavorited('manga', 10),
            historyRepository.getMostViewed('anime', 10),
            historyRepository.getMostViewed('manga', 10)
        ]);

        // Merge Favorites (Mixed)
        const mostFavorited = [...favAnime.map(i => ({...i, type: 'anime'})), ...favManga.map(i => ({...i, type: 'manga'}))]
            .sort((a, b) => b.favoriteCount - a.favoriteCount)
            .slice(0, 10);

        // Separate Viewed (Anime) and Read (Manga)
        const mostViewed = viewAnime.map(i => ({...i, type: 'anime'}));
        const mostRead = viewManga.map(i => ({...i, type: 'manga', readCount: i.viewCount })); // Map viewCount to readCount for clarity

        return {
            mostFavorited,
            mostViewed,
            mostRead
        };
    }
}

module.exports = new InteractionService();
