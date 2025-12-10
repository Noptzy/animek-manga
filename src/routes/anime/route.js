const express = require('express');
const router = express.Router();
const AnimeController = require('../../controllers/anime/animeController');

// Route to get a list of animes with filters
// Example: GET /api/v1/1/anime?page=1&limit=20&status=ongoing
router.get('/', AnimeController.getAnimes);

// Route to get a single anime's details by its slug
// Example: GET /api/v1/1/anime/boku-no-hero-academia-final-season
router.get('/:slug', AnimeController.getAnimeBySlug);

// Route to get stream links for a specific episode
// Example: GET /api/v1/1/anime/boku-no-hero-academia-final-season/1
router.get('/:slug/:episode', AnimeController.getAnimeEpisodeStream);

module.exports = router;
