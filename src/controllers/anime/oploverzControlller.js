const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');
const OploverzService = require('../../services/oploverzService');

exports.getAnimeOngoing = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const result = await OploverzService.getOngoingAnime(page, limit);

        return res.status(200).json(resHandler.success('Successfully get ongoing anime', result).toJSON());
    } catch (error) {
        logger.error(`[OPLOVERZ-CONTROLLER] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve ongoing anime').toJSON());
    }
};

exports.getAnimeCompleted = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const result = await OploverzService.getCompletedAnime(page, limit);

        return res.status(200).json(resHandler.success('Successfully get completed anime', result).toJSON());
    } catch (error) {
        logger.error(`[OPLOVERZ-COMPLETED] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve completed anime').toJSON());
    }
};

exports.getAnimeMovie = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const result = await OploverzService.getMovieAnime(page, limit);

        return res.status(200).json(resHandler.success('Successfully get movie anime', result).toJSON());
    } catch (error) {
        logger.error(`[OPLOVERZ-MOVIE] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve movie anime').toJSON());
    }
};

exports.searchAnime = async (req, res) => {
    try {
        const { q, status, type, page = 1, limit = 10 } = req.query;

        const result = await OploverzService.searchAnime({
            q,
            status,
            type,
            page,
            limit,
        });

        return res.status(200).json(resHandler.success('Successfully search anime', result).toJSON());
    } catch (error) {
        logger.error(`[OPLOVERZ-SEARCH] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to search anime').toJSON());
    }
};

exports.getAnimeBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const anime = await OploverzService.getAnimeDetail(slug);

        if (!anime) {
            return res.status(404).json(resHandler.error('Anime not found').toJSON());
        }

        return res.status(200).json(resHandler.success('Successfully get anime detail', anime).toJSON());
    } catch (error) {
        logger.error(`[OPLOVERZ-DETAIL] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve anime detail').toJSON());
    }
};

exports.getAllAnime = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const result = await OploverzService.getAllAnime(page, limit);

        return res.status(200).json(resHandler.success('Successfully get all anime', result).toJSON());
    } catch (error) {
        logger.error(`[OPLOVERZ-ALL] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve anime list').toJSON());
    }
};

exports.getGenres = async (req, res) => {
    try {
        const genres = await OploverzService.getGenres();

        return res.status(200).json(resHandler.success('Successfully get genres', genres).toJSON());
    } catch (error) {
        logger.error(`[OPLOVERZ-GENRES] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve genres').toJSON());
    }
};
