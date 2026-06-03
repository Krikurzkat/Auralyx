/**
 * Parse LRC file content into timed lyric lines
 * LRC format: [mm:ss.xx]Lyric text
 * Example: [00:12.50]First line of lyrics
 */
export function parseLRC(lrcContent) {
    const lines = lrcContent.replace(/\r/g, '').split('\n');
    const lyrics = [];
    // Match common LRC variants:
    // [mm:ss], [mm:ss.x], [mm:ss.xx], [mm:ss.xxx], [mm:ss:xx], [hh:mm:ss.xx]
    const timeRegex = /\[(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
    const offsetRegex = /\[offset:([+-]?\d+)\]/i;
    let globalOffset = 0;
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine)
            continue;
        // Check for global offset tag
        const offsetMatch = offsetRegex.exec(trimmedLine);
        if (offsetMatch) {
            // Positive offset means lyrics appear sooner, so subtract from timestamp
            // Negative offset means lyrics appear later, so add to timestamp (handled by minus minus)
            globalOffset = parseInt(offsetMatch[1], 10) / 1000;
        }
        // Find all timestamps in the line
        const timestamps = [];
        let match;
        while ((match = timeRegex.exec(trimmedLine)) !== null) {
            const hours = match[1] ? parseInt(match[1], 10) : 0;
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);
            const fraction = match[4]
                ? parseInt(match[4], 10) / Math.pow(10, match[4].length)
                : 0;
            const timeInSeconds = hours * 3600 + minutes * 60 + seconds + fraction;
            timestamps.push(timeInSeconds - globalOffset);
        }
        // Extract the text after all timestamps
        const text = trimmedLine.replace(timeRegex, '').trim();
        // Skip metadata lines (like [ar:Artist], [ti:Title], etc.)
        if (text && timestamps.length > 0) {
            // Add a lyric line for each timestamp (some LRC files have multiple timestamps per line)
            for (const time of timestamps) {
                lyrics.push({ time, text });
            }
        }
    }
    // Sort by time
    lyrics.sort((a, b) => a.time - b.time);
    return lyrics;
}
/**
 * Get the current lyric line index based on current playback time
 */
export function getCurrentLyricIndex(lyrics, currentTime) {
    if (lyrics.length === 0)
        return -1;
    // Find the last lyric line that has passed
    for (let i = lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= lyrics[i].time) {
            return i;
        }
    }
    return -1;
}
/**
 * Convert LyricLine array back to LRC format string
 */
export function toLRCString(lyrics) {
    return lyrics
        .map(line => {
        const minutes = Math.floor(line.time / 60);
        const seconds = Math.floor(line.time % 60);
        const centiseconds = Math.floor((line.time % 1) * 100);
        const mm = minutes.toString().padStart(2, '0');
        const ss = seconds.toString().padStart(2, '0');
        const cs = centiseconds.toString().padStart(2, '0');
        return `[${mm}:${ss}.${cs}]${line.text}`;
    })
        .join('\n');
}
