const prisma = require('../config/prisma.js');
const logger = require('../utils/logger');
require('dotenv').config();

class MangaRepository {
    // buat data seed x hitung data, biarin jk!
    async countAll() {
        return await prisma.manga.count();
    }

    async findAll({ page = 1, limit = 10, order = { updatedAt: 'desc' } }) {
        const skip = (page - 1) * limit;
        const total = await prisma.manga.count();
        const mangas = await prisma.manga.findMany({
            skip,
            take: limit,
            orderBy: order,
            select: {
                title: true,
                slug: true,
                status: true,
                posterUrl: true,
                author: true,
                illustrator: true
            },
        });

        return {
            mangas,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findMangaBySlug(slug, { chapterOrder = 'asc' } = {}) {
        const manga = await prisma.manga.findUnique({
            where: { slug },
            select: {
                title: true,
                slug: true,
                posterUrl: true,
                status: true,
                author: true,
                illustrator: true,
                altTitle: true,
                synopsis: true,
                genres: {
                    select: {
                        genre: {
                            select: {
                                name: true,
                                slug: true,
                            },
                        },
                    },
                },
                chapters: {
                    select: {
                        title: true,
                        chapterIndex: true,
                        url: true,
                    },
                },
            },
        });

        if (!manga) {
            return null;
        }

        const flatGenres = manga.genres.map((item) => item.genre);
        const chapters = Array.isArray(manga.chapters) ? [...manga.chapters] : [];

        const parseChapterNumber = (ci) => {
            if (ci === null || ci === undefined) return NaN;
            const s = String(ci).trim().replace(',', '.');

            const n = parseFloat(s);
            if (!Number.isNaN(n)) return n;

            const m = s.match(/^(\d+(\.\d+)?)/);
            return m ? parseFloat(m[1]) : NaN;
        };

        chapters.sort((a, b) => {
            const na = parseChapterNumber(a.chapterIndex);
            const nb = parseChapterNumber(b.chapterIndex);

            const aIsNum = !Number.isNaN(na);
            const bIsNum = !Number.isNaN(nb);

            if (aIsNum && bIsNum) {
                return chapterOrder === 'asc' ? na - nb : nb - na;
            }

            if (aIsNum && !bIsNum) return -1;
            if (!aIsNum && bIsNum) return 1;

            return chapterOrder === 'asc'
                ? String(a.chapterIndex).localeCompare(String(b.chapterIndex), undefined, {
                      numeric: true,
                      sensitivity: 'base',
                  })
                : String(b.chapterIndex).localeCompare(String(a.chapterIndex), undefined, {
                      numeric: true,
                      sensitivity: 'base',
                  });
        });

        return {
            ...manga,
            genres: flatGenres,
            chapters,
        };
    }

    async search({ query, page = 1, limit = 20 }) {
        const skip = (page - 1) * limit;
        const where = {
            title: {
                contains: query,
                mode: 'insensitive',
            },
        };

        const total = await prisma.manga.count({ where });
        const mangas = await prisma.manga.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                title: true,
                slug: true,
                posterUrl: true,
                status: true,
            },
        });

        return {
            mangas,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async filter({ filters, page = 1, limit = 20, order = { createdAt: 'desc' } }) {
        const skip = (page - 1) * limit;
        const where = {};

        if (filters.genre && filters.genre.length > 0) {
            where.genres = {
                some: {
                    genre: {
                        slug: {
                            in: filters.genre,
                        },
                    },
                },
            };
        }

        if (filters.status) {
            where.status = { equals: filters.status };
        }
        if (filters.author) {
            where.author = { contains: filters.author, mode: 'insensitive' };
        }

        const total = await prisma.manga.count({ where });
        const mangas = await prisma.manga.findMany({
            where,
            skip,
            take: limit,
            orderBy: order,
            select: {
                title: true,
                slug: true,
                posterUrl: true,
                status: true,
                genres: {
                    select: {
                        genre: {
                            select: {
                                name: true,
                                slug: true,
                            },
                        },
                    },
                },
            },
        });

        const mangasWithGenres = mangas.map((m) => ({
            ...m,
            genres: m.genres ? m.genres.map((g) => g.genre) : [],
        }));

        return {
            ...mangas,
            genres: flatGenres,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async checkChapterExists(slug, chapterUrl) {
        const chapter = await prisma.chapter.findFirst({
            where: {
                url: chapterUrl,
                manga: {
                    slug: slug,
                },
            },
        });
        return chapter !== null;
    }

    async upsertManga(data) {
        const genres = data.genres || [];
        const chapters = data.chapters || [];
        const komikIndoUrl = process.env.KOMIK_INDO_URL || 'https://komikindo.ch/';

        const scrubGenres = genres.map((g) => {
            const trimmedName = g.trim();
            return {
                name: trimmedName,
                slug: trimmedName.toLowerCase().replace(/\s+/g, '-'),
            };
        });

        try {
            // --- Bagian 1: Transaksi untuk Manga dan Genre ---
            const manga = await prisma.$transaction(
                async (tx) => {
                    // 1. Upsert Manga
                    const mangaRecord = await tx.manga.upsert({
                        where: { slug: data.slug },
                        update: {
                            title: data.title,
                            posterUrl: data.poster_url,
                            status: data.status,
                            author: data.author,
                            illustrator: data.illustrator,
                            altTitle: data.alt_title,
                            synopsis: data.synopsis,
                            sourceUrl: data.sourceUrl || data.source_url || `${komikIndoUrl}komik/${data.slug}/`,
                            scrapedAt: new Date(),
                        },
                        create: {
                            title: data.title,
                            slug: data.slug,
                            posterUrl: data.poster_url,
                            status: data.status,
                            author: data.author,
                            illustrator: data.illustrator,
                            altTitle: data.alt_title,
                            synopsis: data.synopsis,
                            sourceUrl: data.sourceUrl || data.source_url || `${komikIndoUrl}komik/${data.slug}/`,
                            scrapedAt: new Date(),
                        },
                    });

                    // 2. Proses Genre (Many-to-Many)
                    if (scrubGenres.length > 0) {
                        await Promise.all(
                            scrubGenres.map((g) =>
                                tx.genre.upsert({
                                    where: { slug: g.slug },
                                    update: { name: g.name },
                                    create: g,
                                }),
                            ),
                        );

                        const allGenres = await tx.genre.findMany({
                            where: { slug: { in: scrubGenres.map((g) => g.slug) } },
                        });

                        await tx.mangaGenre.createMany({
                            data: allGenres.map((genre) => ({
                                mangaId: mangaRecord.id,
                                genreId: genre.id,
                            })),
                            skipDuplicates: true,
                        });
                    }
                    return mangaRecord;
                },
                {
                    maxWait: 10000,
                    timeout: 15000,
                },
            );

            // --- Bagian 2: Proses Chapter secara terpisah (di luar transaksi utama) ---
            if (chapters.length > 0) {
                logger.info(`Processing ${chapters.length} chapters for ${data.slug} outside of main transaction...`);
                for (const chapter of chapters) {
                    const chapterIndex = String(chapter.chapter_number).trim();
                    if (!chapterIndex) {
                        logger.warn(`Skipping chapter with no chapter_number for manga ${data.slug}`, chapter);
                        continue;
                    }

                    // Setiap upsert ini adalah operasi atomik sendiri
                    await prisma.chapter.upsert({
                        where: {
                            mangaId_chapterIndex: {
                                mangaId: manga.id,
                                chapterIndex: chapterIndex,
                            },
                        },
                        update: {
                            title: chapter.title,
                            url: chapter.url,
                        },
                        create: {
                            chapterIndex: chapterIndex,
                            title: chapter.title,
                            url: chapter.url,
                            manga: {
                                connect: {
                                    id: manga.id,
                                },
                            },
                        },
                    });
                }
                logger.info(`Finished processing chapters for ${data.slug}.`);
            }

            return manga;
        } catch (error) {
            logger.error(`Upsert process failed for ${data.slug}: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new MangaRepository();
