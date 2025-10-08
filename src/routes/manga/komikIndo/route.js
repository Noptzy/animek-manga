const express = require('express');
const router = express.Router();
const komikuIndoController = require('../../../controllers/manga/komikuIndoController');

router.get('/chapter/:chapterPath', komikuIndoController.getChapterImage);

module.exports = router;
