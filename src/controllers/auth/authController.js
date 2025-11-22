const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');
const bcrypt = require('bcryptjs');
const userService = require('../../services/userService');
const { signAccessToken, signRefreshToken } = require('../../utils/jwt');

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userService.findUser({ email });

        if (!user) {
            return res
                .status(400)
                .json(resHandler
                    .error('User Not Found', null)
                    .toJSON());
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if(!isMatch){
            return res
                    .status(400)
                    .json(resHandler
                        .error('Invalid Credentials', null)
                        .toJSON())
        }

        const accessToken = signAccessToken(user);

        return res
            .status(200)
            .json(resHandler
                .success('Login successful', {accessToken})
                .toJSON()
            );
    } catch (error) {
        logger.error('Login failed', error, { route: '/auth/login' });
        return res
            .status(500)
            .json(resHandler.error('error', null).toJSON());

    }
};


exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await userService.findUser({ email });

        if (existingUser) {
            return res
                .status(400)
                .json(resHandler
                    .error('Email already in use', { email: 'Email already registered' })
                    .toJSON());
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await userService.storeUser({
            name,
            email,
            password: hashedPassword,
        });

        return res
            .status(201)
            .json(resHandler
                .success('Register successful, Please Login', { newUser })
                .toJSON()
            );
    } catch (error) {
        logger.error('Register failed', error, { route: '/auth/register' });
        return res
            .status(500)
            .json(resHandler
                .error('error', null)
                .toJSON());
    }
};

exports.logout = async (req, res) => {
    try {
        return res
            .status(200)
            .json(resHandler
                .success('Logout successful', null)
                .toJSON()
            );
    } catch (error) {
        logger.error('Logout failed', error, { route: '/auth/logout' });
        return res
            .status(500)
            .json(resHandler
                .error('error', null)
                .toJSON());
    }
};
