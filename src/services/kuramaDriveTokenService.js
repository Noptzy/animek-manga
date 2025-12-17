const puppeteer = require('puppeteer');

const kuramaBaseUrl = process.env.KURAMANIME_URL || 'https://v8.kuramanime.tel';

const tokenCache = new Map();
const TOKEN_TTL = 5 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class KuramaDriveTokenService {
    async getToken(pid, sid) {
        if (!pid || !sid) {
            throw new Error('PID dan SID wajib');
        }

        const cacheKey = `${pid}:${sid}`;
        const now = Date.now();

        const cached = tokenCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return cached.data;
        }

        let browser;
        try {
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
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
            );

            await page.goto(kuramaBaseUrl, {
                waitUntil: 'networkidle2',
                timeout: 60000,
            });

            await sleep(1500);

            const result = await page.evaluate(
                async (pid, sid) => {
                    const res = await fetch('/misc/token/drive-token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({ pid, sid }),
                    });

                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}`);
                    }

                    return res.json();
                },
                pid,
                sid
            );

            const { access_token, gid } = result || {};
            if (!access_token || !gid) {
                throw new Error('Token Kuramadrive tidak valid');
            }

            const data = { access_token, gid };

            tokenCache.set(cacheKey, {
                data,
                expiresAt: now + TOKEN_TTL,
            });

            return data;
        } catch (err) {
            throw new Error(`KuramaDrive resolve gagal: ${err.message}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}

module.exports = new KuramaDriveTokenService();
