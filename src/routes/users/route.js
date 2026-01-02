const route = require('express').Router();
const multer = require('multer');
const userController = require('../../controllers/user/userController.js');
const photoController = require('../../controllers/modules/photoController.js');
const interactionController = require('../../controllers/user/interactionController.js');
const notificationController = require('../../controllers/user/notificationController.js');
const auth = require('../../middlewares/auth');
const { requireAdmin, requireMember, requireSelf } = require('../../middlewares/roles');

const upload = multer({ storage: multer.memoryStorage() });

route.post('/favorites', auth, requireMember, interactionController.toggleFavorite);
route.delete('/favorites', auth, requireMember, interactionController.removeFavorite);
route.get('/favorites', auth, requireMember, interactionController.getFavorites);

route.post('/history', auth, requireMember, interactionController.addHistory);
route.get('/history', auth, requireMember, interactionController.getHistory);

// User Stats
route.get('/my-stats', auth, requireMember, interactionController.getUserStats);

// Notifications
route.get('/notifications', auth, requireMember, notificationController.getNotifications);
route.get('/notifications/unread-count', auth, requireMember, notificationController.getUnreadCount);
route.put('/notifications/read-all', auth, requireMember, notificationController.markAllRead);
route.put('/notifications/:id/read', auth, requireMember, notificationController.markRead);

route.get('/', auth, requireMember, userController.getUsers);
route.get('/profile', auth, requireSelf, userController.getProfile);
route.put('/profile', auth, requireSelf, userController.updateProfile);
route.delete('/profile', auth, requireSelf, userController.deleteProfile);

route.get('/:id', auth, requireMember, userController.getUser);
route.post('/', auth, requireAdmin, userController.storeUser);
route.put('/:id', auth, requireAdmin, userController.updateUser);
route.delete('/:id', auth, requireAdmin, userController.deleteUser);

module.exports = route;