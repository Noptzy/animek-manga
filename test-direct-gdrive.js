const puppeteer = require('puppeteer');
const axios = require('axios');

// Config
const TARGET_URL = 'https://v8.kuramanime.tel/anime/2539/big-mac-to-susume/episode/1';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';

async function getMultiResolutionLinks() {
    console.log(`🚀 Memulai Scraping Multi-Resolusi: ${TARGET_URL}`);
    const globalStart = Date.now();
    
    let browser;
    try {
        // 1. SETUP BROWSER
        console.log('⏳ Membuka browser...');
        browser = await puppeteer.launch({
            headless: true, // Ubah false kalau mau lihat browsernya
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        await page.setUserAgent(USER_AGENT);

        // Optimasi: Block gambar/font
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'font', 'stylesheet'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // 2. BUKA HALAMAN (Tunggu sampai load selesai)
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // 3. INTERAKSI UI (PENTING! Ini yang bikin stabil)
        console.log('🖱️  Memilih Server Kuramadrive & Klik Play...');
        try {
            // Tunggu dropdown
            await page.waitForSelector('#changeServer', { timeout: 10000 });
            
            // Pilih server 'kuramadrive'
            await page.select('#changeServer', 'kuramadrive'); 
            await page.evaluate(() => {
                const sel = document.querySelector('#changeServer');
                if(sel) sel.dispatchEvent(new Event('change', { bubbles: true }));
            });

            // Tunggu sebentar biar script website memproses
            await new Promise(r => setTimeout(r, 2000));

            // Klik Tombol Play Besar
            const playBtnSelector = '.plyr__control--overlaid';
            if (await page.$(playBtnSelector)) {
                await page.click(playBtnSelector);
            } else {
                // Fallback klik element video
                await page.evaluate(() => {
                    const v = document.querySelector('video');
                    if(v) v.click();
                });
            }
            
            console.log('✅ Player dipicu. Menunggu inisialisasi data...');
            // Tunggu lagi sebentar biar variable player terisi di memori
            await new Promise(r => setTimeout(r, 3000));

        } catch (e) {
            console.log('⚠️ Warning trigger UI:', e.message);
        }

        // 4. EKSTRAKSI DATA (Rahasia Multi Resolution)
        // Kita ambil langsung dari object Plyr yang sudah aktif di halaman
        const streams = await page.evaluate(() => {
            // Cek 1: Global variable window.playerPlyr
            if (window.playerPlyr && window.playerPlyr.source && window.playerPlyr.source.sources) {
                return window.playerPlyr.source.sources;
            }
            
            // Cek 2: Ambil dari elemen DOM jika global var tidak ketemu
            const videoEl = document.querySelector('video');
            if (videoEl && videoEl.querySelectorAll('source').length > 0) {
                return Array.from(videoEl.querySelectorAll('source')).map(s => ({
                    src: s.src,
                    size: s.getAttribute('size') || 'unknown',
                    type: s.type
                }));
            }

            return [];
        });

        // Ambil Cookies sebelum tutup browser
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        await browser.close();
        console.log(`🔒 Browser ditutup. Ditemukan ${streams.length} raw streams.`);

        if (streams.length === 0) {
            throw new Error("Gagal mengambil daftar stream dari Player.");
        }

        // 5. PROSES KE API GOOGLE (Parallel)
        console.log('\n📡 Menukar token ke Google API untuk semua resolusi...');
        
        // Filter URL yang valid (mengandung pid/sid) dan buang yang duplikat
        const validStreams = streams
            .filter(s => s.src.includes('pid=') && s.src.includes('sid='))
            .map(s => ({
                quality: (s.size || 'HD') + 'p',
                url: s.src
            }));

        // Fungsi helper hit API
        const processStream = async (stream) => {
            try {
                const urlObj = new URL(stream.url);
                const pid = urlObj.searchParams.get('pid');
                const sid = urlObj.searchParams.get('sid');
                
                const tokenRes = await axios.post('https://v8.kuramanime.tel/misc/token/drive-token', 
                    { pid, sid },
                    {
                        headers: {
                            'Origin': 'https://v8.kuramanime.tel',
                            'Referer': TARGET_URL,
                            'User-Agent': USER_AGENT,
                            'Cookie': cookieString 
                        }
                    }
                );

                const { access_token, gid } = tokenRes.data;
                if(!access_token) return null;

                const gDriveUrl = `https://www.googleapis.com/drive/v3/files/${gid}?alt=media`;
                
                // Optional: Cek Size
                // const headRes = await axios.head(gDriveUrl, { headers: { 'Authorization': `Bearer ${access_token}` } });
                
                return {
                    quality: stream.quality,
                    url: gDriveUrl,
                    token: access_token,
                    gid: gid
                };

            } catch (err) {
                return null;
            }
        };

        const results = await Promise.all(validStreams.map(processStream));
        const finalResults = results.filter(r => r !== null);

        // Sort dari kualitas tertinggi ke terendah
        finalResults.sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

        // ==========================================
        // OUTPUT
        // ==========================================
        const totalTime = (Date.now() - globalStart) / 1000;
        console.log('\n🎉 ================= REPORT ================= 🎉');
        console.log(`⏱️  Total Waktu      : ${totalTime} detik`);
        console.log(`📦 Resolusi Didapat  : ${finalResults.length}`);
        console.log('==============================================');

        finalResults.forEach(res => {
            console.log(`\n[${res.quality}]`);
            console.log(`🔗 GDrive Link : ${res.url}`);
            console.log(`🔑 Auth Token  : Bearer ${res.token}`);
        });
        console.log('\n==============================================');

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        if (browser) await browser.close();
    }
}

getMultiResolutionLinks();