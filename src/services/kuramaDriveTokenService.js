const axios = require('axios');

const kuramaBaseUrl = process.env.KURAMANIME_URL || 'https://v8.kuramanime.tel/';

const tokenCache = new Map();

const TOKEN_TTL = 5 * 60 * 1000;

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

        const res = await axios.post(
            `${kuramaBaseUrl}misc/token/drive-token`,
            { pid, sid },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Origin: kuramaBaseUrl,
                    Referer: kuramaBaseUrl,
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                timeout: 15000,
            },
        );

        const { access_token, gid } = res.data || {};
        if (!access_token || !gid) {
            throw new Error('Token Kuramadrive tidak valid');
        }

        const data = { access_token, gid };

        tokenCache.set(cacheKey, {
            data,
            expiresAt: now + TOKEN_TTL,
        });

        return data;
    }
}

module.exports = new KuramaDriveTokenService();
