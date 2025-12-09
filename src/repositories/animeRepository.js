const prisma = require('../config/prisma');
const logger = require('../utils/logger');

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

class AnimeRepository {
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

            // Delete old streams and insert new ones
            await tx.episodeStream.deleteMany({
                where: { episodeId: episode.id },
            });

            await tx.episodeStream.createMany({
                data: streams.map(stream => ({
                    episodeId: episode.id,
                    quality: stream.resolution,
                    url: stream.url,
                    isEmbed: stream.resolution === 'embed',
                    serverName: 'kuramadrive', // or derive from data if available
                })),
            });
            return episode;
        });
    }

    async upsertAnime(animeData, serverId) {
        try {
            const existingAnime = await prisma.anime.findUnique({
                where: { slug: animeData.slug },
            });

            // Skip if the total number of episodes hasn't changed.
            if (existingAnime && existingAnime.totalEpisodes >= animeData.totalEpisodes) {
                return { status: 'skipped', data: { ...existingAnime, id: (await prisma.animeServer.findFirst({where: {animeId: existingAnime.id, serverId: serverId}}))?.id } };
            }

            const isUpdate = !!existingAnime;

            const { anime, animeServer } = await prisma.$transaction(async (tx) => {
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
                    },
                });

                const animeServerRecord = await tx.animeServer.upsert({
                    where: {
                        serverId_slug: { serverId: serverId, slug: animeData.slug },
                    },
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

            return { status: isUpdate ? 'updated' : 'created', data: animeServer };
        } catch (error) {
            logger.error(`Upsert process failed for anime '${animeData.title}': ${error.message}`);
            throw error;
        }
    }
}

module.exports = new AnimeRepository();