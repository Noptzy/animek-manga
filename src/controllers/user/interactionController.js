const interactionService = require('../../services/interactionService');
const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');

exports.toggleFavorite = async (req, res) => {
    const userId = req.user.id;
    const { type, id } = req.body || {};

    if (!type || !id) {
        return res.status(400).json(resHandler.error('Type and ID required').toJSON());
    }

    try {
        const result = await interactionService.toggleFavorite(userId, type, id);
        return res.status(200).json(resHandler.success(result.message, result).toJSON());
    } catch (error) {
        logger.error('Toggle Favorite Error', error);
        return res.status(500).json(resHandler.error(error.message).toJSON());
    }
};

exports.removeFavorite = async (req, res) => {
    const userId = req.user.id;
    // Allow ID from query or body for flexibility, but usually DELETE uses query or param
    // But consistency with toggle (body), let's check both or decide.
    // REST standard: DELETE /favorites?type=anime&id=... or DELETE /favorites/:type/:id
    // Providing body in DELETE is often discouraged but works.
    // I'll support body (like toggle) for symmetry, or query. 
    // Let's use body for consistency with POST endpoint inputs.
    const { type, id } = req.body || {}; 

    if (!type || !id) {
        return res.status(400).json(resHandler.error('Type and ID required').toJSON());
    }

    try {
        const result = await interactionService.removeFavorite(userId, type, id);
        return res.status(200).json(resHandler.success(result.message, result).toJSON());
    } catch (error) {
        logger.error('Remove Favorite Error', error);
        return res.status(500).json(resHandler.error(error.message).toJSON());
    }
};

exports.getFavorites = async (req, res) => {
    const userId = req.user.id;
    const { type, page = 1, limit = 10 } = req.query;

    try {
        const result = await interactionService.getFavorites(userId, type, parseInt(page), parseInt(limit));
        return res.status(200).json(resHandler.success('Favorites retrieved', result).toJSON());
    } catch (error) {
        logger.error('Get Favorites Error', error);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.addHistory = async (req, res) => {
    const userId = req.user.id;
    const { type, id, progress, totalDuration } = req.body || {}; // id is episodeId or chapterId

    if (!type || !id) {
        return res.status(400).json(resHandler.error('Type and ID (Episode/Chapter UUID) required').toJSON());
    }

    try {
        await interactionService.addHistory(userId, { type, id, progress, totalDuration });
        return res.status(200).json(resHandler.success('History updated').toJSON());
    } catch (error) {
        logger.error('Add History Error', error);
        return res.status(500).json(resHandler.error(error.message).toJSON());
    }
};

exports.getHistory = async (req, res) => {
    const userId = req.user.id;
    const { type, page = 1, limit = 20 } = req.query;

    try {
        const result = await interactionService.getHistory(userId, type, parseInt(page), parseInt(limit));
        return res.status(200).json(resHandler.success('History retrieved', result).toJSON());
    } catch (error) {
        logger.error('Get History Error', error);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.getUserStats = async (req, res) => {
    const userId = req.user.id;
    try {
        const stats = await interactionService.getUserStats(userId);
        return res.status(200).json(resHandler.success('User stats retrieved', stats).toJSON());
    } catch (error) {
        logger.error('Get User Stats Error', error);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};

// Admin
exports.getAdminPopularStats = async (req, res) => {
    const { type } = req.query; // 'anime' or 'manga'
    try {
        const stats = await interactionService.getPopularContent(type);
        return res.status(200).json(resHandler.success('Popular content stats', stats).toJSON());
    } catch (error) {
        logger.error('Admin Popular Stats Error', error);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};
