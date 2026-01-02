const notificationService = require('../../services/notificationService');
const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');

exports.broadcastNotification = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { title, message, type } = req.body;

        if (!title || !message) {
            return res.status(400).json(resHandler.error('Title and Message are required').toJSON());
        }

        const result = await notificationService.broadcast(adminId, { title, message, type });
        
        return res.status(200).json(resHandler.success(`Broadcast sent to ${result.count} users`, result).toJSON());
    } catch (error) {
        logger.error('Broadcast Notification Error', error);
        return res.status(500).json(resHandler.error('Failed to broadcast notification').toJSON());
    }
};
