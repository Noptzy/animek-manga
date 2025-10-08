const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimiter = require('./src/utils/rateLimter.js');
const logger = require('./src/config/logger.js');
const apiV1 = require('./src/routes/index.js');

const app = express();
const port = process.env.PORT ?? 3000;

const allowedOrigins = (process.env.CORS_ORIGINS ?? '*').trim();

const corsOptions = {
    origin: allowedOrigins,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);
app.use(morgan('dev'));
app.use('/api/v1', apiV1);

app.use((req, res) => {
    return res.status(404).json({ error: '404 not found' });
});

app.use('/hi', (req, res) => {
    return res.status(200).json({ message: "Animek Backend is Working!"})
})

app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});
