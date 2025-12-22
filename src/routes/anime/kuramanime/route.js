const express = require('express');
const router = express.Router();
const kuramanimeController = require('../../../controllers/anime/kuramanimeController');

// Routes for Server 1 (Kuramanime)
router.get('/1/stats', kuramanimeController.getAnimeStats);
router.get('/1/search', kuramanimeController.searchAnime);
router.get('/1/ongoing', kuramanimeController.getOngoingAnime);
router.get('/1/finished', kuramanimeController.getFinishedAnime);
router.get('/1/movies', kuramanimeController.getMovieAnime);
router.get('/1/animes', kuramanimeController.getRandomAnime);
router.get('/1/:slug', kuramanimeController.getAnimeBySlug);
router.post('/1/scrape-episode', kuramanimeController.scrapeEpisodeStreams);
router.get('/1/animes', kuramanimeController.getRandomAnime);
router.post('/1/drive/resolve', kuramanimeController.resolveDriveUrl);

module.exports = router;
