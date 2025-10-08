const fs = require('fs');
const logger = require('./src/utils/logger.js');
const komikuScrap = require('./src/scrap/manga/komikuScrap.js');

function saveJson(fileName, data) {
    const filePath = `./test/${fileName}`;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.info(`Saved : ${filePath}`);
}

async function testKomikuCompleted() {
    const data = await komikuScrap.getKomikuCompleted(1);
    saveJson('komikuEnd.json', data);
    logger.info(`Berhasil Scrap`, saveJson);
}

async function testKomikDetail() {
    const slug = '123213-chainsaw-man';
    const data = await komikuScrap.getKomikuDetail(slug);
    saveJson('detailKomik.json', data);
    logger.info(`berhail scrap`, saveJson);
}

async function testKomikChapterManga() {
    // KOREKSI: Gunakan PATH RELATIF (tanpa domain)
    const chapterUrlPath = 'chainsaw-man-chapter-216/'; // atau '/chainsaw-man-chapter-216/'

    // Panggil fungsi scraper
    const data = await komikuScrap.getKomikuChapterImages(chapterUrlPath);

    // Simpan data
    saveJson('chapterUrl.json', data);

    // Log hasil (pastikan log dicetak dengan benar)
    if (data && data.images && data.images.length > 0) {
        logger.info(`Berhasil Scrap Gambar: chapterUrl.json (${data.images.length} gambar)`);
        console.log(`\n✅ Berhasil mendapatkan ${data.images.length} gambar chapter.`);
        console.log('Sample Gambar Pertama:', data.images[0]);
    } else {
        logger.error(`Gagal mendapatkan gambar chapter. Cek log axios di komikuScrap.js`);
    }
}

testKomikChapterManga();
