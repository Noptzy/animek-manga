
const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll } = require('bun:test');
const app = require('../../app');
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

describe('Admin Content Management Integration Tests', () => {
    let adminToken = '';
    let memberToken = '';
    const TEST_ANIME_SLUG = 'test-anime-integrity-123';
    const TEST_MANGA_SLUG = 'test-manga-integrity-123';

    beforeAll(async () => {
        // 1. Setup Data: Roles
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

        // 2. Setup Data: Users (Admin & Member)
        const hashedPassword = await bcrypt.hash('adminKuGanteng123Animek', 10);
        await prisma.user.upsert({
            where: { email: 'admin@gmail.com' },
            update: { password: hashedPassword, roleId: roleAdmin.id, isActive: true },
            create: {
                email: 'admin@gmail.com',
                name: 'Admin User',
                password: hashedPassword,
                roleId: roleAdmin.id,
                isActive: true,
            },
        });

        const hashedMemberPassword = await bcrypt.hash('memberKuGanteng123Animek', 10);
        await prisma.user.upsert({
            where: { email: 'member@gmail.com' },
            update: { password: hashedMemberPassword, roleId: roleUser.id, isActive: true },
            create: {
                email: 'member@gmail.com',
                name: 'Member',
                password: hashedMemberPassword,
                roleId: roleUser.id,
                isActive: true,
            },
        });

        // 3. Login to get Tokens
        // Try/Catch for login to debug invalid token issues
        try {
            const adminLogin = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'admin@gmail.com', password: 'adminKuGanteng123Animek' });
            
            if (adminLogin.status === 200 && adminLogin.body.data) {
                 adminToken = adminLogin.body.data.accessToken;
            } else {
                 console.error('Admin Login Failed:', adminLogin.body);
            }

            const memberLogin = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'member@gmail.com', password: 'memberKuGanteng123Animek' });
            
            if (memberLogin.status === 200 && memberLogin.body.data) {
                memberToken = memberLogin.body.data.accessToken;
            } else {
                console.error('Member Login Failed:', memberLogin.body);
            }

        } catch (e) {
            console.error('Login Request Error:', e);
        }

        // 4. Create Dummy Anime & Manga for Testing
        // We use upsert to ensure it exists
        await prisma.anime.upsert({
            where: { slug: TEST_ANIME_SLUG },
            update: {},
            create: {
                slug: TEST_ANIME_SLUG,
                title: 'Test Anime Original',
                posterUrl: 'http://example.com/poster.jpg',
                status: 'Ongoing',
                rating: '0',
                type: 'TV',
                updatedAt: new Date(),
            }
        });

        await prisma.manga.upsert({
            where: { slug: TEST_MANGA_SLUG },
            update: {},
            create: {
                slug: TEST_MANGA_SLUG,
                title: 'Test Manga Original',
                posterUrl: 'http://example.com/manga.jpg',
                status: 'Ongoing',
                updatedAt: new Date(),
            }
        });
    });

    afterAll(async () => {
        // Cleanup Test Data
        try {
            // Delete Parent Records (Cascade should handle children)
            // But if cascade is not set in DB level, we might need manual delete.
            // Looking at schema: 
            // anime Sources -> onDelete: Cascade
            // episodes -> onDelete: Cascade
            // chapters -> onDelete: Cascade
            // So deleting Anime/Manga is enough.
            
            await prisma.anime.delete({ where: { slug: TEST_ANIME_SLUG } });
            await prisma.manga.delete({ where: { slug: TEST_MANGA_SLUG } });
            
        } catch (error) {
            console.error('Cleanup Error:', error);
        } finally {
            await prisma.$disconnect();
        }
    });

    // --- ANIME TESTS ---
    describe('Anime Content Management', () => {
        it('should update anime details successfully as Admin', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/anime/oploverz/${TEST_ANIME_SLUG}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'Test Anime Updated',
                    status: 'Completed'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.title).toBe('Test Anime Updated');
            expect(res.body.data.status).toBe('Completed');
        });

        it('should fail to update anime with missing title', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/anime/oploverz/${TEST_ANIME_SLUG}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                     status: 'Completed'
                    // Missing title
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should forbid Member from updating anime', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/anime/oploverz/${TEST_ANIME_SLUG}`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    title: 'Hacked by Member'
                });

            expect(res.status).toBe(403);
        });

        it('should upsert episode successfully as Admin', async () => {
            const res = await request(app)
                .post(`/api/v1/admin/anime/oploverz/${TEST_ANIME_SLUG}/episode`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    episodeNumber: 1,
                    title: 'Episode 1: The Beginning',
                    sourceUrl: 'http://example.com/ep1'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            
            // Verify DB
            const ep = await prisma.episode.findFirst({
                where: { anime: { slug: TEST_ANIME_SLUG }, episodeNumber: 1 }
            });
            expect(ep).not.toBeNull();
            expect(ep.title).toBe('Episode 1: The Beginning');
        });
        
        it('should fail to upsert episode with invalid data', async () => {
             const res = await request(app)
                .post(`/api/v1/admin/anime/oploverz/${TEST_ANIME_SLUG}/episode`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    episodeNumber: 2
                    // Missing title
                });
             expect(res.status).toBe(400); 
        });

        it('should return 401 if no token provided', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/anime/oploverz/${TEST_ANIME_SLUG}`)
                .send({ title: 'No Token' });
            
            expect(res.status).toBe(401);
        });

        it('should return 404 when updating non-existent anime', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/anime/oploverz/non-existent-slug-12345`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Ghost Anime' });

            // Note: If your controller doesn't handle 404 explicitly but returns "Success" 
            // because upsert/updateMany might not throw, we need to check implementation.
            // Usually updateManual in repo uses prisma.update which throws if not found.
            // Let's assume standard behavior (404 or 500 depending on handling).
            // Ideally it should be 404.
            expect(res.status).toBe(404);
        });
    });

    // --- MANGA TESTS ---
    describe('Manga Content Management', () => {
        it('should update manga details successfully as Admin', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/manga/komikIndo/${TEST_MANGA_SLUG}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'Test Manga Updated',
                    status: 'Completed'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.title).toBe('Test Manga Updated');
        });

        it('should forbid Member from updating manga', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/manga/komikIndo/${TEST_MANGA_SLUG}`)
                .set('Authorization', `Bearer ${memberToken}`)
                .send({
                    title: 'Hacked by Member'
                });

            expect(res.status).toBe(403);
        });

        it('should upsert chapter successfully as Admin', async () => {
             const res = await request(app)
                .post(`/api/v1/admin/manga/komikIndo/${TEST_MANGA_SLUG}/chapter`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    chapterIndex: 1, 
                    title: 'Chapter 1',
                    downloadUrl: 'http://dl.example.com'
                });
            
             expect(res.status).toBe(200);
             expect(res.body.success).toBe(true);
        });

        it('should return 404 when updating non-existent manga', async () => {
            const res = await request(app)
                .put(`/api/v1/admin/manga/komikIndo/non-existent-manga-slug`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Ghost Manga' });

            expect(res.status).toBe(404);
        });
    });
});
