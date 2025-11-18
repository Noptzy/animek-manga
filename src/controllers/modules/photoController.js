const multer = require('multer');
const logger = require('../../utils/logger');
const userService = require('../../services/userService');
const resHandler = require('../../utils/resHandler');
const photoService = require('../../services/photoService');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
            return cb(new Error('Only JPEG/PNG/WEBP images are allowed'), false);
        }
        cb(null, true);
    },
});

exports.uploadProfilePhoto = [
    upload.single('photo'),
    async (req, res) => {
        const userId = req.params.id;
        if (!userId) {
            logger.warning('No user ID provided for profile photo upload');
            return res.status(400).json(resHandler.error('User ID is required').toJSON());
        }

        if (!req.file) {
            logger.warning('No file uploaded for profile photo', { userId });
            return res.status(400).json(resHandler.error('No file uploaded').toJSON());
        }

        try {
            await photoService.ensureDirsAndDefault();

            const existing = await userService.profileUser(userId);
            const saved = await photoService.saveProfileImage(req.file.buffer, req);
            if (existing && existing.photoUrl) {
                await photoService.deleteFileFromUrl(existing.photoUrl, req).catch(() => {});
            }
            const relativePath = `public/photoProfile/${saved.filename}`;

            const mergedMeta = Object.assign({}, (existing && existing.metadata) || {}, {
                profileOriginalName: req.file.originalname,
            });

            await userService.updateProfile({ photoUrl: relativePath, metadata: mergedMeta }, userId);

            return res.status(201).json({
                success: true,
                message: 'Profile photo uploaded',
                data: {
                    photoUrl: saved.fileUrl,
                    thumbnail: saved.thumbUrl, 
                    filename: saved.filename, 
                    dbPhotoUrl: relativePath, 
                    originalName: req.file.originalname,
                },
            });
        } catch (error) {
            logger.error('Profile upload failed', error, {
                route: req.originalUrl,
                userId,
            });
            return res.status(500).json({
                success: false,
                message: 'Upload failed',
            });
        }
    },
];
