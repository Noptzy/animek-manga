const mangaRepository = require('../repositories/mangaRepository.js');
const { seedAllMangaFromKomikIndo } = require('./seeders/komikIndoSeeder.js');
const logger = require('../utils/logger');

async function startSeedingData() {
    try {
        const mangaCount = await mangaRepository.countAll();
        
        if (mangaCount === 0) {
            logger.info('Database manga kosong, memulai seeding data komikindo...');
            await seedAllMangaFromKomikIndo(); 
            logger.info('Seeding komikindo selesai.');
        } else {
            logger.info(`Database sudah berisi ${mangaCount} manga. Seeding dilewati.`);
        }
    } catch (error) {
        logger.error(`Terjadi error besar saat proses seeding: ${error.message}`, error);
        process.exit(1); 
    }
}

startSeedingData();

module.exports = {
    startSeedingData
};