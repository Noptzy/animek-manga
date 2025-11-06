const prisma = require('../config/prisma.js');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

class userRepository {
    async getUsers({ where, offset, limit }) {
        const user = await prisma.user.findMany({
            where: {
                ...where,
                roleId: 1,
            },
            skip: typeof offset === 'number' ? offset : 0,
            take: typeof limit === 'number' ? limit : 10,
            select: {
                id: true,
                name: true,
                email: true,
                photoUrl: true,
                isActive: true,
                roleId: true,
            },
        });

        return user;
    }

    async getUser(id) {
        if (!id) return null;
        return await prisma.user.findUnique({
            where: { id: id },
            select: {
                id: true,
                name: true,
                email: true,
                photoUrl: true,
                isActive: true,
            },
        });
    }

    async storeUser(data = {}) {
        if (!data || !data.email || !data.password) {
            throw new Error('Missing required user data');
        }

        const newUser = await prisma.user.create({
            data: {
                name: data.name || null,
                email: data.email,
                password: data.password,
                photoUrl: data.photoUrl || null,
                roleId:
                    typeof data.roleId === 'number'
                        ? data.roleId
                        : 1,
                isActive:
                    typeof data.isActive === 'boolean'
                        ? data.isActive
                        : true,
            },
            select: { id: true },
        });

        return this.getUser(newUser.id);
    }

    async findUser(params = {}) {
        return await prisma.user.findFirst({
            where: params,
            select: {
                id: true,
                name: true,
                email: true,
                password: true,
                roleId: true,
                isActive: true,
            },
        });
    }

    async findUsers({ where, offset, limit }) {
        const [data, total] = await Promise.all([
            prisma.user.findMany({
                where: {
                    ...where,
                    roleId: 1,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    photoUrl: true,
                    isActive: true,
                    roleId: true,
                },
                skip:
                    typeof offset === 'number' ? offset : 0,
                take:
                    typeof limit === 'number' ? limit : 10,
            }),
            prisma.user.count({ where: where || {} }),
        ]);

        return { data, total };
    }

    async updateUser(id, data) {
        try {
            if (!id) {
                logger.warning('User Not Found');
                return null;
            }

            const updateData = {};
            if (typeof data.name !== 'undefined') updateData.name = data.name;
            if (typeof data.email !== 'undefined') updateData.email = data.email;
            if (typeof data.photoUrl !== 'undefined') {
                if (typeof data.photoUrl === 'string' || data.photoUrl === null) {
                    updateData.photoUrl = data.photoUrl;
                } else if (typeof data.photoUrl === 'object') {
                    if (typeof data.photoUrl.url === 'string') {
                        updateData.photoUrl = data.photoUrl.url;
                    } else {
                        updateData.photoUrl = null;
                    }
                }
            }
            if (typeof data.isActive !== 'undefined') {
                if (typeof data.isActive === 'boolean') {
                    updateData.isActive = data.isActive;
                } else if (typeof data.isActive === 'string') {
                    const v = data.isActive.toLowerCase();
                    updateData.isActive = v === 'true' || v === '1' || v === 'on' || v === 'yes';
                } else if (typeof data.isActive === 'number') {
                    updateData.isActive = data.isActive === 1;
                }
            }
            if (typeof data.roleId !== 'undefined') {
                if (typeof data.roleId === 'number') {
                    updateData.roleId = data.roleId;
                } else if (typeof data.roleId === 'string') {
                    const n = parseInt(data.roleId, 10);
                    if (!isNaN(n)) updateData.roleId = n;
                }
            }
            if (typeof data.metadata !== 'undefined') updateData.metadata = data.metadata;
            if (typeof data.password !== 'undefined') {
                updateData.password = await bcrypt.hash(data.password, 10);
            }

            const user = await prisma.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    photoUrl: true,
                    isActive: true,
                    roleId: true,
                },
            });
            return user;
        } catch (err) {
            logger.error('Error updating user:', err);
            throw new Error('Error updating user');
        }
    }

    async deleteUser(id) {
        try {
            if (!id) return null;
            const deletedUser = await prisma.user.delete({
                where: { id },
                select: { id: true },
            });
            logger.info('User deleted successfully');
            return deletedUser;
        } catch (err) {
            logger.error('Error deleting user:', err);
            return null;
        }
    }

    async updateProfile(data, id) {
        try {
            if (!id) {
                logger.warning('User Not Found');
                return null;
            }

            const updateData = {};
            if (typeof data.name !== 'undefined') updateData.name = data.name;
            if (typeof data.email !== 'undefined') updateData.email = data.email;
            if (typeof data.photoUrl !== 'undefined') {
                if (typeof data.photoUrl === 'string' || data.photoUrl === null) {
                    updateData.photoUrl = data.photoUrl;
                } else if (typeof data.photoUrl === 'object') {
                    if (typeof data.photoUrl.url === 'string') {
                        updateData.photoUrl = data.photoUrl.url;
                    } else {
                        updateData.photoUrl = null;
                    }
                }
            }
            if (typeof data.metadata !== 'undefined') updateData.metadata = data.metadata;
            if (typeof data.password !== 'undefined') {
                updateData.password = await bcrypt.hash(data.password, 10);
            }

            const updateProfile = await prisma.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    photoUrl: true,
                },
            });
            return updateProfile;
        } catch (err) {
            logger.error('Error updating profile:', err);
            throw new Error('Error updating profile');
        }
    }

    async profile(id) {
        if (!id) return null;
        const userProfile = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                photoUrl: true,
                isActive: true,
                password: true,
                roleId: true,
                metadata: true,
            },
        });

        return userProfile;
    }
}

module.exports = new userRepository();
