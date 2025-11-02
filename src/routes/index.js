const express = require('express');
const router = express.Router();
const mangaRoute = require('./manga/route');
const userRoute = require('./users/route');
const authRoute = require('./auth/route');

router.use('/manga', mangaRoute);
router.use('/users', userRoute);
router.use('/auth', authRoute);

module.exports = router;
