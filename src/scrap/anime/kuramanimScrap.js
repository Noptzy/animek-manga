require('dotenv').config();
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger.js');
const { withRetry } = require('../../utils/retryHelper');
const { waitForVideoSources } = require('../../utils/puppeteerHelper.js');
const { cleanEmbedUrl } = require('../../utils/videoHelper.js');
const { detectQualityFromUrl } = require('../../utils/qualityHelper.js');

const kuramaUrl = process.env.KURAMANIME_URL || 'https://v8.kuramanime.tel/';
const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

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
                if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
                else req.continue();
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
                            resolution: detectQualityFromUrl(src),
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

                    try {
                        await page.waitForSelector('iframe', { timeout: 6000 });
                        let embedUrl = await page.$eval('iframe', (el) => el.src);
                        embedUrl = cleanEmbedUrl(embedUrl);

                        if (embedUrl) {
                            resolutions = [{ resolution: 'embed', url: embedUrl }];
                            break;
                        }
                    } catch {}
                }
            }

            return resolutions;
        } catch (err) {
            logger.error(`Stream error: ${err.message}`);
            return [];
        } finally {
            if (browser) await browser.close();
        }
    }

    async getInfoAnimeKuramanime(url) {
        const match = url.match(/\/anime\/(\d+)/);
        if (!match) throw new Error('Invalid anime URL');

        const detailUrl = `${kuramaUrl}anime/${match[1]}/`;

        const { data: html } = await withRetry(
            () =>
                axios.get(detailUrl, {
                    headers: { 'User-Agent': USER_AGENT },
                    timeout: 60000,
                }),
            3,
            1000,
        );

        const $ = cheerio.load(html);

        const title = $('.anime__details__title h3')
            .text()
            .trim()
            .replace(/\s*\(Ep.*?\)$/i, '');
        const altTitle = $('.anime__details__title span').text().trim();
        const slug = this._generateSlug(title);

        const info = {};
        $('.anime__details__widget ul li').each((_, li) => {
            const label = $(li).find('.col-3 span').text().replace(':', '').trim();
            const value = $(li).find('.col-9').text().replace(/\s+/g, ' ').trim();
            if (label) info[label] = value;
        });

        const genres = [];
        $('.anime__details__widget a').each((_, el) => {
            const g = $(el).text().trim();
            if (g) genres.push(g);
        });

        const country = info.Negara || '';
        const category = country === 'JP' ? 'anime' : 'other';

        return {
            title,
            alt_title: altTitle,
            slug,
            link: detailUrl,
            poster_url:
                $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '',
            synopsis: $('#synopsisField').text().trim(),
            status: info.Status || '',
            type: info.Tipe || '',
            country,
            category, // Add the new category field
            genres,
        };
    }

    async getEpisodeListAnimeKuramanime(url) {
        const episodesMap = new Map();
        const baseUrl = url.replace(/\/$/, '');
        const MAX_EP_PAGE = 50;

        for (let page = 1; page <= MAX_EP_PAGE; page++) {
            const pageUrl = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;

            let html;
            try {
                const res = await axios.get(pageUrl, {
                    headers: { 'User-Agent': USER_AGENT },
                    timeout: 30000,
                });
                html = res.data;
            } catch (err) {
                break;
            }

            const $ = cheerio.load(html);
            let foundInThisPage = false;

            $('a[href*="/episode/"]').each((_, el) => {
                const href = $(el).attr('href');
                if (!href) return;

                const match = href.match(/\/episode\/(\d+)/);
                if (!match) return;

                const epNum = Number(match[1]);
                if (Number.isNaN(epNum)) return;

                if (!episodesMap.has(epNum)) {
                    episodesMap.set(epNum, {
                        episodeNumber: epNum,
                        title: `Episode ${epNum}`,
                        url: new URL(href, baseUrl).href,
                    });
                    foundInThisPage = true;
                }
            });

            const popoverHtml =
                $('#episodeLists').attr('data-content') ||
                $('[data-toggle="popover"][data-content]').attr('data-content');

            if (popoverHtml) {
                const $p = cheerio.load(popoverHtml);
                $p('a[href*="/episode/"]').each((_, el) => {
                    const href = $p(el).attr('href');
                    if (!href) return;

                    const match = href.match(/\/episode\/(\d+)/);
                    if (!match) return;

                    const epNum = Number(match[1]);
                    if (Number.isNaN(epNum)) return;

                    if (!episodesMap.has(epNum)) {
                        episodesMap.set(epNum, {
                            episodeNumber: epNum,
                            title: `Episode ${epNum}`,
                            url: new URL(href, baseUrl).href,
                        });
                        foundInThisPage = true;
                    }
                });
            }

            if (!foundInThisPage && page > 1) {
                break;
            }

            await sleep(150);
        }

        return [...episodesMap.values()].sort((a, b) => a.episodeNumber - b.episodeNumber);
    }

    async getDetailAnimeKuramanime(url) {
        const anime = await this.getInfoAnimeKuramanime(url);
        const episodeList = await this.getEpisodeListAnimeKuramanime(url);

        return {
            ...anime,
            totalEpisodes: episodeList.length,
            episodeList,
        };
    }

    async scrapeAnimeListPage(type, page) {
        const listUrl = `${kuramaUrl}quick/${type}?order_by=text&page=${page}`;
        try {
            const { data: html } = await axios.get(listUrl, {
                headers: { 'User-Agent': USER_AGENT },
                timeout: 30000,
            });

            const $ = cheerio.load(html);
            const links = new Set();

            $('a[href*="/anime/"]').each((_, el) => {
                const href = $(el).attr('href');
                if (href) links.add(new URL(href, kuramaUrl).href);
            });

            return links;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                logger.warn(`[SCRAPE] Page ${page} for ${type} not found (404).`);
                return new Set(); // Return empty set on 404
            }
            logger.error(`[SCRAPE] Failed to fetch page ${page} for ${type}: ${error.message}`);
            throw error; // Re-throw other errors
        }
    }
}

module.exports = new KuramanimeScrap();
