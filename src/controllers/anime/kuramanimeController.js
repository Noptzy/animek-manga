const KuramanimeService = require('../../services/kuramanimeService');
const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');
const kuramanimeDriveTokenService = require('../../services/kuramaDriveTokenService');

// exports.getAnimes = async (req, res) => {
//     try {
//         const { serverId } = req.params;
//         const filters = {
//             page: req.query.page,
//             limit: req.query.limit,
//             status: req.query.status,
//             genres: req.query.genres,
//             type: req.query.type,
//             rating: req.query.rating,
//         };
//         const result = await KuramanimeService.getAnimes(serverId, filters);
//         success(res, 200, 'Successfully retrieved animes.', result);
//     } catch (err) {
//         logger.error(`[ANIME-CONTROLLER] Error retrieving animes: ${err.message}`);
//         if (err.message.startsWith('Unsupported server ID')) {
//             return error(res, 400, err.message);
//         }
//         error(res, 500, 'Failed to retrieve animes.');
//     }
// };

// exports.getAnimeBySlug = async (req, res) => {
//     try {
//         const { serverId, slug } = req.params;
//         const anime = await KuramanimeService.getAnimeBySlug(serverId, slug);
//
//         if (!anime) {
//             return error(res, 404, 'Anime not found.');
//         }
//
//         success(res, 200, 'Successfully retrieved anime details.', anime);
//     } catch (err) {
//         logger.error(`[ANIME-CONTROLLER] Error retrieving anime by slug: ${err.message}`);
//         if (err.message.startsWith('Unsupported server ID')) {
//             return error(res, 400, err.message);
//         }
//         error(res, 500, 'Failed to retrieve anime details.');
//     }
// };

exports.getAnimeStats = async (req, res) => {
    try {
        const stats = await KuramanimeService.getAnimeStats();
        return res.status(200).json(resHandler.success('Successfully retrieved anime statistics.', stats).toJSON());
    } catch (error) {
        logger.error(`[ANIME-CONTROLLER] Error retrieving anime statistics: ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve anime statistics.').toJSON());
    }
};

exports.getOngoingAnime = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const { anime, total } = await KuramanimeService.getOngoingAnime(page, limit);

        const result = {
            anime,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };

        return res.status(200).json(resHandler.success('Successfully retrieved ongoing anime.', result).toJSON());
    } catch (err) {
        logger.error(`[ANIME-CONTROLLER] Error in getOngoingAnime: ${err.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve ongoing anime.').toJSON());
    }
};

exports.getFinishedAnime = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const { anime, total } = await KuramanimeService.getFinishedAnime(page, limit);

        const result = {
            anime,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };

        return res.status(200).json(resHandler.success('Successfully retrieved finished anime.', result).toJSON());
    } catch (err) {
        logger.error(`[ANIME-CONTROLLER] Error in getFinishedAnime: ${err.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve finished anime.').toJSON());
    }
};

exports.getMovieAnime = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        // FIXED: Panggil getMovieAnime untuk support pagination
        const { anime, total } = await KuramanimeService.getMovieAnime(page, limit);

        const result = {
            anime,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };

        return res.status(200).json(resHandler.success('Successfully retrieved movie anime.', result).toJSON());
    } catch (err) {
        logger.error(`[ANIME-CONTROLLER] Error in getMovieAnime: ${err.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve movie anime.').toJSON());
    }
};

exports.getAnimeBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const anime = await KuramanimeService.getAnimeBySlug(slug);

        if (!anime) {
            return res.status(404).json(resHandler.error('Anime not found.', null, 404).toJSON());
        }

        return res.status(200).json(resHandler.success('Successfully retrieved anime details.', anime).toJSON());
    } catch (err) {
        logger.error(`[ANIME-CONTROLLER] Error in getAnimeBySlug: ${err.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve anime details.').toJSON());
    }
};

exports.searchAnime = async (req, res) => {
    try {
        const filters = req.query;
        const { anime, total, page, limit } = await KuramanimeService.searchAnime(filters);

        const result = {
            anime,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };

        return res.status(200).json(resHandler.success('Successfully retrieved search results.', result).toJSON());
    } catch (err) {
        logger.error(`[ANIME-CONTROLLER] Error in searchAnime: ${err.message}`);
        return res.status(500).json(resHandler.error('Failed to search anime.').toJSON());
    }
};

exports.scrapeEpisodeStreams = async (req, res) => {
    try {
        const { episodeUrl } = req.body;
        if (!episodeUrl) {
            return res.status(400).json(resHandler.error('episodeUrl is required in the request body.').toJSON());
        }
        const result = await KuramanimeService.scrapeEpisodeStreams(episodeUrl);

        return res.status(200).json(resHandler.success('Successfully retrieved direct stream links.', result).toJSON());
    } catch (err) {
        logger.error(`[ANIME-CONTROLLER] Error in scrapeEpisodeStreams: ${err.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve streams. ' + err.message).toJSON());
    }
};

exports.getRandomAnime = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 15;

        const { anime, total } = await KuramanimeService.getRandomAnime(page, limit);

        if (!anime || anime.length === 0) {
            return res.status(404).json(resHandler.error('No random anime found.', null, 404).toJSON());
        }

        const result = {
            anime,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };

        return res.status(200).json(resHandler.success('Successfully retrieved a random anime.', result).toJSON());
    } catch (err) {
        logger.error(`[ANIME-CONTROLLER] Error in getRandomAnime: ${err.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve a random anime.').toJSON());
    }
};

exports.resolveDriveUrl = async (req, res) => {
    try {
        const { targetUrl } = req.body;

        if (!targetUrl || typeof targetUrl !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'targetUrl wajib diisi',
            });
        }

        const urlObj = new URL(targetUrl);
        const pid = urlObj.searchParams.get('pid');
        const sid = urlObj.searchParams.get('sid');

        if (!pid || !sid) {
            return res.status(400).json({
                success: false,
                message: 'PID atau SID tidak ditemukan',
            });
        }

        const { access_token, gid } = await kuramanimeDriveTokenService.getToken(pid, sid);

        const gDriveUrl = `https://www.googleapis.com/drive/v3/files/${gid}?alt=media`;

        return res.json({
            success: true,
            access_token,
            url: gDriveUrl,
        });
    } catch (err) {
        logger.error(`[DRIVE RESOLVE ERROR] ${err.message}`);
        return res.status(500).json({
            success: false,
            message: 'Gagal resolve drive url',
        });
    }
};
