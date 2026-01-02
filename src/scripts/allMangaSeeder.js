const MangaScrap = require('../scrap/manga/komikIndoScrap.js');
const mangaRepository = require('../repositories/mangaRepository.js');
const scrapeLogRepository = require('../repositories/scrapeLogRepository.js');
const logger = require('../utils/logger');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function processMangaList(mangaList, source) {
    for (const manga of mangaList) {
        if (!manga.slug) {
            logger.warning('Menemukan manga tanpa slug, dilewati:', manga.title);
            continue;
        }

        const endpoint = `/komik/${manga.slug}/`;
        try {
            logger.info(`Mengambil detail untuk: ${manga.slug}`);
            const detailData = await MangaScrap.getKomikIndoDetail(manga.slug);

            if (detailData) {
                const savedManga = await mangaRepository.upsertManga(detailData);
                logger.info(`Berhasil menyimpan: ${savedManga.title}`);

                await scrapeLogRepository.createLog({
                    source,
                    endpoint,
                    slug: manga.slug,
                    status: 'success',
                    response: { 
                        title: savedManga.title, 
                        chaptersProcessed: detailData.chapters?.length || 0 
                    },
                });
            } else {
                throw new Error('Data detail yang diterima null');
            }
        } catch (error) {
            logger.error(`Gagal memproses slug ${manga.slug}: ${error.message}`);
            await scrapeLogRepository.createLog({
                source,
                endpoint,
                slug: manga.slug,
                status: 'failed',
                error: error.message,
            });
        }
        
        await delay(1000); 
    }
}

async function seedAllManga() {
    let currentPage = 1;
    let hasNextPage = true;
    const source = 'manga_seeder';
    let consecutiveEmptyPages = 0;

    logger.info('--- MEMULAI SEEDING SEMUA MANGA ---');

    // We can't use page 1000, so we will loop through all pages.
    // The scraper doesn't support a page size parameter.
    // This will go through all pages one by one.
    while (hasNextPage) {
        const endpoint = `/manga/page/${currentPage}/`;
        logger.info(`Memproses halaman: ${currentPage}`);

        try {
            const pageData = await MangaScrap.getKomikIndoManga(currentPage);

            if (!pageData || !pageData.data || pageData.data.length === 0) {
                consecutiveEmptyPages++;
                logger.warning(`Tidak ada data di halaman ${currentPage}. Halaman kosong berturut-turut: ${consecutiveEmptyPages}`);
                if (consecutiveEmptyPages >= 3) {
                    logger.info('Ditemukan 3 halaman kosong berturut-turut, proses dihentikan.');
                    hasNextPage = false;
                } else {
                    currentPage++;
                }
                continue;
            }
            
            consecutiveEmptyPages = 0;

            await processMangaList(pageData.data, source);

            hasNextPage = pageData.hasNext;
            if (hasNextPage) {
                currentPage = pageData.next_page_num || (currentPage + 1);
                logger.info(`Lanjut ke halaman ${currentPage}`);
            } else {
                logger.info('Tidak ada halaman berikutnya.');
            }
            await delay(2000);

        } catch (error) {
            logger.error(`Gagal mengambil data halaman ${currentPage}: ${error.message}`);
            await scrapeLogRepository.createLog({
                source,
                endpoint,
                status: 'failed',
                error: `Gagal memuat halaman list: ${error.message}`,
            });
            hasNextPage = false; 
        }
    }

    logger.info('--- SEEDING SEMUA MANGA SELESAI ---');
}

// To run this seeder, you can call seedAllManga()
// e.g. require('./allMangaSeeder').seedAllManga();
module.exports = { seedAllManga };

if (require.main === module) {
    seedAllManga().catch(err => {
        logger.error('Error running manga seeder:', err);
        process.exit(1);
    });
}

