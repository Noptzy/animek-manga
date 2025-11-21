const express = require('express');
const router = express.Router();
const komikuIndoController = require('../../controllers/manga/komikuIndoController');

router.get('/count-all-mangas', komikuIndoController.getCountAllMangas);
router.get('/count-all-chapter-mangas', komikuIndoController.getCountAllChapterMangas);

module.exports = router;
