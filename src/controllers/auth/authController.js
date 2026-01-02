const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');
const bcrypt = require('bcryptjs');
const userService = require('../../services/userService');
const { signAccessToken, signRefreshToken } = require('../../utils/jwt');
const redis = require('../../config/RedisUpstash');

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

        if (user.isActive === false) {
             return res
                .status(403)
                .json(resHandler
                    .error('Your account has been banned.', null)
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
        const refreshToken = signRefreshToken(user);

        await redis.set(`refresh_token:${user.id}`, refreshToken, { ex: 7 * 24 * 60 * 60 });
        
        // NEW: Store accessToken in Redis for Stateful Single Session (1 day TTL)
        await redis.set(`access_token:${user.id}`, accessToken, { ex: 24 * 60 * 60 });

        return res
            .status(200)
            .json(resHandler
                .success('Login successful', { accessToken, refreshToken })
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

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json(resHandler.error('Refresh token is required').toJSON());
        }

        // Verify refresh token using utils/jwt.js
        // The jwt.js method 'refreshToken' actually takes a token, verifies it, and returns a NEW access token.
        // Let's check jwt.js implementation again.
        // It says: return jwt.sign(userData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        // So it correctly returns a new access token.
        
        // However, I need to require specific method from jwt.js inside this file if not already imported.
        // It's imported as { signAccessToken, signRefreshToken } currently. 
        // I need to import `refreshToken` function from jwt.js as well.
        
        // Wait, I should not modify imports in this specific tool call if I am appending content at the end.
        // But I need access to `refreshToken` utility.
        // I will assume I will fix imports in next step or use require.
        
        const jwtUtils = require('../../utils/jwt');
        
        // 1. Basic Verification & Type Check
        const decoded = jwtUtils.verifyToken(refreshToken);
        if (!decoded || decoded.type !== 'refresh') {
             return res.status(403).json(resHandler.error('Invalid or expired refresh token').toJSON());
        }

        // 2. Fetch Stored Token from Redis
        const storedRefreshToken = await redis.get(`refresh_token:${decoded.id}`);

        // 3. Strict Comparison
        if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
            // Potential Reuse Attempt or Expired in Redis
             logger.warning(`Refresh Token Reuse/Invalid Attempt for User ${decoded.id}`);
             return res.status(403).json(resHandler.error('Invalid or expired refresh token').toJSON());
        }

        // 4. Rotate Tokens
        const tokens = jwtUtils.refreshToken(refreshToken);
        if (!tokens) { 
            return res.status(403).json(resHandler.error('Error rotating token').toJSON());
        }

        // 5. Update Redis with NEW Refresh Token (Rotate) (7 Days)
        await redis.set(`refresh_token:${decoded.id}`, tokens.refreshToken, { ex: 7 * 24 * 60 * 60 });
        
        // NEW: Overwrite Redis with NEW Access Token (1 Day)
        // This invalidates the old access token immediately because middleware checks this key.
        await redis.set(`access_token:${decoded.id}`, tokens.accessToken, { ex: 24 * 60 * 60 });

        return res.status(200).json(resHandler.success('Token refreshed', tokens).toJSON());

    } catch (error) {
        logger.error('Refresh token failed', error, { route: '/auth/refresh-token' });
        return res.status(500).json(resHandler.error('Internal Server Error').toJSON());
    }
};
