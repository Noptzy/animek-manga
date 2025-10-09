const komikuScrap = require('../scrap/manga/komikuScrap');
const logger = require('../utils/logger');
const resHandler = require('../utils/resHandler');

exports.getChapterImage = async (req, res) => {
    const chapterPath = req.params.chapterPath;
    if (!chapterPath) {
        return res.status(400).json(resHandler.error('Validation Error', { message: 'Chapter path is required' }));
    }
    const fullPath = `${chapterPath}/`;
    try {
        const data = await komikuScrap.getKomikuChapterImages(fullPath);
        if (!data || data.images.length === 0) {
            return res.status(404).json({ message: 'Chapter images not found or failed to scrape.' });
        }
        return res.json(resHandler.success('Success Get Chapter Images', data).toJSON());
    } catch (error) {
        logger.error(`Error in getChapterImages controller for ${chapterPath}: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch chapter images.' });
    }
};