const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1d'; 
const REFRESH_EXPIRES_IN = '7d';

const generateToken = (payload, type = 'at') => {
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        throw new Error('JWT payload must be a plain object');
    }
    const payloadWithType = { ...payload, type: type === 'at' ? 'access' : 'refresh' };
    return jwt.sign(payloadWithType, JWT_SECRET, { expiresIn: type === 'at' ? JWT_EXPIRES_IN : REFRESH_EXPIRES_IN });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

const refreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
            return null; // Reject if not a refresh token
        }

        const { iat, exp, type, ...userData } = decoded;
        // Issue a new access token AND a new refresh token (Rotation)
        return {
            accessToken: generateToken(userData, 'at'),
            refreshToken: generateToken(userData, 'rt')
        };
    } catch (error) {
        return null;
    }
};

const decodedToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
};
const minimalPayload = (user) => {
    if (!user || typeof user !== 'object') return {};

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.roleId,
        isActive: user.isActive
    };
};

const signAccessToken = (user) => generateToken(minimalPayload(user), 'at');
const signRefreshToken = (user) => generateToken(minimalPayload(user), 'rt');

module.exports = {
    generateToken,
    refreshToken,
    verifyToken,
    minimalPayload,
    decodedToken,
    signAccessToken,
    signRefreshToken,
};
