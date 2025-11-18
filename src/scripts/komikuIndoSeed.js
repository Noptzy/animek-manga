const MangaScrap = require('../scrap/manga/komikIndoScrap.js');
const mangaRepository = require('../repositories/mangaRepository.js');
const scrapeLogRepository = require('../repositories/scrapeLogRepository.js');
const logger = require('../utils/logger');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, 100));


async function processMangaList(mangaList, source) {
    for (const manga of mangaList) {
        if (!manga.slug) {
            logger.warn('Menemukan manga tanpa slug, dilewati:', manga.title);
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

async function seedAllMangaFromKomikIndo() {
    let currentPage = 1;
    let hasNextPage = true;
    const source = 'komikindo';

    logger.info('--- MEMULAI SEEDING MANGA KOMIKINDO ---');

    while (hasNextPage) {
        const endpoint = `/manga/page/${currentPage}/`;
        logger.info(`Memproses halaman: ${currentPage}`);

        try {
            const pageData = await MangaScrap.getKomikIndoManga(currentPage);

            if (!pageData || !pageData.data || pageData.data.length === 0) {
                logger.warn(`Tidak ada data di halaman ${currentPage}. Menghentikan loop.`);
                hasNextPage = false;
                continue;
            }

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

    logger.info('--- SEEDING MANGA KOMIKINDO SELESAI ---');
}

module.exports = { seedAllMangaFromKomikIndo };