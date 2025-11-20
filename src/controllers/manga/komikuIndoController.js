const mangaService = require('../../services/mangaService');
const komikIndoScrap = require('../../scrap/manga/komikIndoScrap');
const logger = require('../../utils/logger');
const resHandler = require('../../utils/resHandler');

exports.getChapterImage = async (req, res) => {
    const chapterPath = req.params.chapterPath;
    if (!chapterPath) {
        return res.status(400).json(resHandler.error('Validation Error', { message: 'Chapter path is required' }));
    }
    const fullPath = `${chapterPath}`.endsWith('/') ? chapterPath : `${chapterPath}/`;
    try {
        const data = await komikIndoScrap.getKomikIndoChapterImages(fullPath);
        if (!data || !Array.isArray(data.images) || data.images.length === 0) {
            return res
                .status(404)
                .json(
                    resHandler
                        .error('Not Found', { message: 'Chapter images not found or failed to scrape.' }, 404)
                        .toJSON(),
                );
        }
        return res.json(resHandler.success('Success Get Chapter Images', data).toJSON());
    } catch (error) {
        logger.error(`Error in getChapterImages controller for ${chapterPath}: ${error.message}`);
        res.status(500).json(
            resHandler.error('Internal Server Error', { message: 'Failed to fetch chapter images.' }, 500).toJSON(),
        );
    }
};

exports.getAllMangas = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sort = req.query.sort;
        const order = req.query.order;

        const data = await mangaService.getAllMangas({ page, limit, sort, order });

        return res.status(200).json(resHandler.success('Success Get Mangas', data).toJSON());
    } catch (error) {
        logger.error(`Error fetching mangas: ${error.message}`);
        res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.getMangaDetail = async (req, res) => {
    try {
        const slug = req.params.slug;
        if (!slug) {
            return res
                .status(400)
                .json(resHandler.error('Validation Error', { slug: 'Slug is Required' }, 400).toJSON());
        }

        const chapterSort = (req.query.chapterSort || req.query.chapterOrder || 'asc').toLowerCase();
        const chapterOrder = chapterSort === 'desc' ? 'desc' : 'asc';

        const data = await mangaService.getMangaDetailBySlug(slug, { chapterOrder });

        if (!data) {
            return res
                .status(404)
                .json(resHandler.error('Not Found', { slug: `Manga with slug ${slug} not found.` }, 404).toJSON());
        }

        return res.json(resHandler.success('Success get Manga', data).toJSON());
    } catch (error) {
        logger.error(`Error fetching manga detail: ${error.message}`);
        res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.getMangaSearch = async (req, res) => {
    try {
        const query = req.query.s;
        if (!query) {
            return res
                .status(400)
                .json(resHandler.error('Validation Error', { s: 'Query parameter is required' }, 400).toJSON());
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const data = await mangaService.searchMangas({ query, page, limit });

        if (!data || data.mangas.length === 0) {
            return res
                .status(404)
                .json(resHandler.error('Not Found', { query: `No manga found for query '${query}'` }, 404).toJSON());
        }

        return res.json(resHandler.success('Success Search Manga', data).toJSON());
    } catch (error) {
        logger.error(`Error fetching search manga: ${error.message}`);
        res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.getFilteredManga = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        let filters = { ...req.query };
        delete filters.page;
        delete filters.limit;

        const arrayFilters = ['genre', 'demografis', 'konten', 'tema'];
        arrayFilters.forEach((key) => {
            if (filters[key] && !Array.isArray(filters[key])) {
                filters[key] = [filters[key]];
            }
        });

        const data = await mangaService.getFilteredMangas({ filters, page, limit });

        if (!data || data.mangas.length === 0) {
            return res
                .status(404)
                .json(
                    resHandler
                        .error('Not Found', { filters: 'No manga found with the specified filters.' }, 404)
                        .toJSON(),
                );
        }

        return res.json(resHandler.success('Success Get Filtered Manga', data).toJSON());
    } catch (error) {
        logger.error(`Error fetching filtered mangas: ${error.message}`);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};
