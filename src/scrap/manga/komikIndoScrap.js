require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger.js');

const komikIndoUrl = process.env.KOMIK_INDO_URL || 'https://komikindo.ch/';
const maxPage = process.env.MANGA_MAX_PAGE;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

class komikIndoScrap {
    async getKomikIndoDetail(slug) {
        const url = `${komikIndoUrl}komik/${slug}/`;
        try {
            const res = await axios.get(url, { headers: { 'User-Agent': UA } });
            const $ = cheerio.load(res.data);

            const infoX = $('.infox');
            const mangaDetail = {};

            mangaDetail.title = $('.entry-title').text().replace('Komik', '').trim();
            mangaDetail.slug = slug;
            mangaDetail.poster_url = $('.thumb img').attr('src');

            const extractInfo = (label) => infoX.find(`span:contains("${label}")`).text().replace(label, '').trim();

            mangaDetail.status = extractInfo('Status:');
            mangaDetail.author = extractInfo('Pengarang:');
            mangaDetail.illustrator = extractInfo('Ilustrator:');
            mangaDetail.alt_title = extractInfo('Judul Alternatif:');

            mangaDetail.genres = $('.genre-info a')
                .map((i, el) => $(el).text().trim())
                .get();

            let synopsisText = $('#sinopsis .entry-content p').text();

            mangaDetail.synopsis = synopsisText.replace(/\s+/g, ' ').trim();
            
            if (mangaDetail.status === 'Tamat') {
                mangaDetail.status = 'Completed';
            } else {
                mangaDetail.status = 'Ongoing';
            }

            const chapterList = [];
            $('#chapter_list ul li').each((i, el) => {
                const $li = $(el);
                const chapterLink = $li.find('a');
                const fullUrl = chapterLink.attr('href') || '';

                const cleanUrl = fullUrl.replace(komikIndoUrl, '').replace(/^\/+/, '').replace(/\/$/, '') + '/';

                chapterList.push({
                    chapter_number: $li.find('chapter').text().trim(),
                    title: chapterLink.attr('title'),
                    url: cleanUrl,
                    release_ago: $li.find('.dt a').text().trim(),
                });
            });

            const reversedChapters = chapterList.reverse();

            mangaDetail.total_chapters = reversedChapters.length;
            mangaDetail.chapters = reversedChapters;

            return mangaDetail;
        } catch (error) {
            logger.error(`Error Scraping KomikIndo detail for slug ${slug}`, error.message);
            return null;
        }
    }

    async getKomikIndoChapterImages(chapterPath) {
        const path = chapterPath.startsWith('/') ? chapterPath : `/${chapterPath}`;
        const url = `${komikIndoUrl}${path}`;

        try {
            const res = await axios.get(url, { headers: { 'User-Agent': UA } });
            const $ = cheerio.load(res.data);

            const title = $('.dtlx h1.entry-title').text().trim().replace('Komik', '').trim();

            const imageUrls = [];
            $('#Baca_Komik .img-landmine img').each((i, el) => {
                const src = $(el).attr('src');
                if (src) imageUrls.push(src.trim());
            });

            const nextChapterRaw = $('.navig .nextprev a[rel="next"]').attr('href') || null;

            let nextChapterSlug = null;
            if (nextChapterRaw) {
                try {
                    const parsed = new URL(nextChapterRaw);
                    nextChapterSlug = parsed.pathname.replace(/^\/+/, '');
                } catch {
                    nextChapterSlug = nextChapterRaw.replace(komikIndoUrl, '').replace(/^\/+/, '');
                }

                nextChapterSlug = nextChapterSlug.replace(/\/$/, '');
            }

            return {
                title,
                images: imageUrls,
                next_chapter_url: nextChapterSlug ? `/${nextChapterSlug}/` : null,
            };
        } catch (error) {
            logger.error(`Error Scraping chapter images for ${url}`, error.message);
            return { title: null, images: [], next_chapter_url: null };
        }
    }

    async getKomikIndoSearch(query) {
        const encodedQuery = encodeURIComponent(query);
        const url = `${komikIndoUrl}?s=${encodedQuery}`;
        try {
            const res = await axios.get(url, { headers: { 'User-Agent': UA } });
            const $ = cheerio.load(res.data);
            const searchResults = [];

            const $mainContainer = $('.listupd .film-list');

            if ($mainContainer.length === 0) {
                if ($('h1:contains("Komik Hasil Pencarian")').length > 0) {
                    logger.info(`Search for "${query}" completed, but returned no manga results.`);
                } else {
                    logger.error(`Search results container not found for query: ${query}.`);
                }
                return { query, data: [] };
            }

            $mainContainer.find('.animepost').each((index, element) => {
                const $element = $(element);
                const $link = $element.find('.animposx a').first();
                const mangaUrl = $link.attr('href');

                const posterRaw = $element.find('img').attr('src');
                const title = $element.find('.bigors h4 a').text().trim();

                const ratingText = $element.find('.rating i').text().trim() || null;

                if (mangaUrl && title) {
                    const slugMatch = mangaUrl.match(/\/komik\/(.+?)\/?$/);
                    const slug = slugMatch ? slugMatch[1] : null;

                    const poster_url = posterRaw || $element.find('img').attr('data-src');

                    searchResults.push({
                        title,
                        slug,
                        url: mangaUrl,
                        poster_url,
                        rating: ratingText,
                    });
                }
            });

            return {
                query,
                data: searchResults,
                totalResults: searchResults.length,
            };
        } catch (error) {
            logger.error(`Error during search for "${query}": ${error.message}`);
            return { query, data: [], error: error.message };
        }
    }

    async getKomikIndoManga(page) {
        const pageNum = parseInt(page) || 1;
        const url = pageNum > 1 ? `${komikIndoUrl}manga/page/${pageNum}/` : `${komikIndoUrl}manga/`;

        try {
            const response = await axios.get(url, { headers: { 'User-Agent': UA } });
            const $ = cheerio.load(response.data);
            const mangaList = [];

            const $mainContainer = $('.listupd .film-list');

            const nextLinkRaw = $('.pagination a.next').attr('href');
            let totalPage = pageNum;

            $('.pagination a.page-numbers').each((i, el) => {
                const pageNumText = $(el).text().trim();
                const pageNumValue = parseInt(pageNumText);

                if (!isNaN(pageNumValue) && pageNumValue > totalPage) {
                    totalPage = pageNumValue;
                }
            });

            let next_page_num = null;
            if (nextLinkRaw) {
                const path = nextLinkRaw.replace(komikIndoUrl, '/').replace(/^\/\//, '/');
                const match = path.match(/\/page\/(\d+)\//);

                if (match && match[1]) {
                    next_page_num = parseInt(match[1]);
                }
            }

            if ($mainContainer.length === 0) {
                logger.error(`Container .listupd .film-list not found on page ${pageNum}.`);
                return { page: pageNum, totalPage: 1, data: [], hasNext: false };
            }

            $mainContainer.find('.animepost').each((index, element) => {
                const $element = $(element);
                const $link = $element.find('.animposx a').first();
                const mangaUrl = $link.attr('href');

                const posterRaw = $element.find('img').attr('src');
                const title = $element.find('.bigors h4 a').text().trim();
                const latestChapterLink = $element.find('.lsch a');
                const latestChapterTitle = latestChapterLink.text().trim();
                const latestChapterUrl = latestChapterLink.attr('href');
                const dateUpdate = $element.find('.datech').text().trim();

                if (mangaUrl && title) {
                    const slugMatch = mangaUrl.match(/\/komik\/(.+?)\/?$/);
                    const slug = slugMatch ? slugMatch[1] : null;

                    const poster_url = posterRaw || $element.find('img').attr('data-src');

                    let cleanMangaPath = null;
                    if (mangaUrl) {
                        try {
                            const parsed = new URL(mangaUrl);
                            cleanMangaPath = parsed.pathname.replace(/^\/+/, '');
                        } catch (e) {
                            cleanMangaPath = mangaUrl.replace(komikIndoUrl, '').replace(/^\/+/, '');
                        }
                        cleanMangaPath = cleanMangaPath.replace(/^komik\//, '');
                        if (cleanMangaPath && !cleanMangaPath.endsWith('/')) cleanMangaPath = `${cleanMangaPath}/`;
                    }

                    let cleanLatestPath = null;
                    if (latestChapterUrl) {
                        try {
                            const parsedL = new URL(latestChapterUrl);
                            cleanLatestPath = parsedL.pathname.replace(/^\/+/, '');
                        } catch (e) {
                            cleanLatestPath = latestChapterUrl.replace(komikIndoUrl, '').replace(/^\/+/, '');
                        }
                        cleanLatestPath = cleanLatestPath.replace(/^komik\//, '');
                        if (cleanLatestPath && !cleanLatestPath.endsWith('/')) cleanLatestPath = `${cleanLatestPath}/`;
                    }

                    mangaList.push({
                        title,
                        slug,
                        poster_url,
                        latest_chapter: {
                            title: latestChapterTitle,
                            url: `/manga/komik-indo/chapter/` + cleanLatestPath || latestChapterUrl,
                            updated_ago: dateUpdate,
                        },
                    });
                }
            });

            return {
                data: mangaList,
                page: pageNum,
                totalPage: totalPage,
                next_page_num: next_page_num,
                hasNext: !!nextLinkRaw,
                totalMangas: mangaList.length,
            };
        } catch (error) {
            logger.error(`Error fetching KomikIndo list page ${page}:`, error.message);
            return { page: parseInt(page), totalPage: 1, data: [], hasNext: false };
        }
    }
}

module.exports = new komikIndoScrap();
