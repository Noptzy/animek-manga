const cacheHandler = require('../cache/cacheHandler');
const statsRepository = require('../repositories/StatsRepository');
const { TTL } = require('../utils/cacheConstants');

class StatsService {
    async getServer2Stats() {
        const cache_key = 'stats:server2';
        return await cacheHandler.remember(cache_key, TTL.VERY_LONG, async () => {
            return await statsRepository.getServer2Stats();
        });
    }

    async getMangaStats() {
        const cache_key = 'stats:manga';
        return await cacheHandler.remember(cache_key, TTL.VERY_LONG, async () => {
            return await statsRepository.getMangaStats();
        });
    }

    async getAllStats() {
        const cache_key = 'stats:all';

        return await cacheHandler.remember(cache_key, TTL.VERY_LONG, async () => {
            const allStats = await Promise.all([
                this.getServer2Stats(), 
                this.getMangaStats(),
            ]);

            return {
                server2: allStats[0],
                manga: allStats[1],
            };
        });
    }
}

module.exports = new StatsService();
