import { create } from 'zustand';

export interface Track {
  id: string;
  url?: string;
  title?: string;
  artist?: string;
  duration?: number;
  artwork?: unknown;
}

interface PlayerState {
  isSetup: boolean;
  isPlaying: boolean;
  currentTrack: Track | null;
  queue: Track[];
  setupPlayer: () => Promise<void>;
  playTrack: (track: Track) => Promise<void>;
  playQueue: (tracks: Track[], startIndex?: number) => Promise<void>;
  togglePlayback: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  scanLocalMusic: () => Promise<Track[]>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isSetup: true,
  isPlaying: false,
  currentTrack: null,
  queue: [],

  setupPlayer: async () => {
    set({ isSetup: true });
  },

  playTrack: async (track) => {
    set({ currentTrack: track, queue: [track], isPlaying: true });
  },

  playQueue: async (tracks, startIndex = 0) => {
    set({
      currentTrack: tracks[startIndex] || null,
      queue: tracks,
      isPlaying: tracks.length > 0,
    });
  },

  togglePlayback: async () => {
    if (!get().currentTrack) return;
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  skipToNext: async () => {
    const { queue, currentTrack } = get();
    const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
    const nextTrack = queue[currentIndex + 1];
    if (nextTrack) {
      set({ currentTrack: nextTrack, isPlaying: true });
    }
  },

  skipToPrevious: async () => {
    const { queue, currentTrack } = get();
    const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
    const previousTrack = queue[currentIndex - 1];
    if (previousTrack) {
      set({ currentTrack: previousTrack, isPlaying: true });
    }
  },

  scanLocalMusic: async () => [],
}));
