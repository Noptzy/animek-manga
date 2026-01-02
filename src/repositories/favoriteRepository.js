const prisma = require('../config/prisma');
const logger = require('../utils/logger');

class FavoriteRepository {
    async checkFavorite(userId, type, itemId) {
        const where = { userId };
        if (type === 'anime') where.animeId = itemId;
        else if (type === 'manga') where.mangaId = itemId;

        return await prisma.favorite.findFirst({ where });
    }

    async addFavorite(userId, type, itemId) {
        const data = { userId };
        if (type === 'anime') data.animeId = itemId;
        else if (type === 'manga') data.mangaId = itemId;

        return await prisma.favorite.create({ data });
    }

    async removeFavorite(id) {
        return await prisma.favorite.delete({ where: { id } });
    }

    async getFavorites(userId, type, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const where = { userId };

        // Ensure we only fetch specific type if requested, otherwise fetch all
        if (type === 'anime') where.animeId = { not: null };
        else if (type === 'manga') where.mangaId = { not: null };

        const [data, total] = await Promise.all([
            prisma.favorite.findMany({
                where,
                include: {
                    anime: type === 'anime' || !type ? { select: { id: true, title: true, slug: true, posterUrl: true, type: true, rating: true, status: true } } : false,
                    manga: type === 'manga' || !type ? { select: { id: true, title: true, slug: true, posterUrl: true, status: true } } : false,
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.favorite.count({ where }),
        ]);

        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async countUserFavorites(userId) {
        return await prisma.favorite.count({ where: { userId } });
    }

    // Admin: Get Popular Items (Anime/Manga) based on favorite count
    async getMostFavorited(type = 'anime', limit = 10) {
        const groupByField = type === 'anime' ? 'animeId' : 'mangaId';
        
        // Group by animeId/mangaId and count
        const result = await prisma.favorite.groupBy({
            by: [groupByField],
            _count: {
                [groupByField]: true,
            },
            orderBy: {
                _count: {
                    [groupByField]: 'desc',
                },
            },
            where: {
                [groupByField]: { not: null }
            },
            take: limit,
        });

        // Populate details
        const ids = result.map(r => r[groupByField]);
        let details = [];
        
        if (type === 'anime') {
            details = await prisma.anime.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, slug: true, posterUrl: true } });
        } else {
            details = await prisma.manga.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, slug: true, posterUrl: true } });
        }

        // Merge count with details
        return result.map(r => {
            const item = details.find(d => d.id === r[groupByField]);
            return {
                ...item,
                favoriteCount: r._count[groupByField]
            };
        });
    }
}

module.exports = new FavoriteRepository();
