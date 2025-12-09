require('dotenv').config();
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger.js');
const { detectResolution, cleanEmbedUrl } = require('../../utils/videoHelper.js');
const { waitForVideoSources } = require('../../utils/puppeteerHelper.js');

const kuramaUrl = process.env.KURAMANIME_URL || 'https://v8.kuramanime.tel/';
const MAX_PAGE = process.env.MAX_PAGE_SEED ? parseInt(process.env.MAX_PAGE_SEED) : 100;

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

const countryMap = {
    JP: 'anime',
    CN: 'donghua',
    KR: 'manhwa',
    AU: 'animation',
    MY: 'animation',
    UK: 'animationa',
    US: 'series',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class KuramanimeScrap {
    _generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    
    async getStreamEpsKuramanime(link) {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();
            await page.setUserAgent(USER_AGENT);

            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });

            const servers = await page.$$eval('#changeServer option', (opts) =>
                opts.map((o) => ({ value: o.value, label: o.innerText.trim() })),
            );

            let resolutions = [];

            const kura = servers.find((s) => s.value === 'kuramadrive');
            if (kura) {
                await page.select('#changeServer', kura.value);
                await page.evaluate(() => {
                    const sel = document.querySelector('#changeServer');
                    sel && sel.dispatchEvent(new Event('change', { bubbles: true }));
                });

                for (const frame of page.frames()) {
                    const videoSources = await waitForVideoSources(frame, 12000, 1000);
                    if (videoSources.length) {
                        resolutions = videoSources.map((src) => ({
                            resolution: detectResolution(src),
                            url: src,
                        }));
                        break;
                    }
                }
            }

            if (!resolutions.length) {
                for (const s of servers) {
                    if (s.value === 'kuramadrive') continue;

                    await page.select('#changeServer', s.value);
                    await page.evaluate(() => {
                        const sel = document.querySelector('#changeServer');
                        sel && sel.dispatchEvent(new Event('change', { bubbles: true }));
                    });

                    let embedUrl = null;
                    try {
                        await page.waitForSelector('iframe', { timeout: 6000 });
                        embedUrl = await page.$eval('iframe', (el) => el.src);
                        embedUrl = cleanEmbedUrl(embedUrl);
                    } catch {}

                    if (embedUrl) {
                        resolutions = [
                            {
                                resolution: 'embed',
                                url: embedUrl,
                            },
                        ];
                        break;
                    }
                }
            }

            return resolutions;
        } catch (err) {
            logger.error(`Error in getStreamEpsKuramanime: ${err.message}`);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }

    async getInfoAnimeKuramanime(url) {
        if (!url) {
            const error = new Error('URL tidak boleh kosong');
            logger.error(error.message);
            throw error;
        }

        const match = url.match(/\/(?:anime\/)?(\d+)/);
        if (!match) {
            const error = new Error(`Gagal mendapatkan ID anime dari URL: ${url}`);
            logger.error(error.message);
            throw error;
        }
        const animeId = match[1];

        const detailUrl = `${kuramaUrl}anime/${animeId}/`;

        try {
            const { data: html } = await axios.get(detailUrl, {
                headers: { 'User-Agent': USER_AGENT },
                timeout: 60000,
            });

            const $ = cheerio.load(html);

            let image = '';
            const pic = $('.anime__details__pic.set-bg');
            if (pic.length) {
                image = pic.attr('data-setbg') || '';
                if (!image) {
                    const style = pic.attr('style') || '';
                    const m = style.match(/url\(["']?(.*?)["']?\)/);
                    if (m && m[1]) image = m[1];
                }
            }

            if (!image) {
                const metaImg =
                    $('meta[property="og:image"]').attr('content') ||
                    $('meta[name="twitter:image"]').attr('content') ||
                    '';
                image = metaImg;
            }

            const safeText = (selector) => $(selector).text().replace(/\s+/g, ' ').trim() || '';

            // Clean Title
            let title = (safeText('.anime__details__title h3') || '').replace(/["\\]/g, '');
            title = title.replace(/\s*\(Ep\s*\d+\s*\/.*?\)\s*$/i, '');

            // GENERATE SLUG
            const slug = this._generateSlug(title);

            const altTitle = safeText('.anime__details__title > span') || '';

            let synopsis = $('#synopsisField').text().trim();
            const unwantedPhrase = 'Catatan: Sinopsis diterjemahkan secara otomatis oleh Google Translate.';
            if (synopsis) {
                synopsis = synopsis.replace(unwantedPhrase, '').trim();
            }

            let score = 0;
            const scoreText = $('.anime__details__pic .ep').first().text().replace(/\s+/g, ' ').trim();
            const scoreFloat = parseFloat(scoreText);
            if (!isNaN(scoreFloat)) score = scoreFloat;

            const info = {
                Tipe: '',
                Episode: '',
                Status: '',
                Tayang: '',
                Musim: '',
                Durasi: '',
                Kualitas: '',
                Adaptasi: '',
                Genre: [],
                Studio: '',
                Skor: score,
                Rating: '',
            };

            $('.anime__details__widget ul li').each((_, li) => {
                const $li = $(li);
                const labelEl = $li.find('.col-3 span').first();
                const valueEl = $li.find('.col-9').first();

                if (!labelEl.length || !valueEl.length) return;

                const label = labelEl.text().replace(':', '').trim();
                const rawValue = valueEl.text().replace(/\s+/g, ' ').trim();

                if (label === 'Genre') {
                    const links = [];
                    valueEl.find('a').each((_, a) => {
                        const t = $(a).text().replace(/\s+/g, ' ').trim();
                        if (t) links.push(t);
                    });

                    if (links.length) {
                        info.Genre = links;
                    } else {
                        info.Genre = rawValue
                            .split(',')
                            .map((x) => x.trim())
                            .filter(Boolean);
                    }
                } else {
                    info[label] = rawValue;
                }
            });

            const normalizedGenres = (info.Genre || []).map((g) => g.replace(/,$/, '').trim()).filter(Boolean);

            const countryCode = info.Negara || '';
            const category = countryMap[countryCode] || 'anime';

            const cleanUrl = (u) =>
                u
                    ? u
                          .replace(/&quot;/g, '"')
                          .replace(/&amp;/g, '&')
                          .replace(/^["']|["']$/g, '')
                          .trim()
                    : '';

            return {
                title: title,
                slug: slug,
                alt_title: altTitle,
                link: detailUrl,
                poster_url: cleanUrl(image),
                synopsis: synopsis,
                status: info.Status || '',
                tayang: info.Tayang || '',
                type: info.Tipe || '',
                musim: info.Musim || '',
                durasi: info.Durasi || '',
                kualitas: info.Kualitas || '',
                adaptasi: info.Adaptasi || '',
                genres: normalizedGenres,
                studio: info.Studio || '',
                category,
                country: countryCode,
                score: parseFloat(info.Skor) || 0,
                rating: info.Rating || '',
                episodes: parseInt((info.Episode || '').replace(/\D/g, '')) || 0,
            };
        } catch (err) {
            logger.error(`Error in getInfoAnimeKuramanime: ${err.message}`);
            throw err;
        }
    }

    async getEpisodeListAnimeKuramanime(url) {
        try {
            const { data: html } = await axios.get(url, {
                headers: { 'User-Agent': USER_AGENT },
                timeout: 60000,
            });

            const $ = cheerio.load(html);
            const episodesMap = new Map();

            const addEpisode = (href) => {
                if (!href) return;

                const absHref = new URL(href, url).href;
                const match = href.match(/\/episode\/(\d+)/);
                if (!match) return;

                const epNum = parseInt(match[1], 10);
                if (Number.isNaN(epNum)) return;

                if (!episodesMap.has(absHref)) {
                    episodesMap.set(absHref, {
                        episodeNumber: epNum,
                        href: absHref,
                        title: `Episode ${epNum}`,
                    });
                }
            };

            $('a[href*="/episode/"]').each((_, el) => {
                const href = $(el).attr('href');
                addEpisode(href);
            });

            const popoverHtml =
                $('#episodeLists').attr('data-content') ||
                $('[data-toggle="popover"][data-content]').attr('data-content');

            if (popoverHtml) {
                const $p = cheerio.load(popoverHtml);
                $p('a[href*="/episode/"]').each((_, el) => {
                    const href = $p(el).attr('href');
                    addEpisode(href);
                });
            }

            const episodesList = Array.from(episodesMap.values()).sort((a, b) => a.episodeNumber - b.episodeNumber);

            return episodesList;
        } catch (err) {
            logger.error(`Error in getEpisodeListAnimeKuramanime: ${err.message}`);
            return [];
        }
    }

    async getDetailAnimeKuramanime(url) {
        try {
            const animeInfo = await this.getInfoAnimeKuramanime(url);
            const episodes = await this.getEpisodeListAnimeKuramanime(url);
            const episodeList = episodes.map((e) => ({
                title: e.title,
                url: e.href,
                episodeNumber: e.episodeNumber,
            }));

            return {
                ...animeInfo,
                totalEpisodes: episodeList.length,
                episodeList,
            };
        } catch (err) {
            logger.error(`Error in getDetailAnimeKuramanime: ${err.message}`);
            throw err;
        }
    }

    // === BAGIAN YANG DIPERBAIKI ===
    async scrapeMassSeed(type, onItemScraped = null) {
        const validTypes = ['ongoing', 'finished', 'movie'];
        if (!validTypes.includes(type)) {
            const error = new Error(`Type tidak valid. Gunakan: ${validTypes.join(', ')}`);
            logger.error(error.message);
            throw error;
        }

        logger.info(`[SEED] Memulai scraping: ${type} (Max Page: ${MAX_PAGE})`);

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const pageObj = await browser.newPage();
            await pageObj.setUserAgent(USER_AGENT);

            for (let page = 1; page <= MAX_PAGE; page++) {
                const url = `${kuramaUrl}quick/${type}?order_by=text&page=${page}`;
                logger.info(`[SEED] Mengambil daftar Halaman ${page}...`);

                try {
                    await pageObj.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                    await sleep(1000);

                    const animeLinks = await pageObj.evaluate((baseUrl) => {
                        const links = new Set(); // Use Set to handle duplicates automatically
                        const anchors = document.querySelectorAll(
                            '#animeList a, .product__page__content a, .anime__list__text a',
                        );

                        anchors.forEach((el) => {
                            let href = el.getAttribute('href');
                            if (href && href.includes('/anime/')) {
                                if (href.includes('/episode/')) {
                                    href = href.split('/episode/')[0];
                                }
                                const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
                                links.add(fullUrl);
                            }
                        });
                        return Array.from(links);
                    }, kuramaUrl);

                    if (animeLinks.length === 0) {
                        const bodyText = await pageObj.evaluate(() => document.body.innerText);
                        if (bodyText.includes('Data tidak ditemukan') || bodyText.includes('Halaman tidak ditemukan')) {
                            logger.info(`[SEED] Halaman kosong / Habis di page ${page}. Menghentikan proses.`);
                            break;
                        }
                        logger.info(`[SEED] Tidak ada link ditemukan di halaman ${page}. Lanjut...`);
                        continue;
                    }

                    logger.info(`[SEED] Ditemukan ${animeLinks.length} anime. Memproses detail...`);

                    for (const link of animeLinks) {
                        try {
                            const details = await this.getDetailAnimeKuramanime(link);

                            if (details.country !== 'JP') {
                                logger.info(`[SEED] Skip: ${details.title} (Bukan JP: ${details.country})`);
                                continue;
                            }

                            const hasHentai = details.genres.some((g) => g.toLowerCase().includes('hentai'));
                            if (hasHentai) {
                                logger.info(`[SEED] Skip: ${details.title} (Genre Hentai)`);
                                continue;
                            }

                            details.category = 'anime';

                            // Jika ada callback, jalankan. Jika tidak, return array (legacy support).
                            if (onItemScraped) {
                                await onItemScraped(details);
                            } else {
                                // This else block is for backward compatibility if ever needed,
                                // but the new implementation won't use it.
                            }
                            
                            await sleep(200);
                        } catch (detailErr) {
                            logger.error(`[SEED] Gagal detail ${link}: ${detailErr.message}`);
                        }
                    }
                } catch (err) {
                    logger.error(`[SEED] Error halaman ${page}: ${err.message}`);
                    break;
                }
            }
        } catch (mainErr) {
            logger.error(`[SEED] Fatal Error Browser: ${mainErr.message}`);
            throw mainErr; // re-throw critical errors
        } finally {
            if (browser) await browser.close();
        }

        // The function no longer returns a large array.
        // It processes items as they are found via the callback.
    }
}

module.exports = new KuramanimeScrap();
