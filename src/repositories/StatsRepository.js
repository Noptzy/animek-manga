const prisma = require('../config/prisma');

class StatsRepository {
    async getServer2Stats() {
        const SERVER_ID = 2; 
        const [totalAnimes, totalEpisodes, episodesWithStreams] = await Promise.all([
            prisma.anime.count({
                where: { animeSources: { some: { serverId: SERVER_ID } } }
            }),
            prisma.episode.count({
                where: { anime: { animeSources: { some: { serverId: SERVER_ID } } } }
            }),
            prisma.episodeStream.count({
                where: { serverId: SERVER_ID }
            }),
        ]);

        return {
            'total anime': totalAnimes,
            'total Episode': totalEpisodes,
            'total episode stream': episodesWithStreams,
        };
    }

    async getMangaStats(){
        const [totalMangas, totalChapters] = await Promise.all([
            prisma.manga.count(),
            prisma.chapter.count(),
        ]);

        return {
            'total manga': totalMangas,
            'total manga chapter': totalChapters,
        }
    }
}

module.exports = new StatsRepository();
