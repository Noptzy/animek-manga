const express = require('express');
const router = express.Router();
const komikuIndoController = require('../../../controllers/manga/komikuIndoController');

router.get('/chapter/:chapterPath', komikuIndoController.getChapterImage);
router.get('/mangas/filter', komikuIndoController.getFilteredManga);
router.get('/mangas', komikuIndoController.getAllMangas);
router.get('/mangas/search', komikuIndoController.getMangaSearch);
router.get('/mangas/:slug', komikuIndoController.getMangaDetail);


module.exports = router;
