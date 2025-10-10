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
            return res.status(404).json({ message: 'Chapter images not found or failed to scrape.' });
        }
        return res.json(resHandler.success('Success Get Chapter Images', data).toJSON());
    } catch (error) {
        logger.error(`Error in getChapterImages controller for ${chapterPath}: ${error.message}`);
        res.status(500).json({ status: 'error', message: 'Failed to fetch chapter images.' });
    }
};

exports.getAllMangas = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const data = await komikIndoScrap.getKomikIndoManga(page);

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

// TODO benerin pas manganya ga ditemukan jgn return success
exports.getMangaDetail = async (req, res) => {
    try {
        const slug = req.params.slug;
        if (!slug) {
            return res
                .status(400)
                .json(resHandler.error('Validation Error', { slug: 'Slug is Required' }, 400).toJSON());
        }
        const data = await komikIndoScrap.getKomikIndoDetail(slug);

        if (!data) {
            return res
                .status(404)
                .json(resHandler.error('Not Found', { slug: `Manga with slug ${slug} not found.` }, 404).toJSON());
        }

        return res.json(resHandler.success('Success get Manga', data).toJSON());
    } catch (error) {
        logger.error(`Error fetching manga detail ${error.message}`);
        res.json(resHandler.error('Internal Server Error').toJSON());
    }
};

// TODO benerin pas manganya ga ditemukan jgn return success
exports.getMangaSearch = async (req, res) => {
    try {
        const query = req.query.s;
        if (!query) {
            return res.status(400).json(resHandler.error('Query is required'));
        }
        const data = await komikIndoScrap.getKomikIndoSearch(query);
        return res.json(resHandler.success('Success Search Manga', data).toJSON());
    } catch (error) {
        logger.error(`Error fetching search manga  ${error.message}`);
        res.json(resHandler.error('Internal Server Error').toJSON());
    }
};

// TODO Benerin error yg ga jelas any, tbtb pas pake filter ga bisa tapi pas pake ga pke filter bisa
exports.getFilteredManga = async (req, res) => {
    const page = Number.parseInt(req.query.page) || 1;
    let filters = { ...req.query }; // Gunakan let
    delete filters.page;

    // --- SOLUSI: MEMAKSA FILTER MULTI-VALUE MENJADI ARRAY ---
    const arrayFilters = ['genre', 'demografis', 'konten', 'tema'];

    arrayFilters.forEach((key) => {
        // Periksa jika filter ada dan BUKAN array (berarti hanya 1 value, dikembalikan sebagai string oleh Express)
        if (filters[key] && !Array.isArray(filters[key])) {
            filters[key] = [filters[key]]; // Paksa menjadi array
        }
    });
    // --- END SOLUSI ---

    try {
        const data = await komikIndoScrap.getKomikindoMangaByFilter(page, filters);

        // Pengecekan data kosong yang benar (Anda menggunakan mangaList di scraper)
        if (!data || data.mangaList?.length === 0) {
            if (data?.error) {
                // Cek error dari scraper
                return res
                    .status(500)
                    .json(resHandler.error('Scraping Failed or Server Unreachable.', null, 500).toJSON());
            }
            return res
                .status(404)
                .json(resHandler.error('No manga found with the specified filters.', null, 404).toJSON());
        }

        // Jika data ditemukan
        return res.status(200).json({
            success: true,
            message: 'Success Get Filtered Manga',
            creator: 'Noptzy',
            data,
        });
    } catch (error) {
        logger.error(`Error fetching filtered mangas: ${error.message}`);
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};
