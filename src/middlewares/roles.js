const resHandler = require('../utils/resHandler');
const userRepository = require('../repositories/userRepository');

const requireAuthUser = async (req) => {
  if (req.user && req.user.id) return req.user;
  throw new Error('UNAUTHORIZED');
};

exports.requireAdmin = async (req, res, next) => {
  try {
    const u = await requireAuthUser(req);
    const prof = await userRepository.profile(u.id);
    if (!prof || prof.roleId !== 2) {
      return res.status(403).json(resHandler.error('Forbidden').toJSON());
    }
    next();
  } catch (e) {
    return res.status(401).json(resHandler.error('Unauthorized').toJSON());
  }
};

exports.requireMember = async (req, res, next) => {
  try {
    const u = await requireAuthUser(req);
    const prof = await userRepository.profile(u.id);
    if (!prof || (prof.roleId !== 1 && prof.roleId !== 2)) {
      return res.status(403).json(resHandler.error('Forbidden').toJSON());
    }
    next();
  } catch (e) {
    return res.status(401).json(resHandler.error('Unauthorized').toJSON());
  }
};

exports.requireSelf = async (req, res, next) => {
  try {
    const u = await requireAuthUser(req);
    const targetId = req.params.id || u.id;
    if (u.id !== targetId) {
      return res.status(403).json(resHandler.error('Forbidden').toJSON());
    }
    next();
  } catch (e) {
    return res.status(401).json(resHandler.error('Unauthorized').toJSON());
  }
};
