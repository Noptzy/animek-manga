const KuramanimeService = require('../../services/kuramanimeService');
const { success, error } = require('../../utils/resHandler');
const logger = require('../../utils/logger');

class AnimeController {
    async getAnimes(req, res) {
        try {
            const { serverId } = req.params;
            const filters = {
                page: req.query.page,
                limit: req.query.limit,
                status: req.query.status,
                genres: req.query.genres,
                type: req.query.type,
                rating: req.query.rating,
            };
            const result = await KuramanimeService.getAnimes(serverId, filters);
            success(res, 200, 'Successfully retrieved animes.', result);
        } catch (err) {
            logger.error(`[ANIME-CONTROLLER] Error retrieving animes: ${err.message}`);
            // Check for specific service error
            if (err.message.startsWith('Unsupported server ID')) {
                return error(res, 400, err.message);
            }
            error(res, 500, 'Failed to retrieve animes.');
        }
    }

    async getAnimeBySlug(req, res) {
        try {
            const { serverId, slug } = req.params;
            const anime = await KuramanimeService.getAnimeBySlug(serverId, slug);

            if (!anime) {
                return error(res, 404, 'Anime not found.');
            }

            success(res, 200, 'Successfully retrieved anime details.', anime);
        } catch (err) {
            logger.error(`[ANIME-CONTROLLER] Error retrieving anime by slug: ${err.message}`);
            if (err.message.startsWith('Unsupported server ID')) {
                return error(res, 400, err.message);
            }
            error(res, 500, 'Failed to retrieve anime details.');
        }
    }

    async getAnimeEpisodeStream(req, res) {
        try {
            const { serverId, slug, episode } = req.params;
            const episodeData = await KuramanimeService.getAnimeEpisodeStream(serverId, slug, episode);

            if (!episodeData || episodeData.streams.length === 0) {
                return error(res, 404, 'Episode or stream not found.');
            }

            success(res, 200, 'Successfully retrieved episode streams.', episodeData.streams);
        } catch (err) {
            logger.error(`[ANIME-CONTROLLER] Error retrieving episode stream: ${err.message}`);
            if (err.message.startsWith('Unsupported server ID')) {
                return error(res, 400, err.message);
            }
            error(res, 500, 'Failed to retrieve episode stream.');
        }
    }
}

module.exports = new AnimeController();