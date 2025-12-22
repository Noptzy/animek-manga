// runOploverz.js
const fs = require('fs');
const path = require('path');

// Sesuaikan path ini dengan lokasi file scraper kamu
const scraper = require('./src/scrap/anime/oploverzScrap'); 

// Fungsi Main
(async () => {
    console.log("==========================================");
    console.log("   🚀 MULAI TESTING OPLOVERZ SCRAPER     ");
    console.log("==========================================");

    try {
        // 1. Ambil List Anime Terbaru (untuk mencari target URL yang valid)
        console.log("\n[1] Sedang mengambil daftar anime terbaru...");
        const listAnime = await scraper.getAllAnimeList();

        if (listAnime.total === 0) {
            console.error("❌ Gagal mengambil daftar anime. Cek koneksi atau selector.");
            return;
        }

        console.log(`✅ Berhasil menemukan ${listAnime.total} anime.`);

        // 2. Ambil 1 Anime sebagai sampel (indeks ke-0)
        const targetAnime = listAnime.data[0]; 
        
        // ATAU: Jika ingin URL spesifik (misal One Piece), uncomment baris bawah ini:
        // const targetAnime = { title: "Custom", url: "https://anime.oploverz.ac/series/one-piece/" };

        console.log(`\n[2] Target Anime: ${targetAnime.title}`);
        console.log(`    URL: ${targetAnime.url}`);

        // 3. Jalankan Scrape Full (Detail + Semua Episode)
        console.log("\n[3] Sedang mengambil detail dan semua episode (Stream & Download)...");
        console.time("Waktu Scrape"); // Timer mulai

        const fullData = await scraper.getCompleteAnimeData(targetAnime.url);

        console.timeEnd("Waktu Scrape"); // Timer berhenti

        if (!fullData) {
            console.error("❌ Gagal mengambil data anime (Result null).");
            return;
        }

        // 4. Tampilkan Ringkasan di Console
        console.log("\n==========================================");
        console.log("               HASIL SCRAPE               ");
        console.log("==========================================");
        console.log(`Judul      : ${fullData.title}`);
        console.log(`Total Eps  : ${fullData.episodes.length}`);
        
        if (fullData.episodes.length > 0) {
            const sampleEp = fullData.episodes[0];
            console.log(`\nContoh Episode 1 (${sampleEp.title}):`);
            console.log(`- Streaming Host : ${sampleEp.streaming.length} link`);
            console.log(`- Download Format: ${sampleEp.downloads.length} format`);
            
            if(sampleEp.downloads.length > 0) {
                 console.log(`  > Contoh Link Download: ${sampleEp.downloads[0].format} - ${sampleEp.downloads[0].resolutions[0].quality}`);
            }
        }

        // 5. Simpan ke File JSON (Supaya enak dibaca)
        const outputPath = path.join(__dirname, 'result_anime.json');
        fs.writeFileSync(outputPath, JSON.stringify(fullData, null, 2));
        console.log(`\n✅ Data lengkap tersimpan di file: ${outputPath}`);

    } catch (error) {
        console.error("🔥 Terjadi Error Utama:", error);
    }
})();