require('dotenv').config();
const fs = require('fs');
const path = require('path');
const KuramanimeScrap = require('./src/scrap/anime/kuramanimScrap');

(async () => {
    try {
        console.log('Scraping homepage...');
        const homepageAnime = await KuramanimeScrap.getAnimeHomepageKuramanime();

        const sampleAnimeUrl = homepageAnime['Sedang Tayang']?.[0]?.link;
        if (!sampleAnimeUrl) throw new Error('Tidak ada anime untuk dicoba');

        console.log('Scraping detail anime...');
        const animeDetail = await KuramanimeScrap.getDetailAnimeKuramanime(sampleAnimeUrl);

        // Ambil episode pertama untuk streaming
        const firstEpisodeUrl = animeDetail.episodeList?.[0]?.url;
        let streamInfo = null;
        if (firstEpisodeUrl) {
            console.log('Scraping streaming episode pertama...');
            streamInfo = await KuramanimeScrap.getStreamEpsKuramanime(firstEpisodeUrl);
        }

        // Gabungkan semua data
        const finalResult = {
            homepageAnime,
            animeDetail,
            firstEpisodeStream: streamInfo,
        };

        // Simpan ke file JSON
        const filePath = path.join(__dirname, 'kuramanime_result.json');
        fs.writeFileSync(filePath, JSON.stringify(finalResult, null, 2), 'utf-8');

        console.log('✅ Data berhasil disimpan ke:', filePath);
    } catch (err) {
        console.error('Error saat scraping:', err.message);
    }
})();