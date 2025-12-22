const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');

const CONFIG = {
    baseUrl: 'https://anime.oploverz.ac',
    userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    timeout: 30000,
    concurrency: 10, // [SPEED UP] Naikkan worker agar lebih ngebut
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
            const { data } = await axiosInstance.get(url);
            const $ = cheerio.load(data);
            const rawData = this._extractSvelteData($);

            // [FIX] Ekstraksi Slug yang Lebih Aman
            let seriesSlug = '';

            // Cara 1: Ambil dari URL
            const urlParts = url.split('/series/');
            if (urlParts.length > 1) {
                seriesSlug = urlParts[1].split('/')[0].split('?')[0].replace(/\/$/, '');
            }

            // Cara 2: Ambil dari JSON Svelte (Fallback)
            if (!seriesSlug) {
                const sData = this._findDataRecursive(rawData, 'series');
                if (sData && sData.slug) seriesSlug = sData.slug;
            }

            // Cara 3: Fallback Darurat (Jika URL formatnya aneh, misal /anime/judul)
            if (!seriesSlug) {
                // Coba ambil dari canonical link atau og:url
                const canonical = $('link[rel="canonical"]').attr('href');
                if (canonical && canonical.includes('/series/')) {
                    seriesSlug = canonical.split('/series/')[1].split('/')[0].replace(/\/$/, '');
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

                            return {
                                episode_number: String(epNum),
                                title: ep.title || `Episode ${epNum}`,
                                url: `${CONFIG.baseUrl}/series/${seriesSlug}/episode/${epNum}`,
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
        while (attempts < CONFIG.maxRetries) {
            try {
                const { data } = await axiosInstance.get(episodeInfo.url);
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
                    url: episodeInfo.url,
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
                        url: episodeInfo.url,
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
            try {
                // logger.info(`Scraping streams for: ${episodeUrl}`);
                const { data } = await axiosInstance.get(episodeUrl);
                const $ = cheerio.load(data);
                const rawData = this._extractSvelteData($);

                let streamUrl = this._findDataRecursive(rawData, 'streamUrl') || [];
                let downloadUrl = this._findDataRecursive(rawData, 'downloadUrl') || [];

                // Fallback HTML jika Svelte kosong
                if (!streamUrl.length && !downloadUrl.length) {
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

                return { streaming, downloads };
            } catch (error) {
                attempts++;
                if (attempts >= CONFIG.maxRetries) return { streaming: [], downloads: [] };
                await sleep(1000);
            }
        }
    }
}

module.exports = new OploverzScrap();
