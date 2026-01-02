const { getBrowser } = require('../../utils/browser');
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');

const CONFIG = {
    baseUrl: 'https://anime.oploverz.ac',
    userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    timeout: 30000,
    concurrency: 1, // [FIX] Dibuat jadi 1 untuk menghindari timeout. Proses lebih lambat tapi stabil.
    maxRetries: 3,
};

const axiosInstance = axios.create({
    baseURL: CONFIG.baseUrl,
    headers: {
        'User-Agent': CONFIG.userAgent,
        Referer: CONFIG.baseUrl,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
    timeout: CONFIG.timeout,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class OploverzScrap {
    _extractSvelteData($) {
        let jsonData = null;
        $('script').each((i, el) => {
            const content = $(el).html();
            if (!content) return;

            // Kita cari script yang mengandung data utama
            if (content.includes('allSeries') || content.includes('series')) {
                try {
                    // Regex ini mencari: data: [ ... ], form:
                    // Menangani key "data" yang pakai kutip maupun tidak
                    const match = content.match(/(["']?data["']?)\s*:\s*(\[[\s\S]*?\]),\s*["']?form["']?/);

                    if (match && match[2]) {
                        // Gunakan Function constructor untuk mem-parsing string JS Object (lebih kuat dari JSON.parse)
                        // Ini bisa menangani key tanpa kutip yang sering bikin JSON.parse error
                        const fn = new Function(`return ${match[2]}`);
                        const dataArray = fn(); // Array: [null, null, {type: 'data', data: {...}}]

                        // Cari elemen array yang memiliki properti 'data'
                        const payload = dataArray.find(
                            (item) => item && item.data && (item.data.allSeries || item.data.series),
                        );

                        if (payload) {
                            jsonData = payload.data;
                        }
                    }
                } catch (e) {
                    // Silent fail, lanjut ke script berikutnya atau fallback DOM
                }
            }
        });
        return jsonData;
    }

    _findDataRecursive(obj, keyToFind) {
        if (!obj || typeof obj !== 'object') return null;
        if (obj.hasOwnProperty(keyToFind)) return obj[keyToFind];
        for (const k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                const found = this._findDataRecursive(obj[k], keyToFind);
                if (found) return found;
            }
        }
        return null;
    }

    _extractResolution(rawString) {
        if (!rawString) return null;
        const str = rawString.toString().toLowerCase();
        const match = str.match(/(\d{3,4}p)/);
        if (match) return match[1];
        if (str.includes('4k') || str.includes('uhd')) return '2160p';
        if (str.includes('fhd') || str.includes('1080')) return '1080p';
        if (str.includes('hd') || str.includes('720')) return '720p';
        if (str.includes('sd') || str.includes('480')) return '480p';
        if (str.includes('360')) return '360p';
        return null;
    }

    async getAllAnimeList() {
        try {
            const { data } = await axiosInstance.get('/series');
            const $ = cheerio.load(data);
            const animeList = [];

            // --- CARA A: AMBIL DARI JSON SVELTE (DATA LENGKAP) ---
            const rawData = this._extractSvelteData($);
            const seriesContainer = this._findDataRecursive(rawData, 'allSeries');

            if (seriesContainer && Array.isArray(seriesContainer.data)) {
                seriesContainer.data.forEach((anime) => {
                    animeList.push({
                        title: anime.title,
                        slug: anime.slug,
                        url: `${CONFIG.baseUrl}/series/${anime.slug}`,
                        posterUrl: this._fixPosterUrl(anime.poster || anime.thumbnail),
                        status: anime.status || 'Completed',
                        rating: anime.score || 0,
                    });
                });
            }

            // --- CARA B: FALLBACK DOM SCRAPING (JIKA JSON GAGAL) ---
            if (animeList.length === 0) {
                logger.info('⚠️ JSON extraction failed, switching to DOM Scraping...');

                // Selector DOM Generik: Cari semua link yang mengarah ke /series/
                // Ini lebih aman daripada mencari class tertentu yang bisa berubah
                $('a[href*="/series/"]').each((i, el) => {
                    const link = $(el);
                    const url = link.attr('href');

                    // Validasi URL: Harus berakhiran slug, bukan pagination/sorting
                    // Contoh valid: https://.../series/one-piece
                    if (!url || url.includes('/page/') || url.includes('?')) return;

                    // Cari elemen pembungkus terdekat (biasanya <li> atau <div>)
                    const parent = link.closest('li, div.series, div.item');

                    // Ambil komponen data
                    const imgEl = parent.find('img').first();
                    const titleEl = parent.find('h4, h3, .title, .series-title').first();

                    const title = titleEl.text().trim() || link.attr('title') || link.text().trim();
                    const poster = imgEl.attr('src') || imgEl.attr('data-src');
                    const slug = url.split('/series/')[1]?.replace(/\/$/, '');

                    if (title && slug) {
                        // Cek duplikasi sebelum push (karena selector 'a' bisa menangkap banyak link ke anime sama)
                        const exists = animeList.some((a) => a.slug === slug);
                        if (!exists) {
                            animeList.push({
                                title: title,
                                slug: slug,
                                url: url.startsWith('http') ? url : `${CONFIG.baseUrl}${url}`,
                                posterUrl: this._fixPosterUrl(poster),
                                status: 'Unknown', // DOM List biasanya tidak ada status
                                rating: 0,
                            });
                        }
                    }
                });
            }

            if (animeList.length === 0) {
                logger.error('❌ Failed to fetch anime list: Both JSON and DOM scraping returned 0 results.');
            } else {
                // logger.info(`✅ Found ${animeList.length} anime.`);
            }

            return { total: animeList.length, data: animeList };
        } catch (error) {
            logger.error(`OploverzScrap: getAllAnimeList -> ${error.message}`);
            return { total: 0, data: [] };
        }
    }

    async getAnimeMetadata(url) {
        try {
            let response;
            try {
                response = await axiosInstance.get(url);
            } catch (err) {
                const isSeries = url.includes('/series/');
                if ((err.response?.status === 404 || err.response?.status === 500) && isSeries) {
                    logger.warning(`[OploverzScrap] Metadata fetch failed for ${url}. Trying /movie/ fallback...`);
                    const fallbackUrl = url.replace('/series/', '/movie/');
                    try {
                        response = await axiosInstance.get(fallbackUrl);
                        logger.info(`[OploverzScrap] Fallback to ${fallbackUrl} successful.`);
                        url = fallbackUrl; // Update url for downstream logic
                    } catch (err2) {
                        throw err; // Throw original error if fallback also fails
                    }
                } else {
                    throw err;
                }
            }
            
            const data = response.data;
            const $ = cheerio.load(data);
            const rawData = this._extractSvelteData($);

            // [FIX] Ekstraksi Slug yang Lebih Aman (Support /series/ dan /movie/)
            let seriesSlug = '';
            let urlType = 'series'; // Default

            // [NEW] Cek Final URL (Redirection) untuk deteksi lebih akurat
            const finalUrl = response.request?.res?.responseUrl || url;
            logger.info(`[OploverzScrap] Original: ${url} -> Final: ${finalUrl}`);

            // Cara 1: Ambil dari Final URL (Prioritas Utama)
            if (finalUrl.includes('/series/')) {
                const urlParts = finalUrl.split('/series/');
                if (urlParts.length > 1) {
                    seriesSlug = urlParts[1].split('/')[0].split('?')[0].replace(/\/$/, '');
                    urlType = 'series';
                }
            } else if (finalUrl.includes('/movie/')) {
                const urlParts = finalUrl.split('/movie/');
                if (urlParts.length > 1) {
                    seriesSlug = urlParts[1].split('/')[0].split('?')[0].replace(/\/$/, '');
                    urlType = 'movie';
                }
            } else if (finalUrl.includes('/anime/')) {
                 // Kadang masih /anime/ (jarang), coba parse slugnya saja
                 const urlParts = finalUrl.split('/anime/');
                 if (urlParts.length > 1) {
                    seriesSlug = urlParts[1].split('/')[0].split('?')[0].replace(/\/$/, '');
                 }
            }

            // Cara 2: Ambil dari JSON Svelte (Fallback & Verification)
            if (!seriesSlug || urlType === 'series') {
                const sData = this._findDataRecursive(rawData, 'series');
                if (sData) {
                    if (!seriesSlug && sData.slug) seriesSlug = sData.slug;

                    // Cek tipe dari metadata jika URL belum konfirmasi 'movie'
                    if (sData.type && typeof sData.type === 'string') {
                        const typeLower = sData.type.toLowerCase();
                        if (typeLower.includes('movie')) {
                            urlType = 'movie';
                        }
                    }
                }
            }

            logger.info(`[OploverzScrap] Detected ID: ${seriesSlug}, Type: ${urlType}`);

            // Cara 3: Fallback Darurat (Canonical)
            if (!seriesSlug) {
                const canonical = $('link[rel="canonical"]').attr('href');
                if (canonical) {
                     if (canonical.includes('/series/')) {
                        seriesSlug = canonical.split('/series/')[1].split('/')[0].replace(/\/$/, '');
                        urlType = 'series';
                     } else if (canonical.includes('/movie/')) {
                        seriesSlug = canonical.split('/movie/')[1].split('/')[0].replace(/\/$/, '');
                        urlType = 'movie';
                     }
                }
            }

            // Jika masih kosong, log error dan return null agar tidak crash di prisma
            if (!seriesSlug) {
                logger.error(`Failed to extract slug for URL: ${url}`);
                return null;
            }

            let detail = {};
            if (rawData) {
                const seriesData = this._findDataRecursive(rawData, 'series');
                if (seriesData) {
                    let synopsisClean = '';
                    try {
                        synopsisClean = cheerio.load(seriesData.description).text().trim();
                    } catch (e) {}
                    detail = {
                        title: seriesData.title,
                        alt_title: seriesData.japaneseTitle || seriesData.title,
                        poster_url: seriesData.poster || seriesData.thumbnail,
                        synopsis: synopsisClean,
                        status: seriesData.status,
                        type: seriesData.releaseType,
                        rating: seriesData.rating ? String(seriesData.rating) : '0',
                        score: parseFloat(seriesData.score) || 0,
                        studio: seriesData.studio?.name || '-',
                        season: seriesData.season?.name || '-',
                        duration: seriesData.duration,
                        genres: seriesData.genres?.map((g) => g.name) || [],
                    };
                }
            }

            // Fallback scraping manual jika JSON Svelte gagal/kosong
            if (!detail.title) {
                detail.title = $('h1.entry-title').text().trim();
                detail.synopsis = $('.entry-content p').text().trim();
            }

            let episodeList = [];
            if (rawData) {
                const episodesData = this._findDataRecursive(rawData, 'episodes');
                if (Array.isArray(episodesData)) {
                    // [FIX] Filter dan Map dengan Safety Check
                    episodeList = episodesData
                        .filter((ep) => ep) // Pastikan objek episode tidak null
                        .map((ep) => {
                            // Cek apakah episodeNumber ada. Jika Movie/Special seringkali null -> Default ke 1
                            const epNum =
                                ep.episodeNumber !== null && ep.episodeNumber !== undefined ? ep.episodeNumber : 1;
                            
                            // Konstruksi URL Episode yang benar sesuai type
                            const epUrl = urlType === 'movie' 
                                ? `${CONFIG.baseUrl}/movie/${seriesSlug}/${ep.slug || epNum}` // Sesuai format movie user
                                : `${CONFIG.baseUrl}/series/${seriesSlug}/episode/${epNum}`;

                            return {
                                episode_number: String(epNum),
                                title: ep.title || `Episode ${epNum}`,
                                url: epUrl, 
                            };
                        });
                }
            }

            // Fallback HTML Scraping (jika JSON episodes kosong)
            if (episodeList.length === 0) {
                $('div.lstepsiode ul li a').each((i, el) => {
                    const txt = $(el).text();
                    const numMatch = txt.match(/Episode\s+(\d+)/i) || txt.match(/(\d+)/);

                    // Logic fallback untuk Movie jika tidak ada angka "Episode X"
                    let epNum = '1';
                    if (numMatch) {
                        epNum = numMatch[1];
                    }

                    episodeList.push({
                        episode_number: epNum,
                        title: txt.trim(),
                        url: $(el).attr('href'), // Ambil href langsung dari elemen
                    });
                });
            }

            detail.totalEpisodes = episodeList.length;

            // Return dengan slug yang sudah dipastikan ada
            return { detail, episodeList, slug: seriesSlug };
        } catch (error) {
            logger.error(`OploverzScrap: getAnimeMetadata -> ${error.message}`);
            return null;
        }
    }

    async getEpisodeStreams(episodeInfo) {
        let attempts = 0;
        let targetUrl = episodeInfo.url;
        
        while (attempts < CONFIG.maxRetries) {
            try {
                // [NEW] Smart Fallback Handling
                // Jika URL awal gagal (404/500), coba variasi /movie/ atau /series/
                let response;
                try {
                    response = await axiosInstance.get(targetUrl);
                } catch (err) {
                    const status = err.response?.status;
                    if ((status === 404 || status === 500) && targetUrl.includes('/series/')) {
                        logger.warning(`[OploverzScrap] Failed at ${targetUrl} (${status}). Trying Movie fallback...`);
                        
                        // Coba format Movie: /movie/slug atau /movie/slug/epNum
                        const parts = targetUrl.split('/series/');
                        if (parts.length > 1) {
                            const tail = parts[1]; // slug/episode/1
                            const slug = tail.split('/')[0]; 
                            const epNum = tail.split('/episode/')[1] || '1';
                            
                            // Try Fallback 1: /movie/slug (seringkali movie halamannya langsung di sini)
                            const fallbackUrl1 = `${CONFIG.baseUrl}/movie/${slug}`;
                            logger.info(`[OploverzScrap] Retry Fallback 1: ${fallbackUrl1}`);
                            try {
                                response = await axiosInstance.get(fallbackUrl1);
                                targetUrl = fallbackUrl1; // Update target valid
                            } catch (e1) {
                                // Try Fallback 2: /movie/slug/1 (kadang movie pake penomoran)
                                const fallbackUrl2 = `${CONFIG.baseUrl}/movie/${slug}/${epNum}`;
                                logger.info(`[OploverzScrap] Retry Fallback 2: ${fallbackUrl2}`);
                                response = await axiosInstance.get(fallbackUrl2);
                                targetUrl = fallbackUrl2;
                            }
                        } else {
                            throw err;
                        }
                    } else {
                        throw err; // Lempar error lain
                    }
                }

                const { data } = response;
                const $ = cheerio.load(data);
                const rawData = this._extractSvelteData($);

                let streamUrl = this._findDataRecursive(rawData, 'streamUrl') || [];
                let downloadUrl = this._findDataRecursive(rawData, 'downloadUrl') || [];

                // Fallback HTML jika Svelte kosong
                if (!streamUrl.length && !downloadUrl.length) {
                    $('a').each((i, el) => {
                        const href = $(el).attr('href');
                        const txt = $(el).text().toUpperCase().trim();
                        if (
                            href &&
                            (href.includes('acefile') || href.includes('gdrive') || href.includes('pixeldrain'))
                        ) {
                            downloadUrl.push({
                                format: 'MP4',
                                resolutions: [
                                    {
                                        quality: 'Unknown',
                                        links: [{ host: txt || 'Unknown', url: href }],
                                    },
                                ],
                            });
                        }
                    });
                }

                // 1. STREAMING
                const streaming = Array.isArray(streamUrl)
                    ? streamUrl.map((s) => {
                          const txt = s.source || s.title || s.server || s.quality || '';
                          let res = this._extractResolution(txt);
                          if (!res) {
                              try {
                                  const urlObj = new URL(s.url);
                                  let host = urlObj.hostname.replace('www.', '').split('.')[0];
                                  res = host.charAt(0).toUpperCase() + host.slice(1);
                              } catch (e) {
                                  res = txt || 'Server';
                              }
                          }
                          return {
                              host: res,
                              quality: this._extractResolution(txt) || 'SD',
                              url: s.url,
                          };
                      })
                    : [];

                // 2. DOWNLOADS (FIXED FOR PRISMA ERROR)
                const downloads = [];
                if (Array.isArray(downloadUrl)) {
                    downloadUrl.forEach((dl) => {
                        const cleanResolutions = [];

                        if (dl.resolutions && Array.isArray(dl.resolutions)) {
                            dl.resolutions.forEach((res) => {
                                const linksArr = res.links || res.download_links || [];

                                if (Array.isArray(linksArr) && linksArr.length > 0) {
                                    const validLinks = linksArr
                                        .map((l) => ({
                                            host: (l.host || l.server || 'Unknown')
                                                .toUpperCase()
                                                .replace('GOOGLE DRIVE', 'GD'),
                                            url: l.url || l.link,
                                        }))
                                        .filter((l) => l.url);

                                    if (validLinks.length > 0) {
                                        // [FIX IS HERE] Pastikan quality selalu string, tidak boleh undefined
                                        const rawQuality = res.quality || 'Unknown';
                                        const finalQuality = this._extractResolution(rawQuality) || rawQuality;

                                        cleanResolutions.push({
                                            quality: finalQuality,
                                            links: validLinks,
                                        });
                                    }
                                }
                            });
                        }

                        if (cleanResolutions.length > 0) {
                            downloads.push({
                                format: dl.format || 'mp4',
                                resolutions: cleanResolutions,
                            });
                        }
                    });
                }

                return {
                    episode_number: parseFloat(episodeInfo.episode_number),
                    title: episodeInfo.title,
                    url: targetUrl, // Use the effective URL (targetUrl) instead of original episodeInfo.url
                    streaming,
                    downloads,
                };
            } catch (error) {
                attempts++;
                if (attempts >= CONFIG.maxRetries) {
                    // logger.error(`Failed Eps ${episodeInfo.episode_number}: ${error.message}`);
                    return {
                        episode_number: parseFloat(episodeInfo.episode_number),
                        title: episodeInfo.title,
                        url: targetUrl, // Return failed URL as well
                        streaming: [],
                        downloads: [],
                    };
                }
                await sleep(1000); // Reduce sleep on error retry
            }
        }
    }

    async getCompleteAnimeData(animeUrl) {
        const meta = await this.getAnimeMetadata(animeUrl);
        if (!meta) return null;

        logger.info(`Scraping Episodes: ${meta.detail.title} (${meta.episodeList.length} eps)`);

        const fullEpisodes = [];
        const queue = [...meta.episodeList]; // Copy array episode

        while (queue.length > 0) {
            // Proses batch episode secara paralel (misal 5 eps sekaligus)
            const batch = queue.splice(0, CONFIG.concurrency);

            const results = await Promise.all(
                batch.map(async (ep) => {
                    // Panggil fungsi getEpisodeUrl untuk setiap episode
                    const media = await this.getEpisodeUrl(ep.url);

                    return {
                        ...ep, // Data basic (no episode, judul, url)
                        streaming: media.streaming, // Tambahkan data stream
                        downloads: media.downloads, // Tambahkan data download
                    };
                }),
            );

            fullEpisodes.push(...results);

            // Delay antar batch agar tidak kena rate limit/ban IP
            await sleep(500);
        }

        return {
            title: meta.detail.title,
            slug: meta.slug,
            url: animeUrl,
            detail: meta.detail,
            episodes: fullEpisodes,
        };
    }

    _fixPosterUrl(url) {
        if (!url) return null;
        const base = 'https://cover.oploverz.ac';
        return `${base}/${url.replace(/^\//, '')}`;
    }

    async getEpisodeUrl(episodeUrl) {
        let attempts = 0;
        while (attempts < CONFIG.maxRetries) {
            let page;
            try {
                const browser = await getBrowser();
                page = await browser.newPage();
                await page.setUserAgent(CONFIG.userAgent);
                await page.setExtraHTTPHeaders({ 'Referer': CONFIG.baseUrl });

                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });

                const response = await page.goto(episodeUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: CONFIG.timeout,
                });

                if (!response.ok()) {
                     // [NEW] Smart Fallback Puppeteer
                     if ((response.status() === 404 || response.status() === 500) && episodeUrl.includes('/series/')) {
                         const parts = episodeUrl.split('/series/');
                         if (parts.length > 1) {
                             const tail = parts[1];
                             const slug = tail.split('/')[0];
                             const epNum = tail.split('/episode/')[1] || '1'; // Default 1

                             // Fallback 1: /movie/{slug}
                             const fallbackUrl1 = `${CONFIG.baseUrl}/movie/${slug}`;
                             logger.info(`[OploverzScrap] Puppeteer Fallback 1: ${fallbackUrl1}`);
                             const resp1 = await page.goto(fallbackUrl1, { waitUntil: 'domcontentloaded' });
                             if (resp1.ok()) {
                                 logger.info(`[OploverzScrap] Fallback 1 Success!`);
                             } else {
                                  // Fallback 2: /movie/{slug}/{epNum}
                                 const fallbackUrl2 = `${CONFIG.baseUrl}/movie/${slug}/${epNum}`;
                                 logger.info(`[OploverzScrap] Puppeteer Fallback 2: ${fallbackUrl2}`);
                                 const resp2 = await page.goto(fallbackUrl2, { waitUntil: 'domcontentloaded' });
                                 if (!resp2.ok()) {
                                     throw new Error(`Fallback failed with status code ${resp2.status()}`);
                                 }
                             }
                         } else {
                             throw new Error(`Request failed with status code ${response.status()}`);
                         }
                     } else {
                        throw new Error(`Request failed with status code ${response.status()}`);
                     }
                }

                const data = await page.content();
                const $ = cheerio.load(data);
                const rawData = this._extractSvelteData($);

                let streamUrl = this._findDataRecursive(rawData, 'streamUrl') || [];
                let downloadUrl = this._findDataRecursive(rawData, 'downloadUrl') || [];

                // Fallback HTML jika Svelte kosong
                if (!streamUrl.length && !downloadUrl.length) {
                    logger.debug(`[OploverzScrap] Svelte data not found for ${episodeUrl}. Falling back to HTML scraping.`);
                    // Fallback Download
                    $('.soradl a, .dl a, .op-download a').each((i, el) => {
                        const href = $(el).attr('href');
                        const txt = $(el).text().trim();
                        if (href && !href.startsWith('#')) {
                            downloadUrl.push({
                                format: 'MP4',
                                resolutions: [{ quality: 'Unknown', links: [{ host: txt, url: href }] }],
                            });
                        }
                    });

                    // Fallback Stream (Iframe)
                    $('iframe').each((i, el) => {
                        const src = $(el).attr('src');
                        if (src) streamUrl.push({ server: 'Embed', url: src });
                    });
                }

                // 1. Parsing Streaming
                const streaming = Array.isArray(streamUrl)
                    ? streamUrl.map((s) => {
                          const txt = s.source || s.title || s.server || s.quality || '';
                          let res = this._extractResolution(txt);

                          let host = res ? txt.replace(res, '').trim() : txt;
                          if (!host) {
                              try {
                                  host = new URL(s.url).hostname.replace('www.', '').split('.')[0];
                              } catch (e) {
                                  host = 'Embed';
                              }
                          }
                          return {
                              host: host.charAt(0).toUpperCase() + host.slice(1),
                              quality: res || 'SD',
                              url: s.url,
                          };
                      })
                    : [];

                // 2. Parsing Downloads
                const downloads = [];
                if (Array.isArray(downloadUrl)) {
                    downloadUrl.forEach((dl) => {
                        const cleanResolutions = [];
                        if (dl.resolutions && Array.isArray(dl.resolutions)) {
                            dl.resolutions.forEach((res) => {
                                const linksArr = res.links || res.download_links || [];
                                if (Array.isArray(linksArr)) {
                                    const validLinks = linksArr
                                        .map((l) => ({
                                            host: (l.host || l.server || 'Unknown')
                                                .toUpperCase()
                                                .replace('GOOGLE DRIVE', 'GD'),
                                            url: l.url || l.link,
                                        }))
                                        .filter((l) => l.url);

                                    if (validLinks.length > 0) {
                                        const q = res.quality || 'Unknown';
                                        cleanResolutions.push({
                                            quality: this._extractResolution(q) || q,
                                            links: validLinks,
                                        });
                                    }
                                }
                            });
                        }
                        if (cleanResolutions.length > 0) {
                            downloads.push({
                                format: dl.format || 'MP4',
                                resolutions: cleanResolutions,
                            });
                        }
                    });
                }

                return { streaming, downloads, effectiveUrl: response.url() };
            } catch (error) {
                attempts++;
                logger.error(`[OploverzScrap] Attempt ${attempts} failed for ${episodeUrl}: ${error.message}`);
                if (attempts >= CONFIG.maxRetries) {
                    return { streaming: [], downloads: [], effectiveUrl: episodeUrl };
                }
                await sleep(1000);
            } finally {
                if (page) await page.close();
            }
        }
        return { streaming: [], downloads: [], effectiveUrl: episodeUrl }; // Should not be reached if maxRetries is > 0
    }
}

module.exports = new OploverzScrap();
