function detectQualityFromUrl(url) {
    if (!url || typeof url !== 'string') return 'Default';

    const match = url.match(/(360|480|720|1080)p/i);
    return match ? match[0].toLowerCase() : 'Default';
}

function normalizeQuality(providedQuality, url) {
    if (providedQuality && providedQuality.toLowerCase() !== 'unknown') {
        return providedQuality.toLowerCase();
    }
    return detectQualityFromUrl(url);
}

module.exports = {
    detectQualityFromUrl,
    normalizeQuality,
};
