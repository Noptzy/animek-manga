const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000000,
  message: 'Too many requests from this IP, please try again after a minute',
  standardHeaders: true, 
  legacyHeaders: false, 
});

module.exports = rateLimiter;
