const kuramanimScrap = require('./src/scrap/anime/kuramanimScrap')

const url = "https://v8.kuramanime.tel/anime/1573/one-piece-film-red/episode/1"

async function test() {
    const result = await kuramanimScrap.getStreamEpsKuramanime(url)
    console.log(result)
}

test()