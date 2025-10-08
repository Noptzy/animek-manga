const express = require('express');
const router = express.Router();
const komikIndoRoutes = require('../manga/komikIndo/route');

router.use('/komik-indo', komikIndoRoutes);

module.exports = router;
