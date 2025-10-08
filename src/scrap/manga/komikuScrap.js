require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const logger = require('../../utils/logger.js');
const delay = require('../../utils/delayScrap.js');

const komikuUrl = process.env.KOMIKU_URL;
const komikuApiUrl = process.env.KOMIKU_API_URL;
const maxPage = process.env.MANGA_MAX_PAGE;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

class komikuScrap {
    async getKomikuImageUrl(slug) {
        try {
            const res = await axios.get(pageUrl, { headers: { 'User-Agent': UA } });
            const $ = cheerio.load(res.data);
            const imgs = new Set();
            $('#Baca_Komik img').each((i, el) => {
                const src = $(el).attr('data-src') || $(el).attr('src');
                if (src) imgs.add(src.startsWith('//') ? 'https:' + src : src);
            });
            return Array.from(imgs);
        } catch (error) {
            return null;
        }
    }

    async getKomikuCompleted(page) {
        const url = `${komikuApiUrl}manga/page/${page}/?orderby=modified&tipe=manga&genre&genre2&status=end`;
        try {
            const response = await axios.get(url, { headers: { 'User-Agent': UA } });
            const $ = cheerio.load(response.data);

            const endMangas = [];

            $('div.bge').each((index, element) => {
                const $element = $(element);
                const mangaUrl = $element.find('.kan a').attr('href');
                const title = $element.find('.kan h3').text().trim();

                const slug = mangaUrl
                    ? mangaUrl
                          .split('/')
                          .filter((p) => p)
                          .pop()
                    : null;
                const genreText = $element.find('.bgei .tpe1_inf').text().trim();
                const genre = genreText.replace('Manga', '').trim();

                const synopsis = $element.find('.kan p').text().trim();

                endMangas.push({
                    title,
                    slug,
                    url: mangaUrl,
                    genre,
                    synopsis,
                });
            });

            logger.info(`Scraped ${endMangas.length} completed manga from page ${page}.`);
            return endMangas;
        } catch (error) {
            logger.error(`Error Scraping getKomikuCompleted for page ${page}`, error.message);
            return [];
        }
    }

    async getKomikuDetail(slug) {
        const url = `${komikuUrl}manga/${slug}/`;
        try {
            const response = await axios.get(url, { headers: { 'User-Agent': UA } });
            const $ = cheerio.load(response.data);

            const infoTable = $('table.inftable');
            const chapterList = [];

            $('#daftarChapter tr').each((i, el) => {
                if ($(el).find('th').length > 0) return;

                const chapterTitle = $(el).find('.judulseries a span').text().trim();
                const chapterUrl = $(el).find('.judulseries a').attr('href');
                const views = $(el).find('.pembaca').text().trim();
                const date = $(el).find('.tanggalseries').text().trim();

                if (chapterTitle && chapterUrl) {
                    chapterList.push({
                        title: chapterTitle,
                        url: chapterUrl,
                        date: date,
                    });
                }
            });

            const detail = {
                slug: slug,
                title: $('div#Judul header h1 span[itemprop="name"]').text().replace('Komik', '').trim(),
                title_id: $('div#Judul .j2').text().trim(),
                posterUrl: $('section#Informasi img').attr('src'),
                type: infoTable.find('tr:contains("Jenis Komik") td:nth-child(2) b').text().trim(),
                author: infoTable.find('tr:contains("Pengarang") td:nth-child(2)').text().trim(),
                status: infoTable.find('tr:contains("Status") td:nth-child(2)').text().trim(),
                reader_age: infoTable.find('tr:contains("Umur Pembaca") td:nth-child(2)').text().trim(),
                genres: $('ul.genre li.genre a span[itemprop="genre"]')
                    .map((i, el) => $(el).text())
                    .get(),
                synopsis: $('p.desc').text().trim() || $('section#Sinopsis p').first().text().trim(),
                chapters: chapterList.reverse(),
            };
            logger.info(`Scraped detail for: ${detail.title}`);
            return detail;
        } catch (error) {
            logger.error(`Error Scraping getKomikuDetail for slug ${slug}`, error.message);
            return null;
        }
    }

    async getKomikuChapterImages(chapterPath) {
        const path = chapterPath.startsWith('/') ? chapterPath : `/${chapterPath}`;
        const url = `${komikuUrl}${path}`;

        try {
            const response = await axios.get(url, { headers: { 'User-Agent': UA } });
            const $ = cheerio.load(response.data);

            const imageUrls = [];

            $('#Baca_Komik img').each((i, el) => {
                const $img = $(el);
                const src = $img.attr('src');

                if (src) {
                    imageUrls.push(src.trim());
                }
            });

            let chapterMetadata = {};
            const scriptContent = $('script:contains("chapterData")').html();
            if (scriptContent) {
                try {
                    const match = scriptContent.match(/chapterData\s*=\s*(\{[\s\S]*?\});/);
                    if (match && match[1]) {
                        chapterMetadata = eval('(' + match[1] + ')');
                    }
                } catch (e) {
                    logger.error('Failed to parse chapter metadata script', e.message);
                }
            }

            logger.info(`Scraped ${imageUrls.length} images from chapter URL: ${url}`);

            return {
                images: imageUrls,
                metadata: chapterMetadata,
            };
        } catch (error) {
            logger.error(`Error Scraping chapter images for ${url}`, error.message);
            return { images: [], metadata: {} };
        }
    }

    
}

module.exports = new komikuScrap();
