const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { withRetry } = require('../utils/retryHelper');

const SERVER_ID = 1;

function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function detectQuality(url, providedQuality) {
    // Check if a valid quality is provided directly
    if (providedQuality && providedQuality.toLowerCase() !== 'unknown') {
        return providedQuality.toLowerCase();
    }

    // If not, try to extract quality from the URL
    const qualityMatch = url.match(/(360|480|720|1080)p/i);
    if (qualityMatch) {
        return qualityMatch[0].toLowerCase();
    }

    // If still no quality found, return a professional fallback
    return 'Default';
}

class KuramanimeRepository {
    async countAll() {
        return prisma.anime.count();
    }

    async upsertEpisodeOnly(animeServerId, episode) {
        if (!episode?.url) {
            throw new Error(`Episode ${episode.episodeNumber} missing url`);
        }

        const episodeRecord = await prisma.episode.upsert({
            where: {
                animeServerId_episodeNumber: {
                    animeServerId,
                    episodeNumber: episode.episodeNumber,
                },
            },
            create: {
                animeServerId,
                episodeNumber: episode.episodeNumber,
                title: episode.title || `Episode ${episode.episodeNumber}`,
                url: episode.url,
            },
            update: {
                title: episode.title || `Episode ${episode.episodeNumber}`,
                url: episode.url,
            },
        });
        return episodeRecord;
    }

    async upsertEpisodeStreams(episodeId, streams) {
        if (!streams || streams.length === 0) {
            return;
        }

        const qualityPriority = {
            '1080p': 1,
            '720p': 2,
            '480p': 3,
            '360p': 4,
            Default: 5,
        };

        const streamData = streams.map((stream) => {
            const quality = detectQuality(stream.url, stream.quality);
            return {
                episodeId,
                url: stream.url,
                quality: quality,
                priority: qualityPriority[quality] || qualityPriority['Default'],
            };
        });

        // Use a transaction to delete old streams and create new ones
        await prisma.$transaction([
            prisma.episodeStream.deleteMany({ where: { episodeId } }),
            prisma.episodeStream.createMany({
                data: streamData,
                skipDuplicates: true,
            }),
        ]);
    }

    async upsertAnime(animeData, serverId) {
        try {
            const existingAnime = await withRetry(
                async () =>
                    prisma.anime.findUnique({
                        where: { slug: animeData.slug },
                        include: {
                            animeServers: {
                                where: { serverId },
                                include: {
                                    episodes: {
                                        select: { episodeNumber: true },
                                    },
                                },
                            },
                        },
                    }),
                3,
                1000,
                `findUnique for anime slug ${animeData.slug}`,
            );

            const existingServer = existingAnime?.animeServers[0];
            let episodesToProcess = animeData.episodeList;
            const statusChanged = existingServer && existingServer.status !== animeData.status;

            if (existingServer) {
                const existingEpisodeNumbers = new Set(existingServer.episodes.map((e) => e.episodeNumber));
                const newEpisodes = animeData.episodeList.filter((ep) => !existingEpisodeNumbers.has(ep.episodeNumber));

                if (newEpisodes.length === 0 && !statusChanged) {
                    return { status: 'skipped', data: existingServer, episodesToProcess: [] };
                }
                episodesToProcess = newEpisodes;
            }

            const isUpdate = !!existingAnime;
            const { anime, animeServer } = await withRetry(
                async () =>
                    prisma.$transaction(async (tx) => {
                        const animeRecord = await tx.anime.upsert({
                            where: { slug: animeData.slug },
                            create: {
                                title: animeData.title,
                                slug: animeData.slug,
                                altTitle: animeData.alt_title,
                                posterUrl: animeData.poster_url,
                                synopsis: animeData.synopsis,
                                totalEpisodes: animeData.totalEpisodes,
                            },
                            update: {
                                totalEpisodes: animeData.totalEpisodes,
                                posterUrl: animeData.poster_url,
                                synopsis: animeData.synopsis,
                            },
                        });

                        const animeServerRecord = await tx.animeServer.upsert({
                            where: { serverId_slug: { serverId: serverId, slug: animeData.slug } },
                            create: {
                                title: animeData.title,
                                slug: animeData.slug,
                                posterUrl: animeData.poster_url,
                                synopsis: animeData.synopsis,
                                status: animeData.status,
                                type: animeData.type,
                                season: animeData.musim,
                                duration: animeData.durasi,
                                quality: animeData.kualitas,
                                score: String(animeData.score || '0'),
                                rating: animeData.rating,
                                country: animeData.country,
                                sourceUrl: animeData.link,
                                scrapedAt: new Date(),
                                anime: { connect: { id: animeRecord.id } },
                                server: { connect: { id: serverId } },
                            },
                            update: {
                                status: animeData.status,
                                type: animeData.type,
                                season: animeData.musim,
                                score: String(animeData.score || '0'),
                                sourceUrl: animeData.link,
                                scrapedAt: new Date(),
                            },
                        });
                        return { anime: animeRecord, animeServer: animeServerRecord };
                    }),
                3,
                1000,
                `prisma transaction for anime ${animeData.title}`,
            );

            const genreNames = animeData.genres || [];
            if (genreNames.length > 0) {
                const genreSlugs = genreNames.map(slugify);
                await withRetry(
                    async () =>
                        Promise.all(
                            genreNames.map((name, index) =>
                                prisma.serverGenre.upsert({
                                    where: { serverId_slug: { serverId: serverId, slug: genreSlugs[index] } },
                                    create: { serverId: serverId, name: name, slug: genreSlugs[index] },
                                    update: { name: name },
                                }),
                            ),
                        ),
                    3,
                    1000,
                    `upserting genres for anime ${animeData.title}`,
                );
                const serverGenres = await withRetry(
                    async () =>
                        prisma.serverGenre.findMany({
                            where: { serverId: serverId, slug: { in: genreSlugs } },
                        }),
                    3,
                    1000,
                    `finding server genres for anime ${animeData.title}`,
                );
                await withRetry(
                    async () => prisma.animeServerGenre.deleteMany({ where: { animeServerId: animeServer.id } }),
                    3,
                    1000,
                    `deleting old animeServerGenres for anime ${animeData.title}`,
                );
                await withRetry(
                    async () =>
                        prisma.animeServerGenre.createMany({
                            data: serverGenres.map((sg) => ({
                                animeServerId: animeServer.id,
                                serverGenreId: sg.id,
                            })),
                        }),
                    3,
                    1000,
                    `creating new animeServerGenres for anime ${animeData.title}`,
                );
            }

            return {
                status: isUpdate ? 'updated' : 'created',
                data: animeServer,
                episodesToProcess: episodesToProcess,
            };
        } catch (error) {
            logger.error(`Upsert process failed for anime '${animeData.title}': ${error.message}`);
            throw error;
        }
    }

    async getAnimeByStatus(status, page = 1, limit = 10) {
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const skip = (pageNum - 1) * limitNum;

        const where = { serverId: SERVER_ID, status };

        const [results, total] = await prisma.$transaction([
            prisma.animeServer.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip: skip,
                take: limitNum,
                select: {
                    title: true,
                    slug: true,
                    posterUrl: true,
                    status: true,
                    score: true,
                    type: true,
                    anime: {
                        select: {
                            totalEpisodes: true,
                        },
                    },
                },
            }),
            prisma.animeServer.count({ where }),
        ]);

        const anime = results.map((item) => ({
            title: item.title,
            slug: item.slug,
            posterUrl: item.posterUrl,
            status: item.status,
            score: item.score,
            type: item.type,
            totalEpisodes: item.anime ? item.anime.totalEpisodes : 0,
        }));

        return { anime, total };
    }

    async getAnimeByType(type, page = 1, limit = 10) {
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const skip = (pageNum - 1) * limitNum;

        const where = { serverId: SERVER_ID, type };

        const [results, total] = await prisma.$transaction([
            prisma.animeServer.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip: skip,
                take: limitNum,
                select: {
                    title: true,
                    slug: true,
                    posterUrl: true,
                    status: true,
                    score: true,
                    type: true,
                    anime: {
                        select: {
                            totalEpisodes: true,
                        },
                    },
                },
            }),
            prisma.animeServer.count({ where }),
        ]);

        const anime = results.map((item) => ({
            title: item.title,
            slug: item.slug,
            posterUrl: item.posterUrl,
            status: item.status,
            score: item.score,
            type: item.type,
            totalEpisodes: item.anime ? item.anime.totalEpisodes : 0,
        }));

        return { anime, total };
    }

    async getOngoingAnime(page = 1, limit = 10) {
        return this.getAnimeByStatus('Sedang Tayang', page, limit);
    }

    async getAllOngoingAnime() {
        const results = await prisma.animeServer.findMany({
            where: { serverId: SERVER_ID, status: 'Sedang Tayang' },
            orderBy: { updatedAt: 'desc' },
            select: {
                title: true,
                slug: true,
                posterUrl: true,
                status: true,
                score: true,
                type: true,
                anime: {
                    select: { totalEpisodes: true },
                },
            },
        });

        return results.map((item) => ({
            title: item.title,
            slug: item.slug,
            posterUrl: item.posterUrl,
            status: item.status,
            score: item.score,
            type: item.type,
            totalEpisodes: item.anime ? item.anime.totalEpisodes : 0,
        }));
    }

    async getFinishedAnime(page = 1, limit = 10) {
        return this.getAnimeByStatus('Selesai Tayang', page, limit);
    }

    async getAllFinishedAnime() {
        const results = await prisma.animeServer.findMany({
            where: { serverId: SERVER_ID, status: 'Selesai Tayang' },
            orderBy: { updatedAt: 'desc' },
            select: {
                title: true,
                slug: true,
                posterUrl: true,
                status: true,
                score: true,
                type: true,
                anime: {
                    select: { totalEpisodes: true },
                },
            },
        });

        return results.map((item) => ({
            title: item.title,
            slug: item.slug,
            posterUrl: item.posterUrl,
            status: item.status,
            score: item.score,
            type: item.type,
            totalEpisodes: item.anime ? item.anime.totalEpisodes : 0,
        }));
    }

    async getMovieAnime(page = 1, limit = 10) {
        return this.getAnimeByType('Movie', page, limit);
    }

    async getAllMovieAnime() {
        const results = await prisma.animeServer.findMany({
            where: { serverId: SERVER_ID, type: 'Movie' },
            orderBy: { updatedAt: 'desc' },
            select: {
                title: true,
                slug: true,
                posterUrl: true,
                status: true,
                score: true,
                type: true,
                anime: {
                    select: { totalEpisodes: true },
                },
            },
        });

        return results.map((item) => ({
            title: item.title,
            slug: item.slug,
            posterUrl: item.posterUrl,
            status: item.status,
            score: item.score,
            type: item.type,
            totalEpisodes: item.anime ? item.anime.totalEpisodes : 0,
        }));
    }

    async getAnimeBySlug(slug) {
        const anime = await prisma.animeServer.findUnique({
            where: { serverId_slug: { serverId: SERVER_ID, slug } },
            select: {
                title: true,
                slug: true,
                posterUrl: true,
                synopsis: true,
                status: true,
                type: true,
                season: true,
                duration: true,
                quality: true,
                rating: true,
                score: true,
                country: true,
                server: {
                    select: {
                        id: true,
                        name: true,
                        url: true,
                        type: true,
                        isActive: true,
                    },
                },
                episodes: {
                    orderBy: { episodeNumber: 'asc' },
                    select: {
                        episodeNumber: true,
                        title: true,
                        url: true,
                        // streams: {
                        //     orderBy: { priority: 'desc' },
                        //     select: {
                        //         quality: true,
                        //         url: true,
                        //         updatedAt: true,
                        //     },
                        // },
                    },
                },
                genres: {
                    select: {
                        serverGenre: {
                            select: { name: true, slug: true },
                        },
                    },
                },
                anime: {
                    select: {
                        altTitle: true,
                        totalEpisodes: true,
                    },
                },
            },
        });

        if (anime && anime.genres) {
            anime.genres = anime.genres.map((g) => g.serverGenre);
        }

        return anime;
    }

    async searchAnime(filters) {
        const { q, genre, status, type, page = 1, limit = 20 } = filters;
        const where = { serverId: SERVER_ID };

        if (q) {
            where.OR = [
                { title: { contains: q, mode: 'insensitive' } },
                { anime: { altTitle: { contains: q, mode: 'insensitive' } } },
                { anime: { title: { contains: q, mode: 'insensitive' } } },
            ];
        }
        if (status) where.status = status;
        if (type) where.type = type;
        if (genre) {
            where.genres = {
                some: { serverGenre: { slug: genre } },
            };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [results, total] = await prisma.$transaction([
            prisma.animeServer.findMany({
                where,
                skip,
                take,
                orderBy: { updatedAt: 'desc' },
                select: {
                    title: true,
                    slug: true,
                    posterUrl: true,
                    status: true,
                    score: true,
                    type: true,
                    anime: {
                        select: {
                            totalEpisodes: true,
                        },
                    },
                },
            }),
            prisma.animeServer.count({ where }),
        ]);

        const anime = results.map((item) => ({
            title: item.title,
            slug: item.slug,
            posterUrl: item.posterUrl,
            status: item.status,
            score: item.score,
            type: item.type,
            totalEpisodes: item.anime ? item.anime.totalEpisodes : 0,
        }));

        return { anime, total, page: Number(page), limit: Number(limit) };
    }
    async getRandomAnime() {
        const count = await prisma.animeServer.count({
            where: { serverId: SERVER_ID },
        });
        if (count === 0) {
            return null;
        }
        const skip = Math.floor(Math.random() * count);
        const randomAnime = await prisma.animeServer.findMany({
            where: { serverId: SERVER_ID },
            take: 1,
            skip: skip,
            select: {
                id: true,
                title: true,
                slug: true,
                posterUrl: true,
                synopsis: true,
                status: true,
                type: true,
                season: true,
                duration: true,
                quality: true,
                rating: true,
                score: true,
                country: true,
                server: {
                    select: {
                        id: true,
                        name: true,
                        url: true,
                        type: true,
                        isActive: true,
                    },
                },
                episodes: {
                    orderBy: { episodeNumber: 'asc' },
                    select: {
                        episodeNumber: true,
                        title: true,
                        url: true,
                        streams: {
                            orderBy: { priority: 'desc' },
                            select: {
                                quality: true,
                                url: true,
                                updatedAt: true,
                            },
                        },
                    },
                },
                genres: {
                    select: {
                        serverGenre: {
                            select: { name: true, slug: true },
                        },
                    },
                },
                anime: {
                    select: {
                        altTitle: true,
                        totalEpisodes: true,
                    },
                },
            },
        });

        if (randomAnime.length > 0) {
            const anime = randomAnime[0];
            if (anime && anime.genres) {
                anime.genres = anime.genres.map((g) => g.serverGenre);
            }
            return anime;
        }
        return null;
    }
}

module.exports = new KuramanimeRepository();
