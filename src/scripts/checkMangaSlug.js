
const prisma = require('../config/prisma');

async function checkManga() {
    try {
        const exactSlug = await prisma.manga.findUnique({
            where: { slug: 'test' }
        });
        if (exactSlug) {
            console.log('MANGA FOUND:');
            console.log(JSON.stringify(exactSlug, null, 2));
            console.log(`Slug length: ${exactSlug.slug.length}`);
            console.log(`Slug characters: ${exactSlug.slug.split('').map(c => c.charCodeAt(0)).join(',')}`);
        } else {
            console.log('MANGA NOT FOUND with slug "test"');
            
            // Try title search
            const similar = await prisma.manga.findMany({
                where: {
                    title: {
                        contains: 'test',
                        mode: 'insensitive'
                    }
                }
            });
            console.log('Similar by title "test":', JSON.stringify(similar, null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkManga();
