const prisma = require('../config/prisma');
const logger = require('../utils/logger');

async function cleanupDuplicateMangas() {
    logger.info('Starting duplicate manga cleanup process...');

    try {
        const allMangas = await prisma.manga.findMany({
            orderBy: {
                updatedAt: 'desc',
            },
        });

        const mangasByTitle = allMangas.reduce((acc, manga) => {
            if (!acc[manga.title]) {
                acc[manga.title] = [];
            }
            acc[manga.title].push(manga);
            return acc;
        }, {});

        let totalMerged = 0;
        let totalDeleted = 0;

        for (const title in mangasByTitle) {
            const mangas = mangasByTitle[title];
            if (mangas.length <= 1) {
                continue;
            }

            logger.info(`Found ${mangas.length} duplicates for title: "${title}"`);

            // Sort to ensure the first one is the canonical version (e.g., most recently updated)
            const sortedMangas = mangas.sort((a, b) => {
                const aIsDecoded = a.slug === decodeURIComponent(a.slug);
                const bIsDecoded = b.slug === decodeURIComponent(b.slug);
                if (aIsDecoded && !bIsDecoded) return -1;
                if (!aIsDecoded && bIsDecoded) return 1;
                return b.updatedAt - a.updatedAt;
            });
            

            const canonicalManga = sortedMangas[0];
            const duplicateMangas = sortedMangas.slice(1);

            logger.info(`Canonical manga: ${canonicalManga.slug} (ID: ${canonicalManga.id})`);

            for (const duplicate of duplicateMangas) {
                logger.info(`Processing duplicate: ${duplicate.slug} (ID: ${duplicate.id})`);

                // 1. Handle chapter merging to avoid unique constraint errors
                const canonicalChapters = await prisma.chapter.findMany({
                    where: { mangaId: canonicalManga.id },
                    select: { chapterIndex: true },
                });
                const canonicalChapterIndexes = new Set(canonicalChapters.map(c => c.chapterIndex));

                const duplicateChapters = await prisma.chapter.findMany({
                    where: { mangaId: duplicate.id },
                });

                const conflictingChapters = [];
                const nonConflictingChapters = [];

                for (const chap of duplicateChapters) {
                    if (canonicalChapterIndexes.has(chap.chapterIndex)) {
                        conflictingChapters.push(chap);
                    } else {
                        nonConflictingChapters.push(chap);
                    }
                }

                if (conflictingChapters.length > 0) {
                    const conflictingChapterIds = conflictingChapters.map(c => c.id);
                    await prisma.chapter.deleteMany({
                        where: { id: { in: conflictingChapterIds } },
                    });
                    logger.info(`  - Deleted ${conflictingChapters.length} conflicting chapters.`);
                }

                if (nonConflictingChapters.length > 0) {
                    const nonConflictingChapterIds = nonConflictingChapters.map(c => c.id);
                    await prisma.chapter.updateMany({
                        where: { id: { in: nonConflictingChapterIds } },
                        data: { mangaId: canonicalManga.id },
                    });
                    logger.info(`  - Moved ${nonConflictingChapters.length} non-conflicting chapters.`);
                }
                
                // 2. Re-link genres (MangaGenre) - find genres on duplicate not on canonical
                const duplicateGenres = await prisma.mangaGenre.findMany({ where: { mangaId: duplicate.id }});
                const canonicalGenres = await prisma.mangaGenre.findMany({ where: { mangaId: canonicalManga.id }});
                const canonicalGenreIds = new Set(canonicalGenres.map(g => g.genreId));

                const missingGenres = duplicateGenres.filter(g => !canonicalGenreIds.has(g.genreId));
                if (missingGenres.length > 0) {
                    await prisma.mangaGenre.createMany({
                        data: missingGenres.map(g => ({
                            mangaId: canonicalManga.id,
                            genreId: g.genreId
                        })),
                        skipDuplicates: true,
                    });
                    logger.info(`  - Merged ${missingGenres.length} genres.`);
                }

                // 3. Delete the duplicate manga record
                await prisma.manga.delete({
                    where: { id: duplicate.id },
                });
                logger.info(`  - Deleted duplicate manga record.`);
                totalDeleted++;
            }
            totalMerged += duplicateMangas.length;
        }

        logger.info('-----------------------------------------');
        logger.info('Cleanup process finished.');
        logger.info(`Total titles with duplicates: ${Object.values(mangasByTitle).filter(m => m.length > 1).length}`);
        logger.info(`Total duplicate manga records merged/deleted: ${totalDeleted}`);
        logger.info('-----------------------------------------');


    } catch (error) {
        logger.error('An error occurred during the cleanup process:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupDuplicateMangas();
