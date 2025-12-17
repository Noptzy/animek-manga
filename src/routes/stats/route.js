const express = require('express');
const router = express.Router();
const komikuIndoController = require('../../controllers/manga/komikuIndoController');
const statsController = require('../../controllers/stats/StatsController');

router.get('/server1-stats', statsController.getServer1Stats);
router.get('/manga-stats', statsController.getMangaStats);  

router.get('/count-all-mangas', komikuIndoController.getCountAllMangas);
router.get('/count-all-chapter-mangas', komikuIndoController.getCountAllChapterMangas);

router.get('/all-stats', statsController.getAllStats);

module.exports = router;
