const cacheHandler = require('../cache/cacheHandler');
const statsRepository = require('../repositories/StatsRepository');
const { TTL } = require('../utils/cacheConstants');

class StatsService {
    async getServer1Stats() {
        const cache_key = 'stats:server1';
        return await cacheHandler.remember(cache_key, TTL.MEDIUM, async () => {
            return await statsRepository.getServer1Stats();
        });
    }

    async getMangaStats() {
        const cache_key = 'stats:manga';
        return await cacheHandler.remember(cache_key, TTL.MEDIUM, async () => {
            return await statsRepository.getMangaStats();
        });
    }

    async getAllStats() {
        const cache_key = 'stats:all';

        return await cacheHandler.remember(cache_key, TTL.MEDIUM, async () => {
            const allStats = await Promise.all([
                this.getServer1Stats(), 
                this.getMangaStats(),
            ]);

            return {
                server1: allStats[0],
                manga: allStats[1],
            };
        });
    }
}

module.exports = new StatsService();
