import { create } from 'zustand';
import TrackPlayer, { State, Capability, Track, RepeatMode } from 'react-native-track-player';
import * as MediaLibrary from 'expo-media-library';

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
  isSetup: false,
  isPlaying: false,
  currentTrack: null,
  queue: [],

  setupPlayer: async () => {
    let isSetup = false;
    try {
      await TrackPlayer.getCurrentTrack();
      isSetup = true;
    } catch {
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
      isSetup = true;
    }
    set({ isSetup });
  },

  playTrack: async (track) => {
    const { isSetup, setupPlayer } = get();
    if (!isSetup) await setupPlayer();
    
    await TrackPlayer.reset();
    await TrackPlayer.add([track]);
    await TrackPlayer.play();
    set({ currentTrack: track, queue: [track], isPlaying: true });
  },

  playQueue: async (tracks, startIndex = 0) => {
    const { isSetup, setupPlayer } = get();
    if (!isSetup) await setupPlayer();

    await TrackPlayer.reset();
    await TrackPlayer.add(tracks);
    await TrackPlayer.skip(startIndex);
    await TrackPlayer.play();
    set({ currentTrack: tracks[startIndex], queue: tracks, isPlaying: true });
  },

  togglePlayback: async () => {
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
    await TrackPlayer.skipToNext();
  },

  skipToPrevious: async () => {
    await TrackPlayer.skipToPrevious();
  },

  scanLocalMusic: async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return [];

    let media = await MediaLibrary.getAssetsAsync({
      mediaType: 'audio',
      first: 100, // Load first 100 for now
    });

    const tracks: Track[] = media.assets.map((asset, index) => ({
      id: asset.id,
      url: asset.uri,
      title: asset.filename.replace(/\.[^/.]+$/, ""), // Fallback title
      artist: 'Unknown Artist',
      duration: asset.duration,
      artwork: undefined, // Requires ID3 parsing for local art
    }));

    return tracks;
  }
}));
