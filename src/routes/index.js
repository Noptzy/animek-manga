const express = require('express');
const router = express.Router();
const mangaRoute = require('./manga/route');

router.use('/manga', mangaRoute);

module.exports = router;
