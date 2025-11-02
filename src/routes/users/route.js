const route = require('express').Router();
const multer = require('multer');
const userController = require('../../controllers/user/userController.js');
const photoController = require('../../controllers/modules/photoController.js');
const auth = require('../../middlewares/auth');
const { requireAdmin, requireMember, requireSelf } = require('../../middlewares/roles');

const upload = multer({ storage: multer.memoryStorage() });

route.get('/', auth, requireMember, userController.getUsers);
route.get('/profile', auth, requireSelf, userController.getProfile);
route.get('/:id', auth, requireMember, userController.getUser);
route.post('/', auth, requireAdmin, userController.storeUser);
route.put('/profile', auth, requireSelf, upload.single('photoUrl'), userController.updateProfile);
route.put('/:id', auth, requireAdmin, upload.single('photoUrl'), userController.updateUser);
route.delete('/profile', auth, requireSelf, userController.deleteProfile);
route.delete('/:id', auth, requireAdmin, userController.deleteUser);

module.exports = route;