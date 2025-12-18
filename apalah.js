const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const kuramaBaseUrl = process.env.KURAMANIME_URL || 'https://v8.kuramanime.tel';

const tokenCache = new Map();
const TOKEN_TTL = 5 * 60 * 1000; // Cache selama 5 menit

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class KuramaDriveTokenService {
    async getToken(pid, sid) {
        if (!pid || !sid) {
            throw new Error('PID dan SID wajib ada');
        }

        const cacheKey = `${pid}:${sid}`;
        const now = Date.now();

        const cached = tokenCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            console.log('Menggunakan token dari cache...');
            return cached.data;
        }

        let browser;
        try {
            console.log('Menjalankan browser (Stealth Mode)...');
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                ],
            });

            const page = await browser.newPage();

            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            );

            console.log(`Membuka ${kuramaBaseUrl} untuk mendapatkan session...`);
            await page.goto(kuramaBaseUrl, {
                waitUntil: 'networkidle2',
                timeout: 60000,
            });

            await sleep(2000);

            const cookies = await page.cookies();
            const xsrfCookie = cookies.find(c => c.name === 'XSRF-TOKEN');
            
            if (!xsrfCookie) {
                throw new Error('Gagal mendapatkan XSRF-TOKEN dari Cookie. Mungkin terhadang Cloudflare.');
            }

            const decodedXsrfToken = decodeURIComponent(xsrfCookie.value);
            console.log('XSRF-TOKEN berhasil didapatkan.');

            const result = await page.evaluate(
                async (pid, sid, xsrfToken) => {
                    const res = await fetch('/misc/token/drive-token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-XSRF-TOKEN': xsrfToken, 
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({ pid, sid }),
                    });

                    if (!res.ok) {
                        const error Text = await res.text();
                        throw new Error(`HTTP ${res.status}: ${errorText}`);
                    }

                    return res.json();
                },
                pid,
                sid,
                decodedXsrfToken
            );

            if (!result.access_token) {
                throw new Error('Respon API tidak mengandung access_token');
            }

            const data = {
                access_token: result.access_token,
                gid: result.gid,
                xsrfToken: decodedXsrfToken 
            };

            tokenCache.set(cacheKey, {
                data,
                expiresAt: now + TOKEN_TTL,
            });

            console.log('Token Drive berhasil didapatkan!');
            return data;

        } catch (err) {
            console.error('Detail Error:', err);
            throw new Error(`KuramaDrive resolve gagal: ${err.message}`);
        } finally {
            if (browser) {
                await browser.close();
                console.log('Browser ditutup.');
            }
        }
    }
}

module.exports = new KuramaDriveTokenService();