const express = require('express');
const router = express.Router();
const cronController = require('../../controllers/cron/cronController');

router.post('/run-scrape', cronController.runRecentMangaScrape);

module.exports = router;
