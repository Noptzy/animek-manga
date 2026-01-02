const resHandler = require('../utils/resHandler');
const userRepository = require('../repositories/userRepository');

const requireAuthUser = async (req) => {
  if (req.user && req.user.id) return req.user;
  throw new Error('UNAUTHORIZED');
};

exports.requireAdmin = async (req, res, next) => {
  try {
    const u = await requireAuthUser(req);
    // Role ID 2 is Admin
    if (u.roleId !== 2) {
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
    // Role ID 1 is User/Member, 2 is Admin (Admins usually have access to Member routes too, but strictly enforcing role 1 here if that's the requirement. 
    // Usually Member routes are accessible by Admin too. But strict requires 1.)
    if (u.roleId !== 1 && u.roleId !== 2) {
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
