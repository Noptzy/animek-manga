const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', req => {
        if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
            console.log('[XHR]', req.method(), req.url());
        }
        req.continue();
    });

    await page.goto(
        'https://v8.kuramanime.tel/anime/50/one-piece-OreGjicNb0Fh',
        { waitUntil: 'networkidle2' }
    );

    console.log('➡️ Klik tombol >> secara MANUAL di browser');
})();
