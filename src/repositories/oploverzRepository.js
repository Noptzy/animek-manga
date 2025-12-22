const prisma = require('../config/prisma');
const ScrapeLogRepository = require('./scrapeLogRepository');

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
            // ============================================================
            // TAHAP 1: SIMPAN METADATA ANIME (JUDUL, GENRE, POSTER)
            // ============================================================
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

            // ============================================================
            // TAHAP 2: CLEANUP EPISODES (HAPUS YANG TIDAK VALID)
            // ============================================================
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

            // ============================================================
            // TAHAP 3: SIMPAN EPISODE BARU
            // ============================================================
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

            return savedAnime;
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

    async getAllAnime(page = 1, limit = 10) {
        const pageInt = Math.max(1, parseInt(page) || 1);
        const limitInt = parseInt(limit) || 10;
        const skip = (pageInt - 1) * limitInt;

        const where = {
            animeSources: { some: { serverId: SERVER_ID } },
        };

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
                orderBy: { updatedAt: 'desc' },
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
}

module.exports = new OploverzRepository();
