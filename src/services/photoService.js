// services/photoService.js
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const logger = require('../utils/logger');

const PUBLIC_DIR = path.join(__dirname, '../../public');
const UPLOADS_PROFILE_DIR = path.join(PUBLIC_DIR, 'photoProfile');

// Simpan HANYA nama file di DB
const DEFAULT_FILENAME = 'ohim.png';
const DEFAULT_SOURCE_DIR = path.join(PUBLIC_DIR, 'photoProfile'); // jika Anda punya sumber ohim.png di public/photoProfile

async function ensureDirsAndDefault() {
    await fs.ensureDir(UPLOADS_PROFILE_DIR);

    const defaultDestPath = path.join(UPLOADS_PROFILE_DIR, DEFAULT_FILENAME);
    const thumbDestPath = path.join(UPLOADS_PROFILE_DIR, `thumb-${DEFAULT_FILENAME}`);

    const existsDefault = await fs.pathExists(defaultDestPath);
    if (existsDefault) {
        const existsThumb = await fs.pathExists(thumbDestPath);
        if (!existsThumb) {
            try {
                await sharp(defaultDestPath).resize({ width: 200 }).png().toFile(thumbDestPath);
            } catch (e) {
                logger.warning('Gagal membuat thumbnail default', e.message);
            }
        }
        return;
    }

    // coba copy dari public/photoProfile/ jika ada
    const sourcePath = path.join(DEFAULT_SOURCE_DIR, DEFAULT_FILENAME);
    const sourceExists = await fs.pathExists(sourcePath);

    try {
        if (sourceExists) {
            await fs.copy(sourcePath, defaultDestPath);
            await sharp(defaultDestPath).resize({ width: 200 }).png().toFile(thumbDestPath);
            logger.info('Copied default profile image', { from: sourcePath, to: defaultDestPath });
            return;
        }

        // buat placeholder jika tidak ada source
        await sharp({
            create: {
                width: 800,
                height: 800,
                channels: 3,
                background: '#CCCCCC',
            },
        })
            .png()
            .toFile(defaultDestPath);

        await sharp(defaultDestPath).resize({ width: 200 }).png().toFile(thumbDestPath);
        logger.info('Created placeholder default profile image', { defaultDestPath });
    } catch (err) {
        logger.error('Failed to create/copy default profile image', err);
        throw err;
    }
}

function buildFileUrl(req, filename) {
    // Kembalikan full URL yang digunakan client untuk mengakses gambar
    // Saya gunakan path '/public/uploads/profile/' agar tetap konsisten dg project lama
    const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    return `${base}/public/photoProfile/${filename}`;
}

// resolve path file lokal dari photoUrl yang mungkin berupa:
// - filename ('abcd.jpeg')
// - relative path ('uploads/profile/abcd.jpeg' atau 'public/uploads/profile/abcd.jpeg')
// - absolute URL ('http://localhost:3000/public/uploads/profile/abcd.jpeg')
function resolveLocalPathFromPhotoUrl(photoUrl, req) {
    if (!photoUrl) return null;

    // absolute URL?
    if (/^https?:\/\//i.test(photoUrl)) {
        try {
            const parsed = new URL(photoUrl);
            // parsed.pathname biasanya '/public/uploads/profile/filename' atau '/uploads/..'
            return path.join(__dirname, '../../', parsed.pathname.replace(/^\/+/, ''));
        } catch (e) {
            // fallthrough
        }
    }

    // jika ada slash di string -> anggap path relatif terhadap project root
    if (photoUrl.includes('/')) {
        const normalized = photoUrl.replace(/^\/+/, '');
        return path.join(__dirname, '../../', normalized);
    }

    // hanya filename -> ada di uploads/profile/
    return path.join(UPLOADS_PROFILE_DIR, photoUrl);
}

async function saveProfileImage(buffer, req = null) {
    await ensureDirsAndDefault();

    const filename = `${uuidv4()}.jpeg`;
    const filepath = path.join(UPLOADS_PROFILE_DIR, filename);

    await sharp(buffer).resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(filepath);

    const thumbName = `thumb-${filename}`;
    const thumbPath = path.join(UPLOADS_PROFILE_DIR, thumbName);
    await sharp(buffer).resize({ width: 200 }).jpeg({ quality: 70 }).toFile(thumbPath);

    if (req) {
        return {
            filename, // simpan ini ke DB
            fileUrl: buildFileUrl(req, filename), // kirim ke client
            thumbUrl: buildFileUrl(req, thumbName),
        };
    }

    return { filename };
}

async function deleteFileFromUrl(photoUrl, req) {
    if (!photoUrl) return;
    try {
        const maybePath = resolveLocalPathFromPhotoUrl(photoUrl, req);
        if (!maybePath) return;

        const defaultPath = path.join(UPLOADS_PROFILE_DIR, DEFAULT_FILENAME);
        // jangan hapus default
        if (path.resolve(maybePath) === path.resolve(defaultPath)) {
            logger.info('Not deleting default profile image', { path: maybePath });
            return;
        }

        await fs.remove(maybePath).catch(() => {});
        logger.info('Removed old profile photo if existed', { path: maybePath });
    } catch (e) {
        logger.warning('Failed to delete old profile photo', { photoUrl, error: e.message });
    }
}

module.exports = {
    ensureDirsAndDefault,
    buildFileUrl,
    saveProfileImage,
    deleteFileFromUrl,
    DEFAULT_FILENAME,
    UPLOADS_PROFILE_DIR,
};
