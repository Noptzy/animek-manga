
const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll } = require('bun:test');
const app = require('../../app');
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

describe('Admin Features Integration Tests', () => {
    let adminToken = '';
    let memberToken = '';
    let targetUserId = 0;
    const TEST_ANIME_SLUG = 'test-anime-deletion-123';
    const TEST_MANGA_SLUG = 'test-manga-deletion-123';

    beforeAll(async () => {
        try {
            console.log('Starting Setup...');
            // 1. Setup Roles
            const roleUser = await prisma.role.upsert({
            where: { id: 1 },
            update: {},
            create: { id: 1, title: 'USER' },
        });
        const roleAdmin = await prisma.role.upsert({
            where: { id: 2 },
            update: {},
            create: { id: 2, title: 'ADMIN' },
        });

        // 2. Setup Users
        const hashedAdminPass = await bcrypt.hash('admin123', 10);
        await prisma.user.upsert({
            where: { email: 'admin_feat@gmail.com' },
            update: { password: hashedAdminPass, roleId: roleAdmin.id, isActive: true },
            create: {
                email: 'admin_feat@gmail.com',
                name: 'Admin Feat',
                password: hashedAdminPass,
                roleId: roleAdmin.id,
                isActive: true,
            },
        });

        const hashedMemberPass = await bcrypt.hash('member123', 10);
        await prisma.user.upsert({
            where: { email: 'member_feat@gmail.com' },
            update: { password: hashedMemberPass, roleId: roleUser.id, isActive: true },
            create: {
                email: 'member_feat@gmail.com',
                name: 'Member Feat',
                password: hashedMemberPass,
                roleId: roleUser.id,
                isActive: true,
            },
        });

        // Target User for Manipulation
        const hashedTargetPass = await bcrypt.hash('target123', 10);
        const targetUser = await prisma.user.upsert({
            where: { email: 'target_user@gmail.com' },
            update: { password: hashedTargetPass, roleId: roleUser.id, isActive: true },
            create: {
                email: 'target_user@gmail.com',
                name: 'Target User',
                password: hashedTargetPass,
                roleId: roleUser.id,
                isActive: true,
            },
        });
        targetUserId = targetUser.id;

        // 3. Login
        const adminLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin_feat@gmail.com', password: 'admin123' });
        adminToken = adminLogin.body.data.accessToken;

        const memberLogin = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'member_feat@gmail.com', password: 'member123' });
        memberToken = memberLogin.body.data.accessToken;

        // 4. Create Dummy Content
        await prisma.anime.upsert({
            where: { slug: TEST_ANIME_SLUG },
            update: {},
            create: {
                slug: TEST_ANIME_SLUG,
                title: 'Test Anime Deletion',
                posterUrl: 'http://example.com/poster.jpg',
                status: 'Ongoing',
                updatedAt: new Date(),
            }
        });

        await prisma.manga.upsert({
            where: { slug: TEST_MANGA_SLUG },
            update: {},
            create: {
                slug: TEST_MANGA_SLUG,
                title: 'Test Manga Deletion',
                posterUrl: 'http://example.com/manga.jpg',
                status: 'Ongoing',
                updatedAt: new Date(),
            }
        });
        } catch (error) {
            console.error('Setup Failed:', error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            await prisma.anime.deleteMany({ where: { slug: TEST_ANIME_SLUG } });
            await prisma.manga.deleteMany({ where: { slug: TEST_MANGA_SLUG } });
            await prisma.user.deleteMany({ where: { email: { in: ['admin_feat@gmail.com', 'member_feat@gmail.com', 'target_user@gmail.com'] } } });
        } catch (e) {
            console.error('Cleanup error:', e);
        } finally {
            await prisma.$disconnect();
        }
    });

    // --- USER MANAGEMENT ---
    describe('User Management', () => {
        it('should list users as Admin', async () => {
            const res = await request(app)
                .get('/api/v1/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.status).toBe(200);
            expect(res.body.data).toBeInstanceOf(Array);
        });

        it('should forbid Member from listing users', async () => {
            const res = await request(app)
                .get('/api/v1/admin/users')
                .set('Authorization', `Bearer ${memberToken}`);
            
            expect(res.status).toBe(403);
        });

        it('should update user status (Ban) as Admin', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/users/${targetUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: false }); // Ban user

            const userCheck = await prisma.user.findUnique({ where: { id: targetUserId } });
            console.log('Target User ID:', targetUserId, 'Exists:', !!userCheck);
            
            expect(res.status).toBe(200);
            expect(res.body.data.isActive).toBe(false);

            const userInDb = await prisma.user.findUnique({ where: { id: targetUserId } });
            expect(userInDb.isActive).toBe(false);
        });
        
        it('should update user status (Unban) as Admin', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/users/${targetUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: true }); // Unban user

            expect(res.status).toBe(200);
            expect(res.body.data.isActive).toBe(true);
             const userInDb = await prisma.user.findUnique({ where: { id: targetUserId } });
            expect(userInDb.isActive).toBe(true);
        });

        it('should fail update user with invalid data (trying to change role)', async () => {
             // Role update is not allowed by controller logic
             // But if we send extra data it might just be ignored, or rejected depending on validation.
             // Our controller specifically checks if isActive is present.
             // If we don't send isActive, it should fail.
             const res = await request(app)
                .put(`/api/v1/admin/users/${targetUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ roleId: 2 }); // Try to make admin

             expect(res.status).toBe(400); // Validation error: isActive required
        });

        it('should delete user as Admin', async () => {
             const res = await request(app)
                .delete(`/api/v1/admin/users/${targetUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);

             expect(res.status).toBe(200);
             
             const userInDb = await prisma.user.findUnique({ where: { id: targetUserId } });
             expect(userInDb).toBeNull();
        });
    });

    // --- LOG MANAGEMENT ---
    describe('Log Management', () => {
        it('should retrieve logs as Admin', async () => {
             const res = await request(app)
                .get('/api/v1/admin/logs')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.status).toBe(200);
            expect(res.body.data).toBeInstanceOf(Array);
        });
    });

    // --- CONTENT DELETION ---
    describe('Content Deletion', () => {
        it('should delete anime as Admin', async () => {
            const res = await request(app)
                .delete(`/api/v1/admin/anime/oploverz/${TEST_ANIME_SLUG}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            
            const anime = await prisma.anime.findUnique({ where: { slug: TEST_ANIME_SLUG } });
            expect(anime).toBeNull();
        });

        it('should return 404 when deleting non-existent anime', async () => {
             const res = await request(app)
                .delete(`/api/v1/admin/anime/oploverz/${TEST_ANIME_SLUG}`) // Already deleted
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
        });

        it('should delete manga as Admin', async () => {
            const res = await request(app)
                .delete(`/api/v1/admin/manga/komikIndo/${TEST_MANGA_SLUG}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);

            const manga = await prisma.manga.findUnique({ where: { slug: TEST_MANGA_SLUG } });
            expect(manga).toBeNull();
        });

        it('should return 404 when deleting non-existent manga', async () => {
             const res = await request(app)
                .delete(`/api/v1/admin/manga/komikIndo/${TEST_MANGA_SLUG}`) // Already deleted
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(404);
        });
    });

});
