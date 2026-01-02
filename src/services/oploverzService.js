const logger = require('../utils/logger');
const OploverzRepository = require('../repositories/oploverzRepository');
const cacheHandler = require('../cache/cacheHandler');
const { TTL } = require('../utils/cacheConstants');
const oploverzRepository = require('../repositories/oploverzRepository');
const scrapeLogRepository = require('../repositories/scrapeLogRepository');

// Import Scraper
const oploverzScrap = require('../scrap/anime/oploverzScrap');

const KEYS = {
    ONGOING: (page, limit) => `anime:server2:ongoing:${page}:${limit}`,
    COMPLETED: (page, limit) => `anime:server2:completerd:${page}:${limit}`,
    MOVIES: (page, limit) => `anime:server2:movie:${page}:${limit}`,
    SEARCH: (q, page, limit, status, type) => `anime:server2:search:${q}:${status}:${type}:${page}:${limit}`,
    DETAIL: (slug) => `anime:server2:detail:v2:${slug}`,
    ALL: (page, limit) => `anime:server2:all:${page}:${limit}`,
    GENRES: () => `anime:server2:genres`,
    EPISODE: (slug, ep) => `anime:server2:episode:${slug}:${ep}`,
};

class OploverzService {
    async getOngoingAnime(page = 1, limit = 10) {
        const cacheKey = KEYS.ONGOING(page, limit);

        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            const { data, total } = await oploverzRepository.getOngoingAnime(page, limit);

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        });
    }

    async getCompletedAnime(page = 1, limit = 10) {
        const cacheKey = KEYS.COMPLETED(page, limit);

        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            const { data, total } = await oploverzRepository.getCompletedAnime(page, limit);

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        });
    }

    async getMovieAnime(page = 1, limit = 10) {
        const cacheKey = KEYS.MOVIES(page, limit);

        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            const { data, total } = await oploverzRepository.getMovieAnime(page, limit);

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        });
    }

    async searchAnime(filters) {
        const { q = '', status, type, page = 1, limit = 10 } = filters;

        const cacheKey = KEYS.SEARCH(q, page, limit, status, type);

        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            const { data, total } = await oploverzRepository.searchAnime({
                q,
                status,
                type,
                page,
                limit,
            });

            return {
                data,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            };
        });
    }

    // async getAnimeDetail(slug) {

    //     const cacheKey = KEYS.DETAIL(slug);

    //     return cacheHandler.remember(cacheKey, TTL.LONG, async () => {
    //         const slug = cacheKey.split(':').pop(); // Extract slug safely
    //         const animeUrl = `https://anime.oploverz.ac/series/${slug}`;

    //         let anime = await oploverzRepository.getAnimeBySlug(slug);

    //         const meta = await oploverzScrap.getAnimeMetadata(animeUrl);

    //         if (!anime && !meta) return null;

    //         if (!anime && meta) {
    //             const fullData = await oploverzScrap.getCompleteAnimeData(animeUrl);
    //             if (fullData) {
    //                 anime = await oploverzRepository.upsertAnime(fullData);
    //             }
    //             return this._formatDetailResponse(anime); // Return fresh
    //         }

    //         // 3. Logic "Lazy Healing" (Jika DB Ada)
    //         if (meta && anime) {
    //             const dbEpisodes = anime.episodes || [];
    //             const webEpisodes = meta.episodeList || [];
                
    //             // Cek apakah perlu update
    //             // Kriteria: Jumlah episode beda ATAU ada episode di DB yang kosong (stream & download 0)
    //             const missingEpisodes = [];

    //             // Cek Episode Baru / Hilang
    //             for (const webEp of webEpisodes) {
    //                const epNum = parseFloat(webEp.episode_number);
    //                const dbEp = dbEpisodes.find(e => e.episodeNumber === epNum);

    //                // Jika tidak ada di DB, atau ada tapi 'kosong'
    //                if (!dbEp) {
    //                    missingEpisodes.push(webEp);
    //                } else {
    //                    const hasStreams = dbEp.streams && dbEp.streams.length > 0;
    //                    const hasDownloads = dbEp.downloads && dbEp.downloads.length > 0;
                       
    //                    if (!hasStreams && !hasDownloads) {
    //                        logger.info(`[OploverzService] Empty episode found: ${slug} Eps ${epNum}`);
    //                        missingEpisodes.push(webEp);
    //                    }
    //                }
    //             }

    //             // Jika ada yg perlu di-healing
    //             if (missingEpisodes.length > 0) {
    //                 logger.info(`[OploverzService] Healing ${missingEpisodes.length} episodes for ${slug}`);
                    
    //                 // Proses update per episode (Parallel limit untuk speed)
    //                 // Kita pakai getEpisodeStreams (Axios) biar cepat, fallback ke Puppeteer via getEpisodeUrl di logic scraper kalau perlu
                    
    //                 // Proses update per episode (Batch Limit untuk menghindari DB Connection Exhaustion)
    //                 const BATCH_SIZE = 5;
    //                 for (let i = 0; i < missingEpisodes.length; i += BATCH_SIZE) {
    //                     const batch = missingEpisodes.slice(i, i + BATCH_SIZE);
    //                     logger.info(`[OploverzService] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(missingEpisodes.length / BATCH_SIZE)}`);
                        
    //                     await Promise.all(batch.map(async (ep) => {
    //                          let media = await oploverzScrap.getEpisodeStreams({
    //                              episode_number: ep.episode_number,
    //                              title: ep.title,
    //                              url: ep.url
    //                          });
                             
    //                          // Check if streams/downloads are empty -> Fallback to Puppeteer
    //                          const isEmpty = (!media.streaming || media.streaming.length === 0) && (!media.downloads || media.downloads.length === 0);
                             
    //                          if (isEmpty) {
    //                              logger.info(`[OploverzService] Axios failed for ${slug} Eps ${ep.episode_number}, switching to Puppeteer...`);
    //                              try {
    //                                  const pupResult = await oploverzScrap.getEpisodeUrl(ep.url);
    //                                  if (pupResult) {
    //                                      media.streaming = pupResult.streaming || [];
    //                                      media.downloads = pupResult.downloads || [];
    //                                      // Update URL if fallback redirected
    //                                      if (pupResult.effectiveUrl && pupResult.effectiveUrl !== ep.url) {
    //                                          logger.info(`[OploverzService] Updating URL mismatch: ${ep.url} -> ${pupResult.effectiveUrl}`);
    //                                          media.url = pupResult.effectiveUrl;
    //                                      }
    //                                  }
    //                              } catch (err) {
    //                                  logger.error(`[OploverzService] Puppeteer failed too: ${err.message}`);
    //                                  // Log Error Puppeteer
    //                                  await scrapeLogRepository.createLog({
    //                                      source: 'Oploverz',
    //                                      endpoint: 'Puppeteer_Lazy',
    //                                      slug: slug,
    //                                      status: 'FAILED',
    //                                      error: err.message
    //                                  });
    //                              }
    //                          } else {
    //                              // Log Success Axios
    //                              if (media.url !== ep.url) {
    //                                   logger.info(`[OploverzService] Axios Updating URL mismatch: ${ep.url} -> ${media.url}`);
    //                              }
    //                          }
    
    //                          // Save result (even if empty, to update scraping status)
    //                          if (media) {
    //                              // Log Activity
    //                              await scrapeLogRepository.createLog({
    //                                  source: 'Oploverz',
    //                                  endpoint: 'Lazy_Healing',
    //                                  slug: slug,
    //                                  status: 'SUCCESS',
    //                                  response: { episode: media.episode_number, streams: media.streaming?.length, newUrl: media.url }
    //                              });
    
    //                              return oploverzRepository.upsertEpisodeManual(slug, {
    //                                  episodeNumber: media.episode_number,
    //                                  title: media.title,
    //                                  sourceUrl: media.url, // Correctly updated URL
    //                                  streams: media.streaming,
    //                                  downloads: media.downloads
    //                              });
    //                          }
    //                     }));
                        
    //                     // Optional Delay between batches to let DB breathe
    //                     // await new Promise(r => setTimeout(r, 500)); 
    //                 }
                    
    //                 // Refetch updated data from DB
    //                 anime = await oploverzRepository.getAnimeBySlug(slug);
    //             }
    //         }

    //         // 4. Format dan kembalikan data
    //         return this._formatDetailResponse(anime);
    //     });
    // }

    
    // // ga ngescrape otomatis
     
    async getAnimeDetail(slug) {
        const cacheKey = KEYS.DETAIL(slug);

        return cacheHandler.remember(cacheKey, TTL.LONG, async () => {
            const anime = await oploverzRepository.getAnimeBySlug(slug);

            if (!anime) {
                return null;
            }
            return this._formatDetailResponse(anime);
        });
    }


    _formatDetailResponse(anime) {
        if (!anime) return null;
        return {
            id: anime.id, // Add ID
            title: anime.title,
            slug: anime.slug,
            altTitle: anime.altTitle,
            posterUrl: anime.posterUrl,
            synopsis: anime.synopsis,
            status: anime.status,
            season: anime.season,
            type: anime.type,
            duration: anime.duration,
            rating: anime.rating,
            score: anime.score,
            studio: anime.studio,
            totalEpisodes: anime.totalEpisodes,
            genres: anime.animeServerGenres ? anime.animeServerGenres.map((g) => g.serverGenre) : [],
            episodes: anime.episodes.map((ep) => ({
                id: ep.id, // Add Episode ID
                episodeNumber: ep.episodeNumber,
                title: ep.title,
                sourceUrl: ep.sourceUrl,
                streams: ep.streams.map((s) => ({
                    host: s.host,
                    quality: s.quality,
                    url: s.url,
                })),
                downloads: ep.downloads.map((d) => ({
                    format: d.format,
                    resolutions: d.resolutions,
                    host: d.host,
                    url: d.url,

                })),
            })),
        };
    }

    async getAllAnime(page = 1, limit = 10, { genre, status, type, order } = {}) {
        const cacheKey = `anime:server2:all:${page}:${limit}:${genre || 'all'}:${status || 'all'}:${type || 'all'}:${order || 'desc'}`;

        return cacheHandler.remember(cacheKey, TTL.MEDIUM, async () => {
            const { data, total } = await oploverzRepository.getAllAnime(page, limit, { genre, status, type, order });

            return {
                data,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            };
        });
    }

    async getGenres() {
        const cacheKey = KEYS.GENRES();

        return cacheHandler.remember(cacheKey, TTL.LONG, async () => {
            return await oploverzRepository.getGenres();
        });
    }

    async updateAnimeManual(slug, data) {
        const result = await oploverzRepository.updateAnimeManual(slug, data);

        cacheHandler.invalidate(KEYS.DETAIL(slug));
        cacheHandler.deletePattern('anime:server2:ongoing:*');
        cacheHandler.deletePattern('anime:server2:completerd:*');
        cacheHandler.deletePattern('anime:server2:all:*');

        return result;
    }

    async createAnimeManual(data) {
        if (!data.slug) {
             data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }
        
        const exists = await oploverzRepository.getAnimeBySlug(data.slug);
        if (exists) throw new Error('Anime with this slug already exists');

        const result = await oploverzRepository.createAnime(data);
        cacheHandler.deletePattern('anime:server2:*'); // Clear all anime lists
        return result;
    }

    async deleteEpisode(slug, episodeNumber) {
        const anime = await oploverzRepository.getAnimeBySlug(slug);
        if (!anime) throw new Error('Anime not found');

        await oploverzRepository.deleteEpisode(anime.id, episodeNumber);
        
        cacheHandler.invalidate(KEYS.DETAIL(slug));
        cacheHandler.invalidate(KEYS.EPISODE(slug, episodeNumber));
        return { message: 'Episode deleted successfully' };
    }

    async upsertEpisodeManual(slug, episodeData) {
        const result = await oploverzRepository.upsertEpisodeManual(slug, episodeData);
        cacheHandler.invalidate(KEYS.DETAIL(slug));
        if (episodeData.episodeNumber) {
            cacheHandler.invalidate(KEYS.EPISODE(slug, episodeData.episodeNumber));
        }

        return result;
    }

    async deleteAnime(slug) {
        try {
             await oploverzRepository.deleteAnime(slug);
        } catch (error) {
             throw error;
        }

        cacheHandler.invalidate(KEYS.DETAIL(slug));
        cacheHandler.deletePattern('anime:server2:ongoing:*');
        cacheHandler.deletePattern('anime:server2:completerd:*');
        cacheHandler.deletePattern('anime:server2:all:*');
        cacheHandler.deletePattern('anime:server2:search:*');

        return { message: 'Anime deleted successfully' };
    }
}

module.exports = new OploverzService();
