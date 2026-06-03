import { parseLRC } from './lrcParser';
export function formatDuration(seconds) {
    if (!seconds || isNaN(seconds))
        return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
export function formatPlays(n) {
    if (!n)
        return '0';
    if (n >= 1000000)
        return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)
        return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
}
export function formatListeners(n) {
    if (!n)
        return '0';
    if (n >= 1000000)
        return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000)
        return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
}
export function getLyricsForTrack(_trackId, lrcContent) {
    // If LRC content is provided, parse it
    if (lrcContent) {
        try {
            const syncedLyrics = parseLRC(lrcContent);
            if (syncedLyrics.length > 0)
                return syncedLyrics;
            return lrcContent
                .replace(/\r/g, '')
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((text, index) => ({ time: index * 4, text }));
        }
        catch (error) {
            console.error('Error parsing LRC content:', error);
        }
    }
    // Fallback for tracks without lyrics
    return [];
}
