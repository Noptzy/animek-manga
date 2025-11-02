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

    // Invalidate tokens issued before lastLogoutAt
    const user = await userRepository.profile(decoded.id);
    const lastLogoutAt = user && user.metadata && user.metadata.lastLogoutAt;
    if (lastLogoutAt) {
      const tokenIatMs = (decoded.iat || 0) * 1000;
      const lastLogoutMs = Date.parse(lastLogoutAt);
      if (!isNaN(lastLogoutMs) && tokenIatMs < lastLogoutMs) {
        return res.status(401).json(resHandler.error('Token expired by logout').toJSON());
      }
    }

    req.user = { id: decoded.id, name: decoded.name, email: decoded.email };
    next();
  } catch (e) {
    return res.status(401).json(resHandler.error('Unauthorized').toJSON());
  }
}
