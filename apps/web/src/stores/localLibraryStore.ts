import { create } from 'zustand';
import { localDb, LocalTrack } from '../services/localDb';
import { Playlist } from '../types';
import { usePlayerStore } from './playerStore';

// ─── Helpers ───

function generateId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function stringToGradient(str: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40 + (Math.abs(hash >> 8) % 60)) % 360;
  return [`hsl(${h1}, 65%, 45%)`, `hsl(${h2}, 55%, 55%)`];
}

const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'ogg', 'flac', 'aac']);
const COVER_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const COVER_NAME_PRIORITY = ['cover', 'folder', 'front', 'album'];
const LOCAL_IMPORT_RATE_KEY = 'auralyx.localUploadProtection.v1';
const LOCAL_MAX_IMPORTS_PER_BATCH = 150;
const LOCAL_MAX_IMPORTS_PER_HOUR = 200;
const LOCAL_MAX_IMPORTS_PER_DAY = 700;
const LOCAL_MAX_REJECTED_PER_HOUR = 60;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type ImportableFile = File & { webkitRelativePath?: string };
type LocalUploadCounter = {
  hourStartedAt: number;
  dayStartedAt: number;
  importsThisHour: number;
  importsToday: number;
  rejectedThisHour: number;
};

type ScreenedLocalFile = {
  file: File;
  fileHash: string;
};

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function getBaseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').trim().toLowerCase();
}

function getImportPath(file: ImportableFile): string {
  return (file.webkitRelativePath || file.name).replace(/\\/g, '/');
}

function getImportDirectory(file: ImportableFile): string {
  const importPath = getImportPath(file);
  const slashIndex = importPath.lastIndexOf('/');
  return slashIndex >= 0 ? importPath.slice(0, slashIndex).toLowerCase() : '';
}

function isAudioFile(file: File): boolean {
  return AUDIO_EXTENSIONS.has(getFileExtension(file.name));
}

function getLocalUploadCounter(): LocalUploadCounter {
  const now = Date.now();
  const fallback: LocalUploadCounter = {
    hourStartedAt: now,
    dayStartedAt: now,
    importsThisHour: 0,
    importsToday: 0,
    rejectedThisHour: 0,
  };

  if (typeof localStorage === 'undefined') return fallback;

  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_IMPORT_RATE_KEY) || 'null') as Partial<LocalUploadCounter> | null;
    const counter: LocalUploadCounter = {
      hourStartedAt: parsed?.hourStartedAt || now,
      dayStartedAt: parsed?.dayStartedAt || now,
      importsThisHour: parsed?.importsThisHour || 0,
      importsToday: parsed?.importsToday || 0,
      rejectedThisHour: parsed?.rejectedThisHour || 0,
    };

    if (now - counter.hourStartedAt > HOUR_MS) {
      counter.hourStartedAt = now;
      counter.importsThisHour = 0;
      counter.rejectedThisHour = 0;
    }

    if (now - counter.dayStartedAt > DAY_MS) {
      counter.dayStartedAt = now;
      counter.importsToday = 0;
    }

    return counter;
  } catch {
    return fallback;
  }
}

function saveLocalUploadCounter(counter: LocalUploadCounter) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_IMPORT_RATE_KEY, JSON.stringify(counter));
}

function getLocalImportLimitFlags(counter: LocalUploadCounter): string[] {
  const flags: string[] = [];
  if (counter.importsThisHour >= LOCAL_MAX_IMPORTS_PER_HOUR) flags.push('too_many_imports_hourly');
  if (counter.importsToday >= LOCAL_MAX_IMPORTS_PER_DAY) flags.push('too_many_imports_daily');
  if (counter.rejectedThisHour >= LOCAL_MAX_REJECTED_PER_HOUR) flags.push('too_many_rejected_imports');
  return flags;
}

function recordLocalImportAccepted(count: number) {
  const counter = getLocalUploadCounter();
  counter.importsThisHour += count;
  counter.importsToday += count;
  saveLocalUploadCounter(counter);
}

function recordLocalImportRejected(count: number) {
  const counter = getLocalUploadCounter();
  counter.rejectedThisHour += count;
  saveLocalUploadCounter(counter);
}

async function hashLocalFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function isCoverImageFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  const baseName = getBaseName(file.name);
  return COVER_IMAGE_EXTENSIONS.has(ext) && COVER_NAME_PRIORITY.includes(baseName);
}

function isLyricFile(file: File): boolean {
  return getFileExtension(file.name) === 'lrc';
}

function compareCoverFiles(a: File, b: File): number {
  const aNameRank = COVER_NAME_PRIORITY.indexOf(getBaseName(a.name));
  const bNameRank = COVER_NAME_PRIORITY.indexOf(getBaseName(b.name));
  if (aNameRank !== bNameRank) return aNameRank - bNameRank;

  const aExtRank = a.name.toLowerCase().endsWith('.jpeg') ? 0 : 1;
  const bExtRank = b.name.toLowerCase().endsWith('.jpeg') ? 0 : 1;
  return aExtRank - bExtRank;
}

function buildCoverFileIndex(files: File[]) {
  const byDirectory = new Map<string, File>();
  const covers = files.filter(isCoverImageFile).sort(compareCoverFiles);

  for (const cover of covers) {
    const directory = getImportDirectory(cover as ImportableFile);
    if (!byDirectory.has(directory)) {
      byDirectory.set(directory, cover);
    }
  }

  return {
    byDirectory,
    batchFallback: covers[0],
  };
}

function buildLyricFileIndex(files: File[]) {
  const byPathBase = new Map<string, File>();
  const byDirectory = new Map<string, File[]>();
  const lrcFiles = files.filter(isLyricFile);

  for (const lrcFile of lrcFiles) {
    const directory = getImportDirectory(lrcFile as ImportableFile);
    byPathBase.set(`${directory}/${getBaseName(lrcFile.name)}`, lrcFile);
    byDirectory.set(directory, [...(byDirectory.get(directory) || []), lrcFile]);
  }

  return { byPathBase, byDirectory };
}

function findBatchCoverFile(
  audioFile: File,
  coverIndex: ReturnType<typeof buildCoverFileIndex>
): File | undefined {
  let directory = getImportDirectory(audioFile as ImportableFile);

  while (directory) {
    const cover = coverIndex.byDirectory.get(directory);
    if (cover) return cover;
    const parentSlashIndex = directory.lastIndexOf('/');
    directory = parentSlashIndex >= 0 ? directory.slice(0, parentSlashIndex) : '';
  }

  return coverIndex.byDirectory.get('') || (getImportDirectory(audioFile as ImportableFile) ? undefined : coverIndex.batchFallback);
}

function findBatchLyricFile(
  audioFile: File,
  lyricIndex: ReturnType<typeof buildLyricFileIndex>
): File | undefined {
  const directory = getImportDirectory(audioFile as ImportableFile);
  const baseKey = `${directory}/${getBaseName(audioFile.name)}`;
  const exactMatch = lyricIndex.byPathBase.get(baseKey);
  if (exactMatch) return exactMatch;
  const directoryLyrics = lyricIndex.byDirectory.get(directory) || [];
  return directoryLyrics.length === 1 ? directoryLyrics[0] : undefined;
}

function readFileAsDataUrl(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsText(file);
  });
}

function slugifyLocalId(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || fallback;
}

function cleanFilenamePart(value: string): string {
  return value
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ') ')
    .trim();
}

function isMissingMetadata(value?: string | null): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === 'unknown' ||
    normalized === 'unknown artist' ||
    normalized === 'unknown album'
  );
}

function parseFilenameTemplate(fileName: string): { title: string; artist?: string; album?: string } {
  const baseName = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/^\s*\d{1,3}\s*[-._]\s*/, '')
    .trim();

  const parts = baseName
    .split(/\s+-\s+/)
    .map(cleanFilenamePart)
    .filter(Boolean);

  if (parts.length >= 3) {
    return {
      title: parts[0],
      artist: parts[1],
      album: parts.slice(2).join(' - '),
    };
  }

  if (parts.length === 2) {
    return {
      title: parts[0],
      artist: parts[1],
    };
  }

  return {
    title: cleanFilenamePart(baseName.replace(/[._]+/g, ' ')),
  };
}

function findReusableAlbumCover(album: string, artist: string, tracks: LocalTrack[]): string | undefined {
  if (isMissingMetadata(album)) return undefined;

  const normalizedAlbum = album.trim().toLowerCase();
  const normalizedArtist = artist.trim().toLowerCase();
  const sameArtistAlbum = tracks.find((track) =>
    track.coverUrl &&
    track.album?.trim().toLowerCase() === normalizedAlbum &&
    track.artist?.trim().toLowerCase() === normalizedArtist
  );

  if (sameArtistAlbum?.coverUrl) return sameArtistAlbum.coverUrl;

  return tracks.find((track) =>
    track.coverUrl &&
    track.album?.trim().toLowerCase() === normalizedAlbum
  )?.coverUrl;
}

async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const cleanup = () => {
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
    };
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
      cleanup();
    });
    audio.addEventListener('error', () => {
      resolve(0);
      cleanup();
    });
  });
}

function syncTrackIntoPlayer(updatedTrack: LocalTrack) {
  const playerState = usePlayerStore.getState();
  const mergeTrack = <T extends { id: string }>(track: T): T =>
    track.id === updatedTrack.id ? ({ ...track, ...updatedTrack } as T) : track;

  const nextCurrentTrack = playerState.currentTrack
    ? mergeTrack(playerState.currentTrack)
    : null;
  const nextQueue = playerState.queue.map(mergeTrack);
  const nextHistory = playerState.history.map(mergeTrack);

  usePlayerStore.setState({
    currentTrack: nextCurrentTrack,
    queue: nextQueue,
    history: nextHistory,
  });
}

// ─── Types ───

export interface ImportProgress {
  total: number;
  done: number;
  current: string;
  isRunning: boolean;
  rejected: number;
  abuseFlags: string[];
}

interface LocalLibraryState {
  // Data
  localTracks: LocalTrack[];
  localPlaylists: Playlist[];
  playCounts: Record<string, number>;
  lastPlayed: Record<string, number>;

  // UI state
  isLoaded: boolean;
  importProgress: ImportProgress;
  searchQuery: string;

  // Actions
  loadLibrary: () => Promise<void>;
  importFiles: (files: FileList | File[]) => Promise<void>;
  removeTrack: (id: string) => Promise<void>;
  updateTrack: (id: string, updates: Partial<LocalTrack>) => Promise<void>;
  clearLibrary: () => Promise<void>;
  updateTrackDuration: (id: string, duration: number) => Promise<void>;

  createPlaylist: (title: string) => Promise<Playlist>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  reorderPlaylistTracks: (playlistId: string, fromIdx: number, toIdx: number) => Promise<void>;

  recordPlay: (trackId: string) => void;
  setSearchQuery: (q: string) => void;
  searchTracks: (query: string) => LocalTrack[];
  getMostPlayed: (limit?: number) => LocalTrack[];
  getRecentlyPlayed: (limit?: number) => LocalTrack[];
}

// ─── Store ───

export const useLocalLibraryStore = create<LocalLibraryState>((set, get) => ({
  localTracks: [],
  localPlaylists: [],
  playCounts: {},
  lastPlayed: {},
  isLoaded: false,
  importProgress: { total: 0, done: 0, current: '', isRunning: false, rejected: 0, abuseFlags: [] },
  searchQuery: '',

  loadLibrary: async () => {
    try {
      const [tracks, playlists, playCounts, lastPlayed] = await Promise.all([
        localDb.getTracks(),
        localDb.getPlaylists(),
        localDb.getSetting<Record<string, number>>('playCounts'),
        localDb.getSetting<Record<string, number>>('lastPlayed'),
      ]);
      set({
        localTracks: tracks,
        localPlaylists: playlists,
        playCounts: playCounts || {},
        lastPlayed: lastPlayed || {},
        isLoaded: true,
      });
      usePlayerStore.getState().restoreLastPlayback(tracks);
    } catch (err) {
      console.error('Failed to load local library:', err);
      set({ isLoaded: true });
    }
  },

  importFiles: async (files: FileList | File[]) => {
    const allFiles = Array.from(files);
    const coverIndex = buildCoverFileIndex(allFiles);
    const lyricIndex = buildLyricFileIndex(allFiles);
    const coverDataUrlCache = new Map<File, Promise<string | undefined>>();
    const lyricTextCache = new Map<File, Promise<string | undefined>>();
    const getBatchCoverUrl = (file: File): Promise<string | undefined> => {
      const coverFile = findBatchCoverFile(file, coverIndex);
      if (!coverFile) return Promise.resolve(undefined);
      let cached = coverDataUrlCache.get(coverFile);
      if (!cached) {
        cached = readFileAsDataUrl(coverFile);
        coverDataUrlCache.set(coverFile, cached);
      }
      return cached;
    };
    const getBatchLyrics = (file: File): Promise<string | undefined> => {
      const lyricFile = findBatchLyricFile(file, lyricIndex);
      if (!lyricFile) return Promise.resolve(undefined);
      let cached = lyricTextCache.get(lyricFile);
      if (!cached) {
        cached = readFileAsText(lyricFile);
        lyricTextCache.set(lyricFile, cached);
      }
      return cached;
    };
    const audioFiles = allFiles.filter(isAudioFile);

    if (audioFiles.length === 0) return;

    const rateCounter = getLocalUploadCounter();
    const limitFlags = getLocalImportLimitFlags(rateCounter);
    if (limitFlags.length > 0) {
      recordLocalImportRejected(audioFiles.length);
      console.warn('[LocalLibrary] Import blocked by rate limits:', limitFlags);
      set({
        importProgress: {
          total: 0,
          done: 0,
          current: '',
          isRunning: false,
          rejected: audioFiles.length,
          abuseFlags: limitFlags,
        },
      });
      return;
    }

    const allowedByBatch = audioFiles.slice(0, LOCAL_MAX_IMPORTS_PER_BATCH);
    const overflowCount = Math.max(0, audioFiles.length - allowedByBatch.length);
    if (overflowCount > 0) {
      recordLocalImportRejected(overflowCount);
      console.warn(`[LocalLibrary] Skipped ${overflowCount} files over the ${LOCAL_MAX_IMPORTS_PER_BATCH}-file batch limit.`);
    }

    const remainingHour = Math.max(0, LOCAL_MAX_IMPORTS_PER_HOUR - rateCounter.importsThisHour);
    const remainingDay = Math.max(0, LOCAL_MAX_IMPORTS_PER_DAY - rateCounter.importsToday);
    const rateAllowedCount = Math.min(allowedByBatch.length, remainingHour, remainingDay);
    const rateSkippedCount = allowedByBatch.length - rateAllowedCount;
    const rateLimitedFiles = allowedByBatch.slice(0, rateAllowedCount);
    if (rateSkippedCount > 0) {
      recordLocalImportRejected(rateSkippedCount);
      console.warn(`[LocalLibrary] Skipped ${rateSkippedCount} files over the current import rate limit.`);
    }

    const existingHashes = new Set(get().localTracks.map((track) => track.fileHash).filter(Boolean));
    const batchHashes = new Set<string>();
    const screenedFiles: ScreenedLocalFile[] = [];

    for (const file of rateLimitedFiles) {
      try {
        const fileHash = await hashLocalFile(file);
        if (existingHashes.has(fileHash) || batchHashes.has(fileHash)) {
          recordLocalImportRejected(1);
          console.warn(`[LocalLibrary] Duplicate file blocked: ${file.name}`);
          continue;
        }
        batchHashes.add(fileHash);
        screenedFiles.push({ file, fileHash });
      } catch (err) {
        recordLocalImportRejected(1);
        console.warn(`[LocalLibrary] Failed to hash file, skipped: ${file.name}`, err);
      }
    }

    if (screenedFiles.length === 0) {
      set({
        importProgress: {
          total: 0,
          done: 0,
          current: '',
          isRunning: false,
          rejected: audioFiles.length,
          abuseFlags: ['duplicate_or_blocked_imports'],
        },
      });
      return;
    }

    set({
      importProgress: {
        total: screenedFiles.length,
        done: 0,
        current: '',
        isRunning: true,
        rejected: overflowCount + rateSkippedCount + (rateLimitedFiles.length - screenedFiles.length),
        abuseFlags: overflowCount > 0 || rateSkippedCount > 0
          ? ['batch_or_rate_limit_applied']
          : [],
      }
    });

    const { parseBlob } = await import('music-metadata-browser');
    const newTracks: LocalTrack[] = [];

    for (let i = 0; i < screenedFiles.length; i++) {
      const { file, fileHash } = screenedFiles[i];

      set(s => ({
        importProgress: { ...s.importProgress, done: i, current: file.name }
      }));

      try {
        const metadata = await parseBlob(file);
        const { common, format } = metadata;
        const filenameMetadata = parseFilenameTemplate(file.name);

        // Extract cover art
        let coverUrl: string | undefined;
        if (common.picture && common.picture.length > 0) {
          const pic = common.picture[0];
          const base64 = btoa(
            pic.data.reduce((data: string, byte: number) => data + String.fromCharCode(byte), '')
          );
          coverUrl = `data:${pic.format};base64,${base64}`;
        }

        const title = cleanFilenamePart(
          isMissingMetadata(common.title) ? filenameMetadata.title : common.title || filenameMetadata.title
        );
        const artist = cleanFilenamePart(
          isMissingMetadata(common.artist)
            ? filenameMetadata.artist || common.albumartist || 'Unknown Artist'
            : common.artist || common.albumartist || 'Unknown Artist'
        );
        const album = cleanFilenamePart(
          isMissingMetadata(common.album) ? filenameMetadata.album || 'Unknown Album' : common.album || 'Unknown Album'
        );
        coverUrl = coverUrl
          || await getBatchCoverUrl(file)
          || findReusableAlbumCover(album, artist, [...get().localTracks, ...newTracks]);
        const lyrics = await getBatchLyrics(file);

        // Check duplicate by same title+artist
        const existingTracks = get().localTracks;
        const isDuplicate = existingTracks.some(
          t => t.title === title && t.artist === artist && t.album === album
        );
        if (isDuplicate) continue;

        const track: LocalTrack = {
          id: generateId(),
          title,
          artist,
          artistId: `local_artist_${slugifyLocalId(artist, 'unknown')}`,
          album,
          albumId: `local_album_${slugifyLocalId(album, 'unknown')}`,
          duration: format.duration ? Math.round(format.duration) : Math.round(await getAudioDuration(file)),
          genre: common.genre?.[0] || '',
          releaseDate: common.year ? String(common.year) : '',
          lyrics,
          plays: 0,
          explicit: false,
          coverUrl,
          coverGradient: stringToGradient(title + artist),
          fileHash,
          uploadStatus: 'quarantined',
          visibility: 'private',
          moderationFlags: ['local_import_quarantined'],
          blob: file,
          isLocal: true,
          addedAt: Date.now(),
        };

        await localDb.saveTrack(track);
        newTracks.push(track);
      } catch {
        // Fallback: add with basic metadata derived from filename
        const filenameMetadata = parseFilenameTemplate(file.name);
        const title = filenameMetadata.title;
        const artist = filenameMetadata.artist || 'Unknown Artist';
        const album = filenameMetadata.album || 'Unknown Album';
        const coverUrl = await getBatchCoverUrl(file)
          || findReusableAlbumCover(album, artist, [...get().localTracks, ...newTracks]);
        const lyrics = await getBatchLyrics(file);
        const track: LocalTrack = {
          id: generateId(),
          title,
          artist,
          artistId: `local_artist_${slugifyLocalId(artist, 'unknown')}`,
          album,
          albumId: `local_album_${slugifyLocalId(album, 'unknown')}`,
          duration: Math.round(await getAudioDuration(file)),
          lyrics,
          plays: 0,
          explicit: false,
          coverUrl,
          coverGradient: stringToGradient(title + artist),
          fileHash,
          uploadStatus: 'quarantined',
          visibility: 'private',
          moderationFlags: ['local_import_quarantined', 'metadata_parse_failed'],
          blob: file,
          isLocal: true,
          addedAt: Date.now(),
        };
        await localDb.saveTrack(track);
        newTracks.push(track);
      }
    }

    recordLocalImportAccepted(newTracks.length);

    set(s => ({
      localTracks: [...s.localTracks, ...newTracks],
      importProgress: {
        ...s.importProgress,
        total: screenedFiles.length,
        done: screenedFiles.length,
        current: '',
        isRunning: false,
      },
    }));
  },

  removeTrack: async (id: string) => {
    await localDb.deleteTrack(id);
    set(s => ({ localTracks: s.localTracks.filter(t => t.id !== id) }));
  },

  updateTrack: async (id: string, updates: Partial<LocalTrack>) => {
    const { localTracks } = get();
    const track = localTracks.find(t => t.id === id);
    if (!track) return;
    const updated: LocalTrack = { ...track, ...updates };
    await localDb.saveTrack(updated);
    set(s => ({ localTracks: s.localTracks.map(t => t.id === id ? updated : t) }));
    syncTrackIntoPlayer(updated);
  },

  clearLibrary: async () => {
    const { localTracks } = get();
    await Promise.all(localTracks.map(t => localDb.deleteTrack(t.id)));
    set({ localTracks: [] });
  },

  updateTrackDuration: async (id: string, duration: number) => {
    const { localTracks } = get();
    const track = localTracks.find(t => t.id === id);
    if (!track) return;
    const updated: LocalTrack = { ...track, duration };
    await localDb.saveTrack(updated);
    set(s => ({ localTracks: s.localTracks.map(t => t.id === id ? updated : t) }));
    syncTrackIntoPlayer(updated);
  },

  createPlaylist: async (title: string) => {
    const playlist: Playlist = {
      id: generateId(),
      title,
      description: '',
      owner: 'You',
      ownerName: 'You',
      trackIds: [],
      followers: 0,
      isPublic: false,
      isCollaborative: false,
      type: 'user',
      coverGradient: stringToGradient(title),
      createdAt: new Date().toISOString(),
    };
    await localDb.savePlaylist(playlist);
    set(s => ({ localPlaylists: [...s.localPlaylists, playlist] }));
    return playlist;
  },

  updatePlaylist: async (id: string, updates: Partial<Playlist>) => {
    const { localPlaylists } = get();
    const existing = localPlaylists.find(p => p.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    await localDb.savePlaylist(updated);
    set(s => ({ localPlaylists: s.localPlaylists.map(p => p.id === id ? updated : p) }));
  },

  deletePlaylist: async (id: string) => {
    await localDb.deletePlaylist(id);
    set(s => ({ localPlaylists: s.localPlaylists.filter(p => p.id !== id) }));
  },

  addTrackToPlaylist: async (playlistId: string, trackId: string) => {
    const { localPlaylists } = get();
    const playlist = localPlaylists.find(p => p.id === playlistId);
    if (!playlist || playlist.trackIds.includes(trackId)) return;
    const updated = { ...playlist, trackIds: [...playlist.trackIds, trackId] };
    await localDb.savePlaylist(updated);
    set(s => ({ localPlaylists: s.localPlaylists.map(p => p.id === playlistId ? updated : p) }));
  },

  removeTrackFromPlaylist: async (playlistId: string, trackId: string) => {
    const { localPlaylists } = get();
    const playlist = localPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    const updated = { ...playlist, trackIds: playlist.trackIds.filter(id => id !== trackId) };
    await localDb.savePlaylist(updated);
    set(s => ({ localPlaylists: s.localPlaylists.map(p => p.id === playlistId ? updated : p) }));
  },

  reorderPlaylistTracks: async (playlistId: string, fromIdx: number, toIdx: number) => {
    const { localPlaylists } = get();
    const playlist = localPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    const newIds = [...playlist.trackIds];
    const [moved] = newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, moved);
    const updated = { ...playlist, trackIds: newIds };
    await localDb.savePlaylist(updated);
    set(s => ({ localPlaylists: s.localPlaylists.map(p => p.id === playlistId ? updated : p) }));
  },

  recordPlay: (trackId: string) => {
    set(s => {
      const playCounts = { ...s.playCounts, [trackId]: (s.playCounts[trackId] || 0) + 1 };
      const lastPlayed = { ...s.lastPlayed, [trackId]: Date.now() };
      localDb.saveSetting('playCounts', playCounts);
      localDb.saveSetting('lastPlayed', lastPlayed);
      return { playCounts, lastPlayed };
    });
  },

  setSearchQuery: (q: string) => set({ searchQuery: q }),

  searchTracks: (query: string) => {
    const { localTracks } = get();
    if (!query.trim()) return localTracks;
    const q = query.toLowerCase();
    return localTracks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.album || '').toLowerCase().includes(q) ||
      (t.genre || '').toLowerCase().includes(q)
    );
  },

  getMostPlayed: (limit = 20) => {
    const { localTracks, playCounts } = get();
    return [...localTracks]
      .sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0))
      .slice(0, limit);
  },

  getRecentlyPlayed: (limit = 20) => {
    const { localTracks, lastPlayed } = get();
    return [...localTracks]
      .filter(t => lastPlayed[t.id])
      .sort((a, b) => (lastPlayed[b.id] || 0) - (lastPlayed[a.id] || 0))
      .slice(0, limit);
  },
}));
