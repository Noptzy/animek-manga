const Kuramanime = require('./src/scrap/anime/kuramanimScrap');

(async () => {
    try {
        // Pilihan tipe: 'ongoing', 'finished', 'movie'
        const dataOngoing = await Kuramanime.scrapeMassSeed('ongoing');
        
        // Simpan dataOngoing ke database atau file JSON...
        const fs = require('fs');
        fs.writeFileSync('seed_ongoing.json', JSON.stringify(dataOngoing, null, 2));
        
        console.log("Data seeding selesai.");
    } catch (e) {
        console.error(e);
    }
})();