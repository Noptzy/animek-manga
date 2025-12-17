const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStreamQuality() {
    console.log('Starting stream quality fix...');

    try {
        // Ambil semua stream yang quality-nya 'unknown'
        const streams = await prisma.episodeStream.findMany({
            where: {
                quality: 'unknown',
            },
        });

        console.log(`Found ${streams.length} streams with "unknown" quality.`);

        let updatedCount = 0;

        for (const stream of streams) {
            let newQuality = 'Default'; // Fallback profesional

            // Regex untuk deteksi resolusi
            const match = stream.url.match(/(360|480|720|1080)p/i);

            if (match) {
                newQuality = match[0].toLowerCase(); // e.g., "720p"
            }

            // Update DB
            await prisma.episodeStream.update({
                where: { id: stream.id },
                data: { quality: newQuality },
            });

            updatedCount++;
            if (updatedCount % 100 === 0) {
                console.log(`Processed ${updatedCount} streams...`);
            }
        }

        console.log(`Finished! Updated ${updatedCount} streams.`);
    } catch (error) {
        console.error('Error fixing streams:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixStreamQuality();
