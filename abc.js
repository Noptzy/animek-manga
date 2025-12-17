const kuramanimScrap = require('./src/scrap/anime/kuramanimScrap')

const url = "https://v8.kuramanime.tel/anime/4444/chainsaw-man-movie-reze-hen/episode/1"

async function test() {
    // 1. Label timer
    console.time("⏱️ Scraping Selesai"); 

    const result = await kuramanimScrap.getStreamEpsKuramanime(url)
    console.log(result)

    // 2. Stop timer (Label harus sama persis)
    console.timeEnd("⏱️ Scraping Selesai"); 
}

async function testList() {
    // 1. Label timer
    console.time("⏱️ Scraping Selesai"); 

    const urlList = "https://v8.kuramanime.tel/anime/50/one-piece-OreGjicNb0Fh"
    const result = await kuramanimScrap.getEpisodeListAnimeKuramanime(urlList)
    console.log(result)

    // 2. Stop timer (Label harus sama persis)
    console.timeEnd("⏱️ Scraping Selesai"); 
}

testList()