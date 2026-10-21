/**
 * Lyrics service:
 * - Linebreak normalization & repair for corrupted lyrics (e.g. unescaped \n or missing backslashes like "wordnCapital")
 * - Free online synchronized lyrics fetching via LRCLIB (LRC format with precise timestamps)
 * - Automatic upgrade of tracks with unsynced or missing lyrics to live synced lyrics
 */

export function hasSyncedLyricTimestamps(text?: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return /(?:\[|\()\s*(?:\d{1,2}:)?\d{1,3}:\d{2}(?:[.:,]\d{1,3})?\s*(?:\]|\))/.test(text);
}

/**
 * Normalizes lyric text:
 * 1. Resolves escaped \n, \r\n, \\n, \\r\\n
 * 2. Repairs corrupted 'n' linebreaks (common bug from shell-invoked downloaders like spotDL/Musixmatch)
 *    WITHOUT corrupting words starting with 'n' right after LRC timestamps (e.g. [00:12.34]now)
 * 3. Decodes HTML entities (&quot;, &#39;, &amp;, etc.)
 * 4. Trims whitespace while maintaining clean stanza structure
 */
export function normalizeLyricText(text?: string): string {
  if (!text || typeof text !== 'string') return '';

  let res = text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\N/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\u0000/g, '');

  // Decode common HTML entities
  res = res
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Repair a known truncated lyric fragment so every player surface receives
  // the complete word before parsing or rendering the line.
  res = res.replace(/\b(grab)(\s+a\s+cop\s+)gu(?=\s|kinda\b|[,.!?]|$)/gi, '$1$2gun');

  // Recover malformed 'n' line delimiters without deleting lyric characters.
  // The source is ambiguous (a literal n may be part of a word), so preserve
  // it when adding a likely missing line break instead of guessing it is noise.
  // When bash/cmd strips the backslash from \n in unquoted commands:
  // (a) After parenthesis or punctuation: [).!?'",] (DO NOT include ']' because timestamp tags end in ']')
  res = res.replace(/([\).!?'",])n(?=[A-Z"'`])/g, '$1n\n');

  // (b) Recover a missing separator before a capitalized next line. Keep the
  // n in both known and unknown words (e.g. "gunKinda" -> "gun\nKinda").
  res = res.replace(/([a-z0-9])n(?=[A-Z"(\[])/g, '$&\n');

  // (c) Apply the same character-preserving behavior to the apostrophe form.
  res = res.replace(/([a-z0-9\)])n(?='[A-Z])/g, '$&\n');

  // Repair lyrics previously split by the old contraction rule (for example,
  // "Do\n't act" becoming "Do\n’t act") when they are normalized again.
  res = res.replace(/([a-z])\n('t\b)/gi, '$1n$2');

  // Collapse 3+ consecutive newlines to 2 (clean verse breaks)
  res = res.replace(/\n{3,}/g, '\n\n');

  return res
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Strips LRC metadata headers like [ti:...], [ar:...] from non-timed lyrics
 */
export function stripLrcHeaders(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*\[(ti|ar|al|by|offset|length|re|ve):/i.test(line))
    .join('\n')
    .trim();
}

/**
 * Clean track title of common noise that breaks lyrics API lookups:
 * - File extensions (.mp3, .flac, .m4a, .wav)
 * - Track numbers at start ('01 - ', '1. ')
 * - Duplicate file copy numbers e.g. ' (1)', ' (2)', ' [1]'
 * - Remaster / Edition / Bonus / Audio / Video / Feat tags
 */
export function cleanSongTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\.[a-zA-Z0-9]{2,4}$/, '') // file extension
    .replace(/^\s*\d+[\s.-]+/, '') // track numbers at start ('01 - ', '1. ')
    .replace(/\s*[\(\[]\s*\d+\s*[\)\]]\s*$/, '') // duplicate suffix e.g. (1), [1]
    .replace(/\s*[\(\[](?:feat|ft|with|prod|official|video|audio|lyrics|remaster|deluxe|bonus|expanded|anniversary|edit|version)[^\]\)]*[\)\]]/gi, '')
    .replace(/\s*-\s*(?:official|video|audio|lyrics|remaster|deluxe|bonus|expanded|edit|version).*$/gi, '')
    .replace(/["'`]/g, '')
    .trim();
}

export function cleanArtistName(artist: string): string {
  if (!artist) return '';
  return artist
    .replace(/\s*(feat\.|ft\.|featuring|with|prod\.).*$/i, '')
    .replace(/["'`]/g, '')
    .trim();
}

export interface LyricsFetchResult {
  syncedLyrics?: string;
  plainLyrics?: string;
}

/**
 * Fetch online synced lyrics from LRCLIB with multi-strategy query lookups.
 * Returns synced LRC string if available, or plain lyrics as fallback.
 */
export async function fetchOnlineSyncedLyrics(
  title: string,
  artist: string,
  album?: string,
  duration?: number
): Promise<LyricsFetchResult | null> {
  const cleanTitle = cleanSongTitle(title);
  const cleanArtist = cleanArtistName(artist);

  // Helper for LRCLIB direct get endpoint
  const tryDirectGet = async (t: string, a: string, withDuration = true): Promise<LyricsFetchResult | null> => {
    try {
      const params = new URLSearchParams({
        track_name: t,
        artist_name: a,
      });
      if (album) params.set('album_name', album);
      if (withDuration && duration && duration > 0) {
        params.set('duration', String(Math.round(duration)));
      }

      const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.syncedLyrics || data.plainLyrics) {
          return {
            syncedLyrics: data.syncedLyrics ? normalizeLyricText(data.syncedLyrics) : undefined,
            plainLyrics: data.plainLyrics ? normalizeLyricText(data.plainLyrics) : undefined,
          };
        }
      }
    } catch {}
    return null;
  };

  // Helper for LRCLIB search endpoint
  const trySearch = async (query: string): Promise<LyricsFetchResult | null> => {
    try {
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const results: Array<{ syncedLyrics?: string; plainLyrics?: string; duration?: number; trackName?: string }> = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          // If duration is known, find closest match with synced lyrics
          if (duration && duration > 0) {
            const durationMatch = results.find(
              (r) => r.syncedLyrics && r.duration && Math.abs(r.duration - duration) <= 4
            );
            if (durationMatch?.syncedLyrics) {
              return {
                syncedLyrics: normalizeLyricText(durationMatch.syncedLyrics),
                plainLyrics: durationMatch.plainLyrics ? normalizeLyricText(durationMatch.plainLyrics) : undefined,
              };
            }
          }

          // Otherwise find any best match with synced lyrics
          const bestSynced = results.find((r) => r.syncedLyrics);
          if (bestSynced?.syncedLyrics) {
            return {
              syncedLyrics: normalizeLyricText(bestSynced.syncedLyrics),
              plainLyrics: bestSynced.plainLyrics ? normalizeLyricText(bestSynced.plainLyrics) : undefined,
            };
          }

          const bestPlain = results.find((r) => r.plainLyrics);
          if (bestPlain?.plainLyrics) {
            return {
              syncedLyrics: undefined,
              plainLyrics: normalizeLyricText(bestPlain.plainLyrics),
            };
          }
        }
      }
    } catch {}
    return null;
  };

  try {
    // Strategy 1: Cleaned title + artist + duration
    let result = await tryDirectGet(cleanTitle, cleanArtist, true);
    if (result?.syncedLyrics) return result;

    // Strategy 2: Cleaned title + artist without duration filter
    result = await tryDirectGet(cleanTitle, cleanArtist, false);
    if (result?.syncedLyrics) return result;

    // Strategy 3: Original title & artist if different from cleaned
    if (cleanTitle !== title || cleanArtist !== artist) {
      result = await tryDirectGet(title.trim(), artist.trim(), false);
      if (result?.syncedLyrics) return result;
    }

    // Strategy 4: If title contains ' - ' (e.g. "Artist - Track" or "Track - Artist"), split & swap
    if (cleanTitle.includes(' - ')) {
      const parts = cleanTitle.split(' - ').map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        result = await tryDirectGet(parts[1], parts[0], false);
        if (result?.syncedLyrics) return result;
        result = await tryDirectGet(parts[0], parts[1], false);
        if (result?.syncedLyrics) return result;
      }
    }

    // Strategy 5: Full-text search endpoint with artist + title
    result = await trySearch(`${cleanArtist} ${cleanTitle}`);
    if (result?.syncedLyrics) return result;

    // Strategy 6: Full-text search with just the cleaned title
    if (cleanTitle.length > 2) {
      result = await trySearch(cleanTitle);
      if (result?.syncedLyrics) return result;
    }

    // Return any plain lyrics if found as last resort
    if (result?.plainLyrics) return result;
  } catch (err) {
    console.warn('[LyricsService] LRCLIB search failed:', err);
  }

  return null;
}

/**
 * In-flight requests cache to prevent redundant simultaneous API requests
 */
const inFlightRequests = new Map<string, Promise<string | null>>();

/**
 * Automatically upgrades a track's lyrics:
 * - Normalizes any existing plain text
 * - If missing or unsynced, queries LRCLIB for synchronized LRC lyrics
 * - Persists to playerStore, localLibraryStore and IndexedDB
 */
export async function autoUpgradeTrackLyrics(track: {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  lyrics?: string;
  isLocal?: boolean;
}): Promise<string | null> {
  if (!track || !track.title) return null;

  // 1. If track already has synced lyrics, just ensure they are normalized
  if (track.lyrics && hasSyncedLyricTimestamps(track.lyrics)) {
    const normalized = normalizeLyricText(track.lyrics);
    if (normalized !== track.lyrics) {
      track.lyrics = normalized;
      await persistUpdatedLyrics(track.id, normalized);
    }
    return normalized;
  }

  // 2. Normalize existing plain lyrics if present
  const normalizedCurrent = track.lyrics ? normalizeLyricText(track.lyrics) : undefined;
  if (normalizedCurrent && normalizedCurrent !== track.lyrics) {
    track.lyrics = normalizedCurrent;
    await persistUpdatedLyrics(track.id, normalizedCurrent);
  }

  // 3. Prevent duplicate concurrent fetches for the same track
  const reqKey = `${track.title}__${track.artist}`;
  if (inFlightRequests.has(reqKey)) {
    return inFlightRequests.get(reqKey)!;
  }

  const promise = (async () => {
    try {
      const fetched = await fetchOnlineSyncedLyrics(track.title, track.artist, track.album, track.duration);
      if (fetched?.syncedLyrics) {
        track.lyrics = fetched.syncedLyrics;
        await persistUpdatedLyrics(track.id, fetched.syncedLyrics);
        return fetched.syncedLyrics;
      } else if (!normalizedCurrent && fetched?.plainLyrics) {
        track.lyrics = fetched.plainLyrics;
        await persistUpdatedLyrics(track.id, fetched.plainLyrics);
        return fetched.plainLyrics;
      }
    } catch (err) {
      console.warn('[LyricsService] autoUpgradeTrackLyrics failed:', err);
    } finally {
      inFlightRequests.delete(reqKey);
    }
    return normalizedCurrent || null;
  })();

  inFlightRequests.set(reqKey, promise);
  return promise;
}

/**
 * Helper to persist lyrics across playerStore, localLibraryStore and IndexedDB
 */
export async function persistUpdatedLyrics(trackId: string, lyrics: string) {
  try {
    const { usePlayerStore } = await import('../stores/playerStore');
    const store = usePlayerStore.getState();
    if (store.currentTrack && store.currentTrack.id === trackId) {
      usePlayerStore.setState((s) => ({
        currentTrack: s.currentTrack ? { ...s.currentTrack, lyrics } : null,
        queue: s.queue.map((t) => (t.id === trackId ? { ...t, lyrics } : t)),
      }));
    }

    const { localDb } = await import('./localDb');
    const stored = await localDb.getTrack(trackId);
    if (stored) {
      await localDb.saveTrack({ ...stored, lyrics });
    }

    const { useLocalLibraryStore } = await import('../stores/localLibraryStore');
    useLocalLibraryStore.setState((s) => ({
      localTracks: s.localTracks.map((t) => (t.id === trackId ? { ...t, lyrics } : t)),
    }));
  } catch (err) {
    console.warn('[LyricsService] Error persisting lyrics:', err);
  }
}
