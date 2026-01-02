const route = require('express').Router();
const authController = require('../../controllers/auth/authController.js');
const auth = require('../../middlewares/auth');
const { LoginUserSchema, createUserSchema } = require('../../validators/users.js')
const validate = require('../../middlewares/validate.js')

route.post('/register', validate(createUserSchema), authController.register);
route.post('/login', validate(LoginUserSchema), authController.loginUser);
route.post('/refresh-token', authController.refreshToken);
route.post('/logout', auth, authController.logout);

module.exports = route;
