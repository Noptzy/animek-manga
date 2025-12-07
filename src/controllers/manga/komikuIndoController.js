const { waitUntil } = require('@vercel/functions');
const mangaRepository = require('../../repositories/mangaRepository');
const mangaService = require('../../services/mangaService');
const logger = require('../../utils/logger');
const resHandler = require('../../utils/resHandler');

exports.getMangaDetailBySlugSWR = async (req, res) => {
    const { slug } = req.params;
    const ONE_HOUR_IN_MS = 3600 * 1000;

    try {
        const manga = await mangaRepository.findMangaBySlug(slug, { chapterOrder: 'asc' });

        if (manga) {
            const isStale = new Date() - new Date(manga.updatedAt) > ONE_HOUR_IN_MS;
            if (isStale) {
                waitUntil(mangaService.scrapeAndCheckForUpdate(slug));
            }
            return res.json(resHandler.success('Success get Manga', manga).toJSON());
        } else {
            // If manga doesn't exist, scrape, wait, and then return
            await mangaService.scrapeAndCheckForUpdate(slug);
            const freshManga = await mangaRepository.findMangaBySlug(slug, { chapterOrder: 'asc' });
            if (freshManga) {
                return res.status(201).json(resHandler.success('Successfully scraped and created manga', freshManga).toJSON());
            } else {
                return res.status(404).json(resHandler.error('Not Found', { message: `Manga with slug '${slug}' not found after scraping.` }).toJSON());
            }
        }
    } catch (error) {
        logger.error(`Error in getMangaDetailBySlugSWR for slug ${slug}: ${error.message}`);
        res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.getChapterImage = async (req, res) => {
    const chapterPath = req.params.chapterPath;
    if (!chapterPath) {
        return res.status(400).json(resHandler.error('Validation Error', { message: 'Chapter path is required' }));
    }
    const fullPath = `${chapterPath}`.endsWith('/') ? chapterPath : `${chapterPath}/`;
    try {
        const data = await mangaService.getChapterImages(fullPath);
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
        const { q, genre, status, author } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const searchParams = { q, genre, status, author, page, limit };
        
        if (!q && !genre && !status && !author) {
            return res.status(400).json(
                resHandler.error('Validation Error', { message: "At least one query parameter (q, genre, status, author) is required." }).toJSON()
            );
        }
        
        const data = await mangaService.searchMangas(searchParams);

        if (!data || data.mangas.length === 0) {
            return res.status(404).json(
                resHandler.error('Not Found', { message: `No manga found for the given criteria.` }, 404).toJSON()
            );
        }

        return res.json(resHandler.success('Success Search Manga', data).toJSON());

    } catch (error) {
        logger.error(`Error fetching search manga: ${error.message}`);
        return res.status(500).json(
            resHandler.error('Internal Server Error', { message: error.message }, 500).toJSON()
        );
    }
};

exports.getCountAllMangas = async (req, res) => {
    try {
        const data = await mangaService.getCountAllMangas();
        return res.json(resHandler.success('Success Get Count All Mangas', {countAllMangas: data}).toJSON());
    } catch (error) {
        logger.error(`Error fetching count all mangas: ${error.message}`);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.getCountAllChapterMangas = async (req, res) => {
    try {
        const data = await mangaService.getCountAllChapterMangas();
        return res.json(resHandler.success('Success Get Count All Chapter Mangas', {countAllChapterMangas: data}).toJSON());
    } catch (error) {
        logger.error(`Error fetching count all chapter mangas: ${error.message}`);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};

exports.getGenres = async (req, res) => {
    try {
        const data = await mangaService.getGenres();
        return res.json(resHandler.success('Success Get Genres', data).toJSON());
    } catch (error) {
        logger.error(`Error fetching genres: ${error.message}`);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};