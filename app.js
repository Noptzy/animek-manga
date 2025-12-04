require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimiter = require('./src/utils/rateLimter.js');
const logger = require('./src/config/logger.js');
const apiV1 = require('./src/routes/index.js');
const path = require('path');
const recentMangaWorker = require('./src/workers/recentMangaWorker.js');
const cleanupWorker = require('./src/workers/cleanupWorker.js');

const app = express();
const port = process.env.PORT ?? 3000;

const allowedOrigins = (process.env.CORS_ORIGINS ?? '*').trim();

const corsOptions = {
    origin: allowedOrigins,
};

app.set('trust proxy', 1);
app.use(express.json());
app.disable('etag');
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);
app.use(morgan('dev'));

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/photoProfile', express.static(path.join(__dirname, 'public', 'photoProfile')));

app.use('/docs', (req, res) => {
    res.redirect('https://nopsy.gitbook.io/animek/');
});

app.use('/api/v1', apiV1);

app.use((req, res) => {
    return res.status(404).json({ error: '404 not found', message: 'you can see docs at /docs' });
});

module.exports = app;
