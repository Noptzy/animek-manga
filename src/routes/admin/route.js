const express = require('express');
const router = express.Router();
const adminContentController = require('../../controllers/admin/adminContentController');
const adminUserController = require('../../controllers/admin/adminUserController');
const adminLogController = require('../../controllers/admin/adminLogController');
const adminScrapeController = require('../../controllers/admin/adminScrapeController');
const interactionController = require('../../controllers/user/interactionController.js');
const adminHealthController = require('../../controllers/admin/adminHealthController');
const adminNotificationController = require('../../controllers/admin/adminNotificationController');
const auth = require('../../middlewares/auth');
const { requireAdmin } = require('../../middlewares/roles');

// Apply Auth & Admin Check globally for this router
router.use(auth, requireAdmin);

// System Health (Placed top for visibility and to avoid shadowing)
router.get('/system-health', adminHealthController.getSystemHealth);

// Users
router.get('/users', adminUserController.listUsers);
router.put('/users/:id', adminUserController.updateUser);
router.delete('/users/:id', adminUserController.deleteUser);

// Logs
router.get('/logs', adminLogController.getLogs);

// Scrape Manual Triggers
router.post('/scrape/manga', adminScrapeController.triggerMangaScrape);
router.post('/scrape/anime', adminScrapeController.triggerAnimeScrape);
router.post('/scrape/mass-heal', adminScrapeController.triggerMassHeal);

// Anime (Server 2)
router.post('/anime/2', adminContentController.createAnime); // Create
router.put('/anime/2/:slug', adminContentController.updateAnime);
router.delete('/anime/2/:slug', adminContentController.deleteAnime);
router.post('/anime/2/:slug/episode', adminContentController.upsertEpisode);
router.delete('/anime/2/:slug/episode/:episodeNumber', adminContentController.deleteEpisode);

// Fallback for Frontend (Default to Server 2)
router.post('/anime', adminContentController.createAnime);
router.put('/anime/:slug', adminContentController.updateAnime);
router.delete('/anime/:slug', adminContentController.deleteAnime); 
router.post('/anime/:slug/episode', adminContentController.upsertEpisode);
router.delete('/anime/:slug/episode/:episodeNumber', adminContentController.deleteEpisode);

// Manga (KomikuIndo)
router.post('/manga/komikIndo', adminContentController.createManga); // Create
router.put('/manga/komikIndo/:slug', adminContentController.updateManga);
router.delete('/manga/komikIndo/:slug', adminContentController.deleteManga);
router.post('/manga/komikIndo/:slug/chapter', adminContentController.upsertChapter);
router.delete('/manga/komikIndo/:slug/chapter/:chapterIndex', adminContentController.deleteChapter); // Delete Ch

// Fallback for Manga (Default to KomikIndo)
router.post('/manga', adminContentController.createManga);
router.put('/manga/:slug', adminContentController.updateManga);
router.delete('/manga/:slug', adminContentController.deleteManga);
router.post('/manga/:slug/chapter', adminContentController.upsertChapter);
router.delete('/manga/:slug/chapter/:chapterIndex', adminContentController.deleteChapter);

// Popular Stats (Implementation in User Interaction Controller)
// Removed redundant auth/requireAdmin as it's applied globally
router.get('/stats/popular', interactionController.getAdminPopularStats);

// Global Notifications (Broadcast)
router.post('/notifications/broadcast', adminNotificationController.broadcastNotification);

module.exports = router;
