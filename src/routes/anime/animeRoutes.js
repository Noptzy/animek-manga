const oploverzRoute = require('./oploverz/route');
const express = require('express');
const router = express.Router();

router.use('/2', oploverzRoute);

module.exports = router;
