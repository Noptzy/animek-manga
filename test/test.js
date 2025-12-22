require('dotenv').config();
const fs = require('fs');
const path = require('path');
const KuramanimeScrap = require('../src/scrap/anime/kuramanimScrap'); // Pastikan path require sesuai dengan struktur foldermu

(async () => {
    try {
        console.log('Scraping homepage...');
        const homepageAnime = await KuramanimeScrap.getAnimeHomepageKuramanime();

        // LOGIKA BARU: Cari link dari kategori apapun yang tersedia
        let sampleAnimeUrl = null;
        const categories = ['Sedang Tayang', 'Selesai Tayang', 'Film Layar Lebar'];

        for (const cat of categories) {
            if (homepageAnime[cat] && homepageAnime[cat].length > 0) {
                sampleAnimeUrl = homepageAnime[cat][0].link;
                console.log(`🔍 Mengambil sampel anime dari kategori: '${cat}' -> ${homepageAnime[cat][0].title}`);
                break; 
            }
        }

        if (!sampleAnimeUrl) {
            // Cek jika ada anime tapi tidak masuk kategori (fallback)
            const allKeys = Object.keys(homepageAnime);
            for (const key of allKeys) {
                 if (homepageAnime[key] && homepageAnime[key].length > 0) {
                    sampleAnimeUrl = homepageAnime[key][0].link;
                    console.log(`🔍 Mengambil sampel anime dari kategori (fallback): '${key}'`);
                    break;
                 }
            }
        }

        if (!sampleAnimeUrl) throw new Error('Tidak ada anime untuk dicoba (Hasil scrape kosong)');

        console.log('⏳ Scraping detail anime...');
        const animeDetail = await KuramanimeScrap.getDetailAnimeKuramanime(sampleAnimeUrl);

        const firstEpisodeUrl = animeDetail.episodeList?.[0]?.url;
        let streamInfo = null;
        if (firstEpisodeUrl) {
            console.log('⏳ Scraping streaming episode pertama...');
            streamInfo = await KuramanimeScrap.getStreamEpsKuramanime(firstEpisodeUrl);
        } else {
            console.log('⚠️ Tidak ada episode ditemukan untuk anime ini.');
        }

        // Gabungkan semua data
        const finalResult = {
            homepageAnime,
            animeDetail,
        };

        // Simpan ke file JSON
        const filePath = path.join(__dirname, 'kuramanime_result.json');
        fs.writeFileSync(filePath, JSON.stringify(finalResult, null, 2), 'utf-8');

        console.log('✅ Data berhasil disimpan ke:', filePath);
    } catch (err) {
        console.error('❌ Error saat scraping:', err.message);
    }
})();