const komikuIndoScrap = require('../../scrap/manga/komikIndoScrap');
const logger = require('../../utils/logger');
const resHandler = require('../../utils/resHandler');

exports.getChapterImage = async (req, res) => {
    const chapterPath = req.params.chapterPath;
    if (!chapterPath) {
        return res.status(400).json(resHandler.error('Validation Error', { message: 'Chapter path is required' }));
    }
    const fullPath = `${chapterPath}/`;
    try {
        const data = await komikuIndoScrap.getKomikIndoChapterImages(fullPath);
        if (!data || data.images.length === 0) {
            return res.status(404).json({ message: 'Chapter images not found or failed to scrape.' });
        }
        return res.json(resHandler.success('Success Get Chapter Images', data).toJSON());
    } catch (error) {
        logger.error(`Error in getChapterImages controller for ${chapterPath}: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch chapter images.' });
    }
};

exports.getMangas = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const data = await komikuIndoScrap.getKomikIndoManga(page);

        return res.status(200).json({
            success: true,
            message: `Success Get Mangas at page ${page}`,
            creator: 'Noptzy',
            data,
        });
    } catch (error) {
        logger.error(`Error fetching mangas ${error.message}`);
        res.json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.getMangaDetail = async (req, res) => {
    try {
        const slug = req.params.slug;
        const data = await komikuIndoScrap.getKomikIndoDetail(slug);

        if (!slug) {
            return res.status(404).json(resHandler.error('Validation Error', { slug: 'Slug is Required' }));
        }

        return res.json(resHandler.success('Success get Manga', data).toJSON());
    } catch (error) {
        logger.error(`Error fetching manga detail ${error.message}`);
        res.json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.getMangaSearch = async (req, res) => {
    try {
        const query = req.query.s;
        if (!query) {
            return res.status(400).json(resHandler.error('Query is required'));
        }
        const data = await komikuIndoScrap.getKomikIndoSearch(query);
        return res.json(resHandler.success('Success Search Manga', data).toJSON());
    } catch (error) {
        logger.error(`Error fetching search manga  ${error.message}`);
        res.json(resHandler.error('Internal Server Error').toJSON());
    }
};
