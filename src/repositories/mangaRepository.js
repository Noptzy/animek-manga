const prisma = require('../config/prisma.js');
const logger = require('../utils/logger');
require('dotenv').config();

class MangaRepository {
    // buat data seed x hitung data, biarin jk!
    async countAll() {
        return await prisma.manga.count();
    }

    async countAllMangasInDB() {
        return await prisma.manga.count();
    }

    async countAllChapterMangaInDB() {
        return await prisma.chapter.count();
    }

    async getMangaList({ page = 1, limit = 10, order = { updatedAt: 'desc' } }) {
        const skip = (page - 1) * limit;

        const mangas = await prisma.manga.findMany({
            skip,
            take: limit,
            orderBy: order,
            select: {
                title: true,
                slug: true,
                status: true,
                posterUrl: true,
            },
        });

        return mangas.map((m) => ({
            ...m,
            _count: undefined,
        }));
    }

    async findMangaBySlug(slug, { chapterOrder = 'asc' } = {}) {
        try {
            const decodedSlug = decodeURIComponent(slug);
            const manga = await prisma.manga.findUnique({
                where: { slug: decodedSlug },
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
        } catch (error) {
            logger.error(`Error finding manga by slug ${slug}: ${error.message}`);
            throw error;
        }
    }

    async findAndFilter({ q, genre, status, author, page = 1, limit = 20, orderBy = { title: 'asc' } }) {
        const skip = (page - 1) * limit;
        const where = { AND: [] };

        if (q) {
            where.AND.push({
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { altTitle: { contains: q, mode: 'insensitive' } },
                ],
            });
        }

        if (genre && genre.length > 0) {
            where.AND.push({
                genres: {
                    some: {
                        genre: {
                            slug: {
                                in: Array.isArray(genre) ? genre : [genre],
                            },
                        },
                    },
                },
            });
        }

        if (status) {
            where.AND.push({ status: { equals: status } });
        }

        if (author) {
            where.AND.push({ author: { contains: author, mode: 'insensitive' } });
        }

        const finalWhere = where.AND.length > 0 ? where : {};

        const [total, mangas] = await prisma.$transaction([
            prisma.manga.count({ where: finalWhere }),
            prisma.manga.findMany({
                where: finalWhere,
                skip,
                take: limit,
                orderBy,
                select: {
                    title: true,
                    slug: true,
                    posterUrl: true,
                    status: true,
                    author: true,
                    illustrator: true,
                    _count: {
                        select: { chapters: true },
                    },
                },
            }),
        ]);

        const mappedMangas = mangas.map((m) => ({
            ...m,
            totalChapters: m._count ? m._count.chapters : 0,
            _count: undefined,
        }));

        return {
            mangas: mappedMangas,
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
        const decodedSlug = decodeURIComponent(data.slug);
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
            const existingManga = await prisma.manga.findUnique({
                where: { slug: decodedSlug },
                select: {
                    id: true,
                    status: true,
                    _count: {
                        select: { chapters: true },
                    },
                },
            });

            if (existingManga) {
                const incomingChapterCount = chapters.length;
                const isStatusSame = existingManga.status === data.status;
                const isChapterCountSame = existingManga._count.chapters === incomingChapterCount;

                if (isStatusSame && isChapterCountSame) {
                    logger.info(
                        `Skipping upsert for ${decodedSlug} - no changes detected (Status: ${data.status}, Chapters: ${incomingChapterCount}).`,
                    );
                    return existingManga;
                }
            }

            const manga = await prisma.$transaction(
                async (tx) => {
                    const mangaRecord = await tx.manga.upsert({
                        where: { slug: decodedSlug },
                        update: {
                            title: data.title,
                            posterUrl: data.poster_url,
                            status: data.status,
                            author: data.author,
                            illustrator: data.illustrator,
                            altTitle: data.alt_title,
                            synopsis: data.synopsis,
                            sourceUrl: data.sourceUrl || data.source_url || `${komikIndoUrl}komik/${decodedSlug}/`,
                            scrapedAt: new Date(),
                        },
                        create: {
                            title: data.title,
                            slug: decodedSlug,
                            posterUrl: data.poster_url,
                            status: data.status,
                            author: data.author,
                            illustrator: data.illustrator,
                            altTitle: data.alt_title,
                            synopsis: data.synopsis,
                            sourceUrl: data.sourceUrl || data.source_url || `${komikIndoUrl}komik/${decodedSlug}/`,
                            scrapedAt: new Date(),
                        },
                    });

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

            if (chapters.length > 0) {
                logger.info(`Processing ${chapters.length} chapters for ${decodedSlug} outside of main transaction...`);
                for (const chapter of chapters) {
                    const chapterIndex = String(chapter.chapter_number).trim();
                    if (!chapterIndex) {
                        logger.warn(`Skipping chapter with no chapter_number for manga ${decodedSlug}`, chapter);
                        continue;
                    }

                    try {
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
                    } catch (err) {
                        if (err.code === 'P2002') {
                            logger.warn(
                                `Duplicate chapter detected for ${decodedSlug} chapter ${chapterIndex}, skipping.`,
                            );
                        } else {
                            throw err;
                        }
                    }
                }
                logger.info(`Finished processing chapters for ${decodedSlug}.`);
            }

            return manga;
        } catch (error) {
            logger.error(`Upsert process failed for ${decodedSlug}: ${error.message}`);
            throw error;
        }
    }

    async upsertGenres(genres) {
        if (!genres || genres.length === 0) return;

        const uniqueInputGenres = [];
        const seenInputNames = new Set();

        for (const g of genres) {
            const trimmedName = g.name.trim();
            if (!seenInputNames.has(trimmedName)) {
                seenInputNames.add(trimmedName);
                uniqueInputGenres.push({
                    name: trimmedName,
                    slug: g.slug,
                });
            }
        }

        try {
            const existingGenres = await prisma.genre.findMany({
                select: { name: true, slug: true },
            });

            const existingNameMap = new Map();
            existingGenres.forEach((g) => existingNameMap.set(g.name, g.slug));

            const finalGenresToUpsert = [];
            for (const g of uniqueInputGenres) {
                const existingSlug = existingNameMap.get(g.name);
                if (existingSlug) {
                    if (existingSlug === g.slug) {
                        finalGenresToUpsert.push(g);
                    } else {
                        logger.warning(
                            `Genre name collision: '${g.name}' exists with slug '${existingSlug}', but input has slug '${g.slug}'. Skipping input.`,
                        );
                    }
                } else {
                    finalGenresToUpsert.push(g);
                }
            }

            if (finalGenresToUpsert.length > 0) {
                await prisma.$transaction(
                    finalGenresToUpsert.map((g) =>
                        prisma.genre.upsert({
                            where: { slug: g.slug },
                            update: { name: g.name },
                            create: { name: g.name, slug: g.slug },
                        }),
                    ),
                );
                logger.info(`Successfully upserted ${finalGenresToUpsert.length} genres.`);
            } else {
                logger.info('No new or matching genres to upsert.');
            }
        } catch (error) {
            logger.error(`Error upserting genres: ${error.message}`);
            throw error;
        }
    }

    async getGenres() {
        const genres = await prisma.genre.findMany({
            orderBy: {
                name: 'asc',
            },
            include: {
                _count: {
                    select: { mangas: true },
                },
            },
        });

        return genres.map((g) => ({
            name: g.name,
            slug: g.slug,
            count: g._count.mangas,
        }));
    }

    async findOngoingManga() {
        try {
            const mangas = await prisma.manga.findMany({
                where: {
                    status: 'Ongoing'
                },
                select: {
                    slug: true,
                    _count: {
                        select: { chapters: true },
                    },
                },
            });

            return mangas.map((m) => ({
                slug: m.slug,
                chapterCount: m._count.chapters,
            }));
        } catch (error) {
            logger.error(`Error finding ongoing manga: ${error.message}`);
            throw error;
        }
    }

    async createScrapeLog(data) {
        return await prisma.scrapeLog.create({
            data: {
                id: data.id,
                source: data.source,
                endpoint: data.endpoint,
                slug: data.slug,
                status: data.status,
                response: data.response ? JSON.stringify(data.response) : null,
                scrapedAt: new Date(),
            },
        });
    }

    async updateScrapeLog(id, data) {
        return await prisma.scrapeLog.update({
            where: { id },
            data: {
                status: data.status,
                response: data.response ? JSON.stringify(data.response) : undefined,
                error: data.error,
            },
        });
    }
}

module.exports = new MangaRepository();
