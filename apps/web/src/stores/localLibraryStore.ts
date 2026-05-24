import { create } from 'zustand';
import { localDb, LocalTrack } from '../services/localDb';
import { Playlist } from '../types';

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

// ─── Types ───

export interface ImportProgress {
  total: number;
  done: number;
  current: string;
  isRunning: boolean;
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
  importProgress: { total: 0, done: 0, current: '', isRunning: false },
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
    } catch (err) {
      console.error('Failed to load local library:', err);
      set({ isLoaded: true });
    }
  },

  importFiles: async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext && ['mp3', 'm4a', 'wav', 'ogg', 'flac', 'aac'].includes(ext);
    });

    if (fileArray.length === 0) return;

    set({
      importProgress: { total: fileArray.length, done: 0, current: '', isRunning: true }
    });

    const { parseBlob } = await import('music-metadata-browser');
    const newTracks: LocalTrack[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      set(s => ({
        importProgress: { ...s.importProgress, done: i, current: file.name }
      }));

      try {
        const metadata = await parseBlob(file);
        const { common, format } = metadata;

        // Extract cover art
        let coverUrl: string | undefined;
        if (common.picture && common.picture.length > 0) {
          const pic = common.picture[0];
          const base64 = btoa(
            pic.data.reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          coverUrl = `data:${pic.format};base64,${base64}`;
        }

        const title = common.title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        const artist = common.artist || 'Unknown Artist';
        const album = common.album || 'Unknown Album';

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
          artistId: `local_artist_${artist.toLowerCase().replace(/\s+/g, '_')}`,
          album,
          albumId: `local_album_${album.toLowerCase().replace(/\s+/g, '_')}`,
          duration: format.duration ? Math.round(format.duration) : Math.round(await getAudioDuration(file)),
          genre: common.genre?.[0] || '',
          releaseDate: common.year ? String(common.year) : '',
          plays: 0,
          explicit: false,
          coverUrl,
          coverGradient: stringToGradient(title + artist),
          blob: file,
          isLocal: true,
          addedAt: Date.now(),
        };

        await localDb.saveTrack(track);
        newTracks.push(track);
      } catch (err) {
        // Fallback: add with basic metadata derived from filename
        const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        const track: LocalTrack = {
          id: generateId(),
          title,
          artist: 'Unknown Artist',
          artistId: 'local_artist_unknown',
          album: 'Unknown Album',
          albumId: 'local_album_unknown',
          duration: Math.round(await getAudioDuration(file)),
          plays: 0,
          explicit: false,
          coverGradient: stringToGradient(title),
          blob: file,
          isLocal: true,
          addedAt: Date.now(),
        };
        await localDb.saveTrack(track);
        newTracks.push(track);
      }
    }

    set(s => ({
      localTracks: [...s.localTracks, ...newTracks],
      importProgress: { total: fileArray.length, done: fileArray.length, current: '', isRunning: false },
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
    const updated = { ...track, ...updates };
    await localDb.saveTrack(updated);
    set(s => ({ localTracks: s.localTracks.map(t => t.id === id ? updated : t) }));
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
    const updated = { ...track, duration };
    await localDb.saveTrack(updated);
    set(s => ({ localTracks: s.localTracks.map(t => t.id === id ? updated : t) }));
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
