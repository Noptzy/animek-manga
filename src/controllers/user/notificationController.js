const notificationService = require('../../services/notificationService');
const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await notificationService.getUserNotifications(userId, page, limit);

        return res.status(200).json(resHandler.success('Successfully retrieved notifications', result).toJSON());
    } catch (error) {
        logger.error(`[NOTIFICATION-GET] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve notifications').toJSON());
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await notificationService.getUnreadCount(userId);
        return res.status(200).json(resHandler.success('Successfully retrieved unread count', { unreadCount: count }).toJSON());
    } catch (error) {
        logger.error(`[NOTIFICATION-COUNT] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve unread count').toJSON());
    }
};

exports.markRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await notificationService.markAsRead(userId, id);

        if (!result) {
            return res.status(404).json(resHandler.error('Notification not found or not owned by user').toJSON());
        }

        return res.status(200).json(resHandler.success('Notification marked as read', result).toJSON());
    } catch (error) {
        logger.error(`[NOTIFICATION-READ] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to mark notification as read').toJSON());
    }
};

exports.markAllRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await notificationService.markAllAsRead(userId);
        return res.status(200).json(resHandler.success('All notifications marked as read', { count: result.count }).toJSON());
    } catch (error) {
        logger.error(`[NOTIFICATION-READ-ALL] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to mark all notifications as read').toJSON());
    }
};
