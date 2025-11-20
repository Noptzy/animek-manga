require('dotenv').config();
const puppeteer = require('puppeteer');
const Logger = require('../../utils/logger.js');
const { detectResolution, cleanEmbedUrl } = require('../../utils/videoHelper.js');
const { waitForVideoSources } = require('../../utils/puppeteerHelper.js');

const kuramaUrl = process.env.KURAMANIME_URL || "https://v8.kuramanime.tel/";

const countryMap = {
    JP: 'anime',
    CN: 'donghua',
    KR: 'manhwa',
    AU: 'animation',
    MY: 'animation',
    UK: 'animationa',
    US: 'series',
};

class KuramanimeScrap {
    async getStreamEpsKuramanime(link) {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();

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

            let result = null;

            const kura = servers.find((s) => s.value === 'kuramadrive');
            if (kura) {
                await page.select('#changeServer', kura.value);
                await page.evaluate(() => {
                    const sel = document.querySelector('#changeServer');
                    sel && sel.dispatchEvent(new Event('change', { bubbles: true }));
                });

                let videoSources = [];
                for (const frame of page.frames()) {
                    videoSources = await waitForVideoSources(frame, 12000, 1000);
                    if (videoSources.length) break;
                }

                const resolutions = videoSources.map((src) => ({
                    resolution: detectResolution(src),
                    url: src,
                }));

                if (resolutions.length) {
                    result = { server: kura.value, resolutions };
                }
            }

            if (!result) {
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
                        result = { server: s.value, embedUrl };
                        break;
                    }
                }
            }

            return result;
        } catch (err) {
            Logger.error('Error in getStreamEpsKuramanime:', err.message);
            return null;
        } finally {
            if (browser) await browser.close();
        }
    }

    async getAnimeHomepageKuramanime() {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            );

            await page.goto(kuramaUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            const allLinks = await page.$$eval('a', (links) => {
                const uniqueLinks = new Set();
                links.forEach((link) => {
                    const href = link.getAttribute('href');
                    if (href && href.includes('/anime/') && !href.includes('/episode/')) {
                        uniqueLinks.add(href);
                    }
                });
                return Array.from(uniqueLinks);
            });

            await browser.close();

            const CONCURRENCY_LIMIT = 10;
            const animeDetailsMap = new Map();

            console.log(`Total ${allLinks.length} anime unik akan di-scrape...`);

            for (let i = 0; i < allLinks.length; i += CONCURRENCY_LIMIT) {
                const chunk = allLinks.slice(i, i + CONCURRENCY_LIMIT);
                const promises = chunk.map((link) => {
                    const fullUrl = new URL(link, kuramaUrl).href;
                    return this.getInfoAnimeKuramanime(fullUrl)
                        .then((detail) => ({ status: 'fulfilled', value: detail, link: fullUrl }))
                        .catch((err) => ({ status: 'rejected', reason: err.message, link: fullUrl }));
                });

                const settledResults = await Promise.all(promises);

                settledResults.forEach((res) => {
                    if (res.status === 'fulfilled' && res.value) {
                        animeDetailsMap.set(res.link, res.value);
                    } else {
                        console.warn(`🔴 GAGAL TOTAL scrape: ${res.link} | Alasan: ${res.reason}`);
                    }
                });
            }

            const allAnime = Array.from(animeDetailsMap.values());

            const groupedAnime = allAnime.reduce(
                (acc, anime) => {
                    if (anime.status === 'Sedang Tayang') acc['Sedang Tayang'].push(anime);
                    else if (anime.status === 'Selesai Tayang') acc['Selesai Tayang'].push(anime);
                    return acc;
                },
                { 'Sedang Tayang': [], 'Selesai Tayang': [], 'Film Layar Lebar': [] },
            );

            const movies = allAnime.filter((anime) => anime.type === 'Movie');
            groupedAnime['Film Layar Lebar'] = movies;

            return groupedAnime;
        } catch (err) {
            if (browser) await browser.close();
            Logger.error('Error in getAnimeHomepageKuramanime:', err.message);
            throw err;
        }
    }

    async getInfoAnimeKuramanime(url) {
        if (!url) throw new Error('URL tidak boleh kosong');

        console.log('Scraping URL:', url);
        const match = url.match(/\/(?:anime\/)?(\d+)/);
        if (!match) throw new Error(`Gagal mendapatkan ID anime dari URL: ${url}`);
        const animeId = match[1];

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            });
            const page = await browser.newPage();
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            );
            await page.setViewport({ width: 1200, height: 900 });

            const detailUrl = `${kuramaUrl}anime/${animeId}/`;
            await page.goto(detailUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            let image = '';
            try {
                await page.waitForSelector('.anime__details__pic.set-bg', { timeout: 8000 }).catch(() => {});
                image = await page.$eval('.anime__details__pic.set-bg', (el) => {
                    const bg =
                        window.getComputedStyle(el).getPropertyValue('background-image') ||
                        el.getAttribute('style') ||
                        '';
                    const m = bg.match(/url\(["']?(.*?)["']?\)/);
                    return m && m[1] ? m[1] : '';
                });
            } catch {
                image = await page.evaluate(() => {
                    const metaImg =
                        document.querySelector('meta[property="og:image"]') ||
                        document.querySelector('meta[name="twitter:image"]');
                    return metaImg ? metaImg.getAttribute('content') || '' : '';
                });
            }

            const scraped = await page.evaluate(() => {
                const safeText = (el) => el?.innerText?.trim() || '';
                const title = safeText(document.querySelector('.anime__details__title h3')) || '';
                let score = 0;
                const scoreEl = document.querySelector('.anime__details__pic .ep');
                if (scoreEl) {
                    const f = parseFloat(safeText(scoreEl));
                    if (!isNaN(f)) score = f;
                }
                const info = {
                    Tipe: '',
                    Episode: '',
                    Status: '',
                    Tayang: '',
                    Musim: '',
                    Durasi: '',
                    Kualitas: '',
                    Negara: '',
                    Adaptasi: '',
                    Genre: [],
                    Studio: '',
                    Skor: score,
                    Rating: '',
                };
                document.querySelectorAll('.anime__details__widget ul li').forEach((li) => {
                    const labelEl = li.querySelector('.col-3 span');
                    const valueEl = li.querySelector('.col-9');
                    if (!labelEl || !valueEl) return;
                    const label = safeText(labelEl).replace(':', '').trim();
                    if (label === 'Genre') {
                        const links = Array.from(valueEl.querySelectorAll('a'))
                            .map((a) => a.innerText.trim())
                            .filter(Boolean);
                        info.Genre = links.length
                            ? links
                            : safeText(valueEl)
                                  .split(',')
                                  .map((x) => x.trim())
                                  .filter(Boolean);
                    } else info[label] = safeText(valueEl);
                });
                return { title, info };
            });

            await browser.close();
            browser = null;

            const normalizedGenres = (scraped.info.Genre || []).map((g) => g.replace(/,$/, '').trim()).filter(Boolean);
            const countryCode = scraped.info.Negara || '';
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
                title: scraped.title || '',
                link: detailUrl,
                image: cleanUrl(image),
                country: countryCode,
                category,
                type: scraped.info.Tipe || '',
                episodes: parseInt((scraped.info.Episode || '').replace(/\D/g, '')) || 0,
                status: scraped.info.Status || '',
                tayang: scraped.info.Tayang || '',
                musim: scraped.info.Musim || '',
                durasi: scraped.info.Durasi || '',
                kualitas: scraped.info.Kualitas || '',
                adaptasi: scraped.info.Adaptasi || '',
                genres: normalizedGenres,
                studio: scraped.info.Studio || '',
                score: parseFloat(scraped.info.Skor) || 0,
                rating: scraped.info.Rating || '',
            };
        } catch (err) {
            if (browser) await browser.close();
            Logger.error('Error in getInfoAnimeKuramanime:', err.message);
            throw err;
        }
    }

    async getEpisodeListAnimeKuramanime(url) {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            );

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            const episodes = await page.evaluate(() => {
                const episodesList = [];
                document.querySelectorAll('a[href*="/episode/"]').forEach((link) => {
                    const href = link.getAttribute('href');
                    const episodeMatch = href && href.match(/\/episode\/(\d+)/);
                    if (episodeMatch) {
                        episodesList.push({
                            episodeNumber: parseInt(episodeMatch[1]),
                            href: href.startsWith('http') ? href : `${window.location.origin}${href}`,
                            title: `Episode ${episodeMatch[1]}`,
                        });
                    }
                });

                const uniqueEpisodes = episodesList.filter(
                    (ep, idx, self) => idx === self.findIndex((e) => e.href === ep.href),
                );

                return uniqueEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
            });

            await browser.close();
            return episodes;
        } catch (err) {
            if (browser) await browser.close();
            Logger.error('Error in getEpisodeListAnimeKuramanime:', err.message);
            return [];
        }
    }
    async getDetailAnimeKuramanime(url) {
        try {
            const animeInfo = await this.getInfoAnimeKuramanime(url);
            const episodes = await this.getEpisodeListAnimeKuramanime(url);
            const episodeList = episodes.map((e) => ({
                title: e.episode,
                url: e.href,
                episodeNumber: e.episodeNumber,
            }));
            return { ...animeInfo, totalEpisodes: episodeList.length, episodeList };
        } catch (err) {
            Logger.error('Error in getDetailAnimeKuramanime:', err.message);
            throw err;
        }
    }
}

module.exports = new KuramanimeScrap();