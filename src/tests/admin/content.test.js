const request = require('supertest');
const app = require('../../../app'); // Adjust path to app.js
const prisma = require('../../../src/config/prisma');
const { generateToken } = require('../../../src/utils/jwt');
const bcrypt = require('bcryptjs');
const redis = require('../../../src/config/RedisUpstash'); // Import Redis

let adminToken;
let animeSlug = 'test-anime-crm';
let mangaSlug = 'test-manga-crm';

describe('Admin Content Management Tests', () => {
    
    beforeAll(async () => {
        // 1. Create Admin User
        // 1. Upsert Admin Role (ID 2) to ensure it exists and bypass sequence issues
        const adminRole = await prisma.role.upsert({
            where: { id: 2 },
            update: { title: 'admin' },
            create: { id: 2, title: 'admin' }
        });

        // 2. Create Admin User
        const hashedPassword = await bcrypt.hash('password123', 10);
        const admin = await prisma.user.upsert({
            where: { email: 'admin_crm@test.com' },
            update: { role: { connect: { id: adminRole.id } } },
            create: {
                name: 'Admin CRM',
                email: 'admin_crm@test.com',
                password: hashedPassword,
                role: {
                     connect: { id: adminRole.id }
                }
            }
        });
        adminToken = generateToken(admin);
        
        // 3. Store Token in Redis (Stateful Auth Requirement)
        await redis.set(`access_token:${admin.id}`, adminToken, { ex: 86400 });

        // 2. Ensure Provider Genres exist? (Optional, logic handles create)
    });

    afterAll(async () => {
        // Cleanup
        await prisma.episode.deleteMany({ where: { anime: { slug: animeSlug } } });
        await prisma.anime.deleteMany({ where: { slug: animeSlug } });
        await prisma.chapter.deleteMany({ where: { manga: { slug: mangaSlug } } });
        await prisma.manga.deleteMany({ where: { slug: mangaSlug } });
        await prisma.user.delete({ where: { email: 'admin_crm@test.com' } });
        await prisma.$disconnect();
    });

    describe('Anime Management (Server 2)', () => {
        it('should create a new anime with nested episodes', async () => {
            const payload = {
                title: "Test Anime CRM",
                slug: animeSlug,
                posterUrl: "https://example.com/poster.jpg",
                synopsis: "Test Synopis",
                status: "Ongoing",
                type: "TV",
                genres: ["Action", "Test"],
                episodes: [
                    {
                        episodeNumber: 1,
                        title: "Ep 1",
                        streams: [
                            { host: "Server 1", url: "https://stream.com/1", quality: "720p" }
                        ]
                    }
                ]
            };

            const res = await request(app)
                .post('/api/v1/admin/anime/2')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            
            // Verify DB
            const anime = await prisma.anime.findUnique({
                where: { slug: animeSlug },
                include: { episodes: { include: { streams: true } }, animeServerGenres: { include: { serverGenre: true } } }
            });
            expect(anime).not.toBeNull();
            expect(anime.episodes.length).toBe(1);
            expect(anime.episodes[0].streams.length).toBe(1);
        });

        it('should perform deep update on anime', async () => {
            const payload = {
                title: "Test Anime CRM Updated",
                // Remove 'Test', Add 'Comedy'
                genres: ["Action", "Comedy"], 
                episodes: [
                    // Update Ep 1
                    {
                        episodeNumber: 1,
                        title: "Ep 1 Renamed",
                        streams: [
                             // Replace stream
                             { host: "Server 2", url: "https://stream.com/2", quality: "1080p" }
                        ]
                    },
                    // Add Ep 2
                    {
                        episodeNumber: 2,
                        title: "Ep 2",
                        streams: []
                    }
                ]
            };

            const res = await request(app)
                .put(`/api/v1/admin/anime/2/${animeSlug}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.statusCode).toBe(200);

            // Verify DB
            const anime = await prisma.anime.findUnique({
                where: { slug: animeSlug },
                include: { episodes: { orderBy: { episodeNumber: 'asc' }, include: { streams: true } }, animeServerGenres: { include: { serverGenre: true } } }
            });
            
            expect(anime.title).toBe("Test Anime CRM Updated");
            expect(anime.episodes.length).toBe(2);
            expect(anime.episodes[0].title).toBe("Ep 1 Renamed");
            expect(anime.episodes[0].streams[0].host).toBe("Server 2"); // Replaced
            
            // Verify Genres
            const genreNames = anime.animeServerGenres.map(g => g.serverGenre.name);
            expect(genreNames).toContain("Comedy");
            expect(genreNames).not.toContain("Test");
        });
    });

    describe('Manga Management (KomikuIndo)', () => {
        it('should create a new manga with nested chapters', async () => {
             const payload = {
                title: "Test Manga CRM",
                slug: mangaSlug,
                author: "Test Author",
                genres: ["Adventure"],
                chapters: [
                    { chapterIndex: "1", title: "Ch 1", url: "https://read.com/1" }
                ]
            };

            const res = await request(app)
                .post('/api/v1/admin/manga/komikIndo')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.statusCode).toBe(201);
            
             // Verify DB
            const manga = await prisma.manga.findUnique({
                where: { slug: mangaSlug },
                include: { chapters: true }
            });
            expect(manga).not.toBeNull();
            expect(manga.chapters.length).toBe(1);
        });

         it('should perform deep update on manga', async () => {
            const payload = {
                title: "Test Manga CRM Updated",
                chapters: [
                    { chapterIndex: "1", title: "Ch 1 Updated" },
                    { chapterIndex: "2", title: "Ch 2" }
                ]
            };

            const res = await request(app)
                .put(`/api/v1/admin/manga/komikIndo/${mangaSlug}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.statusCode).toBe(200);

             // Verify DB
            const manga = await prisma.manga.findUnique({
                where: { slug: mangaSlug },
                include: { chapters: { orderBy: { chapterIndex: 'asc' } } }
            });
            expect(manga.title).toBe("Test Manga CRM Updated");
            expect(manga.chapters.length).toBe(2);
            expect(manga.chapters[0].title).toBe("Ch 1 Updated");
        });
    });
});
