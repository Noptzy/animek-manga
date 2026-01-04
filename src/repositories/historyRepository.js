const prisma = require('../config/prisma');
const logger = require('../utils/logger');

class HistoryRepository {
    // Upsert history: usage is to track "Last Watched"
    async upsertHistory(userId, data) {
        const { animeId, episodeId, mangaId, chapterId, progress = 0, totalDuration = 0 } = data;
        
        let whereClause = {};
        if (episodeId) whereClause = { userId_episodeId: { userId, episodeId } };
        else if (chapterId) whereClause = { userId_chapterId: { userId, chapterId } };
        else throw new Error("EpisodeID or ChapterID required");

        return await prisma.userHistory.upsert({
            where: whereClause,
            update: {
                watchedAt: new Date(),
                progress: progress || undefined, // Only update if provided
                totalDuration: totalDuration || undefined
            },
            create: {
                userId,
                animeId,
                episodeId,
                mangaId,
                chapterId,
                watchedAt: new Date(),
                progress: progress || 0,
                totalDuration: totalDuration || 0
            },
        });
    }

    async getUserHistory(userId, type, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = { userId };
        
        if (type === 'anime') where.animeId = { not: null };
        else if (type === 'manga') where.mangaId = { not: null };

        // Determine distinct fields to group by series
        let distinct = [];
        if (type === 'anime') distinct = ['animeId'];
        else if (type === 'manga') distinct = ['mangaId'];
        else distinct = ['animeId', 'mangaId'];

        // We need to fetch total unique items for correct pagination
        const countDistinctNode = type === 'anime' ? ['animeId'] : type === 'manga' ? ['mangaId'] : ['animeId', 'mangaId'];

        // Note: Prisma count with distinct returns the count of unique combinations
        const [data, total] = await Promise.all([
            prisma.userHistory.findMany({
                where,
                include: {
                    anime: type === 'anime' || !type ? { select: { id: true, title: true, slug: true, posterUrl: true } } : false,
                    episode: type === 'anime' || !type ? { select: { id: true, episodeNumber: true, title: true } } : false,
                    manga: type === 'manga' || !type ? { select: { id: true, title: true, slug: true, posterUrl: true } } : false,
                    chapter: type === 'manga' || !type ? { select: { id: true, chapterIndex: true, title: true, url: true } } : false,
                },
                distinct: distinct, 
                skip,
                take: limit,
                orderBy: { watchedAt: 'desc' },
            }),
            prisma.userHistory.findMany({
                where,
                distinct: distinct,
                select: { id: true } // Minimal select just to count
            }).then(res => res.length)
        ]);

        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }


    // Stats: Count Episodes Watched
    async countEpisodesWatched(userId) {
        return await prisma.userHistory.count({
            where: { userId, episodeId: { not: null } }
        });
    }

    // Stats: Count Chapters Read
    async countChaptersRead(userId) {
        return await prisma.userHistory.count({
            where: { userId, chapterId: { not: null } }
        });
    }

    // Stats: Sum Watch Time (Seconds)
    async getTotalWatchTime(userId) {
        const result = await prisma.userHistory.aggregate({
            _sum: {
                progress: true,
            },
            where: { 
                userId, 
                animeId: { not: null } // Only sum progress for anime
            }
        });
        return result._sum.progress || 0;
    }

    // Admin: Get Most Watched Anime / Read Manga
    async getMostViewed(type = 'anime', limit = 10) {
        const groupByField = type === 'anime' ? 'animeId' : 'mangaId';

        const result = await prisma.userHistory.groupBy({
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
                 viewCount: r._count[groupByField]
             };
         });
    }
}

module.exports = new HistoryRepository();
