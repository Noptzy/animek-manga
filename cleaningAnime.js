require('dotenv').config();

const prisma = require('./src/config/prisma');
const logger = require('./src/utils/logger');

async function cleanupNonJPAnime() {
    const nonJPAnimeServers = await prisma.animeServer.findMany({
        where: {
            country: {
                not: 'JP',
            },
        },
        select: {
            id: true,
            slug: true,
        },
    });

    if (nonJPAnimeServers.length === 0) {
        logger.info('No non-JP anime found');
        process.exit(0);
    }

    const animeServerIds = nonJPAnimeServers.map((a) => a.id);

    logger.info(`Deleting ${animeServerIds.length} non-JP anime servers`);

    await prisma.$transaction([
        prisma.episodeStream.deleteMany({
            where: {
                episode: {
                    animeServerId: {
                        in: animeServerIds,
                    },
                },
            },
        }),

        prisma.episode.deleteMany({
            where: {
                animeServerId: {
                    in: animeServerIds,
                },
            },
        }),

        prisma.animeServerGenre.deleteMany({
            where: {
                animeServerId: {
                    in: animeServerIds,
                },
            },
        }),

        prisma.animeServer.deleteMany({
            where: {
                id: {
                    in: animeServerIds,
                },
            },
        }),
    ]);

    const orphanAnimes = await prisma.anime.findMany({
        where: {
            animeServers: {
                none: {},
            },
        },
        select: { id: true },
    });

    if (orphanAnimes.length > 0) {
        await prisma.anime.deleteMany({
            where: {
                id: {
                    in: orphanAnimes.map((a) => a.id),
                },
            },
        });
    }

    logger.info('Non-JP anime cleanup completed');
    process.exit(0);
}

cleanupNonJPAnime().catch((err) => {
    logger.error(err.message);
    process.exit(1);
});
