const oploverzScrap = require('./src/scrap/anime/oploverzScrap');
const OploverzRepository = require('./src/repositories/oploverzRepository');
const logger = require('./src/utils/logger');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Helper: Cek apakah perlu update
const shouldUpdate = (dbAnime, sourceMeta) => {
    if (!dbAnime) return { update: true, reason: 'New Anime' };

    // 1. Cek Jumlah Episode
    const sourceEpCount = sourceMeta.episodeList.length;
    const dbEpCount = dbAnime.episodes.length;

    if (sourceEpCount !== dbEpCount) {
        return { update: true, reason: `Episode count mismatch (DB: ${dbEpCount}, Src: ${sourceEpCount})` };
    }

    // 2. Cek Status Anime (Ongoing -> Completed)
    if (dbAnime.status !== sourceMeta.detail.status) {
        return { update: true, reason: `Status changed (${dbAnime.status} -> ${sourceMeta.detail.status})` };
    }

    // 3. Cek Episode Terakhir
    if (sourceEpCount > 0 && dbEpCount > 0) {
        // [FIX] Sort source episode secara Descending (terbesar ke terkecil) agar match dengan DB
        // Karena array dari scraper urutannya bisa acak/ascending
        const sortedSourceEps = [...sourceMeta.episodeList].sort((a, b) => 
            parseFloat(b.episode_number) - parseFloat(a.episode_number)
        );
        
        const lastSourceEp = sortedSourceEps[0].episode_number; 
        const lastDbEp = dbAnime.episodes[0].episodeNumber; // Di Repo sudah di-sort desc

        if (String(lastSourceEp) !== String(lastDbEp)) {
            return { update: true, reason: `Latest episode mismatch (DB: ${lastDbEp}, Src: ${lastSourceEp})` };
        }
    }

    return { update: false, reason: 'Up to date' };
};

const runOploverzSync = async () => {
    logger.info('🚀 WORKER STARTED: Oploverz Smart Sync');

    try {
        await OploverzRepository.ensureServerExists();

        // ============================================================
        // TAHAP 1: PERSIAPAN DATA
        // ============================================================
        logger.info('📡 Fetching source list from Oploverz...');
        const sourceList = await oploverzScrap.getAllAnimeList();

        if (sourceList.total === 0) {
            logger.error('❌ Failed to fetch anime list from source.');
            return;
        }

        logger.info('💾 Fetching database slugs...');
        
        // [FIX] Panggil fungsi getAllSlugs (bukan getAnimeBySlug)
        const dbSlugs = await OploverzRepository.getAllSlugs(); 

        const sourceSlugSet = new Set(sourceList.data.map((a) => a.slug));
        
        // ============================================================
        // TAHAP 2: DELETE ANIME YANG HILANG
        // ============================================================
        const slugsToDelete = dbSlugs.filter((slug) => !sourceSlugSet.has(slug));

        if (slugsToDelete.length > 0) {
            logger.info(`🗑️ Found ${slugsToDelete.length} anime to DELETE`);
            for (const slug of slugsToDelete) {
                try {
                    await OploverzRepository.deleteAnime(slug);
                    logger.info(`✅ Deleted: ${slug}`);
                } catch (err) {
                    logger.error(`❌ Failed Delete ${slug}: ${err.message}`);
                }
            }
        } else {
            logger.info('✅ No anime needs to be deleted.');
        }

        // ============================================================
        // TAHAP 3: CHECK & UPDATE
        // ============================================================
        logger.info(`🔄 Checking ${sourceList.total} anime for updates...`);

        for (let i = 0; i < sourceList.data.length; i++) {
            const animeBasic = sourceList.data[i];
            const prefixLog = `[${i + 1}/${sourceList.total}] ${animeBasic.title}`;

            try {
                // 1. Ambil DB
                const dbAnime = await OploverzRepository.getAnimeBySlug(animeBasic.slug);

                // 2. Ambil Metadata Source
                const sourceMeta = await oploverzScrap.getAnimeMetadata(animeBasic.url);

                if (!sourceMeta) {
                    logger.warn(`${prefixLog} ⚠️ Skipped: Metadata Failed`);
                    continue;
                }

                // 3. Bandingkan
                const check = shouldUpdate(dbAnime, sourceMeta);

                if (!check.update) {
                    logger.info(`${prefixLog} ⏭️  Skipped (${check.reason})`);
                    continue;
                }

                logger.info(`${prefixLog} ⚡ Update detected: ${check.reason}`);

                // 4. Scrape Full & Save
                const fullAnimeData = await oploverzScrap.getCompleteAnimeData(animeBasic.url);

                if (fullAnimeData) {
                    await OploverzRepository.upsertAnime(fullAnimeData);
                    logger.info(`${prefixLog} ✅ Updated Successfully`);
                } else {
                    logger.error(`${prefixLog} ❌ Failed to get full data`);
                }
            } catch (err) {
                logger.error(`${prefixLog} ❌ Error: ${err.message}`);
            }

            await sleep(1000);
        }
    } catch (error) {
        logger.error(`🔥 FATAL WORKER ERROR: ${error.message}`);
    }

    logger.info('🏁 WORKER FINISHED');
};

runOploverzSync();