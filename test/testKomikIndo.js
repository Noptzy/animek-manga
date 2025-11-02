const logger = require('../src/utils/logger.js');
const komikIndoScrap = require('../src/scrap/manga/komikIndoScrap.js');
const fs = require('fs');

function saveJson(fileName, data) {
    const filePath = `./test/komikIndo/${fileName}`;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.info(`Saved : ${filePath}`);
}

async function testKomikindoList() {
    const pageToScrape = 100;
    const result = await komikIndoScrap.getKomikIndoManga(pageToScrape);

    saveJson('komikindo_list_page1.json', result);
}

async function testKomikindoDetail() {
    const slug = 'zombie-papa';
    const result = await komikIndoScrap.getKomikIndoDetail(slug);

    saveJson('komikIndoDetail.json', result);
}

async function testKomikindoChapterImgs() {
    const chapter = 'chainsaw-man-chapter-40';
    const result = await komikIndoScrap.getKomikIndoChapterImages(chapter);

    // KOREKSI: Tambahkan pengecekan eksplisit. Jika result null/undefined, set ke objek kosong.
    const dataToSave = result || { error: 'Scraping failed or returned null data.' };

    saveJson('komikIndoImg.json', dataToSave);
}

async function testKomikIndoSearch() {
    const query = 'chainsaw man';

    const result = await komikIndoScrap.getKomikIndoSearch(query);
    saveJson('komikIndoSearch.json', result);
}

async function testKomikIndoHomepage() {
    const page = 2;
    const result = await komikIndoScrap.getKomikIndoManga(page);
    saveJson('komikIndoManga.json', result);
}

async function testKomikIndoFilterComplex() {
    console.log('\n--- Memulai Tes Filter Kompleks (Page 1) ---');

    const pageToScrape = 1;

    // Objek filters yang merepresentasikan query string yang kompleks
    const complexFilters = {
        // genre: ['action', 'shounen'], // KOREKSI: Hapus '[]'
        // demografis: [''], // KOREKSI
        konten: ['sexual-violence'], // KOREKSI
        tema: ['harem'], // KOREKSI
        status: 'Completed',
        type: 'Manga',
        order: 'title',
    };

    try {
        // Panggil scraper dengan halaman dan objek filter
        const result = await komikIndoScrap.getKomikindoMangaByFilter(pageToScrape, complexFilters);

        // Simpan hasil untuk inspeksi
        saveJson('komikindo_filter_complex.json', result);
    } catch (error) {
        logger.error(`Tes Filter Gagal Total: ${error.message}`);
        // Jika error, save objek kosong untuk memastikan proses tidak crash
        saveJson('komikindo_filter_complex.json', { error: error.message });
    }
}
testKomikIndoFilterComplex();
