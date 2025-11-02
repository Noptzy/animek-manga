
// Menggunakan dotenv untuk memuat variabel dari file .env
require('dotenv').config();

const komikuScrap = require('../src/scrap/manga/komikuScrap.js');

async function runTest() {
    console.log('Memulai tes scraping untuk getKomikuCompleted...');
    
    // Cek apakah URL API sudah ada
    if (!process.env.KOMIKU_API_URL) {
        console.error('Error: Variabel lingkungan KOMIKU_API_URL tidak ditemukan.');
        console.log('Pastikan file .env sudah ada dan berisi KOMIKU_API_URL=https://komiku.org/');
        return;
    }

    try {
        const pageToScrape = 1;
        const data = await komikuScrap.getKomikuCompleted(pageToScrape);

        if (data && data.length > 0) {
            console.log(`Berhasil scrape ${data.length} manga dari halaman ${pageToScrape}.`);
            console.log('---------------------------------');
            console.log('Contoh data (item pertama):');
            console.log(JSON.stringify(data[1], null, 2));
        } else {
            console.log('Fungsi selesai dijalankan, namun tidak ada data yang kembali.');
        }
    } catch (error) {
        console.error('Terjadi error saat menjalankan tes:', error);
    }
}

runTest();
