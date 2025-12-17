const userRepository = require('../repositories/userRepository');
const prisma = require('../config/prisma');

class userService {
    async findUsers({ where, page, limit }) {
        const offset = (page - 1) * limit;

        const result = await userRepository.findUsers({ where, limit, offset });

        return {
            data: result.data,
            total: result.total,
            page,
            limit,
        };
    }

    async profileUser(id) {
        if (!id) return null;
        return userRepository.profile(id);
    }

    async getUser(id) {
        const result = await userRepository.getUser(id);
        if (!result) return null;
        return result;
    }

    async findUser(params) {
        return await userRepository.findUser(params);
    }

    async storeUser(data) {
        return await userRepository.storeUser(data);
    }

    async updateUser(id, data) {
        return await userRepository.updateUser(id, data);
    }

    async deleteUser(id) {
        return await userRepository.deleteUser(id);
    }

    async updateProfile(data, id) {
        return await userRepository.updateProfile(data, id);
    }
}

module.exports = new userService();
