const resHandler = require('../../utils/resHandler');
const logger = require('../../utils/logger');
const UserRepository = require('../../repositories/userRepository');

exports.listUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, q } = req.query;
        const where = {};
        
        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } }
            ];
        }

        const result = await UserRepository.findAllUsers({
            where,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        return res.status(200).json(resHandler.success('Successfully retrieved users', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-USER-LIST] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to retrieve users').toJSON());
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Only allow updating isActive (Ban/Unban)
        // Allow updating name, email, roleId, and isActive
        const { name, email, roleId, isActive } = req.body;

        if (name === undefined && email === undefined && roleId === undefined && isActive === undefined) {
             return res.status(400).json(resHandler.error('Validation Error: No valid update fields provided').toJSON());
        }

        const result = await UserRepository.updateUser(id, { name, email, roleId, isActive });

        if (!result) {
            return res.status(404).json(resHandler.error('User not found').toJSON());
        }

        return res.status(200).json(resHandler.success('Successfully updated user status', result).toJSON());
    } catch (error) {
         logger.error(`[ADMIN-USER-UPDATE] ${error.message}`);
         return res.status(500).json(resHandler.error('Failed to update user').toJSON());
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await UserRepository.deleteUser(id);

         if (!result) {
            return res.status(404).json(resHandler.error('User not found').toJSON());
        }

        return res.status(200).json(resHandler.success('Successfully deleted user', result).toJSON());
    } catch (error) {
        logger.error(`[ADMIN-USER-DELETE] ${error.message}`);
        return res.status(500).json(resHandler.error('Failed to delete user').toJSON());
    }
};
