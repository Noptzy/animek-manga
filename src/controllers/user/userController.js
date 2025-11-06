const userService = require('../../services/userService.js');
const bcrypt = require('bcryptjs');
const resHandler = require('../../utils/resHandler.js');
const logger = require('../../utils/logger');
const photoService = require('../../services/photoService.js');
const photoController = require('../modules/photoController.js');

exports.getUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            ...queryFilters
        } = req.query;
        const result = await userService.findUsers({
            page: parseInt(page),
            limit: parseInt(limit),
            where: {
                ...queryFilters,
            },
        });

        return res
            .status(200)
            .json(resHandler
                    .success('Users retrieved successfully',result,)
                    .toJSON());
    } catch (error) {
        logger.error("Failed To Get Users", error, { route: '/users' });
        return res
            .status(500)
            .json(resHandler
                .error('error', null)
                .toJSON());
    }
};

exports.getProfile = async (req, res) => {
    const id = (req.user && req.user.id) || null;
    const uuidRegex = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

    if (!id) {
        return res
            .status(400)
            .json(resHandler
                .error('User ID is required')
                .toJSON());
    }
    if (typeof id !== 'string' || !uuidRegex.test(id)) {
        logger.warning('Invalid user id format', { userId: id });
        return res
            .status(400)
            .json(resHandler
                .error('Invalid ID: must be a UUID', null)
                .toJSON());
    }

    try {
        const profile = await userService.profileUser(id);
        if (!profile) {
            return res
                .status(404)
                .json(resHandler
                    .error('User not found')
                    .toJSON());
        }

        const data = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            photoUrl: profile.photoUrl,
            metadata: profile.metadata,
        };

        return res
            .status(200)
            .json(resHandler
                .success('Profile retrieved successfully', data)
                .toJSON());
    } catch (error) {
        logger.error('Failed To Get Profile', error, { route: '/users/profile', userId: id });
        return res
            .status(500)
            .json(resHandler
                .error('error', null)
                .toJSON());
    }
};

exports.deleteProfile = async (req, res) => {
    const id = (req.user && req.user.id) || null;
    const uuidRegex = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

    if (!id) {
        return res
            .status(400)
            .json(resHandler
                .error('User ID is required')
                .toJSON());
    }
    if (typeof id !== 'string' || !uuidRegex.test(id)) {
        logger.warning('Invalid user id format', { userId: id });
        return res
            .status(400)
            .json(resHandler
                .error('Invalid ID: must be a UUID', null)
                .toJSON());
    }

    try {
        const existing = await userService.profileUser(id);
        if (existing && existing.photoUrl) {
            await photoService.deleteFileFromUrl(existing.photoUrl, req).catch(() => {});
        }

        const deleted = await userService.deleteUser(id);
        if (!deleted) {
            return res
                .status(404)
                .json(resHandler
                    .error('User not found')
                    .toJSON());
        }

        return res
            .status(200)
            .json(resHandler
                .success('Profile deleted successfully')
                .toJSON());
    } catch (error) {
        logger.error('Failed To Delete Profile', error, { route: '/users/profile', userId: id });
        return res
            .status(500)
            .json(resHandler
                .error('error', null)
                .toJSON());
    }
};

exports.getUser = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res
            .status(400)
            .json(resHandler
                .error('User ID is required')
                .toJSON());
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

    if(!uuidRegex.test(id)){
            logger.warning('Invalid user id format', { userId: id });
            return res
                    .status(400)
                    .json(resHandler
                        .error('Invalid ID: must be a UUID', null)
                        .toJSON());
    }

    try {
        const user = await userService.getUser(id)
        return user ? res
                        .status(200)
                        .json(resHandler
                            .success('User retrieved successfully', user)
                            .toJSON()) : 
                    res
                        .status(404)
                        .json(resHandler
                            .error('User not found')
                            .toJSON());
    } catch (error) {
        logger.error('Failed To Get User', error, { route: '/users/:id', userId: id });
        return res
            .status(500)
            .json(resHandler
                .error('error', null)
                .toJSON());
    }
};

exports.storeUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      logger.warning('Name, email, and password are required');
      return res
        .status(400)
        .json(resHandler.error('Name, email, and password are required').toJSON());
    }

    const checkEmail = await userService.findUser({ email });
    if (checkEmail) {
      logger.warning('Email already in use', { email });
      return res.status(400).json(resHandler.error('Email already in use').toJSON());
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await photoService.ensureDirsAndDefault();

    const defaultPhotoUrl = photoService.buildFileUrl(req, photoService.DEFAULT_FILENAME);

    const newUser = await userService.storeUser({
      name,
      email,
      password: hashedPassword,
      photoUrl: defaultPhotoUrl,
    });

    return res.status(201).json(resHandler.success('User created successfully', newUser).toJSON());
  } catch (error) {
    logger.error('Failed To Create User', error, { route: '/users' });
    return res.status(500).json(resHandler.error('error', null).toJSON());
  }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

    if (!id) {
        return res
            .status(400)
            .json(resHandler
                .error('User ID is required')
                .toJSON()
    )};

    if (!uuidRegex.test(id)) {
        logger.warning('Invalid user id format', { userId: id });
        return res
            .status(400)
            .json(resHandler
                .error('Invalid ID: must be a UUID', null)
                .toJSON());
    }

    try {
        const body = req.body || {};
        const { name, email, password, photoUrl, isActive } = body;

        if (email) {
            const existing = await userService.findUser({ email });
            if (existing && existing.id !== id) {
                logger.warning('Email already in use for another user', { email, userId: id });
                return res.status(400).json(
                    resHandler.error('Email already in use').toJSON());
            }
        }

        const payload = {};
        if (name !== undefined) payload.name = name;
        if (email !== undefined) payload.email = email;
        if (password !== undefined) payload.password = password; 
        if (photoUrl !== undefined) payload.photoUrl = photoUrl;
        if (typeof isActive !== 'undefined') payload.isActive = isActive;

        if (req.file && req.file.buffer) {
            await photoService.ensureDirsAndDefault();
            const existing = await userService.profileUser(id);
            const saved = await photoService.saveProfileImage(req.file.buffer, req);
            const relativePath = `public/photoProfile/${saved.filename}`;

            if (existing && existing.photoUrl) {
                await photoService.deleteFileFromUrl(existing.photoUrl, req).catch(() => {});
            }

            const mergedMeta = Object.assign({}, (existing && existing.metadata) || {}, {
                profileOriginalName: req.file.originalname,
            });

            payload.photoUrl = relativePath;
            payload.metadata = mergedMeta;
        }

        if (Object.keys(payload).length === 0) {
            return res
                .status(400)
                .json(resHandler
                    .error('Nothing to update')
                    .toJSON());
        }

        const updated = await userService.updateUser(id, payload);
        if (!updated) {
            return res
                .status(404)
                .json(resHandler
                    .error('User not found')
                    .toJSON());
        }

        return res
            .status(200)
            .json(resHandler
                .success('User updated successfully', updated)
                .toJSON());
    } catch (error) {
        logger.error('Failed To Update User', error, { route: '/users/:id', userId: id });
        return res
            .status(500)
            .json(resHandler
                .error('error', null)
                .toJSON());
    }
};

exports.updateProfile = async (req, res) => {
    const authId = req.user && req.user.id;
    const id = authId;

    if (!id) {
        return res
            .status(401)
            .json(resHandler
                .error('Unauthorized')
                .toJSON());
    }

    try {
        const body = req.body;
        const { name, email, password, photoUrl } = body;

        if (email) {
            const existing = await userService.findUser({ email });
            if (existing && existing.id !== id) {
                logger.warning('Email already in use', { email, userId: id });
                return res
                    .status(400)
                    .json(resHandler
                        .error('Email already in use')
                        .toJSON());
            }
        }

        const payload = {};
        if (name !== undefined) payload.name = name;
        if (email !== undefined) payload.email = email;
        if (password !== undefined) payload.password = password; 
        if (photoUrl !== undefined) payload.photoUrl = photoUrl;

        if (req.file && req.file.buffer) {
            await photoService.ensureDirsAndDefault();
            const existing = await userService.profileUser(id);
            const saved = await photoService.saveProfileImage(req.file.buffer, req);
            const relativePath = `public/photoProfile/${saved.filename}`;

            if (existing && existing.photoUrl) {
                await photoService.deleteFileFromUrl(existing.photoUrl, req).catch(() => {});
            }

            const mergedMeta = Object.assign({}, (existing && existing.metadata) || {}, {
                profileOriginalName: req.file.originalname,
            });

            payload.photoUrl = relativePath;
            payload.metadata = mergedMeta;
        }

        if (Object.keys(payload).length === 0) {
            return res
                .status(400)
                .json(resHandler
                    .error('Nothing to update')
                    .toJSON());
        }

        const updated = await userService.updateProfile(payload, id);
        if (!updated) {
            return res
                .status(404)
                .json(resHandler
                    .error('User not found')
                    .toJSON());
        }

        return res
            .status(200)
            .json(resHandler
                .success('Profile updated successfully', updated)
                .toJSON());
    } catch (error) {
        logger.error('Failed To Update Profile', error, { route: '/users/profile', userId: id });
        return res
            .status(500)
            .json(resHandler
                .error('error', null)
                .toJSON());
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

    if (!id) {
        return res
            .status(400)
            .json(resHandler
                .error('User ID is required')
                .toJSON());
    }

    if (!uuidRegex.test(id)) {
        logger.warning('Invalid user id format', { userId: id });
        return res
            .status(400)
            .json(resHandler
                .error('Invalid ID: must be a UUID', null)
                .toJSON());
    }

    try {
        const deleted = await userService.deleteUser(id);
        if (!deleted) {
            return res
                .status(404)
                .json(resHandler
                    .error('User not found')
                    .toJSON());
        }

    return res
        .status(200)
        .json(resHandler
            .success('User deleted successfully')
            .toJSON());
    } catch (error) {
        logger.error('Failed To Delete User', error, { route: '/users/:id', userId: id });
        return res
            .status(500)
            .json(resHandler
                .error('error', null)
                .toJSON());
    }
};
