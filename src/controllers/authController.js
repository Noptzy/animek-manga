const authService = require('../services/authService');
const resHandler = require('../utils/resHandler');
const logger = require('../utils/logger');

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        const result = await authService.register({ name, email, password });
        return res
            .status(201)
            .json(
                resHandler
                    .success('Register success, please login', {
                        id: result.user.id,
                        name: result.user.name,
                        email: result.user.email,
                    })
                    .toJSON(),
            );
    } catch (error) {
        if (error.code === 'EMAIL_IN_USE') {
            return res.status(400).json(resHandler.error('Email already in use').toJSON());
        }
        logger.error('Register failed', error, { route: '/auth/register' });
        return res.status(500).json(resHandler.error('error', null).toJSON());
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const result = await authService.login({ email, password });
        return res
            .status(200)
            .json(resHandler.success('Login successful', { accessToken: result.accessToken }).toJSON());
    } catch (error) {
        if (error.code === 'INVALID_CREDENTIALS') {
            return res.status(401).json(resHandler.error('Invalid credentials').toJSON());
        }
        logger.error('Login failed', error, { route: '/auth/login' });
        return res.status(500).json(resHandler.error('error', null).toJSON());
    }
};

exports.logout = async (req, res) => {
    try {
        const userId = (req.user && req.user.id) || (req.body && req.body.userId);
        const result = await authService.logout(userId);
        return res.status(200).json(resHandler.success('Logged out', result).toJSON());
    } catch (error) {
        logger.error('Logout failed', error, { route: '/auth/logout' });
        return res.status(500).json(resHandler.error('error', null).toJSON());
    }
};
