const prisma = require('../config/prisma');
const logger = require('../utils/logger');

const SERVER_ID = 1; // Hardcode server ID for now

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

class KuramanimeRepository {

    // Existing functions from the original file
    async countAll() {
        return prisma.anime.count();
    }

    async upsertEpisodeWithStreams(animeServerId, episodeInfo, streams) {
        if (!streams || streams.length === 0) {
            logger.warn(`[DB-EP] No streams found for Ep. ${episodeInfo.episodeNumber} of animeServerId ${animeServerId}. Skipping.`);
            return;
        }

        return prisma.$transaction(async (tx) => {
            const episode = await tx.episode.upsert({
                where: {
                    animeServerId_episodeNumber: {
                        animeServerId: animeServerId,
                        episodeNumber: episodeInfo.episodeNumber,
                    },
                },
                create: {
                    animeServerId: animeServerId,
                    episodeNumber: episodeInfo.episodeNumber,
                    title: episodeInfo.title,
                    url: episodeInfo.url,
                },
                update: {
                    title: episodeInfo.title,
                    url: episodeInfo.url,
                },
            });

            await tx.episodeStream.deleteMany({
                where: { episodeId: episode.id },
            });

            await tx.episodeStream.createMany({
                data: streams.map(stream => ({
                    episodeId: episode.id,
                    quality: stream.resolution,
                    url: stream.url,
                    isEmbed: stream.resolution === 'embed',
                    serverName: 'kuramadrive',
                })),
            });
            return episode;
        });
    }

    async upsertAnime(animeData, serverId) {
    try {
        const existingAnime = await prisma.anime.findUnique({
            where: { slug: animeData.slug },
            include: {
                animeServers: {
                    where: { serverId },
                    include: {
                        episodes: {
                            select: { episodeNumber: true }
                        }
                    }
                }
            }
        });

        const existingServer = existingAnime?.animeServers[0];
        let episodesToProcess = animeData.episodeList;
        const statusChanged = existingServer && existingServer.status !== animeData.status;

        if (existingServer) {
            const existingEpisodeNumbers = new Set(existingServer.episodes.map(e => e.episodeNumber));
            const newEpisodes = animeData.episodeList.filter(ep => !existingEpisodeNumbers.has(ep.episodeNumber));

            if (newEpisodes.length === 0 && !statusChanged) {
                return { status: 'skipped', data: existingServer, episodesToProcess: [] };
            }
            episodesToProcess = newEpisodes;
        }

        const isUpdate = !!existingAnime;
        const { anime, animeServer } = await prisma.$transaction(async (tx) => {
            const animeRecord = await tx.anime.upsert({
                where: { slug: animeData.slug },
                create: {
                    title: animeData.title, slug: animeData.slug, altTitle: animeData.alt_title,
                    posterUrl: animeData.poster_url, synopsis: animeData.synopsis,
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
                    title: animeData.title, slug: animeData.slug, posterUrl: animeData.poster_url,
                    synopsis: animeData.synopsis, status: animeData.status, type: animeData.type,
                    season: animeData.musim, duration: animeData.durasi, quality: animeData.kualitas,
                    score: String(animeData.score || '0'), rating: animeData.rating, country: animeData.country,
                    sourceUrl: animeData.link, scrapedAt: new Date(),
                    anime: { connect: { id: animeRecord.id } },
                    server: { connect: { id: serverId } },
                },
                update: {
                    status: animeData.status, type: animeData.type, season: animeData.musim,
                    score: String(animeData.score || '0'), sourceUrl: animeData.link, scrapedAt: new Date(),
                },
            });
            return { anime: animeRecord, animeServer: animeServerRecord };
        });

        const genreNames = animeData.genres || [];
        if (genreNames.length > 0) {
            const genreSlugs = genreNames.map(slugify);
            await Promise.all(
                genreNames.map((name, index) =>
                    prisma.serverGenre.upsert({
                        where: { serverId_slug: { serverId: serverId, slug: genreSlugs[index] } },
                        create: { serverId: serverId, name: name, slug: genreSlugs[index] },
                        update: { name: name },
                    })
                )
            );
            const serverGenres = await prisma.serverGenre.findMany({
                where: { serverId: serverId, slug: { in: genreSlugs } },
            });
            await prisma.animeServerGenre.deleteMany({ where: { animeServerId: animeServer.id } });
            await prisma.animeServerGenre.createMany({
                data: serverGenres.map((sg) => ({
                    animeServerId: animeServer.id,
                    serverGenreId: sg.id,
                })),
            });
        }

        return {
            status: isUpdate ? 'updated' : 'created',
            data: animeServer,
            episodesToProcess: episodesToProcess
        };
    } catch (error) {
        logger.error(`Upsert process failed for anime '${animeData.title}': ${error.message}`);
        throw error;
    }
}

    async getAnimes(filters = {}) {
        const { page = 1, limit = 24, status, genres, type, rating } = filters;
        const take = parseInt(limit);
        const skip = (parseInt(page) - 1) * take;

        const where = { serverId: SERVER_ID };

        const statusMap = {
            ongoing: 'Sedang Tayang',
            completed: 'Selesai Tayang',
            finished: 'Selesai Tayang',
        };

        if (status && statusMap[status.toLowerCase()]) {
            where.status = statusMap[status.toLowerCase()];
        }
        
        if (status && status.toLowerCase() === 'movie') {
            where.type = 'Movie';
        }

        if (type) {
            where.type = type;
        }

        if (rating) {
            where.rating = { contains: rating, mode: 'insensitive' };
        }

        if (genres) {
            const genreSlugs = genres.split(',').map(g => g.trim()).filter(Boolean);
            if (genreSlugs.length > 0) {
                where.genres = {
                    some: {
                        serverGenre: {
                            slug: { in: genreSlugs },
                        },
                    },
                };
            }
        }

        const animes = await prisma.animeServer.findMany({
            where,
            take,
            skip,
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                anime: true,
                genres: {
                    include: {
                        serverGenre: true,
                    },
                },
            },
        });

        const total = await prisma.animeServer.count({ where });

        return {
            data: animes,
            total,
            page: parseInt(page),
            limit: take,
            totalPages: Math.ceil(total / take),
        };
    }

    async getAnimeBySlug(slug) {
        return prisma.animeServer.findFirst({
            where: {
                slug: slug,
                serverId: SERVER_ID,
            },
            include: {
                anime: true, 
                genres: {
                    include: {
                        serverGenre: true,
                    },
                },
                episodes: {
                    orderBy: {
                        episodeNumber: 'asc',
                    },
                },
            },
        });
    }

    async getAnimeEpisodeStream(slug, episodeNumber) {
        const epNum = parseFloat(episodeNumber);
        if (isNaN(epNum)) {
            return null;
        }

        return prisma.episode.findFirst({
            where: {
                episodeNumber: epNum,
                animeServer: {
                    slug: slug,
                    serverId: SERVER_ID,
                },
            },
            include: {
                streams: {
                    orderBy: {
                        quality: 'desc'
                    }
                },
            },
        });
    }
}

module.exports = new KuramanimeRepository();
