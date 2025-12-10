const KuramanimeRepository = require('../repositories/kuramanimeRepository');
const logger = require('../utils/logger');

// In the future, you can add other repositories here
// const OtherServerRepository = require('../repositories/otherServerRepository');

class KuramanimeService {
    getRepo(serverId) {
        // The serverId from the URL will be a string, so parse it
        const id = parseInt(serverId);

        // Simple mapping for now. Can be extended with a more dynamic system.
        if (id === 1) {
            return KuramanimeRepository;
        }
        
        // Add other repositories here as you support more servers
        // if (id === 2) {
        //     return OtherServerRepository;
        // }

        logger.error(`[ANIME-SERVICE] No repository found for serverId: ${serverId}`);
        throw new Error(`Unsupported server ID: ${serverId}`);
    }

    async getAnimes(serverId, filters) {
        const repo = this.getRepo(serverId);
        // The repository is already hardcoded to its specific server_id,
        // so we don't need to pass it down.
        return repo.getAnimes(filters);
    }

    async getAnimeBySlug(serverId, slug) {
        const repo = this.getRepo(serverId);
        return repo.getAnimeBySlug(slug);
    }

    async getAnimeEpisodeStream(serverId, slug, episodeNumber) {
        const repo = this.getRepo(serverId);
        return repo.getAnimeEpisodeStream(slug, episodeNumber);
    }
}

module.exports = new KuramanimeService();
