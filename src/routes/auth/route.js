const route = require('express').Router();
const authController = require('../../controllers/authController');
const auth = require('../../middlewares/auth');

route.post('/register', authController.register);
route.post('/login', authController.login);
route.post('/logout', auth, authController.logout);

module.exports = route;
