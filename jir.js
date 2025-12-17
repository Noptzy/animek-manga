const puppeteer = require('puppeteer');

// Helper untuk delay
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    console.log('🚀 Mulai membuka browser...');
    // headless: false supaya bisa lihat prosesnya
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    }); 
    const page = await browser.newPage();

    // Set User Agent yang umum
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);

    // ============================================================
    // 1. LISTENER: TANGKAP TRAFFIC & PRINT SEMUA HEADER
    // ============================================================
    page.on('response', async (response) => {
        const url = response.url();
        const status = response.status();
        const req = response.request();

        // Filter URL Video (.mp4, .m3u8) atau Google Video
        if (
            (url.includes('.mp4') || url.includes('.m3u8') || url.includes('googlevideo') || url.includes('storage.googleapis.com')) &&
            !url.includes('blank.mp4') // Skip video dummy player
        ) {
            console.log(`\n=============================================================`);
            console.log(`🎥 [VIDEO DITEMUKAN!]`);
            console.log(`URL: ${url}`);
            console.log(`STATUS: ${status}`);
            console.log(`-------------------------------------------------------------`);
            
            // A. REQUEST HEADERS (PENTING BUAT PEMUTAR VIDEO KAMU)
            // Ini adalah header yang dikirim BROWSER ke SERVER.
            // Kamu wajib meniru ini (terutama Referer & User-Agent) saat hit URL ini di kodemu.
            console.log('📤 REQUEST HEADERS (Tiru ini di App/Backend kamu):');
            console.log(JSON.stringify(req.headers(), null, 2));

            console.log(`-------------------------------------------------------------`);

            // B. RESPONSE HEADERS (INFO DARI SERVER)
            // Ini header yang dibalas SERVER ke BROWSER.
            // Berguna buat cek Content-Type, Content-Length, Access-Control-Allow-Origin, dll.
            console.log('📥 RESPONSE HEADERS (Info dari Server):');
            console.log(JSON.stringify(response.headers(), null, 2));
            
            console.log(`=============================================================\n`);
        }
    });

    // ============================================================
    // 2. NAVIGASI KE HALAMAN
    // ============================================================
    const targetUrl = 'https://v8.kuramanime.tel/anime/4402/k-on-movie/episode/1';
    console.log(`🔗 Membuka halaman: ${targetUrl}`);
    
    try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log('✅ Halaman terbuka.');
    } catch (error) {
        console.log('❌ Gagal membuka halaman:', error.message);
        await browser.close();
        return;
    }

    // ============================================================
    // 3. PILIH SERVER & TRIGGER LOAD
    // ============================================================
    try {
        console.log('⏳ Menunggu dropdown server...');
        await page.waitForSelector('#changeServer', { timeout: 10000 });
        
        console.log('👉 Memilih server Kuramadrive...');
        await page.select('#changeServer', 'kuramadrive'); 

        // Paksa event change
        await page.evaluate(() => {
            const sel = document.querySelector('#changeServer');
            if (sel) {
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        
        // Tunggu sebentar biar Player ke-inject ke DOM
        await sleep(3000);

    } catch (e) {
        console.log('⚠️ Gagal set server:', e.message);
    }

    // ============================================================
    // 4. KLIK TOMBOL PLAY (WAJIB BIAR REQUEST VIDEO KELUAR)
    // ============================================================
    console.log('▶️ Mencoba klik tombol Play...');
    try {
        // Selector tombol play besar Plyr
        const playButtonSelector = '.plyr__control--overlaid'; 
        
        await page.waitForSelector(playButtonSelector, { timeout: 5000, visible: true });
        await page.click(playButtonSelector);
        console.log('✅ Tombol Play diklik!');
        
    } catch (e) {
        console.log('⚠️ Gagal klik play (Mungkin autoplay atau selector beda). Mencoba fallback...');
        // Fallback: Klik tag video langsung
        try {
            await page.evaluate(() => {
                const video = document.querySelector('video');
                if(video) video.play(); // Coba command play langsung
            });
        } catch(err) {}
    }

    // ============================================================
    // 5. TUNGGU HASIL
    // ============================================================
    console.log('⏳ Menunggu traffic video (15 detik)...');
    await sleep(15000); 

    console.log('👋 Selesai. Menutup browser.');
    await browser.close();
})();