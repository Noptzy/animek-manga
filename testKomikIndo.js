const logger = require('./src/utils/logger.js');
const komikIndoScrap = require('./src/scrap/manga/komikIndoScrap.js');
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

testKomikindoDetail();
