const prisma = require('../config/prisma');

class StatsRepository {
    async getServer1Stats() {
        const [totalAnimes, totalEpisodes, episodesWithStreams] = await Promise.all([
            prisma.animeServer.count(),
            prisma.episode.count(),
            prisma.episodeStream.count(),
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
