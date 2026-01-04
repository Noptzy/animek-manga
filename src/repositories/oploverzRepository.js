const prisma = require('../config/prisma');
const ScrapeLogRepository = require('./scrapeLogRepository');
const notificationService = require('../services/notificationService');

const SERVER_ID = 2;
const SERVER_NAME = 'Oploverz';

class OploverzRepository {
    async ensureServerExists() {
        try {
            await prisma.server.upsert({
                where: { id: SERVER_ID },
                update: { title: SERVER_NAME, isActive: true },
                create: { id: SERVER_ID, title: SERVER_NAME, baseUrl: 'https://anime.oploverz.ac/', isActive: true },
            });
        } catch (error) {
            // Ignore duplicate/race condition
        }
    }

    async upsertAnime(animeData) {
        if (!animeData.detail) {
            console.warn(`[SKIP] No detail found for ${animeData.title}`);
            return null;
        }

        try {
            // Pre-check for new episodes notifications
            let newEpisodesToNotify = [];
            try {
                const existingAnime = await prisma.anime.findUnique({
                    where: { slug: animeData.slug },
                    select: { id: true, episodes: { select: { episodeNumber: true } } }
                });

                if (existingAnime && animeData.episodes) {
                    const existingNumbers = new Set(existingAnime.episodes.map(e => e.episodeNumber));
                    newEpisodesToNotify = animeData.episodes.filter(ep => {
                        const num = parseFloat(ep.episode_number);
                        return !isNaN(num) && !existingNumbers.has(num);
                    });
                }
            } catch (err) {
                console.warn(`[SKIP] Notification check failed for ${animeData.title}:`, err.message);
            }

            // Save Anime Metadata (Title, Genre, Poster)
            const savedAnime = await prisma.$transaction(
                async (tx) => {
                    // 1. Upsert Anime
                    const anime = await tx.anime.upsert({
                        where: { slug: animeData.slug },
                        update: {
                            title: animeData.title,
                            altTitle: animeData.detail.alt_title,
                            posterUrl: animeData.detail.poster_url,
                            synopsis: animeData.detail.synopsis,
                            status: animeData.detail.status,
                            type: animeData.detail.type ? animeData.detail.type.substring(0, 50) : null,
                            rating: animeData.detail.rating ? animeData.detail.rating.substring(0, 50) : null,
                            score: animeData.detail.score,
                            studio: animeData.detail.studio,
                            season: animeData.detail.season ? animeData.detail.season.substring(0, 50) : null,
                            duration: animeData.detail.duration ? animeData.detail.duration.substring(0, 50) : null,
                            totalEpisodes: parseInt(animeData.detail.totalEpisodes) || 0,
                            updatedAt: new Date(),
                        },
                        create: {
                            title: animeData.title,
                            slug: animeData.slug,
                            altTitle: animeData.detail.alt_title,
                            posterUrl: animeData.detail.poster_url,
                            synopsis: animeData.detail.synopsis,
                            status: animeData.detail.status,
                            type: animeData.detail.type ? animeData.detail.type.substring(0, 50) : null,
                            rating: animeData.detail.rating ? animeData.detail.rating.substring(0, 50) : null,
                            score: animeData.detail.score,
                            studio: animeData.detail.studio,
                            season: animeData.detail.season ? animeData.detail.season.substring(0, 50) : null,
                            duration: animeData.detail.duration ? animeData.detail.duration.substring(0, 50) : null,
                            totalEpisodes: parseInt(animeData.detail.totalEpisodes) || 0,
                        },
                    });

                    // 2. Upsert Source
                    const existingSource = await tx.animeSource.findFirst({
                        where: { animeId: anime.id, serverId: SERVER_ID },
                    });

                    if (existingSource) {
                        await tx.animeSource.update({
                            where: { id: existingSource.id },
                            data: { sourceUrl: animeData.url, scrapedAt: new Date() },
                        });
                    } else {
                        await tx.animeSource.create({
                            data: { animeId: anime.id, serverId: SERVER_ID, sourceUrl: animeData.url },
                        });
                    }

                    // 3. Upsert Genres
                    if (animeData.detail.genres && animeData.detail.genres.length > 0) {
                        await tx.animeServerGenre.deleteMany({
                            where: { animeId: anime.id, serverGenre: { serverId: SERVER_ID } },
                        });

                        for (const genreName of animeData.detail.genres) {
                            const slug = genreName
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, '-')
                                .substring(0, 100);
                            const cleanName = genreName.substring(0, 100);

                            const serverGenre = await tx.serverGenre.upsert({
                                where: { serverId_name: { serverId: SERVER_ID, name: cleanName } },
                                update: {},
                                create: { serverId: SERVER_ID, name: cleanName, slug: slug },
                            });

                            await tx.animeServerGenre.create({
                                data: { animeId: anime.id, serverGenreId: serverGenre.id },
                            });
                        }
                    }

                    return anime;
                },
                { timeout: 10000 },
            );

            // Cleanup invalid episodes (ghost episodes)
            // Ini akan menghapus episode "hantu" (misal 36255) yang ada di DB tapi tidak ada di hasil scrape baru
            if (animeData.episodes) {
                const validEpisodeNumbers = animeData.episodes
                    .map((ep) => parseFloat(ep.episode_number))
                    .filter((n) => !isNaN(n));

                if (validEpisodeNumbers.length > 0) {
                    await prisma.episode.deleteMany({
                        where: {
                            animeId: savedAnime.id,
                            episodeNumber: { notIn: validEpisodeNumbers },
                        },
                    });
                }
            }

            // Save New Episodes
            let episodeCount = 0;
            if (animeData.episodes && animeData.episodes.length > 0) {
                for (const ep of animeData.episodes) {
                    await prisma.$transaction(
                        async (tx) => {
                            const epNumVal = parseFloat(ep.episode_number);
                            const safeEpNum = isNaN(epNumVal) ? 99999 : epNumVal;

                            const episode = await tx.episode.upsert({
                                where: {
                                    animeId_episodeNumber: {
                                        animeId: savedAnime.id,
                                        episodeNumber: safeEpNum,
                                    },
                                },
                                update: {
                                    title: ep.title,
                                    sourceUrl: ep.url,
                                    updatedAt: new Date(),
                                },
                                create: {
                                    animeId: savedAnime.id,
                                    episodeNumber: safeEpNum,
                                    title: ep.title,
                                    sourceUrl: ep.url,
                                },
                            });

                            // Streams
                            await tx.episodeStream.deleteMany({ where: { episodeId: episode.id } });
                            if (ep.streaming && ep.streaming.length > 0) {
                                const streamsPayload = ep.streaming
                                    .filter((s) => s.url)
                                    .map((s) => ({
                                        episodeId: episode.id,
                                        serverId: SERVER_ID,
                                        quality: (s.quality || 'SD').substring(0, 100),
                                        url: s.url,
                                        host: (s.host || 'Oploverz Embed').substring(0, 50),
                                    }));

                                if (streamsPayload.length > 0) {
                                    await tx.episodeStream.createMany({ data: streamsPayload });
                                }
                            }

                            // Downloads
                            await tx.episodeDownload.deleteMany({ where: { episodeId: episode.id } });
                            if (ep.downloads && ep.downloads.length > 0) {
                                const downloadsPayload = [];
                                ep.downloads.forEach((dlGroup) => {
                                    const format = (dlGroup.format || 'mp4').substring(0, 50);
                                    if (dlGroup.resolutions && Array.isArray(dlGroup.resolutions)) {
                                        dlGroup.resolutions.forEach((res) => {
                                            const quality = (res.quality || 'Unknown').substring(0, 50);
                                            if (res.links && Array.isArray(res.links)) {
                                                res.links.forEach((link) => {
                                                    if (link.url && link.url.trim() !== '') {
                                                        downloadsPayload.push({
                                                            episodeId: episode.id,
                                                            format: format,
                                                            resolutions: quality,
                                                            host: (link.host || 'Unknown').substring(0, 50),
                                                            url: link.url,
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                                if (downloadsPayload.length > 0) {
                                    await tx.episodeDownload.createMany({ data: downloadsPayload });
                                }
                            }
                        },
                        { timeout: 10000, maxWait: 5000 },
                    );
                    episodeCount++;
                }
            }

            // Log Sukses
            await ScrapeLogRepository.createLog({
                source: SERVER_NAME,
                endpoint: 'detail',
                slug: animeData.slug,
                status: 'success',
                response: { message: `Updated ${animeData.title}`, episodes: episodeCount },
                error: null,
            });

            // Send Notifications (Async)
            if (newEpisodesToNotify.length > 0) {
                // Fire and forget, jangan await agar tidak memblokir scraping
                (async () => {
                   for (const ep of newEpisodesToNotify) {
                       const epNum = parseFloat(ep.episode_number);
                       await notificationService.notifySubscribers('anime', savedAnime.id, {
                           title: `Episode Baru: ${savedAnime.title}`,
                           message: `Episode ${epNum} dari ${savedAnime.title} telah rilis!`,
                           payload: {
                               slug: savedAnime.slug,
                               episodeNumber: epNum
                           }
                       });
                   }
                })().catch(err => console.error(`[Notification] Auto-alert failed for ${animeData.title}:`, err));
            }

            // Return Full Object (Ensure episodes are included for Service)
            return await tx.anime.findUnique({
                where: { id: savedAnime.id },
                include: {
                    animeServerGenres: { include: { serverGenre: true } },
                    episodes: {
                        orderBy: { episodeNumber: 'asc' },
                        include: { streams: true, downloads: true },
                    },
                },
            });
        } catch (error) {
            console.error(`ERROR Repository Upsert ${animeData.title}:`, error);
            await ScrapeLogRepository.createLog({
                source: SERVER_NAME,
                endpoint: 'detail',
                slug: animeData.slug,
                status: 'failed',
                response: null,
                error: error.message,
            });
            throw error;
        }
    }

    // --- FUNGSI GET/SEARCH (TIDAK BERUBAH) ---
    async getOngoingAnime(page = 1, limit = 10) {
        const pageInt = Math.max(1, parseInt(page) || 1);
        const limitInt = parseInt(limit) || 10;
        const skip = (pageInt - 1) * limitInt;

        const [data, total] = await Promise.all([
            prisma.anime.findMany({
                where: {
                    status: 'Ongoing',
                    animeSources: { some: { serverId: SERVER_ID } },
                },
                select: {
                    title: true,
                    slug: true,
                    posterUrl: true,
                    totalEpisodes: true,
                    type: true,
                    score: true,
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limitInt,
            }),
            prisma.anime.count({
                where: {
                    status: 'Ongoing',
                    type: { not: 'Movie' },
                    animeSources: { some: { serverId: SERVER_ID } },
                },
            }),
        ]);
        return { data, total };
    }

    async getCompletedAnime(page = 1, limit = 10) {
        const pageInt = Math.max(1, parseInt(page) || 1);
        const limitInt = parseInt(limit) || 10;
        const skip = (pageInt - 1) * limitInt;

        const [data, total] = await Promise.all([
            prisma.anime.findMany({
                where: {
                    status: 'Completed',
                    animeSources: { some: { serverId: SERVER_ID } },
                },
                select: {
                    title: true,
                    slug: true,
                    posterUrl: true,
                    totalEpisodes: true,
                    type: true,
                    score: true,
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limitInt,
            }),
            prisma.anime.count({
                where: {
                    status: 'Completed',
                    type: { not: 'Movie' },
                    animeSources: { some: { serverId: SERVER_ID } },
                },
            }),
        ]);
        return { data, total };
    }

    async getMovieAnime(page = 1, limit = 10) {
        const pageInt = Math.max(1, parseInt(page) || 1);
        const limitInt = parseInt(limit) || 10;
        const skip = (pageInt - 1) * limitInt;

        const [data, total] = await Promise.all([
            prisma.anime.findMany({
                where: {
                    type: 'Movie',
                    animeSources: { some: { serverId: SERVER_ID } },
                },
                select: {
                    title: true,
                    slug: true,
                    posterUrl: true,
                    score: true,
                    type: true,
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limitInt,
            }),
            prisma.anime.count({
                where: {
                    type: 'Movie',
                    animeSources: { some: { serverId: SERVER_ID } },
                },
            }),
        ]);
        return { data, total };
    }

    async getAnimeBySlug(slug) {
        return prisma.anime.findFirst({
            where: {
                slug,
                animeSources: { some: { serverId: SERVER_ID } },
            },
            include: {
                animeServerGenres: {
                    select: {
                        serverGenre: { select: { name: true, slug: true } },
                    },
                },
                episodes: {
                    orderBy: { episodeNumber: 'desc' },
                    include: { streams: true, downloads: true },
                },
            },
        });
    }

    async searchAnime({ q, status, type, page = 1, limit = 10 }) {
        const pageInt = Math.max(1, parseInt(page) || 1);
        const limitInt = parseInt(limit) || 10;
        const skip = (pageInt - 1) * limitInt;

        const where = {
            animeSources: { some: { serverId: SERVER_ID } },
        };

        if (q) {
            where.OR = [
                { title: { contains: q, mode: 'insensitive' } },
                { altTitle: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (status) where.status = status;
        if (type) where.type = type;

        const [data, total] = await Promise.all([
            prisma.anime.findMany({
                where,
                select: {
                    title: true,
                    slug: true,
                    posterUrl: true,
                    totalEpisodes: true,
                    type: true,
                    score: true,
                    status: true,
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limitInt,
            }),
            prisma.anime.count({ where }),
        ]);
        return { data, total };
    }

    async getAllAnime(page = 1, limit = 10, { genre, status, type, order } = {}) {
        const pageInt = Math.max(1, parseInt(page) || 1);
        const limitInt = parseInt(limit) || 10;
        const skip = (pageInt - 1) * limitInt;

        const where = {
            animeSources: { some: { serverId: SERVER_ID } },
        };

        if (status) {
            where.status = status;
        }

        if (type) {
            where.type = type;
        }

        if (genre) {
            where.animeServerGenres = {
                some: {
                    serverGenre: {
                        slug: genre
                    }
                }
            };
        }

        let orderBy = { updatedAt: 'desc' }; // Default: Latest Update
        if (order === 'a-z') orderBy = { title: 'asc' };
        else if (order === 'z-a') orderBy = { title: 'desc' };
        else if (order === 'newest') orderBy = { updatedAt: 'desc' };
        else if (order === 'oldest') orderBy = { updatedAt: 'asc' };
        else if (order === 'release_newest') orderBy = { createdAt: 'desc' };
        else if (order === 'release_oldest') orderBy = { createdAt: 'asc' };

        const [data, total] = await Promise.all([
            prisma.anime.findMany({
                where,
                select: {
                    title: true,
                    slug: true,
                    posterUrl: true,
                    status: true,
                    type: true,
                    totalEpisodes: true,
                    score: true,
                },
                orderBy,
                skip,
                take: limitInt,
            }),
            prisma.anime.count({ where }),
        ]);
        return { data, total };
    }

    async getGenres() {
        return prisma.serverGenre.findMany({
            where: {
                serverId: SERVER_ID,
                animeServerGenres: { some: {} },
            },
            select: { name: true, slug: true },
            orderBy: { name: 'asc' },
        });
    }

    async getAllSlugs() {
        const results = await prisma.anime.findMany({
            where: {
                animeSources: { some: { serverId: SERVER_ID } },
            },
            select: { slug: true },
        });
        return results.map((r) => r.slug);
    }

    // 2. Hapus anime (Jika di Oploverz sudah tidak ada)
    async createAnime(data) {
        return await prisma.$transaction(async (tx) => {
            // 1. Create/Connect Genres
            const genreIds = [];
            if (data.genres && Array.isArray(data.genres)) {
                for (const g of data.genres) {
                    let name, slug;
                    if (typeof g === 'string') {
                        name = g;
                        slug = g.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    } else {
                        name = g.name;
                        slug = g.slug || g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    }
                    
                    // Upsert Genre per Server (since ServerGenre is unique per server+slug)
                    let genre = await tx.serverGenre.findFirst({
                        where: { serverId: SERVER_ID, slug: slug }
                    });

                    if (!genre) {
                        genre = await tx.serverGenre.create({
                            data: {
                                serverId: SERVER_ID,
                                name: name,
                                slug: slug
                            }
                        });
                    }
                    genreIds.push(genre.id);
                }
            }

            // 2. Create Anime
            const anime = await tx.anime.create({
                data: {
                    title: data.title,
                    slug: data.slug,
                    altTitle: data.altTitle,
                    posterUrl: data.posterUrl,
                    synopsis: data.synopsis,
                    status: data.status || 'Ongoing',
                    season: data.season,
                    type: data.type || 'TV',
                    duration: data.duration,
                    rating: data.rating,
                    score: data.score,
                    studio: data.studio,
                    totalEpisodes: isNaN(parseInt(data.totalEpisodes)) ? null : parseInt(data.totalEpisodes),
                    
                    // Creates relations
                    animeSources: {
                        create: {
                             serverId: SERVER_ID,
                             sourceUrl: data.sourceUrl || null
                        }
                    },
                    episodes: data.episodes && Array.isArray(data.episodes) ? {
                        create: data.episodes.map(ep => ({
                            episodeNumber: parseFloat(ep.episodeNumber),
                            title: ep.title || `Episode ${ep.episodeNumber}`,
                            sourceUrl: ep.sourceUrl || null,
                            streams: {
                                create: ep.streams ? ep.streams.map(s => ({
                                    serverId: SERVER_ID,
                                    host: s.host || 'Default',
                                    quality: s.quality || 'SD',
                                    url: s.url
                                })) : []
                            },
                        downloads: {
                            create: ep.downloads ? ep.downloads.map(d => ({
                                format: d.format || 'mp4',
                                resolutions: d.resolutions || '720p',
                                host: d.host || 'Default',
                                url: d.url
                            })) : []
                        }
                        }))
                    } : undefined
                }
            });

            // 3. Link Genres
            if (genreIds.length > 0) {
                await tx.animeServerGenre.createMany({
                    data: genreIds.map(gid => ({
                        animeId: anime.id,
                        serverGenreId: gid
                    })),
                    skipDuplicates: true
                });
            }

            return anime;
        });
    }

    async deleteEpisode(animeId, episodeNumber) {
        return await prisma.episode.delete({
            where: {
                animeId_episodeNumber: {
                    animeId: animeId,
                    episodeNumber: parseFloat(episodeNumber)
                }
            }
        });
    }

    async deleteAnime(slug) {
        return prisma.anime.delete({
            where: { slug: slug },
        });
    }

    async updateEpisodeData(episodeId, data) {
        return await prisma.$transaction(async (tx) => {
            // 1. Update timestamp episode
            await tx.episode.update({
                where: { id: episodeId },
                data: { updatedAt: new Date() },
            });

            // 2. Refresh Streams (Hapus lama -> Insert baru)
            if (data.streaming && data.streaming.length > 0) {
                await tx.episodeStream.deleteMany({ where: { episodeId } });
                await tx.episodeStream.createMany({
                    data: data.streaming.map((s) => ({
                        episodeId,
                        serverId: SERVER_ID,
                        host: s.host.substring(0, 50),
                        quality: s.quality.substring(0, 100),
                        url: s.url,
                    })),
                });
            }

            // 3. Refresh Downloads (Hapus lama -> Insert baru)
            if (data.downloads && data.downloads.length > 0) {
                await tx.episodeDownload.deleteMany({ where: { episodeId } });
                const dlPayload = [];

                data.downloads.forEach((dl) => {
                    const format = (dl.format || 'MP4').substring(0, 50);
                    // Karena struktur output scraper agak beda (links array), kita flatten disini
                    if (dl.links && Array.isArray(dl.links)) {
                        dl.links.forEach((link) => {
                            dlPayload.push({
                                episodeId,
                                format: format,
                                resolutions: (dl.resolutions || 'Unknown').substring(0, 50),
                                host: link.host.substring(0, 50),
                                url: link.url,
                            });
                        });
                    }
                });

                if (dlPayload.length > 0) {
                    await tx.episodeDownload.createMany({ data: dlPayload });
                }
            }

            return true;
        });
    }
    async updateAnimeManual(slug, data) {
        return await prisma.$transaction(async (tx) => {
            // 1. Get Anime ID first
            const anime = await tx.anime.findUnique({ where: { slug } });
            if (!anime) throw new Error('Anime not found');

            // 2. Update Metadata
            const updatedAnime = await tx.anime.update({
                where: { slug },
                data: {
                    title: data.title,
                    posterUrl: data.posterUrl,
                    synopsis: data.synopsis,
                    status: data.status,
                    type: data.type,
                    rating: data.rating,
                    score: data.score,
                    studio: data.studio,
                    season: data.season,
                    duration: data.duration,
                    totalEpisodes: isNaN(parseInt(data.totalEpisodes)) ? null : parseInt(data.totalEpisodes),
                    updatedAt: new Date(),
                }
            });

            // 3. Sync Genres (Replace Strategy)
            if (data.genres && Array.isArray(data.genres)) {
                // Delete existing relations
                await tx.animeServerGenre.deleteMany({ where: { animeId: anime.id } });
                
                const genreIds = [];
                for (const g of data.genres) {
                    let name, genreSlug;
                    if (typeof g === 'string') {
                        name = g;
                        genreSlug = g.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    } else {
                        name = g.name;
                        genreSlug = g.slug || g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    }

                    // Upsert Genre
                    let genre = await tx.serverGenre.findFirst({
                         where: { serverId: SERVER_ID, slug: genreSlug }
                    });
                    if (!genre) {
                        genre = await tx.serverGenre.create({
                            data: { serverId: SERVER_ID, name, slug: genreSlug }
                        });
                    }
                    genreIds.push(genre.id);
                }

                // Create new relations
                if (genreIds.length > 0) {
                    await tx.animeServerGenre.createMany({
                        data: genreIds.map(gid => ({ animeId: anime.id, serverGenreId: gid })),
                        skipDuplicates: true
                    });
                }
            }

            // 4. Sync Episodes (Upsert + Replace Nested)
            if (data.episodes && Array.isArray(data.episodes)) {
               for (const ep of data.episodes) {
                   const epNum = parseFloat(ep.episodeNumber);
                   
                   // Upsert Episode
                   const episode = await tx.episode.upsert({
                       where: {
                           animeId_episodeNumber: { animeId: anime.id, episodeNumber: epNum }
                       },
                       update: {
                           title: ep.title || `Episode ${epNum}`,
                           sourceUrl: ep.sourceUrl || null,
                           updatedAt: new Date()
                       },
                       create: {
                           animeId: anime.id,
                           episodeNumber: epNum,
                           title: ep.title || `Episode ${epNum}`,
                           sourceUrl: ep.sourceUrl || null
                       }
                   });

                   // Sync Streams (Replace)
                   if (ep.streams && Array.isArray(ep.streams)) {
                       await tx.episodeStream.deleteMany({ where: { episodeId: episode.id } });
                       if (ep.streams.length > 0) {
                           await tx.episodeStream.createMany({
                               data: ep.streams.map(s => ({
                                   episodeId: episode.id,
                                   serverId: SERVER_ID,
                                   host: s.host || 'Default',
                                   quality: s.quality || 'SD',
                                   url: s.url
                               }))
                           });
                       }
                   }

                   // Sync Downloads (Replace)
                   if (ep.downloads && Array.isArray(ep.downloads)) {
                       await tx.episodeDownload.deleteMany({ where: { episodeId: episode.id } });
                       if (ep.downloads.length > 0) {
                           await tx.episodeDownload.createMany({
                               data: ep.downloads.map(d => ({
                                   episodeId: episode.id,
                                   format: d.format || 'mp4',
                                   resolutions: d.resolutions || '720p',
                                   host: d.host || 'Default',
                                   url: d.url
                               }))
                           });
                       }
                   }
               }
            }

            // 5. Return Full Object
            return await tx.anime.findUnique({
                where: { id: anime.id },
                include: {
                    animeServerGenres: { include: { serverGenre: true } },
                    episodes: {
                        orderBy: { episodeNumber: 'asc' },
                        include: { streams: true, downloads: true }
                    }
                }
            });
        });
    }

    async upsertEpisodeManual(slug, episodeData) {
        const anime = await prisma.anime.findUnique({ where: { slug } });
        if (!anime) throw new Error(`Anime with slug ${slug} not found`);

        const epNumVal = parseFloat(episodeData.episodeNumber);
        const safeEpNum = isNaN(epNumVal) ? 99999 : epNumVal;

        // Check availability for notification (Pre-Transaction check)
        const exists = await prisma.episode.findUnique({
            where: {
                animeId_episodeNumber: {
                    animeId: anime.id,
                    episodeNumber: safeEpNum,
                }
            },
            select: { id: true }
        });

        if (!exists) {
            notificationService.notifySubscribers('anime', anime.id, {
                title: `Episode Baru: ${anime.title}`,
                message: `Episode ${safeEpNum === 99999 ? 'Terbaru' : safeEpNum} dari ${anime.title} baru saja rilis!`,
                payload: {
                    slug: anime.slug,
                    episodeNumber: episodeData.episodeNumber
                }
            }).catch(err => console.error(`Notify Error: ${err.message}`));
        }

        return await prisma.$transaction(async (tx) => {
             const episode = await tx.episode.upsert({
                where: {
                    animeId_episodeNumber: {
                        animeId: anime.id,
                        episodeNumber: safeEpNum,
                    },
                },
                update: {
                    title: episodeData.title,
                    sourceUrl: episodeData.sourceUrl || '#',
                    updatedAt: new Date(),
                },
                create: {
                    animeId: anime.id,
                    episodeNumber: safeEpNum,
                    title: episodeData.title,
                    sourceUrl: episodeData.sourceUrl || '#',
                },
            });

            // Streams
            if (episodeData.streams && Array.isArray(episodeData.streams)) {
                await tx.episodeStream.deleteMany({ where: { episodeId: episode.id } });
                if (episodeData.streams.length > 0) {
                     await tx.episodeStream.createMany({
                        data: episodeData.streams.map((s) => ({
                            episodeId: episode.id,
                            serverId: SERVER_ID,
                            host: s.host,
                            quality: s.quality,
                            url: s.url,
                        })),
                    });
                }
            }

            // Downloads
            if (episodeData.downloads && Array.isArray(episodeData.downloads)) {
                await tx.episodeDownload.deleteMany({ where: { episodeId: episode.id } });
                const downloadsPayload = [];

                episodeData.downloads.forEach((dlGroup) => {
                    const format = (dlGroup.format || 'mp4').substring(0, 50);
                    
                    // Handle Nested Resolutions (from Scraper)
                    if (dlGroup.resolutions && Array.isArray(dlGroup.resolutions)) {
                        dlGroup.resolutions.forEach((res) => {
                            const quality = (res.quality || 'Unknown').substring(0, 50);
                            
                            // Handle Links array inside Resolution
                            if (res.links && Array.isArray(res.links)) {
                                res.links.forEach((link) => {
                                    if (link.url && link.url.trim() !== '') {
                                        downloadsPayload.push({
                                            episodeId: episode.id,
                                            format: format,
                                            resolutions: quality,
                                            host: (link.host || 'Unknown').substring(0, 50),
                                            url: link.url,
                                        });
                                    }
                                });
                            }
                        });
                    } 
                    // Handle Flat Structure (if passed differently)
                    else if (dlGroup.url) {
                         downloadsPayload.push({
                            episodeId: episode.id,
                            format: format,
                            resolutions: (dlGroup.resolutions || '720p').substring(0, 50),
                            host: (dlGroup.host || 'Default').substring(0, 50),
                            url: dlGroup.url
                        });
                    }
                });

                if (downloadsPayload.length > 0) {
                    await tx.episodeDownload.createMany({
                        data: downloadsPayload
                    });
                }
            }
            
            
            // 4. Update Auto Total Episodes
            const totalEpisodes = await tx.episode.count({
                where: { animeId: anime.id }
            });
            
            await tx.anime.update({
                where: { id: anime.id },
                data: { totalEpisodes: totalEpisodes }
            });

            return episode;
        });
    }
    async getAnimeById(id) {
        return prisma.anime.findUnique({
            where: { id },
            include: {
                animeServerGenres: {
                    select: {
                        serverGenre: { select: { name: true, slug: true } },
                    },
                },
                episodes: {
                    orderBy: { episodeNumber: 'desc' },
                    include: { streams: true, downloads: true },
                },
            },
        });
    }
}

module.exports = new OploverzRepository();
