const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');
const OploverzService = require('../../services/oploverzService');
const MangaService = require('../../services/mangaService');

// --- ANIME (Oploverz) --- 

exports.updateAnime = async (req, res) => {
    try {
        const { slug } = req.params;
        const data = req.body;

        if (!data.title) {
            return res.status(400).json(resHandler.error('Validation Error: title is required').toJSON());
        }

        const result = await OploverzService.updateAnimeManual(slug, data);

        return res.status(200).json(resHandler.success('Successfully updated anime', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-ANIME-UPDATE] ${error.message}`);
        if (error.message.includes('not found')) {
            return res.status(404).json(resHandler.error(error.message).toJSON());
        }
        return res.status(500).json(resHandler.error('Failed to update anime').toJSON());
    }
};


exports.createAnime = async (req, res) => {
    try {
        const data = req.body;
        if (!data.title) {
            return res.status(400).json(resHandler.error('Validation Error: title is required').toJSON());
        }
        if (!data.slug) {
            data.slug = data.title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
        }

        const result = await OploverzService.createAnimeManual(data);
        return res.status(201).json(resHandler.success('Successfully created anime', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-ANIME-CREATE] ${error.message}`);
        return res.status(500).json(resHandler.error(error.message).toJSON());
    }
};

exports.deleteEpisode = async (req, res) => {
    try {
        const { slug, episodeNumber } = req.params;
        const result = await OploverzService.deleteEpisode(slug, episodeNumber);
        return res.status(200).json(resHandler.success('Successfully deleted episode', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-EPISODE-DELETE] ${error.message}`);
        if (error.message.includes('not found')) {
            return res.status(404).json(resHandler.error(error.message).toJSON());
        }
        return res.status(500).json(resHandler.error('Failed to delete episode').toJSON());
    }
};

exports.upsertEpisode = async (req, res) => {
    try {
        const { slug } = req.params;
        const data = req.body; 

        if (!data.episodeNumber || !data.title) {
             return res.status(400).json(resHandler.error('Validation Error: episodeNumber and title are required').toJSON());
        }

        const result = await OploverzService.upsertEpisodeManual(slug, data);

        return res.status(200).json(resHandler.success('Successfully upserted episode', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-EPISODE-UPSERT] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to upsert episode').toJSON());
    }
};

// --- MANGA (KomikuIndo) ---

exports.updateManga = async (req, res) => {
    try {
        const { slug } = req.params;
        const data = req.body;

        if (!data.title) {
            return res.status(400).json(resHandler.error('Validation Error: title is required').toJSON());
        }

        const result = await MangaService.updateMangaManual(slug, data);

        return res.status(200).json(resHandler.success('Successfully updated manga', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-MANGA-UPDATE] ${error.message}`);
        if (error.message.includes('not found')) {
            return res.status(404).json(resHandler.error(error.message).toJSON());
        }
        return res.status(500).json(resHandler.error('Failed to update manga').toJSON());
    }
};


exports.createManga = async (req, res) => {
    try {
        const data = req.body;
        if (!data.title) {
            return res.status(400).json(resHandler.error('Validation Error: title is required').toJSON());
        }
        if (!data.slug) {
            data.slug = data.title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
        }
        const result = await MangaService.createMangaManual(data);
        return res.status(201).json(resHandler.success('Successfully created manga', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-MANGA-CREATE] ${error.message}`);
        return res.status(500).json(resHandler.error(error.message).toJSON());
    }
};

exports.deleteChapter = async (req, res) => {
    try {
        const { slug, chapterIndex } = req.params;
        const result = await MangaService.deleteChapter(slug, chapterIndex);
        return res.status(200).json(resHandler.success('Successfully deleted chapter', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-CHAPTER-DELETE] ${error.message}`);
        if (error.message.includes('not found')) {
            return res.status(404).json(resHandler.error(error.message).toJSON());
        }
        return res.status(500).json(resHandler.error('Failed to delete chapter').toJSON());
    }
};

exports.upsertChapter = async (req, res) => {
    try {
        const { slug } = req.params;
        const data = req.body;

        if (!data.chapterIndex || !data.title) {
             return res.status(400).json(resHandler.error('Validation Error: chapterIndex and title are required').toJSON());
        }

        const result = await MangaService.upsertChapterManual(slug, data);

        return res.status(200).json(resHandler.success('Successfully upserted chapter', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-CHAPTER-UPSERT] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to upsert chapter').toJSON());
    }
};

exports.deleteAnime = async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await OploverzService.deleteAnime(slug);
        return res.status(200).json(resHandler.success('Successfully deleted anime', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-ANIME-DELETE] ${error.message}`);
         if (error.message.includes('not found')) {
            return res.status(404).json(resHandler.error(error.message).toJSON());
        }
        return res.status(500).json(resHandler.error('Failed to delete anime').toJSON());
    }
};

exports.deleteManga = async (req, res) => {
    try {
        const { slug } = req.params;
        logger.info(`[CONTROLLER-DELETE] Request to delete manga with slug: '${slug}'`);
        const result = await MangaService.deleteManga(slug);
        return res.status(200).json(resHandler.success('Successfully deleted manga', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-MANGA-DELETE] ${error.message}`);
         if (error.message.includes('not found')) {
            return res.status(404).json(resHandler.error(error.message).toJSON());
        }
        return res.status(500).json(resHandler.error('Failed to delete manga').toJSON());
    }
};
