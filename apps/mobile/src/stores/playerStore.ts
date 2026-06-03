import { create } from 'zustand';
import TrackPlayer, { State, Capability, Track, RepeatMode } from 'react-native-track-player';
import * as MediaLibrary from 'expo-media-library';

export type { Track } from 'react-native-track-player';

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

let playerSetupPromise: Promise<boolean> | null = null;

async function ensurePlayerSetup() {
  if (playerSetupPromise) return playerSetupPromise;

  playerSetupPromise = (async () => {
    try {
      await TrackPlayer.getCurrentTrack();
      return true;
    } catch {
      try {
        await TrackPlayer.setupPlayer();
        await TrackPlayer.updateOptions({
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.Stop,
          ],
          compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
        });
        await TrackPlayer.setRepeatMode(RepeatMode.Queue);
        return true;
      } catch (error) {
        console.warn('Track player setup failed', error);
        playerSetupPromise = null;
        return false;
      }
    }
  })();

  return playerSetupPromise;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isSetup: false,
  isPlaying: false,
  currentTrack: null,
  queue: [],

  setupPlayer: async () => {
    const isSetup = await ensurePlayerSetup();
    set({ isSetup });
  },

  playTrack: async (track) => {
    const { isSetup, setupPlayer } = get();
    if (!isSetup) await setupPlayer();
    if (!get().isSetup) return;
    
    await TrackPlayer.reset();
    await TrackPlayer.add([track]);
    await TrackPlayer.play();
    set({ currentTrack: track, queue: [track], isPlaying: true });
  },

  playQueue: async (tracks, startIndex = 0) => {
    const { isSetup, setupPlayer } = get();
    if (!isSetup) await setupPlayer();
    if (!get().isSetup || tracks.length === 0) return;

    await TrackPlayer.reset();
    await TrackPlayer.add(tracks);
    await TrackPlayer.skip(startIndex);
    await TrackPlayer.play();
    set({ currentTrack: tracks[startIndex], queue: tracks, isPlaying: true });
  },

  togglePlayback: async () => {
    if (!get().isSetup) return;
    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
      await TrackPlayer.pause();
      set({ isPlaying: false });
    } else {
      await TrackPlayer.play();
      set({ isPlaying: true });
    }
  },

  skipToNext: async () => {
    if (!get().isSetup) return;
    await TrackPlayer.skipToNext();
  },

  skipToPrevious: async () => {
    if (!get().isSetup) return;
    await TrackPlayer.skipToPrevious();
  },

  scanLocalMusic: async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return [];

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'audio',
        first: 100,
      });

      const tracks: Track[] = media.assets.map((asset) => ({
        id: asset.id,
        url: asset.uri,
        title: asset.filename.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
        duration: asset.duration,
        artwork: undefined,
      }));

      return tracks;
    } catch (error) {
      console.warn('Media library scan failed', error);
      return [];
    }
  }
}));
