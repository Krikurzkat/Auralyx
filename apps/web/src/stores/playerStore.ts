import { create } from 'zustand';
import { Track } from '../types';

type AudioSlot = 0 | 1;
const LAST_PLAYBACK_KEY = 'go_music_last_playback';

const _blobUrlByAudio = new WeakMap<HTMLAudioElement, string>();
let _crossfadeAnimationFrame: number | null = null;
let _crossfadeTimeout: number | null = null;
let _pendingAutoAdvance: {
  nextTrack: Track;
  nextIndex: number;
  queue: Track[];
  history: Track[];
  nextSlot: AudioSlot;
  activeAudio: HTMLAudioElement;
  inactiveAudio: HTMLAudioElement;
} | null = null;

interface PersistedPlaybackState {
  trackId: string;
  track?: Track;
  queueIds: string[];
  queue?: Track[];
  queueIndex: number;
  currentTime: number;
  updatedAt: number;
}

// #region debug-point A:reporter
const reportTrackSwitchDebug = (_hypothesisId: string, _msg: string, _data: Record<string, unknown> = {}) => {};
// #endregion

function getAudioDebugSnapshot(audio: HTMLAudioElement | null, label: string) {
  if (!audio) {
    return { label, exists: false };
  }

  return {
    label,
    exists: true,
    currentSrc: audio.currentSrc,
    paused: audio.paused,
    currentTime: audio.currentTime,
    readyState: audio.readyState,
    networkState: audio.networkState,
    volume: audio.volume,
    ended: audio.ended,
  };
}

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  // Current playback
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // 0-100
  currentTime: number; // seconds
  duration: number;
  volume: number; // 0-100
  isMuted: boolean;

  // Queue
  queue: Track[];
  queueIndex: number;
  originalQueue: Track[];
  originalQueueIndex: number;
  history: Track[];

  // Modes
  shuffle: boolean;
  repeat: RepeatMode;
  manualFadeDuration: number; // seconds
  autoFadeDuration: number; // seconds

  // UI
  isFullscreen: boolean;
  isFullscreenOpen: boolean;
  showLyrics: boolean;
  showQueue: boolean;

  // Audio element ref
  primaryAudioRef: HTMLAudioElement | null;
  secondaryAudioRef: HTMLAudioElement | null;
  audioRef: HTMLAudioElement | null;
  activeAudioSlot: AudioSlot;
  isCrossfading: boolean;

  // Actions
  setAudioRefs: (primary: HTMLAudioElement, secondary: HTMLAudioElement) => void;
  playTrack: (track: Track, context?: Track[], isAutoAdvance?: boolean) => void;
  handleTrackEnded: () => void;
  maybeStartAutoCrossfade: () => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (percent: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setManualFadeDuration: (seconds: number) => void;
  setAutoFadeDuration: (seconds: number) => void;
  setFullscreenOpen: (value: boolean) => void;
  toggleFullscreen: () => void;
  toggleLyrics: () => void;
  toggleQueue: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (from: number, to: number) => void;
  setProgress: (progress: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  restoreLastPlayback: (tracks: Track[]) => void;
  resetPlaybackState: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getInactiveSlot(slot: AudioSlot): AudioSlot {
  return slot === 0 ? 1 : 0;
}

function getPrimaryAudio(state: Pick<PlayerState, 'primaryAudioRef'>) {
  return state.primaryAudioRef;
}

function getSecondaryAudio(state: Pick<PlayerState, 'secondaryAudioRef'>) {
  return state.secondaryAudioRef;
}

function getActiveAudio(state: Pick<PlayerState, 'primaryAudioRef' | 'secondaryAudioRef' | 'activeAudioSlot'>) {
  return state.activeAudioSlot === 0 ? getPrimaryAudio(state) : getSecondaryAudio(state);
}

function getInactiveAudio(state: Pick<PlayerState, 'primaryAudioRef' | 'secondaryAudioRef' | 'activeAudioSlot'>) {
  return state.activeAudioSlot === 0 ? getSecondaryAudio(state) : getPrimaryAudio(state);
}

function clearAudioBlobUrl(audio: HTMLAudioElement | null) {
  if (!audio) return;
  const existing = _blobUrlByAudio.get(audio);
  if (existing) {
    URL.revokeObjectURL(existing);
    _blobUrlByAudio.delete(audio);
  }
}

function clearCrossfadeAnimation() {
  if (_crossfadeAnimationFrame !== null) {
    cancelAnimationFrame(_crossfadeAnimationFrame);
    _crossfadeAnimationFrame = null;
  }
  if (_crossfadeTimeout !== null) {
    window.clearTimeout(_crossfadeTimeout);
    _crossfadeTimeout = null;
  }
}

function isPageHidden() {
  return typeof document !== 'undefined' && document.hidden;
}

function scheduleCrossfadeStep(callback: (time: number) => void) {
  _crossfadeTimeout = window.setTimeout(() => {
    _crossfadeTimeout = null;
    callback(performance.now());
  }, isPageHidden() ? 250 : 50);
}

function getTargetVolume(state: Pick<PlayerState, 'volume' | 'isMuted'>) {
  return state.isMuted ? 0 : state.volume / 100;
}

function clampAudioVolume(volume: number) {
  if (!Number.isFinite(volume)) return 0;
  return Math.min(1, Math.max(0, volume));
}

function resetAndStopAudio(audio: HTMLAudioElement | null, state: Pick<PlayerState, 'volume' | 'isMuted'>) {
  if (!audio) return;

  // #region debug-point A:reset-stop-audio
  reportTrackSwitchDebug('A', 'resetAndStopAudio', {
    currentTime: audio.currentTime,
    paused: audio.paused,
    targetVolume: getTargetVolume(state),
  });
  // #endregion
  clearCrossfadeAnimation();
  audio.volume = clampAudioVolume(getTargetVolume(state));
  audio.pause();
  audio.currentTime = 0;
}

function stopInactiveAudio(audio: HTMLAudioElement | null) {
  if (!audio) return;
  // #region debug-point D:stop-inactive-audio
  reportTrackSwitchDebug('D', 'stopInactiveAudio', getAudioDebugSnapshot(audio, 'inactive-before-stop'));
  // #endregion
  audio.pause();
  audio.currentTime = 0;
  audio.volume = clampAudioVolume(0);
}

function setAudioSource(audio: HTMLAudioElement, track: Track) {
  clearAudioBlobUrl(audio);

  if (track.isLocal && track.blob) {
    const blobUrl = URL.createObjectURL(track.blob);
    _blobUrlByAudio.set(audio, blobUrl);
    audio.src = blobUrl;
  } else if (track.audioUrl) {
    audio.src = track.audioUrl;
  } else {
    audio.removeAttribute('src');
    audio.load();
  }

  // #region debug-point A:set-audio-source
  reportTrackSwitchDebug('A', 'setAudioSource', {
    trackId: track.id,
    isLocal: track.isLocal,
    hasBlob: !!track.blob,
    hasAudioUrl: !!track.audioUrl,
    audio: getAudioDebugSnapshot(audio, 'after-set-source'),
  });
  // #endregion
}

function readLastPlaybackSnapshot(): PersistedPlaybackState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(LAST_PLAYBACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedPlaybackState;
    if (!parsed?.trackId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistLastPlaybackSnapshot(state: Pick<PlayerState, 'currentTrack' | 'queue' | 'queueIndex' | 'currentTime'>) {
  if (typeof window === 'undefined' || !state.currentTrack) return;

  const serializeTrack = (track: Track): Track => {
    const serializableTrack = { ...track };
    delete serializableTrack.blob;
    return serializableTrack;
  };
  const queueIds = state.queue.length > 0
    ? state.queue.map((track) => track.id)
    : [state.currentTrack.id];

  const snapshot: PersistedPlaybackState = {
    trackId: state.currentTrack.id,
    track: serializeTrack(state.currentTrack),
    queueIds,
    queue: state.queue.map(serializeTrack),
    queueIndex: Math.max(0, state.queueIndex),
    currentTime: Math.max(0, Math.floor(state.currentTime || 0)),
    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(LAST_PLAYBACK_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures; playback should keep working.
  }
}

/**
 * Equal-power crossfade using cosine curve
 * This maintains constant perceived loudness during transition
 * Formula: fadeOut = cos(progress * π/2), fadeIn = sin(progress * π/2)
 */
function calculateEqualPowerGains(progress: number): { fadeOut: number; fadeIn: number } {
  // Clamp progress between 0 and 1
  const p = Math.max(0, Math.min(1, progress));
  
  // Equal-power crossfade using quarter-wave cosine/sine
  // This ensures fadeOut² + fadeIn² = 1 (constant power)
  const fadeOut = Math.cos(p * Math.PI * 0.5);
  const fadeIn = Math.sin(p * Math.PI * 0.5);
  
  return { fadeOut, fadeIn };
}

/**
 * Smooth fade-in using requestAnimationFrame for high precision
 * Uses equal-power curve for natural sound
 */
function fadeInAudio(audio: HTMLAudioElement | null, targetVolume: number, durationMs: number = 280) {
  if (!audio) return;

  // #region debug-point B:fade-in-start
  reportTrackSwitchDebug('B', 'fadeInAudio start', {
    targetVolume,
    durationMs,
    currentSrc: audio.currentSrc,
  });
  // #endregion
  
  clearCrossfadeAnimation();
  audio.volume = clampAudioVolume(0);
  
  if (targetVolume <= 0 || durationMs <= 0) {
    audio.volume = clampAudioVolume(targetVolume);
    audio.play().catch((err) => {
      console.error('Failed to play audio:', err);
    });
    return;
  }

  // Start playback
  audio.play().catch((err) => {
    console.error('Failed to play audio:', err);
  });

  const startTime = performance.now();
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    
    // Use sine curve for smooth fade-in (equal-power)
    const gain = Math.sin(progress * Math.PI * 0.5);
    audio.volume = clampAudioVolume(targetVolume * gain);
    
    if (progress < 1) {
      scheduleCrossfadeStep(animate);
    } else {
      // #region debug-point B:fade-in-complete
      reportTrackSwitchDebug('B', 'fadeInAudio complete', {
        finalVolume: audio.volume,
        currentSrc: audio.currentSrc,
      });
      // #endregion
      clearCrossfadeAnimation();
    }
  };
  
  scheduleCrossfadeStep(animate);
}

/**
 * Manual crossfade for next/previous track buttons
 * Uses equal-power crossfading for smooth transitions
 */
function performManualCrossfade(
  activeAudio: HTMLAudioElement,
  inactiveAudio: HTMLAudioElement,
  nextTrack: Track,
  nextIndex: number,
  queue: Track[],
  history: Track[],
  targetVolume: number,
  durationMs: number,
  nextSlot: AudioSlot,
  setState: (state: Partial<PlayerState>) => void,
  onPlayFailure: () => void
) {
  // #region debug-point B:manual-crossfade-entry
  reportTrackSwitchDebug('B', 'performManualCrossfade entry', {
    nextTrackId: nextTrack.id,
    nextIndex,
    durationMs,
    nextSlot,
    queueLength: queue.length,
    activeAudio: getAudioDebugSnapshot(activeAudio, 'active-entry'),
    inactiveAudio: getAudioDebugSnapshot(inactiveAudio, 'inactive-entry'),
  });
  // #endregion
  // Prepare next track
  clearCrossfadeAnimation();
  _pendingAutoAdvance = null;
  stopInactiveAudio(inactiveAudio);
  setAudioSource(inactiveAudio, nextTrack);
  inactiveAudio.currentTime = 0;
  inactiveAudio.volume = clampAudioVolume(0);
  
  // Preload and start playing
  inactiveAudio.load();
  // #region debug-point B:manual-crossfade-after-load
  reportTrackSwitchDebug('B', 'performManualCrossfade after load', {
    nextTrackId: nextTrack.id,
    inactiveAudio: getAudioDebugSnapshot(inactiveAudio, 'inactive-after-load'),
  });
  // #endregion

  inactiveAudio.play()
    .then(() => {
      // #region debug-point B:manual-crossfade-play-resolved
      reportTrackSwitchDebug('B', 'performManualCrossfade play resolved', {
        nextTrackId: nextTrack.id,
        activeAudio: getAudioDebugSnapshot(activeAudio, 'active-play-resolved'),
        inactiveAudio: getAudioDebugSnapshot(inactiveAudio, 'inactive-play-resolved'),
      });
      // #endregion
      if (durationMs <= 0) {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        inactiveAudio.volume = clampAudioVolume(targetVolume);

        setState({
          currentTrack: nextTrack,
          queueIndex: nextIndex,
          history,
          progress: 0,
          currentTime: 0,
          isPlaying: true,
          isCrossfading: false,
          activeAudioSlot: nextSlot,
          audioRef: inactiveAudio,
        });
        return;
      }

      // Update state immediately so progress/time listeners follow the new slot.
      setState({
        currentTrack: nextTrack,
        queueIndex: nextIndex,
        history,
        progress: 0,
        currentTime: 0,
        isPlaying: true,
        isCrossfading: true,
        activeAudioSlot: nextSlot,
        audioRef: inactiveAudio,
      });

      // Start equal-power crossfade
      const startTime = performance.now();
      const startVolume = activeAudio.volume;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / durationMs);

        // Calculate equal-power gains
        const { fadeOut, fadeIn } = calculateEqualPowerGains(progress);

        // Apply volumes
        activeAudio.volume = clampAudioVolume(startVolume * fadeOut);
        inactiveAudio.volume = clampAudioVolume(targetVolume * fadeIn);

        if (progress < 1) {
          scheduleCrossfadeStep(animate);
        } else {
          // Crossfade complete
          clearCrossfadeAnimation();
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudio.volume = clampAudioVolume(targetVolume);
          inactiveAudio.volume = clampAudioVolume(targetVolume);

          setState({ isCrossfading: false });
        }
      };

      scheduleCrossfadeStep(animate);
    })
    .catch((err) => {
      console.error('Manual crossfade failed:', err);
      // #region debug-point C:manual-crossfade-play-rejected
      reportTrackSwitchDebug('C', 'performManualCrossfade play rejected', {
        nextTrackId: nextTrack.id,
        error: err instanceof Error ? err.message : String(err),
        activeAudio: getAudioDebugSnapshot(activeAudio, 'active-play-rejected'),
        inactiveAudio: getAudioDebugSnapshot(inactiveAudio, 'inactive-play-rejected'),
      });
      // #endregion
      stopInactiveAudio(inactiveAudio);
      onPlayFailure();
    });
}

function performDirectTrackSwitch(
  activeAudio: HTMLAudioElement | null,
  inactiveAudio: HTMLAudioElement | null,
  nextTrack: Track,
  nextIndex: number,
  queue: Track[],
  history: Track[],
  targetVolume: number,
  fadeDurationMs: number,
  state: Pick<PlayerState, 'volume' | 'isMuted' | 'activeAudioSlot'>,
  setState: (state: Partial<PlayerState>) => void
) {
  // #region debug-point D:direct-track-switch-entry
  reportTrackSwitchDebug('D', 'performDirectTrackSwitch entry', {
    nextTrackId: nextTrack.id,
    nextIndex,
    fadeDurationMs,
    queueLength: queue.length,
    activeSlot: state.activeAudioSlot,
    activeAudio: getAudioDebugSnapshot(activeAudio, 'active-direct-entry'),
    inactiveAudio: getAudioDebugSnapshot(inactiveAudio, 'inactive-direct-entry'),
  });
  // #endregion
  if (activeAudio) {
    clearCrossfadeAnimation();
    _pendingAutoAdvance = null;
    resetAndStopAudio(activeAudio, state);
    stopInactiveAudio(inactiveAudio);
    setAudioSource(activeAudio, nextTrack);
  }

  setState({
    currentTrack: nextTrack,
    isPlaying: true,
    progress: 0,
    currentTime: 0,
    queue,
    queueIndex: nextIndex,
    history,
    isCrossfading: false,
    activeAudioSlot: state.activeAudioSlot,
    audioRef: activeAudio,
  });

  fadeInAudio(activeAudio, targetVolume, fadeDurationMs);
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  currentTime: 0,
  duration: 0,
  volume: 78,
  isMuted: false,

  queue: [],
  queueIndex: -1,
  originalQueue: [],
  originalQueueIndex: -1,
  history: [],

  shuffle: false,
  repeat: 'off',
  manualFadeDuration: typeof window !== 'undefined' && localStorage.getItem('manualFadeDuration') !== null
    ? Number(localStorage.getItem('manualFadeDuration'))
    : 0,
  autoFadeDuration: typeof window !== 'undefined' && localStorage.getItem('autoFadeDuration') !== null
    ? Number(localStorage.getItem('autoFadeDuration'))
    : 15,

  isFullscreen: false,
  isFullscreenOpen: false,
  showLyrics: false,
  showQueue: true,

  primaryAudioRef: null,
  secondaryAudioRef: null,
  audioRef: null,
  activeAudioSlot: 0,
  isCrossfading: false,

  setAudioRefs: (primary, secondary) => set((state) => {
    const activeAudio = state.activeAudioSlot === 0 ? primary : secondary;

    if (state.currentTrack && activeAudio.currentSrc === '') {
      setAudioSource(activeAudio, state.currentTrack);
      activeAudio.currentTime = state.currentTime || 0;
      activeAudio.volume = clampAudioVolume(getTargetVolume(state));
      activeAudio.pause();
    }

    return {
      primaryAudioRef: primary,
      secondaryAudioRef: secondary,
      audioRef: activeAudio,
    };
  }),

  playTrack: (track, context, isAutoAdvance = false) => {
    const state = get();
    const activeAudio = getActiveAudio(state);
    const inactiveAudio = getInactiveAudio(state);
    const targetVolume = getTargetVolume(state);

    let newQueue = state.queue;
    let newIndex = state.queueIndex;

    const isExistingQueue = context && (
      context === state.queue || 
      (context.length === state.queue.length && context.every((t, i) => t.id === state.queue[i]?.id))
    );

    if (context && context.length > 0 && !isExistingQueue) {
      // Playing from a new context (e.g., album, playlist)
      if (state.shuffle) {
        // Save original context order before shuffling
        const originalIndex = context.findIndex(t => t.id === track.id);
        set({
          originalQueue: [...context],
          originalQueueIndex: originalIndex >= 0 ? originalIndex : 0,
        });
        
        // Put the clicked track at index 0, and shuffle all other tracks after it.
        // This ensures the clicked track plays first immediately and no random tracks 
        // are marked as completed before it.
        const otherTracks = context.filter(t => t.id !== track.id);
        newQueue = [track, ...shuffleArray(otherTracks)];
        newIndex = 0;
      } else {
        newQueue = context;
        // Clear any stored original queue since we're not shuffled
        set({ originalQueue: [], originalQueueIndex: -1 });
        newIndex = newQueue.findIndex(t => t.id === track.id);
        if (newIndex === -1) newIndex = 0;
      }
    } else {
      // Playing from existing queue
      const existingIndex = state.queue.findIndex(t => t.id === track.id);
      
      if (existingIndex !== -1 && existingIndex !== state.queueIndex) {
        // Track exists in queue but not currently playing
        if (state.shuffle) {
          // SHUFFLE MODE ON: Reorder so clicked track is next (sequential: 1/8 → 2/8 → 3/8)
          const currentTrack = state.queue[state.queueIndex];
          const clickedTrack = state.queue[existingIndex];
          const remaining = state.queue.filter((_, idx) => idx !== state.queueIndex && idx !== existingIndex);
          
          newQueue = [currentTrack, clickedTrack, ...remaining];
          newIndex = 1; // Clicked track is now at position 1 (right after current)
        } else {
          // SHUFFLE MODE OFF: Jump directly to the track's position (jumping: click #5 → 5/8)
          newIndex = existingIndex;
        }
      } else if (existingIndex === state.queueIndex) {
        // Already playing this track, just restart it
        newIndex = existingIndex;
      } else {
        // Track not in queue, add it as next
        newQueue = [track, ...state.queue];
        newIndex = 0;
      }
    }

    // #region debug-point A:play-track-entry
    reportTrackSwitchDebug('A', 'playTrack called', {
      fromTrackId: state.currentTrack?.id ?? null,
      toTrackId: track.id,
      queueLength: newQueue.length,
      newIndex,
      hasAudio: !!activeAudio,
      isFullscreen: state.isFullscreen,
    });
    // #endregion
    const history = state.currentTrack
      ? [state.currentTrack, ...state.history.slice(0, 49)]
      : state.history;

    const fadeDurationMs = isAutoAdvance ? state.autoFadeDuration * 1000 : state.manualFadeDuration * 1000;
    const shouldManualCrossfade =
      !isAutoAdvance &&
      state.manualFadeDuration > 0 &&
      state.isPlaying &&
      !!state.currentTrack &&
      state.currentTrack.id !== track.id &&
      !!activeAudio &&
      !!inactiveAudio;

    // #region debug-point A:play-track-branch
    reportTrackSwitchDebug('A', 'playTrack branch evaluation', {
      trackId: track.id,
      currentTrackId: state.currentTrack?.id ?? null,
      isAutoAdvance,
      manualFadeDuration: state.manualFadeDuration,
      autoFadeDuration: state.autoFadeDuration,
      fadeDurationMs,
      shouldManualCrossfade,
      isPlaying: state.isPlaying,
      activeSlot: state.activeAudioSlot,
      activeAudio: getAudioDebugSnapshot(activeAudio, 'active-playTrack'),
      inactiveAudio: getAudioDebugSnapshot(inactiveAudio, 'inactive-playTrack'),
    });
    // #endregion

    if (shouldManualCrossfade) {
      const nextSlot = getInactiveSlot(state.activeAudioSlot);
      performManualCrossfade(
        activeAudio,
        inactiveAudio,
        track,
        newIndex,
        newQueue,
        history,
        targetVolume,
        fadeDurationMs,
        nextSlot,
        (newState) => set(newState),
        () => performDirectTrackSwitch(
          activeAudio,
          inactiveAudio,
          track,
          newIndex,
          newQueue,
          history,
          targetVolume,
          0,
          state,
          (newState) => set(newState),
        )
      );
      return;
    }

    performDirectTrackSwitch(
      activeAudio,
      inactiveAudio,
      track,
      newIndex,
      newQueue,
      history,
      targetVolume,
      fadeDurationMs,
      state,
      (newState) => set(newState),
    );
  },

  handleTrackEnded: () => {
    const state = get();
    const { queue, queueIndex, repeat, isCrossfading } = state;
    const activeAudio = getActiveAudio(state);

    // #region debug-point C:handle-ended
    reportTrackSwitchDebug('C', 'handleTrackEnded called', {
      currentTrackId: state.currentTrack?.id ?? null,
      queueIndex,
      queueLength: queue.length,
      repeat,
      hasAudio: !!activeAudio,
      isCrossfading,
    });
    // #endregion
    if (isCrossfading && _pendingAutoAdvance) {
      const pending = _pendingAutoAdvance;
      _pendingAutoAdvance = null;
      clearCrossfadeAnimation();
      pending.activeAudio.pause();
      pending.activeAudio.currentTime = 0;
      pending.activeAudio.volume = clampAudioVolume(getTargetVolume(state));
      pending.inactiveAudio.volume = clampAudioVolume(getTargetVolume(state));

      set({
        currentTrack: pending.nextTrack,
        queue: pending.queue,
        queueIndex: pending.nextIndex,
        history: pending.history,
        progress: pending.inactiveAudio.duration
          ? (pending.inactiveAudio.currentTime / pending.inactiveAudio.duration) * 100
          : 0,
        currentTime: pending.inactiveAudio.currentTime || 0,
        duration: pending.inactiveAudio.duration || pending.nextTrack.duration || 0,
        isPlaying: true,
        isCrossfading: false,
        activeAudioSlot: pending.nextSlot,
        audioRef: pending.inactiveAudio,
      });
      return;
    }

    if (isCrossfading) return;
    if (queue.length === 0) {
      set({ isPlaying: false });
      return;
    }

    let nextIndex: number;
    if (repeat === 'one') {
      nextIndex = queueIndex;
    } else if (queueIndex < queue.length - 1) {
      nextIndex = queueIndex + 1;
    } else if (repeat === 'all') {
      nextIndex = 0;
    } else {
      resetAndStopAudio(activeAudio, state);
      set({ isPlaying: false });
      return;
    }

    get().playTrack(queue[nextIndex], queue, true);
  },

  maybeStartAutoCrossfade: () => {
    const state = get();
    const activeAudio = getActiveAudio(state);
    const inactiveAudio = getInactiveAudio(state);

    // Safety checks
    if (
      state.isCrossfading ||
      state.autoFadeDuration <= 0 ||
      !state.currentTrack ||
      !activeAudio ||
      !inactiveAudio ||
      !Number.isFinite(activeAudio.duration) ||
      activeAudio.duration <= 0
    ) {
      return;
    }

    const remaining = activeAudio.duration - activeAudio.currentTime;
    
    // Start crossfade when remaining time equals fade duration
    // Add small buffer (0.1s) to ensure smooth timing
    const shouldStartCrossfade = remaining <= state.autoFadeDuration && remaining > 0.1;
    
    if (!shouldStartCrossfade) {
      return;
    }

    const { queue, queueIndex, repeat } = state;
    let nextIndex: number | null = null;

    if (repeat === 'one') {
      nextIndex = queueIndex;
    } else if (queueIndex < queue.length - 1) {
      nextIndex = queueIndex + 1;
    } else if (repeat === 'all') {
      nextIndex = 0;
    }

    if (nextIndex === null || !queue[nextIndex]) {
      return;
    }

    const nextTrack = queue[nextIndex];
    const nextSlot = getInactiveSlot(state.activeAudioSlot);
    const history = state.currentTrack
      ? [state.currentTrack, ...state.history.slice(0, 49)]
      : state.history;

    reportTrackSwitchDebug('C', 'auto crossfade starting', {
      fromTrackId: state.currentTrack.id,
      toTrackId: nextTrack.id,
      remaining,
      durationSeconds: state.autoFadeDuration,
    });

    // Prepare next track
    clearCrossfadeAnimation();
    stopInactiveAudio(inactiveAudio);
    setAudioSource(inactiveAudio, nextTrack);
    inactiveAudio.currentTime = 0;
    inactiveAudio.volume = clampAudioVolume(0);

    // Preload next track
    inactiveAudio.load();
    
    // Start playing next track (muted initially)
    const playPromise = inactiveAudio.play();

    // Wait for play to start before beginning crossfade
    if (playPromise) {
      playPromise.then(() => {
        _pendingAutoAdvance = {
          nextTrack,
          nextIndex,
          queue,
          history,
          nextSlot,
          activeAudio,
          inactiveAudio,
        };

        // Keep the old track as the visible/current track until it really ends.
        set({
          isPlaying: true,
          isCrossfading: true,
        });

        // Start equal-power crossfade animation
        const targetVolume = getTargetVolume(get());
        const durationMs = state.autoFadeDuration * 1000;

        const startTime = performance.now();
        const startVolume = activeAudio.volume;

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(1, elapsed / durationMs);
          
          // Calculate equal-power gains
          const { fadeOut, fadeIn } = calculateEqualPowerGains(progress);
          
          // Apply volumes with equal-power curve
          activeAudio.volume = clampAudioVolume(startVolume * fadeOut);
          inactiveAudio.volume = clampAudioVolume(targetVolume * fadeIn);
          
          if (progress < 1) {
            scheduleCrossfadeStep(animate);
          } else {
            // Fade complete, but do not switch visible/current track yet.
            // The next audio keeps playing underneath until the old track fires "ended".
            clearCrossfadeAnimation();
            activeAudio.volume = clampAudioVolume(0);
            inactiveAudio.volume = clampAudioVolume(targetVolume);
            
            reportTrackSwitchDebug('C', 'auto crossfade audio overlap ready', {
              toTrackId: nextTrack.id,
              finalVolume: inactiveAudio.volume,
            });
          }
        };
        
        scheduleCrossfadeStep(animate);
      }).catch((err) => {
        console.error('Crossfade play failed, falling back to direct switch:', err);
        _pendingAutoAdvance = null;
        reportTrackSwitchDebug('C', 'auto crossfade fallback to direct switch', {
          toTrackId: nextTrack.id,
          error: err.message,
        });
        get().playTrack(nextTrack, queue, true);
      });
    }
  },

  togglePlay: () => {
    const state = get();
    const audio = getActiveAudio(state);
    const inactiveAudio = getInactiveAudio(state);
    if (!state.currentTrack) {
      // Play first track in queue
      if (state.queue.length > 0) {
        get().playTrack(state.queue[0], state.queue);
      }
      return;
    }
    if (state.isPlaying) {
      audio?.pause();
      inactiveAudio?.pause();
    } else {
      audio?.play().catch(() => {});
      if (_pendingAutoAdvance) {
        _pendingAutoAdvance.inactiveAudio.play().catch(() => {});
      }
    }
    set({ isPlaying: !state.isPlaying });
  },

  pause: () => {
    const state = get();
    clearCrossfadeAnimation();
    getActiveAudio(state)?.pause();
    getInactiveAudio(state)?.pause();
    set({ isPlaying: false, isCrossfading: false });
  },

  resume: () => {
    getActiveAudio(get())?.play().catch(() => {});
    if (_pendingAutoAdvance) {
      _pendingAutoAdvance.inactiveAudio.play().catch(() => {});
    }
    set({ isPlaying: true });
  },

  nextTrack: () => {
    const state = get();
    const { queue, queueIndex, repeat, manualFadeDuration } = state;
    if (queue.length === 0) return;

    let nextIndex: number;
    if (repeat === 'one') {
      nextIndex = queueIndex;
    } else if (queueIndex < queue.length - 1) {
      nextIndex = queueIndex + 1;
    } else if (repeat === 'all') {
      nextIndex = 0;
    } else {
      set({ isPlaying: false });
      return;
    }

    const nextTrack = queue[nextIndex];
    const activeAudio = getActiveAudio(state);
    const inactiveAudio = getInactiveAudio(state);
    
    // Use crossfade if manual fade duration is set and both audio elements exist
    if (manualFadeDuration > 0 && activeAudio && inactiveAudio && state.isPlaying) {
      const nextSlot = getInactiveSlot(state.activeAudioSlot);
      const history = state.currentTrack
        ? [state.currentTrack, ...state.history.slice(0, 49)]
        : state.history;
      const targetVolume = getTargetVolume(state);
      const durationMs = manualFadeDuration * 1000;
      
      performManualCrossfade(
        activeAudio,
        inactiveAudio,
        nextTrack,
        nextIndex,
        queue,
        history,
        targetVolume,
        durationMs,
        nextSlot,
        (newState) => set(newState),
        () => performDirectTrackSwitch(
          activeAudio,
          inactiveAudio,
          nextTrack,
          nextIndex,
          queue,
          history,
          targetVolume,
          0,
          state,
          (newState) => set(newState),
        )
      );
    } else {
      // No crossfade, use standard playTrack
      get().playTrack(nextTrack, queue);
    }
  },

  prevTrack: () => {
    const state = get();
    const { queue, queueIndex, currentTime, manualFadeDuration } = state;

    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      const audio = state.audioRef;
      if (audio) audio.currentTime = 0;
      set({ progress: 0, currentTime: 0 });
      return;
    }

    if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      const prevTrack = queue[prevIndex];
      const activeAudio = getActiveAudio(state);
      const inactiveAudio = getInactiveAudio(state);
      
      // Use crossfade if manual fade duration is set and both audio elements exist
      if (manualFadeDuration > 0 && activeAudio && inactiveAudio && state.isPlaying) {
        const nextSlot = getInactiveSlot(state.activeAudioSlot);
        const history = state.currentTrack
          ? [state.currentTrack, ...state.history.slice(0, 49)]
          : state.history;
        const targetVolume = getTargetVolume(state);
        const durationMs = manualFadeDuration * 1000;
        
        performManualCrossfade(
          activeAudio,
          inactiveAudio,
          prevTrack,
          prevIndex,
          queue,
          history,
          targetVolume,
          durationMs,
          nextSlot,
          (newState) => set(newState),
          () => performDirectTrackSwitch(
            activeAudio,
            inactiveAudio,
            prevTrack,
            prevIndex,
            queue,
            history,
            targetVolume,
            0,
            state,
            (newState) => set(newState),
          )
        );
      } else {
        // No crossfade, use standard playTrack
        get().playTrack(prevTrack, queue);
      }
    }
  },

  seekTo: (percent) => {
    const state = get();
    const audio = state.audioRef;
    if (audio && audio.duration) {
      audio.currentTime = (percent / 100) * audio.duration;
    }
    set({ progress: percent });
  },

  setVolume: (vol) => {
    const state = get();
    const audio = getActiveAudio(state);
    const inactiveAudio = getInactiveAudio(state);
    const nextVolume = clampAudioVolume(vol / 100);

    if (audio) audio.volume = nextVolume;
    if (state.isCrossfading && inactiveAudio) {
      inactiveAudio.volume = Math.min(inactiveAudio.volume, nextVolume);
    }

    set({ volume: vol, isMuted: vol === 0 });
  },

  toggleMute: () => {
    const state = get();
    const audio = getActiveAudio(state);
    if (state.isMuted) {
      if (audio) audio.volume = clampAudioVolume(state.volume / 100);
      set({ isMuted: false });
    } else {
      if (audio) audio.volume = clampAudioVolume(0);
      set({ isMuted: true });
    }
  },

  toggleShuffle: () => {
    const state = get();
    if (!state.shuffle) {
      // Turning shuffle ON: save original queue, then shuffle all other tracks
      const current = state.currentTrack;
      if (!current || state.queue.length === 0) {
        set({ shuffle: true });
        return;
      }

      // Filter out current track, shuffle all other tracks in the queue
      const otherTracks = state.queue.filter(t => t.id !== current.id);
      const shuffledOthers = shuffleArray(otherTracks);
      
      // Reconstruct: current track is at index 0 (very first), all others shuffled after it
      const newQueue = [current, ...shuffledOthers];
      
      set({
        shuffle: true,
        originalQueue: [...state.queue],
        originalQueueIndex: state.queueIndex,
        queue: newQueue,
        queueIndex: 0, // Set active index to 0
      });
    } else {
      // Turning shuffle OFF: restore original queue order
      const current = state.currentTrack;
      const origQueue = state.originalQueue;

      if (origQueue.length > 0 && current) {
        // Find where the currently-playing track sits in the original order
        const restoredIndex = origQueue.findIndex(t => t.id === current.id);
        set({
          shuffle: false,
          queue: origQueue,
          queueIndex: restoredIndex >= 0 ? restoredIndex : state.originalQueueIndex,
          originalQueue: [],
          originalQueueIndex: -1,
        });
      } else {
        set({ shuffle: false, originalQueue: [], originalQueueIndex: -1 });
      }
    }
  },

  cycleRepeat: () => {
    const state = get();
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIdx = modes.indexOf(state.repeat);
    set({ repeat: modes[(currentIdx + 1) % 3] });
  },

  setManualFadeDuration: (seconds) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('manualFadeDuration', seconds.toString());
    }
    set({ manualFadeDuration: seconds });
  },
  setAutoFadeDuration: (seconds) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoFadeDuration', seconds.toString());
    }
    set({ autoFadeDuration: seconds });
  },
  setFullscreenOpen: (value) => set({ isFullscreen: value, isFullscreenOpen: value }),
  toggleFullscreen: () => set(s => ({ isFullscreen: !s.isFullscreenOpen, isFullscreenOpen: !s.isFullscreenOpen })),
  toggleLyrics: () => set(s => ({ showLyrics: !s.showLyrics })),
  toggleQueue: () => set(s => ({ showQueue: !s.showQueue })),

  addToQueue: (track) => set(s => ({ queue: [...s.queue, track] })),
  playNext: (track) => set(s => {
    const newQueue = [...s.queue];
    // Insert after current track (queueIndex + 1)
    newQueue.splice(s.queueIndex + 1, 0, track);
    return { queue: newQueue };
  }),
  removeFromQueue: (index) => set(s => {
    const newQueue = s.queue.filter((_, i) => i !== index);
    const newIndex = index < s.queueIndex ? s.queueIndex - 1 : s.queueIndex;
    return { queue: newQueue, queueIndex: Math.min(newIndex, newQueue.length - 1) };
  }),
  clearQueue: () => set({ queue: [], queueIndex: -1 }),
  reorderQueue: (from, to) => set(s => {
    const newQueue = [...s.queue];
    const [moved] = newQueue.splice(from, 1);
    newQueue.splice(to, 0, moved);
    let newIndex = s.queueIndex;
    if (from === s.queueIndex) newIndex = to;
    else if (from < s.queueIndex && to >= s.queueIndex) newIndex--;
    else if (from > s.queueIndex && to <= s.queueIndex) newIndex++;
    return { queue: newQueue, queueIndex: newIndex };
  }),

  setProgress: (progress) => set({ progress }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  restoreLastPlayback: (tracks) => {
    const snapshot = readLastPlaybackSnapshot();
    if (!snapshot) return;

    const trackById = new Map(tracks.map((track) => [track.id, track]));
    const restoredTrack = trackById.get(snapshot.trackId) ?? snapshot.track;
    if (!restoredTrack) return;

    const snapshotQueueById = new Map((snapshot.queue || []).map((track) => [track.id, track]));
    const restoredQueue = snapshot.queueIds
      .map((id) => trackById.get(id))
      .map((track, index) => track ?? snapshotQueueById.get(snapshot.queueIds[index]))
      .filter((track): track is Track => Boolean(track));
    const queue = restoredQueue.length > 0 ? restoredQueue : [restoredTrack];
    const queueIndex = Math.max(0, queue.findIndex((track) => track.id === restoredTrack.id));
    const currentTime = Math.max(0, Math.min(snapshot.currentTime || 0, restoredTrack.duration || snapshot.currentTime || 0));
    const duration = restoredTrack.duration || 0;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const state = get();
    const activeAudio = getActiveAudio(state);
    const inactiveAudio = getInactiveAudio(state);

    clearCrossfadeAnimation();
    stopInactiveAudio(inactiveAudio);

    if (activeAudio) {
      setAudioSource(activeAudio, restoredTrack);
      activeAudio.currentTime = currentTime;
      activeAudio.volume = clampAudioVolume(getTargetVolume(state));
      activeAudio.pause();
    }

    set({
      currentTrack: restoredTrack,
      queue,
      queueIndex: queueIndex >= 0 ? queueIndex : 0,
      progress,
      currentTime,
      duration,
      isPlaying: false,
      isCrossfading: false,
      audioRef: activeAudio,
    });
  },
  
  resetPlaybackState: () => set({
    shuffle: false,
    repeat: 'off',
    isPlaying: false,
    isCrossfading: false,
    originalQueue: [],
    originalQueueIndex: -1,
  }),
}));

// Reset shuffle and repeat on page load/refresh
if (typeof window !== 'undefined') {
  usePlayerStore.subscribe((state) => {
    persistLastPlaybackSnapshot(state);
  });

  window.addEventListener('load', () => {
    usePlayerStore.getState().resetPlaybackState();
  });
  
  // Also reset on page show (handles back/forward cache)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      usePlayerStore.getState().resetPlaybackState();
    }
  });

  document.addEventListener('visibilitychange', () => {
    const state = usePlayerStore.getState();
    if (!state.currentTrack || !state.isPlaying) return;

    const activeAudio = getActiveAudio(state);
    const inactiveAudio = getInactiveAudio(state);
    const targetVolume = clampAudioVolume(getTargetVolume(state));

    if (!state.isCrossfading && activeAudio && activeAudio.volume < targetVolume) {
      clearCrossfadeAnimation();
      activeAudio.volume = targetVolume;
      activeAudio.play().catch(() => {});
      stopInactiveAudio(inactiveAudio);
      usePlayerStore.setState({ isCrossfading: false, audioRef: activeAudio });
    }
  });
}
