const redis = require('../config/RedisUpstash');
const resHandler = require('../utils/resHandler');
const { verifyToken } = require('../utils/jwt');
const userRepository = require('../repositories/userRepository');

module.exports = async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json(resHandler.error('Unauthorized').toJSON());
    }
    const token = parts[1];
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json(resHandler.error('Unauthorized').toJSON());
    }

    // STATEFUL CHECK: Verify if this Access Token is the one stored in Redis
    const storedAccessToken = await redis.get(`access_token:${decoded.id}`);
    
    if (!storedAccessToken || storedAccessToken !== token) {
        // This means either:
        // 1. Session expired
        // 2. Token rotated (fresh login/refresh occurred elsewhere) -> OLD TOKEN INVALIDATED
        // 3. User logged out
        return res.status(401).json(resHandler.error('Session Expired or Revoked. Please Login Again.').toJSON());
    }

    const user = await userRepository.profile(decoded.id);
    const lastLogoutAt = user && user.metadata && user.metadata.lastLogoutAt;
    if (lastLogoutAt) {
      const tokenIatMs = (decoded.iat || 0) * 1000;
      const lastLogoutMs = Date.parse(lastLogoutAt);
      if (!isNaN(lastLogoutMs) && tokenIatMs < lastLogoutMs) {
        return res.status(401).json(resHandler.error('Token expired by logout').toJSON());
      }
    }

    if (user && user.isActive === false) {
      return res.status(403).json(resHandler.error('Your Account Is Not Active Anymore').toJSON());
    }

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json(resHandler.error('Unauthorized').toJSON());
  }
}
