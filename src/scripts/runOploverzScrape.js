const oploverzScrap = require('../scrap/anime/oploverzScrap');
const OploverzRepository = require('../repositories/oploverzRepository');
const logger = require('../utils/logger');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const runOploverzScrape = async () => {
    logger.info('🚀 WORKER STARTED: Oploverz');

    try {
        // 1. Pastikan Server ID ada di DB
        await OploverzRepository.ensureServerExists();

        // 2. Ambil List Semua Anime
        const list = await oploverzScrap.getAllAnimeList();
        logger.info(`📚 Found ${list.total} anime in directory`);

        // 3. Loop setiap Anime
        for (let i = 0; i < list.data.length; i++) {
            const animeBasic = list.data[i];
            logger.info(`[${i + 1}/${list.total}] Processing: ${animeBasic.title}`);

            try {
                const fullAnimeData = await oploverzScrap.getCompleteAnimeData(animeBasic.url);

                if (!fullAnimeData) {
                    logger.warning(`⚠️ Skipped (No Data): ${animeBasic.title}`);
                    continue;
                }

                // 5. Simpan ke Database via Repository (Tidak diubah)
                await OploverzRepository.upsertAnime(fullAnimeData);

                logger.info(`✅ Saved: ${fullAnimeData.title} (${fullAnimeData.episodes.length} Episodes)`);

            } catch (err) {
                logger.error(`❌ Error scraping ${animeBasic.title}: ${err.message}`);
                // Lanjut ke anime berikutnya walaupun error
            }

            // Delay antar Anime agar tidak spam request ke server Oploverz
            await sleep(2000);
        }

    } catch (error) {
        logger.error(`🔥 FATAL WORKER ERROR: ${error.message}`);
    }

    logger.info('🏁 WORKER FINISHED');
};

runOploverzScrape();