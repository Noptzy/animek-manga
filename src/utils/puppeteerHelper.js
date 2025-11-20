async function waitForVideoSources(frame, maxWait = 12000, interval = 1000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        try {
            const sources = await frame.evaluate(() => {
                const video = document.querySelector('video');
                return video ? Array.from(video.querySelectorAll('source')).map((s) => s.src) : [];
            });
            if (sources.length) return sources;
        } catch {}
        await new Promise((r) => setTimeout(r, interval));
    }
    return [];
}

module.exports = { waitForVideoSources };