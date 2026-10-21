/**
 * Comprehensive embedded metadata and lyrics extractor for audio files.
 * Supports:
 * - ID3v2.2, ID3v2.3, ID3v2.4 (USLT, SYLT, ULT, TXXX:LYRICS, TXXX:SYNCED_LYRICS, TXXX:Musixmatch, etc.)
 * - Vorbis Comments in FLAC, Ogg, Opus (LYRICS, SYNCEDLYRICS, UNSYNCEDLYRICS, LYRICS_SYNCED, LRC)
 * - MP4/M4A/iTunes (©lyr, clyr, ----:com.apple.itunes:lyrics, ----:com.apple.itunes:syncedlyrics)
 * - WMA/ASF (WM/Lyrics, WM/SyncLyrics)
 * - Direct binary fallback parser when metadata libraries fail
 */

export interface ParsedAudioMetadata {
  common?: {
    title?: string;
    artist?: string;
    albumartist?: string;
    album?: string;
    year?: number;
    genre?: string[];
    lyrics?: unknown;
    picture?: Array<{ data: Uint8Array | number[]; format: string }>;
  };
  native?: Record<string, Array<{ id?: unknown; value?: unknown }>>;
  format?: {
    duration?: number;
  };
}

export interface ExtractedMetadataResult {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string;
  lyrics?: string;
  hasSyncedLyrics: boolean;
  coverUrl?: string;
  duration?: number;
}

/**
 * Checks if a string contains synced LRC timestamps like [00:12.34], [01:23], (00:12,34), etc.
 */
export function hasSyncedLyricTimestamps(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return /(?:\[|\()\s*(?:\d{1,2}:)?\d{1,3}:\d{2}(?:[.:,]\d{1,3})?\s*(?:\]|\))/.test(text);
}

import { normalizeLyricText } from '../services/lyricsService';

/**
 * Clean and normalize lyric text by removing null bytes, carriage returns,
 * repairing corrupted 'n' linebreaks, and trimming lines
 */
export function cleanLyricText(text: string): string {
  return normalizeLyricText(text);
}

/**
 * Test whether a tag identifier refers to lyrics
 */
export function isNativeLyricsTag(tagId: unknown): boolean {
  if (typeof tagId !== 'string') return false;
  const normalized = tagId.toLowerCase().trim();

  // Exclude lyricist / writer / composer
  if (normalized.includes('lyricist') || normalized.includes('composer') || normalized.includes('writer')) {
    return false;
  }

  // ID3v2 USLT / ULT / SYLT tags (often USLT, USLT:eng, USLT:description, USLT:Musixmatch, etc.)
  if (
    normalized === 'uslt' ||
    normalized.startsWith('uslt:') ||
    normalized.endsWith(':uslt') ||
    normalized === 'ult' ||
    normalized.startsWith('ult:') ||
    normalized.endsWith(':ult') ||
    normalized === 'sylt' ||
    normalized.startsWith('sylt:') ||
    normalized.endsWith(':sylt') ||
    normalized === 'slt' ||
    normalized.startsWith('slt:')
  ) {
    return true;
  }

  // Common lyrics tag variants in Vorbis, APE, ASF, iTunes
  const knownTags = [
    'lyrics',
    'lyric',
    'unsyncedlyrics',
    'unsynced lyrics',
    'unsynced_lyrics',
    'syncedlyrics',
    'synced lyrics',
    'synced_lyrics',
    'synclyrics',
    'lyrics_synced',
    'wm/lyrics',
    'wm/synclyrics',
    '©lyr',
    'clyr',
    '----:com.apple.itunes:lyrics',
    '----:com.apple.itunes:syncedlyrics',
    '----:com.apple.itunes:synced_lyrics',
    '----:com.apple.itunes:lrc',
    'lrc',
  ];

  if (knownTags.some((tag) => normalized === tag || normalized.endsWith(`:${tag}`))) {
    return true;
  }

  // TXXX user defined frames with lyrics / sync / musixmatch / spotube descriptions
  if (normalized.startsWith('txxx:')) {
    const desc = normalized.slice(5);
    if (
      desc.includes('lyric') ||
      desc.includes('lrc') ||
      desc.includes('musixmatch') ||
      desc.includes('spotube') ||
      desc.includes('synced')
    ) {
      return true;
    }
  }

  // Any tag containing lyric or lrc
  if (normalized.includes('lyric') || normalized.includes('sync_lyric') || normalized.includes('synced_lyric')) {
    return true;
  }

  return false;
}

/**
 * Extracts plain text or formatted synced text from any metadata tag value
 */
export function getLyricTextFromValue(value: unknown): string[] {
  if (!value) return [];

  // Plain string
  if (typeof value === 'string') {
    const cleaned = cleanLyricText(value);
    return cleaned ? [cleaned] : [];
  }

  // Array of values
  if (Array.isArray(value)) {
    // Check if it's an array of synchronized lyric items: [{ timestamp/time, text/line }, ...]
    if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
      const isTimedArray = value.some(
        (it) => it && (typeof (it as Record<string, unknown>).time === 'number' || typeof (it as Record<string, unknown>).timestamp === 'number')
      );
      if (isTimedArray) {
        // Universally determine whether timestamps are in milliseconds
        let isMs = false;
        const numbers: number[] = [];
        for (const item of value) {
          const it = item as Record<string, unknown>;
          if (typeof it.timestamp === 'number') {
            numbers.push(it.timestamp);
            isMs = true; // 'timestamp' in ID3 SYLT & audio metadata is always milliseconds
          } else if (typeof it.time === 'number') {
            numbers.push(it.time);
          }
        }
        const maxVal = Math.max(0, ...numbers);
        if (maxVal > 600) isMs = true;

        const formattedLines: string[] = [];
        for (const item of value) {
          const it = item as Record<string, unknown>;
          const rawNum = typeof it.timestamp === 'number'
            ? it.timestamp
            : typeof it.time === 'number'
              ? it.time
              : undefined;

          if (rawNum === undefined || isNaN(rawNum)) continue;
          const rawSeconds = isMs ? rawNum / 1000 : rawNum;
          if (rawSeconds < 0) continue;

          const lineText = typeof it.text === 'string'
            ? it.text
            : typeof it.line === 'string'
              ? it.line
              : typeof it.lyric === 'string'
                ? it.lyric
                : '';

          const mins = Math.floor(rawSeconds / 60);
          const secs = (rawSeconds % 60).toFixed(2);
          formattedLines.push(`[${String(mins).padStart(2, '0')}:${secs.padStart(5, '0')}]${lineText.trim()}`);
        }
        if (formattedLines.length > 0) {
          return [formattedLines.join('\n')];
        }
      }
    }

    return value.flatMap(getLyricTextFromValue);
  }

  // Binary data (Uint8Array / Buffer)
  if (value instanceof Uint8Array || (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer)) {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    const decoders = ['utf-8', 'utf-16le', 'latin1'];
    for (const encoding of decoders) {
      try {
        const decoded = new TextDecoder(encoding).decode(bytes).replace(/\u0000/g, '').trim();
        if (decoded && decoded.length > 2 && (hasSyncedLyricTimestamps(decoded) || decoded.includes('\n'))) {
          return [decoded];
        }
      } catch {
        // Continue to next decoder
      }
    }
  }

  // Object structures (e.g. ID3 USLT object: { language, description, text })
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    // Direct text / lyrics / value properties
    const directText = record.text ?? record.lyrics ?? record.value ?? record.content ?? record.data ?? record.syncText;
    if (typeof directText === 'string') {
      const cleaned = cleanLyricText(directText);
      if (cleaned) return [cleaned];
    }
    if (Array.isArray(directText)) {
      return directText.flatMap(getLyricTextFromValue);
    }

    // Check for nested lines or items
    if (Array.isArray(record.lines)) {
      return record.lines.flatMap(getLyricTextFromValue);
    }
  }

  return [];
}

/**
 * Extracts lyrics from parsed audio metadata (e.g. from music-metadata-browser)
 */
export function getEmbeddedLyrics(metadata: ParsedAudioMetadata | null | undefined): string | undefined {
  if (!metadata) return undefined;

  const lyricTexts: string[] = [];

  // 1. Check common.lyrics
  if (metadata.common?.lyrics) {
    lyricTexts.push(...getLyricTextFromValue(metadata.common.lyrics));
  }

  // 2. Check native tags across all formats (ID3v2.3, ID3v2.4, vorbis, iTunes, ASF, APE, etc.)
  if (metadata.native) {
    Object.values(metadata.native).forEach((tags) => {
      if (!Array.isArray(tags)) return;
      tags.forEach((tag) => {
        if (!tag) return;

        // Is it explicitly a lyrics tag?
        if (isNativeLyricsTag(tag.id)) {
          lyricTexts.push(...getLyricTextFromValue(tag.value));
        } else {
          // Even if tag.id wasn't in the list, test if tag.value contains synced LRC timestamps
          const extracted = getLyricTextFromValue(tag.value);
          for (const txt of extracted) {
            if (hasSyncedLyricTimestamps(txt)) {
              lyricTexts.push(txt);
            }
          }
        }
      });
    });
  }

  const cleanedTexts = Array.from(new Set(lyricTexts.map(cleanLyricText).filter(Boolean)));
  if (cleanedTexts.length === 0) return undefined;

  // Prioritize synced lyrics with timestamps over unsynced lyrics
  const syncedLyric = cleanedTexts.find(hasSyncedLyricTimestamps);
  if (syncedLyric) return syncedLyric;

  // Return the longest/most complete lyrics text
  return cleanedTexts.reduce((best, curr) => (curr.length > best.length ? curr : best), cleanedTexts[0]);
}

/**
 * Direct binary scanner that reads ID3v2, Vorbis, and MP4 structures directly from a Blob or File.
 * This guarantees extraction even if music-metadata-browser fails to parse or skips frames.
 */
export async function extractEmbeddedLyricsFromBlobDirect(blob: Blob): Promise<string | undefined> {
  try {
    // Read the first 1024KB where ID3v2 headers, SYLT frames, and Vorbis comments reside
    const headerChunkSize = Math.min(blob.size, 1024 * 1024);
    const headerBuffer = await blob.slice(0, headerChunkSize).arrayBuffer();
    const bytes = new Uint8Array(headerBuffer);

    // 1. Check ID3v2 tag at the start of the file
    if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      const id3Lyrics = parseID3v2Direct(bytes);
      if (id3Lyrics) return id3Lyrics;
    }

    // 2. Check FLAC / OGG Vorbis comments
    const vorbisLyrics = parseVorbisCommentsDirect(bytes);
    if (vorbisLyrics) return vorbisLyrics;

    // 3. Check MP4 ©lyr atom
    const mp4Lyrics = parseMP4Direct(bytes);
    if (mp4Lyrics) return mp4Lyrics;

    // 4. Check ID3v1 or footer ID3v2 at the end of the file if large enough
    if (blob.size > 128 * 1024) {
      const footerChunkSize = Math.min(blob.size, 128 * 1024);
      const footerBuffer = await blob.slice(blob.size - footerChunkSize, blob.size).arrayBuffer();
      const footerBytes = new Uint8Array(footerBuffer);
      const footerLyrics = parseID3v2Direct(footerBytes) || parseVorbisCommentsDirect(footerBytes);
      if (footerLyrics) return footerLyrics;
    }
  } catch (err) {
    console.warn('[EmbeddedLyrics] Direct binary scan encountered error:', err);
  }

  return undefined;
}

/**
 * Fast direct ID3v2 parser for USLT, SYLT/SLT, and TXXX lyrics frames
 */
function parseID3v2Direct(bytes: Uint8Array): string | undefined {
  if (bytes.length < 10) return undefined;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return undefined;

  const major = bytes[3];
  if (major < 2 || major > 4) return undefined;

  const tagSize =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);

  let pos = 10;
  const end = Math.min(bytes.length, 10 + tagSize);
  const foundLyrics: string[] = [];

  while (pos + 10 < end) {
    let frameId: string;
    let frameSize: number;
    let headerSize = 10;

    if (major === 2) {
      headerSize = 6;
      frameId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2]);
      frameSize = (bytes[pos + 3] << 16) | (bytes[pos + 4] << 8) | bytes[pos + 5];
    } else if (major === 3) {
      frameId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
      frameSize = (bytes[pos + 4] << 24) | (bytes[pos + 5] << 16) | (bytes[pos + 6] << 8) | bytes[pos + 7];
    } else {
      // ID3v2.4 synchsafe
      frameId = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
      frameSize =
        ((bytes[pos + 4] & 0x7f) << 21) |
        ((bytes[pos + 5] & 0x7f) << 14) |
        ((bytes[pos + 6] & 0x7f) << 7) |
        (bytes[pos + 7] & 0x7f);
    }

    // Stop on padding or invalid frame
    if (!frameId || frameId.charCodeAt(0) === 0 || frameSize <= 0 || pos + headerSize + frameSize > end) {
      break;
    }

    const dataPos = pos + headerSize;

    // USLT (ID3v2.3/2.4) or ULT (ID3v2.2)
    if (frameId === 'USLT' || frameId === 'ULT') {
      const enc = bytes[dataPos];
      let descEnd = dataPos + 4; // skip 1 byte encoding + 3 bytes language
      if (enc === 1 || enc === 2) {
        while (descEnd + 1 < dataPos + frameSize && !(bytes[descEnd] === 0 && bytes[descEnd + 1] === 0)) {
          descEnd += 2;
        }
        descEnd += 2;
      } else {
        while (descEnd < dataPos + frameSize && bytes[descEnd] !== 0) {
          descEnd++;
        }
        descEnd += 1;
      }

      const lyricsBytes = bytes.slice(descEnd, dataPos + frameSize);
      const text = decodeEncodedText(lyricsBytes, enc);
      if (text) foundLyrics.push(cleanLyricText(text));
    } else if (frameId === 'SYLT' || frameId === 'SLT') {
      // Synchronized Lyrics / Text Frame (ID3v2.3/2.4 SYLT, ID3v2.2 SLT)
      const enc = bytes[dataPos];
      const timeFormat = bytes[dataPos + 4]; // 1 = MPEG frames, 2 = milliseconds
      let descEnd = dataPos + 6;
      if (enc === 1 || enc === 2) {
        while (descEnd + 1 < dataPos + frameSize && !(bytes[descEnd] === 0 && bytes[descEnd + 1] === 0)) {
          descEnd += 2;
        }
        descEnd += 2;
      } else {
        while (descEnd < dataPos + frameSize && bytes[descEnd] !== 0) {
          descEnd++;
        }
        descEnd += 1;
      }

      const frameEnd = dataPos + frameSize;
      let entryPos = descEnd;
      const syltLines: string[] = [];
      const isMs = timeFormat === 2 || timeFormat === 0;

      while (entryPos < frameEnd) {
        let textEnd = entryPos;
        if (enc === 1 || enc === 2) {
          while (textEnd + 1 < frameEnd && !(bytes[textEnd] === 0 && bytes[textEnd + 1] === 0)) {
            textEnd += 2;
          }
        } else {
          while (textEnd < frameEnd && bytes[textEnd] !== 0) {
            textEnd++;
          }
        }

        const lineBytes = bytes.slice(entryPos, textEnd);
        entryPos = textEnd + (enc === 1 || enc === 2 ? 2 : 1);

        if (entryPos + 4 <= frameEnd) {
          const rawTime =
            ((bytes[entryPos] & 0xff) << 24) |
            ((bytes[entryPos + 1] & 0xff) << 16) |
            ((bytes[entryPos + 2] & 0xff) << 8) |
            (bytes[entryPos + 3] & 0xff);
          entryPos += 4;

          const rawSeconds = isMs ? rawTime / 1000 : rawTime;
          const decodedText = decodeEncodedText(lineBytes, enc).trim();
          if (decodedText && rawSeconds >= 0) {
            const mins = Math.floor(rawSeconds / 60);
            const secs = (rawSeconds % 60).toFixed(2);
            syltLines.push(`[${String(mins).padStart(2, '0')}:${secs.padStart(5, '0')}]${decodedText}`);
          }
        } else {
          break;
        }
      }

      if (syltLines.length > 0) {
        foundLyrics.push(syltLines.join('\n'));
      }
    } else if (frameId === 'TXXX') {
      const enc = bytes[dataPos];
      let descEnd = dataPos + 1; // skip encoding byte
      if (enc === 1 || enc === 2) {
        while (descEnd + 1 < dataPos + frameSize && !(bytes[descEnd] === 0 && bytes[descEnd + 1] === 0)) {
          descEnd += 2;
        }
        descEnd += 2;
      } else {
        while (descEnd < dataPos + frameSize && bytes[descEnd] !== 0) {
          descEnd++;
        }
        descEnd += 1;
      }

      const descBytes = bytes.slice(dataPos + 1, descEnd);
      const desc = decodeEncodedText(descBytes, enc).toLowerCase().trim();
      if (
        desc.includes('lyric') ||
        desc.includes('lrc') ||
        desc.includes('musixmatch') ||
        desc.includes('spotube') ||
        desc.includes('synced')
      ) {
        const textBytes = bytes.slice(descEnd, dataPos + frameSize);
        const text = decodeEncodedText(textBytes, enc);
        if (text) foundLyrics.push(cleanLyricText(text));
      }
    }

    pos += headerSize + frameSize;
  }

  if (foundLyrics.length === 0) return undefined;
  const synced = foundLyrics.find(hasSyncedLyricTimestamps);
  return synced || foundLyrics[0];
}

/**
 * Decode text bytes with ID3 encoding identifier
 */
function decodeEncodedText(bytes: Uint8Array, encoding: number): string {
  try {
    if (encoding === 1) return new TextDecoder('utf-16le').decode(bytes).replace(/\u0000/g, '');
    if (encoding === 2) return new TextDecoder('utf-16be').decode(bytes).replace(/\u0000/g, '');
    if (encoding === 3) return new TextDecoder('utf-8').decode(bytes).replace(/\u0000/g, '');
    return new TextDecoder('latin1').decode(bytes).replace(/\u0000/g, '');
  } catch {
    return new TextDecoder('utf-8').decode(bytes).replace(/\u0000/g, '');
  }
}

/**
 * Scan Vorbis comments in FLAC/OGG files for LYRICS, SYNCEDLYRICS, etc.
 */
function parseVorbisCommentsDirect(bytes: Uint8Array): string | undefined {
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const regex = /(?:LYRICS|SYNCEDLYRICS|UNSYNCEDLYRICS|LYRICS_SYNCED|LRC)\s*=\s*([\s\S]+?)(?=(?:\x00|\x01|\x02|[A-Z_]{3,15}\s*=|$))/gi;
    let match: RegExpExecArray | null;
    const candidates: string[] = [];

    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        const cleaned = cleanLyricText(match[1]);
        if (cleaned && cleaned.length > 5) candidates.push(cleaned);
      }
    }

    if (candidates.length > 0) {
      const synced = candidates.find(hasSyncedLyricTimestamps);
      return synced || candidates[0];
    }
  } catch {
    // Ignore decoding errors
  }
  return undefined;
}

/**
 * Scan MP4 atoms for ©lyr atom
 */
function parseMP4Direct(bytes: Uint8Array): string | undefined {
  try {
    // Look for ©lyr signature: 0xA9 0x6C 0x79 0x72
    for (let i = 0; i < bytes.length - 16; i++) {
      if (bytes[i] === 0xa9 && bytes[i + 1] === 0x6c && bytes[i + 2] === 0x79 && bytes[i + 3] === 0x72) {
        // Child 'data' atom usually follows shortly: 'data' (0x64 0x61 0x74 0x61)
        for (let j = i + 4; j < Math.min(bytes.length - 8, i + 32); j++) {
          if (bytes[j] === 0x64 && bytes[j + 1] === 0x61 && bytes[j + 2] === 0x74 && bytes[j + 3] === 0x61) {
            // Data atom length is 4 bytes before 'data'
            const dataLen = (bytes[j - 4] << 24) | (bytes[j - 3] << 16) | (bytes[j - 2] << 8) | bytes[j - 1];
            // Skip 'data' (4 bytes) + flags (4 bytes)
            const textStart = j + 8;
            const textEnd = Math.min(bytes.length, j - 4 + dataLen);
            if (textEnd > textStart) {
              const textBytes = bytes.slice(textStart, textEnd);
              const text = new TextDecoder('utf-8').decode(textBytes).replace(/\u0000/g, '').trim();
              if (text) return cleanLyricText(text);
            }
          }
        }
      }
    }
  } catch {
    // Ignore
  }
  return undefined;
}

/**
 * Fully extracts all embedded metadata from an audio Blob / File,
 * using music-metadata-browser with automatic binary fallback.
 */
export async function extractFullEmbeddedMetadata(
  fileOrBlob: Blob | File
): Promise<ExtractedMetadataResult> {
  let title: string | undefined;
  let artist: string | undefined;
  let album: string | undefined;
  let year: number | undefined;
  let genre: string | undefined;
  let coverUrl: string | undefined;
  let duration: number | undefined;
  let lyrics: string | undefined;

  try {
    const { parseBlob } = await import('music-metadata-browser');
    const metadata = await parseBlob(fileOrBlob);
    const { common, format } = metadata;

    title = common.title;
    artist = common.artist || common.albumartist;
    album = common.album;
    year = common.year;
    genre = common.genre?.[0];
    duration = format.duration;

    // Cover art extraction
    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      const base64 = btoa(
        pic.data.reduce((data: string, byte: number) => data + String.fromCharCode(byte), '')
      );
      coverUrl = `data:${pic.format};base64,${base64}`;
    }

    // Embedded lyrics from metadata
    lyrics = getEmbeddedLyrics(metadata as ParsedAudioMetadata);
  } catch (err) {
    console.warn('[EmbeddedMetadata] music-metadata-browser failed, using fallback:', err);
  }

  // If lyrics were not found through music-metadata-browser, run direct binary inspection
  if (!lyrics) {
    lyrics = await extractEmbeddedLyricsFromBlobDirect(fileOrBlob);
  }

  return {
    title,
    artist,
    album,
    year,
    genre,
    lyrics,
    hasSyncedLyrics: lyrics ? hasSyncedLyricTimestamps(lyrics) : false,
    coverUrl,
    duration,
  };
}
