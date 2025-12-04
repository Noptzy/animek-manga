const express = require('express');
const router = express.Router();
const mangaRoute = require('./manga/route');
const userRoute = require('./users/route');
const authRoute = require('./auth/route');
const statsRoute = require('./stats/route');
const cronRoute = require('./cron/route');

router.use('/manga', mangaRoute);
router.use('/users', userRoute);
router.use('/auth', authRoute);
router.use('/stats',statsRoute);
router.use('/cron', cronRoute);

module.exports = router;
