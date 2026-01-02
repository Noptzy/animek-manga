const prisma = require('../config/prisma.js');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');
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
                id: true,
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
                    id: true,
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
                            id: true,
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
                    id: true,
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


                        // Check if new (created just now) or use explicit check
                        // Since upsert doesn't tell us, let's look at the result
                        // If createdAt is very close to now AND updatedAt is also now (which is true for update)
                        // It's hard. Let's use the explicit pre-check approach cleanly.
                        
                        /* 
                           Wait, doing pre-check for every chapter in loop is expensive.
                           Optimization: Only check if we SUSPECT it's new? 
                           The loop iterates ALL chapters from source.
                           Most will be old.
                           
                           Better approach:
                           Fetch ALL existing chapter indexes for this manga once.
                           Compare incoming with existing.
                           Only Upsert & Notify the NEW ones.
                        */
                       
                       // For now, let's trust the upsert but we lose the "new" distinction.
                       // Let's implement the pre-fetch optimization in a separate step or stick to simple check.
                       // Given the file size, let's keep it simple: Check only if we successfully upserted? No.
                       
                       // Let's do the fetch check. It's robust.
                       const exists = await prisma.chapter.findFirst({
                           where: { 
                               mangaId: manga.id, 
                               chapterIndex: chapterIndex 
                            },
                            select: { id: true }
                       });

                       if (!exists) {
                           logger.info(`New Chapter found: ${decodedSlug} Ch ${chapterIndex}`);
                           // Notify
                           notificationService.notifySubscribers('manga', manga.id, {
                               title: `Chapter Baru: ${data.title}`,
                               message: `Chapter ${chapterIndex} dari ${data.title} baru saja rilis!`,
                               payload: {
                                   slug: decodedSlug,
                                   chapterIndex: chapterIndex
                               }
                           }).catch(err => logger.error(`Notify Error: ${err.message}`));
                       }

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
                                updatedAt: new Date(), // Important to mark as active
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
                response: data.response, 
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
    async updateMangaManual(slug, data) {
        logger.info(`[REPO-UPDATE] Attempting to update manga with slug: '${slug}'`);
        return await prisma.$transaction(async (tx) => {
            // 1. Get Manga
            const manga = await tx.manga.findUnique({ where: { slug } });
            logger.info(`[REPO-UPDATE] Find result for '${slug}': ${manga ? `Found (${manga.id})` : 'Not Found'}`);
            
            if (!manga) throw new Error('Manga not found');

            // 2. Update Metadata
            const updatedManga = await tx.manga.update({
                where: { slug },
                data: {
                    title: data.title,
                    posterUrl: data.posterUrl,
                    status: data.status,
                    author: data.author,
                    illustrator: data.illustrator,
                    altTitle: data.altTitle,
                    synopsis: data.synopsis,
                    updatedAt: new Date(),
                }
            });

            // 3. Sync Genres (Replace Strategy)
            if (data.genres && Array.isArray(data.genres)) {
                 await tx.mangaGenre.deleteMany({ where: { mangaId: manga.id } });
                 
                 const genreIds = [];
                 for (const g of data.genres) {
                    let name, genreSlug;
                    // Handle string or object structure
                    if (typeof g === 'string') {
                        name = g;
                        genreSlug = g.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    } else {
                        name = g.name;
                        genreSlug = g.slug || g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    }

                    // Upsert Genre
                    let genre = await tx.genre.findUnique({ where: { slug: genreSlug } });
                    if (!genre) {
                        genre = await tx.genre.create({ data: { name, slug: genreSlug } });
                    }
                    genreIds.push(genre.id);
                 }

                 if (genreIds.length > 0) {
                     await tx.mangaGenre.createMany({
                         data: genreIds.map(gid => ({ mangaId: manga.id, genreId: gid })),
                         skipDuplicates: true
                     });
                 }
            }

            // 4. Sync Chapters
            if (data.chapters && Array.isArray(data.chapters)) {
                for (const ch of data.chapters) {
                    const chIndex = String(ch.chapterIndex).trim();
                    await tx.chapter.upsert({
                        where: {
                            mangaId_chapterIndex: { mangaId: manga.id, chapterIndex: chIndex }
                        },
                        update: {
                            title: ch.title || `Chapter ${chIndex}`,
                            url: ch.url || '#',
                            updatedAt: new Date()
                        },
                        create: {
                             mangaId: manga.id,
                             chapterIndex: chIndex,
                             title: ch.title || `Chapter ${chIndex}`,
                             url: ch.url || '#'
                        }
                    });
                }
            }

            return updatedManga;
        }, {
             maxWait: 20000, // 20s
             timeout: 30000, // 30s
        });
    }

    async upsertChapterManual(slug, chapterData) {
        const manga = await prisma.manga.findUnique({ where: { slug } });
        if (!manga) throw new Error(`Manga with slug ${slug} not found`);

        const chapterIndex = String(chapterData.chapterIndex).trim();
        
        return await prisma.$transaction(async (tx) => {
            const chapter = await tx.chapter.upsert({
                where: {
                    mangaId_chapterIndex: {
                        mangaId: manga.id,
                        chapterIndex: chapterIndex,
                    },
                },
                update: {
                    title: chapterData.title,
                    url: chapterData.url || '#',
                    updatedAt: new Date(),
                },
                create: {
                    mangaId: manga.id,
                    chapterIndex: chapterIndex,
                    title: chapterData.title,
                    url: chapterData.url || '#',
                },
            });
            
            return chapter;
        });
    }

    async createManga(data) {
        return await prisma.$transaction(async (tx) => {
            // 1. Handle Genres
            const genreIds = [];
            if (data.genres && Array.isArray(data.genres)) {
                for (const genreName of data.genres) {
                    const slug = genreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    
                    let genre = await tx.genre.findUnique({ where: { slug } });
                    if (!genre) {
                        genre = await tx.genre.create({
                             data: { name: genreName, slug }
                        });
                    }
                    genreIds.push(genre.id);
                }
            }

            // 2. Create Manga
            const manga = await tx.manga.create({
                data: {
                    title: data.title,
                    slug: data.slug,
                    altTitle: data.altTitle,
                    posterUrl: data.posterUrl,
                    synopsis: data.synopsis,
                    status: data.status || 'Ongoing',
                    rating: data.rating,
                    author: data.author,
                    illustrator: data.illustrator,
                    sourceUrl: data.sourceUrl,
                    // releaseDate: data.releaseDate ? new Date(data.releaseDate) : null, // Not in schema directly? Ah schema doesn't have releaseDate for Manga, it has createdAt/scrapedAt.
                    
                    chapters: data.chapters && Array.isArray(data.chapters) ? {
                        create: data.chapters.map(ch => ({
                            chapterIndex: String(ch.chapterIndex), // Ensure string
                            title: ch.title || `Chapter ${ch.chapterIndex}`,
                            url: ch.url || '#'
                        }))
                    } : undefined
                }
            });

            // 3. Link Genres
            if (genreIds.length > 0) {
                await tx.mangaGenre.createMany({
                    data: genreIds.map(gid => ({
                        mangaId: manga.id,
                        genreId: gid
                    })),
                    skipDuplicates: true
                });
            }

            return manga;
        });
    }

    async deleteChapter(mangaId, chapterIndex) {
        return await prisma.chapter.delete({
            where: {
                mangaId_chapterIndex: {
                    mangaId: mangaId,
                    chapterIndex: chapterIndex
                }
            }
        });
    }

    async deleteManga(slug) {
        try {
            logger.info(`[REPO-DELETE] Deleting manga with slug: '${slug}'`);
            return await prisma.manga.delete({
                where: { slug },
            });
        } catch (error) {
            if (error.code === 'P2025') {
                 throw new Error('Manga not found');
            }
            throw error;
        }
    }

    async getMangaById(id) {
        return await prisma.manga.findUnique({
             where: { id },
             select: {
                id: true,
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
                    orderBy: {
                        createdAt: 'desc' 
                    },
                    select: {
                        id: true,
                        title: true,
                        chapterIndex: true,
                        url: true,
                    },
                },
            }
        });
    }
}

module.exports = new MangaRepository();
