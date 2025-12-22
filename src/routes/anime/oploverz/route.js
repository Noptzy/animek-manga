const express = require('express');
const router = express.Router();
const oploverzController = require('../../../controllers/anime/oploverzControlller');

router.get('/', oploverzController.getAllAnime);
router.get('/genres', oploverzController.getGenres);
router.get('/ongoing', oploverzController.getAnimeOngoing);
router.get('/completed', oploverzController.getAnimeCompleted);
router.get('/movie', oploverzController.getAnimeMovie);
router.get('/search', oploverzController.searchAnime);
router.get('/:slug', oploverzController.getAnimeBySlug);

module.exports = router;
