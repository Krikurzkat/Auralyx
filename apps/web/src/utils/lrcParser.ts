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
  if (!lrcContent) return [];
  const normalized = lrcContent
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const lyrics: LyricLine[] = [];

  // Match offset tag: e.g. [offset: +500], [offset:-200], [offset: 1000]
  const offsetRegex = /\[offset:\s*([+-]?\d+)\s*\]/i;
  
  let globalOffset = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for global offset tag
    const offsetMatch = offsetRegex.exec(trimmedLine);
    if (offsetMatch) {
      // Positive offset means lyrics appear sooner, so subtract from timestamp
      // Negative offset means lyrics appear later, so add to timestamp
      globalOffset = parseInt(offsetMatch[1], 10) / 1000;
      continue;
    }

    // Skip standard LRC header tags: [ti:...], [ar:...], [al:...], [by:...], [re:...], [ve:...], [length:...]
    if (/^\s*\[\s*(?:ti|ar|al|by|re|ve|length|tool|author)\s*:/i.test(trimmedLine)) {
      continue;
    }

    // Match all timestamp variants:
    // [mm:ss], [mm:ss.xx], [mm:ss,xx], [mm:ss:xx], [m:ss.xx], [hh:mm:ss.xx], (mm:ss.xx)
    const timeMatchRegex = /(?:\[|\()\s*(?:(\d{1,2}):)?(\d{1,3}):(\d{1,2})(?:[.:,](\d{1,3}))?\s*(?:\]|\))/g;
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    
    while ((match = timeMatchRegex.exec(trimmedLine)) !== null) {
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      const fraction = match[4]
        ? parseInt(match[4], 10) / Math.pow(10, match[4].length)
        : 0;

      const timeInSeconds = hours * 3600 + minutes * 60 + seconds + fraction;
      // Safeguard against NaN and negative times
      if (!isNaN(timeInSeconds)) {
        timestamps.push(Math.max(0, timeInSeconds - globalOffset));
      }
    }

    // Extract text after stripping leading/trailing line timestamps
    let text = trimmedLine.replace(/(?:\[|\()\s*(?:(\d{1,2}):)?\d{1,3}:\d{1,2}(?:[.:,]\d{1,3})?\s*(?:\]|\))/g, '').trim();

    // Clean word-level / karaoke timestamps embedded inside the line:
    // e.g. <00:12.50>, <12:34>, <1230>, (00:12.50)
    text = text
      .replace(/<\s*(?:\d{1,2}:)?\d{1,3}:\d{1,2}(?:[.:,]\d{1,3})?\s*>/g, '')
      .replace(/<\s*\d+\s*>/g, '')
      .replace(/\(\s*(?:\d{1,2}:)?\d{1,3}:\d{1,2}(?:[.:,]\d{1,3})?\s*\)/g, '')
      .trim();

    if (text && timestamps.length > 0) {
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
