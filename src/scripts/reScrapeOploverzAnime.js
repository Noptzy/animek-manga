const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const oploverzScrap = require('../scrap/anime/oploverzScrap');
const OploverzRepository = require('../repositories/oploverzRepository');
const scrapeLogRepository = require('../repositories/scrapeLogRepository');
const OploverzService = require('../services/oploverzService');

const SERVER_ID = 2; // Oploverz

async function syncAnimeAndEpisodes() {
    logger.info('Starting full sync and healing for Oploverz Anime...');

    // 1. Get ALL Active Anime for Oploverz
    const animeList = await prisma.anime.findMany({
        where: {
            animeSources: {
                some: { serverId: SERVER_ID },
            },
        },
        include: {
            animeSources: { where: { serverId: SERVER_ID } },
            episodes: { select: { episodeNumber: true, sourceUrl: true, id: true } }, // Minimal select
        },
    });

    logger.info(`Found ${animeList.length} anime to check.`);

    for (const anime of animeList) {
        const originalSourceUrl = anime.animeSources[0]?.sourceUrl;
        if (!originalSourceUrl) continue;

        logger.info(`Checking: ${anime.title} (${originalSourceUrl})`);

        try {
            // STEP 1: Get Metadata & check for Redirects (Series vs Movie)
            // getAnimeMetadata now handles the /series/ and /movie/ detection
            const meta = await oploverzScrap.getAnimeMetadata(originalSourceUrl);

            if (!meta) {
                 logger.warn(`Metadata not found for ${anime.title}. Skipping.`);
                 continue;
            }

            // Correction Logic: Check if URL type changed or Slug changed
            // Since we don't have the 'effectiveUrl' explicitly from getAnimeMetadata yet (unless we added it),
            // we can infer it from the constructed URLs in meta.episodeList[0].url if needed,
            // OR we can trust `meta.slug`.
            // But wait, `getAnimeMetadata` constructs urls based on `urlType` detected internally.
            
            // Let's rely on the count first.
            const webEpisodeCount = meta.episodeList.length;
            const dbEpisodeCount = anime.episodes.length;

            logger.info(`Episodes: DB=${dbEpisodeCount} vs Web=${webEpisodeCount}`);

            // STEP 2: Check if Metadata Update is Needed
            let needsMetadataUpdate = false;

            if (webEpisodeCount !== dbEpisodeCount) {
                needsMetadataUpdate = true;
            } else if (webEpisodeCount > 0) {
                 const sampleEp = meta.episodeList[0];
                 const sampleDbEp = anime.episodes.find(e => e.episodeNumber == sampleEp.episode_number);
                 
                 if (sampleDbEp && sampleEp.url !== sampleDbEp.sourceUrl) {
                     logger.info(`[URL FIX] Episode URL mismatch detected! Healing URLs...`);
                     needsMetadataUpdate = true;
                 }
            }

            if (needsMetadataUpdate) {
                // STEP 3: Update Anime & Upsert Episodes
                logger.info(`Syncing ${anime.title}...`);

                // Update Anime Details (Poster, Status, etc) - Metadata already has it
                await OploverzRepository.updateAnimeManual(anime.slug, {
                   ...meta.detail,
                   totalEpisodes: webEpisodeCount
                });

                // Process Episodes
                for (const ep of meta.episodeList) {
                    // Upsert Episode (Metadata only has basic info, no streams)
                    // We use upsertEpisodeManual to basic info and URL correction
                    await OploverzRepository.upsertEpisodeManual(anime.slug, {
                        episodeNumber: ep.episode_number,
                        title: ep.title,
                        sourceUrl: ep.url, // This is the CORRECTED URL from scraper
                        streams: [], // Empty for now, wait for lazy scrape or 2nd pass
                        downloads: []
                    });
                }
                logger.info(`Synced basic data for ${anime.title}.`);
            } else {
                logger.info(`No metadata updates for ${anime.title}.`);
            }
            
            // STEP 4: Trigger Lazy Healing to populate streams
            // This runs ALWAYS, even if metadata didn't change, to populate missing streams.
            logger.info(`Checking stream availability for ${anime.title}...`);
            await OploverzService.getAnimeDetail(anime.slug);
            
            logger.info(`Done check/healing for ${anime.title}.`);

        } catch (error) {
            logger.error(`Failed to sync ${anime.title}: ${error.message}`);
        }
    }
    
    logger.info('Finished sync process.');
}

async function main() {
    await syncAnimeAndEpisodes();
}

main().catch(err => {
    logger.error('An error occurred during the re-scraping process:', err);
    process.exit(1);
});
