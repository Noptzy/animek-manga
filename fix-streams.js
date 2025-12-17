require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const KuramanimeScrap = require('./src/scrap/anime/kuramanimScrap'); // Sesuaikan path jika beda
const logger = require('./src/utils/logger'); // Sesuaikan path jika beda

function detectQuality(url) {
    if (!url) return 'unknown';
    const match = url.match(/(360|480|720|1080)p/i);
    return match ? match[0].toLowerCase() : 'Default';
}

async function fixStreams() {
    console.log('🚀 Memulai perbaikan stream...');

    // 1. Cari stream rusak (tanpa pid/sid)
    const badStreams = await prisma.episodeStream.findMany({
        where: {
            serverName: 'kuramadrive',
            OR: [
                { NOT: { url: { contains: 'pid=' } } },
                { NOT: { url: { contains: 'sid=' } } }
            ]
        },
        select: { episodeId: true },
        distinct: ['episodeId']
    });

    if (badStreams.length === 0) {
        console.log('✅ Database bersih.');
        await prisma.$disconnect();
        return;
    }

    console.log(`⚠️  Ditemukan ${badStreams.length} episode rusak.`);

    // 2. Loop & Perbaiki
    for (const [index, item] of badStreams.entries()) {
        const episode = await prisma.episode.findUnique({ where: { id: item.episodeId } });
        if (!episode || !episode.url) continue;

        console.log(`\n🔄 [${index + 1}/${badStreams.length}] Repair: ${episode.title}`);

        try {
            const freshStreams = await KuramanimeScrap.getStreamEpsKuramanime(episode.url);

            if (freshStreams && freshStreams.length > 0) {
                await prisma.$transaction(async (tx) => {
                    await tx.episodeStream.deleteMany({ where: { episodeId: episode.id } });
                    await tx.episodeStream.createMany({
                        data: freshStreams.map((s) => ({
                            episodeId: episode.id,
                            quality: detectQuality(s.url),
                            url: s.url, // URL LENGKAP
                            isEmbed: false,
                            serverName: 'kuramadrive',
                        })),
                    });
                });
                console.log(`   ✅ Fixed (${freshStreams.length} streams).`);
            } else {
                console.log(`   ❌ Gagal (Stream tidak ditemukan).`);
            }
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        }
        
        // Delay 2 detik
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n🎉 Selesai.');
    await prisma.$disconnect();
}

fixStreams();