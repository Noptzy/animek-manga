const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN; // access token expiry
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';

const generateToken = (payload, type = 'at') => {
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        throw new Error('JWT payload must be a plain object');
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: type === 'at' ? JWT_EXPIRES_IN : REFRESH_EXPIRES_IN });
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
        const { iat, exp, ...userData } = decoded;
        return jwt.sign(userData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
        role_id: user.roleId
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
