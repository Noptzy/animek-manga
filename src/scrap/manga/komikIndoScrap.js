require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../../utils/logger.js');

const komikIndoUrl = process.env.KOMIK_INDO_URL || 'https://komikindo.ch/';
const maxPage = process.env.MANGA_MAX_PAGE;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

class komikIndoScrap {
    async getKomikIndoManga(page) {
        const url = page > 1 ? `${komikIndoUrl}manga/page/${page}/` : `${komikIndoUrl}manga/`;

        try {
            const response = await axios.get(url, { headers: { 'User-Agent': UA } });
            const $ = cheerio.load(response.data);
            const mangaList = [];

            const $mainContainer = $('.listupd .film-list');

            if ($mainContainer.length === 0) {
                logger.error(`Container .listupd .film-list not found on page ${page}. Check site structure.`);
                return { page: parseInt(page), totalPage: 1, data: [], hasNext: false };
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

                    mangaList.push({
                        title,
                        slug,
                        url: mangaUrl,
                        poster_url,
                        latest_chapter: {
                            title: latestChapterTitle,
                            url: latestChapterUrl,
                            updated_ago: dateUpdate,
                        },
                    });
                }
            });

            const nextLink = $('.pagination a.next').attr('href');
            const lastPageElement = $('.pagination .page-numbers:not(.dots)').last().text();
            const totalPage = parseInt(lastPageElement) || (nextLink ? parseInt(lastPageElement) + 1 : page);

            return {
                page: parseInt(page),
                totalPage: totalPage,
                data: mangaList,
                hasNext: !!nextLink,
            };
        } catch (error) {
            logger.error(`Error fetching KomikIndo list page ${page}:`, error.message);
            return { page: parseInt(page), totalPage: 1, data: [], hasNext: false };
        }
    }

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

            const chapterList = [];
            $('#chapter_list ul li').each((i, el) => {
                const $li = $(el);
                const chapterLink = $li.find('a');

                chapterList.push({
                    chapter_number: $li.find('chapter').text().trim(),
                    title: chapterLink.attr('title'),
                    url: chapterLink.attr('href'),
                    release_ago: $li.find('.dt a').text().trim(),
                });
            });

            mangaDetail.chapters = chapterList.reverse();

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

            const imageUrls = [];

            const title = $('.dtlx h1.entry-title').text().trim().replace('Komik', '').trim();
            const nextChapterUrl = $('.navig .nextprev a[rel="next"]').attr('href');

            $('#Baca_Komik .img-landmine img').each((i, el) => {
                const $img = $(el);
                const src = $img.attr('src');
                if (src) {
                    imageUrls.push(src.trim());
                }
            });

            let nextChapterUrlSlug = null;

            if (nextChapterUrl) {
                nextChapterUrlSlug = nextChapterUrl.replace(komikIndoUrl, '');

                nextChapterUrlSlug = nextChapterUrlSlug.replace(/\/$/, '');
            }
            return {
                title: title,
                images: imageUrls,
                next_chapter_url: '/' + nextChapterUrlSlug,
            };
        } catch (error) {
            logger.error(`Error Scraping chapter images for ${url}`, error.message);
            return { images: [], next_chapter_url: null };
        }
    }

    async 
}

module.exports = new komikIndoScrap();
