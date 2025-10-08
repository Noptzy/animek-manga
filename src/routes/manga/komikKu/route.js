const express = require('express');
const router = express.Router();
const mangaController = require('../../../controllers/mangaController');

router.get('/chapter/:chapterPath', mangaController.getChapterImage);

module.exports = router;
