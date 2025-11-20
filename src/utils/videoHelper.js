function detectResolution(url) {
    const m = url.match(/-(\d{3,4})p-/);
    return m ? m[1] + 'p' : 'unknown';
}

function cleanEmbedUrl(url) {
    if (!url) return null;
    try {
        const u = new URL(url);
        if (u.searchParams.has('poster')) {
            u.searchParams.delete('poster');
        }
        return u.toString();
    } catch {
        return url;
    }
}

module.exports = { detectResolution, cleanEmbedUrl };