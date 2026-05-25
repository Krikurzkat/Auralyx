export interface LyricLine {
  time: number; // Time in seconds
  text: string;
}

/**
 * Parse LRC file content into timed lyric lines
 * LRC format: [mm:ss.xx]Lyric text
 * Example: [00:12.50]First line of lyrics
 */
export function parseLRC(lrcContent: string): LyricLine[] {
  const lines = lrcContent.replace(/\r/g, '').split('\n');
  const lyrics: LyricLine[] = [];

  // Match common LRC variants:
  // [mm:ss], [mm:ss.x], [mm:ss.xx], [mm:ss.xxx], [mm:ss:xx], [hh:mm:ss.xx]
  const timeRegex = /\[(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Find all timestamps in the line
    const timestamps: number[] = [];
    let match;
    
    while ((match = timeRegex.exec(trimmedLine)) !== null) {
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      const fraction = match[4]
        ? parseInt(match[4], 10) / Math.pow(10, match[4].length)
        : 0;

      const timeInSeconds = hours * 3600 + minutes * 60 + seconds + fraction;
      timestamps.push(timeInSeconds);
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
export function getCurrentLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  if (lyrics.length === 0) return -1;

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
export function toLRCString(lyrics: LyricLine[]): string {
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
