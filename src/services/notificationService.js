const prisma = require('../config/prisma');
const logger = require('../utils/logger');

class NotificationService {
    /**
     * Broadcast a notification to all users (except excludeUserId)
     */
    async broadcast(excludeUserId, { title, message, type = 'info', payload = {} }) {
        // 1. Get all eligible recipients
        const recipients = await prisma.user.findMany({
            where: {
                id: { not: excludeUserId } 
            },
            select: { id: true }
        });

        if (recipients.length === 0) return { count: 0 };

        // 2. Prepare bulk data
        const notifications = recipients.map(user => ({
            userId: user.id,
            type: type,
            // You might want to restructure payload or just put title/message in payload
            // But usually schema has 'type' and 'payload'.
            // Let's standardise payload for announcement.
            payload: {
                title,
                message,
                ...payload
            },
            isRead: false,
            createdAt: new Date()
        }));

        // 3. Bulk Insert
        const result = await prisma.notification.createMany({
            data: notifications
        });

        return { count: result.count };
    }

    /**
     * Notify users who favorited a specific Anime or Manga
     */
    async notifySubscribers(type, contentId, { title, message, payload = {} }) {
        // 1. Find subscribers
        const whereFavorite = {};
        if (type === 'anime') whereFavorite.animeId = contentId;
        else if (type === 'manga') whereFavorite.mangaId = contentId;
        else return { count: 0 };

        const subscribers = await prisma.favorite.findMany({
            where: whereFavorite,
            select: { userId: true }
        });

        if (subscribers.length === 0) return { count: 0 };

        // 2. Create Notifications
        const notifications = subscribers.map(fav => ({
            userId: fav.userId,
            type: 'content_update',
            payload: {
                title,
                message,
                contentType: type,
                contentId,
                ...payload
            },
            isRead: false,
            createdAt: new Date()
        }));

        // 3. Bulk Insert
        const result = await prisma.notification.createMany({
            data: notifications
        });

        logger.info(`[Notification] Sent update for ${type} ${contentId} to ${result.count} users.`);
        return { count: result.count };
    }
    /**
     * Get notifications for a specific user
     */
    async getUserNotifications(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.notification.count({ where: { userId } }),
            prisma.notification.count({ where: { userId, isRead: false } })
        ]);

        return {
            data: notifications,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                unreadCount
            }
        };
    }

    /**
     * Get only unread count
     */
    async getUnreadCount(userId) {
        return await prisma.notification.count({
            where: { userId, isRead: false }
        });
    }

    /**
     * Mark a single notification as read
     */
    async markAsRead(userId, notificationId) {
        // Ensure the notification belongs to the user
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId }
        });

        if (!notification) return null;

        return await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true }
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        return await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
    }
}

module.exports = new NotificationService();
