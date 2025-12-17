function detectResolution(url) {
    const match = url.match(/(\d{3,4})p(?:\.mp4|\/|-|$)/i); // Matches XXXp followed by .mp4, /, -, or end of string
    if (match) {
        return match[1] + 'p';
    }

    // Fallback for embed or other cases if needed
    if (url.includes('embed')) return 'embed';

    return 'unknown';
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