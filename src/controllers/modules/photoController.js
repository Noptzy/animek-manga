// controllers/users/photoController.js
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

            // simpan file dan dapatkan filename + URL untuk response
            const saved = await photoService.saveProfileImage(req.file.buffer, req);

            // hapus photo lama (DB mungkin menyimpan filename atau absolute URL)
            if (existing && existing.photoUrl) {
                await photoService.deleteFileFromUrl(existing.photoUrl, req).catch(() => {});
            }

            // Simpan path relatif untuk photoUrl agar konsisten: public/photoProfile/<filename>
            const relativePath = `public/photoProfile/${saved.filename}`;

            // Simpan nama file asli di metadata
            const mergedMeta = Object.assign({}, (existing && existing.metadata) || {}, {
                profileOriginalName: req.file.originalname,
            });

            await userService.updateProfile({ photoUrl: relativePath, metadata: mergedMeta }, userId);

            return res.status(201).json({
                success: true,
                message: 'Profile photo uploaded',
                data: {
                    photoUrl: saved.fileUrl, // URL lengkap untuk client
                    thumbnail: saved.thumbUrl, // URL thumbnail
                    filename: saved.filename, // nama file unik di server
                    dbPhotoUrl: relativePath, // nilai yang disimpan di kolom photoUrl
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
