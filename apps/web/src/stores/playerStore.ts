import { create } from 'zustand';
import { Track } from '../types';

type AudioSlot = 0 | 1;

const _blobUrlByAudio = new WeakMap<HTMLAudioElement, string>();
let _crossfadeAnimationFrame: number | null = null;
let _crossfadeStartTime: number | null = null;

// #region debug-point A:reporter
const reportTrackSwitchDebug = (hypothesisId: string, msg: string, data: Record<string, unknown> = {}) => {
  fetch('http://127.0.0.1:7777/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'track-switch-delay',
      runId: 'pre-fix',
      hypothesisId,
      location: 'playerStore.ts',
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion

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
  _crossfadeStartTime = null;
}

function getTargetVolume(state: Pick<PlayerState, 'volume' | 'isMuted'>) {
  return state.isMuted ? 0 : state.volume / 100;
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
  audio.volume = getTargetVolume(state);
  audio.pause();
  audio.currentTime = 0;
}

function stopInactiveAudio(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0;
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
  audio.volume = 0;
  
  // Start playback
  audio.play().catch((err) => {
    console.error('Failed to play audio:', err);
  });

  // Instant volume if no fade duration
  if (targetVolume <= 0 || durationMs <= 0) {
    audio.volume = targetVolume;
    return;
  }

  const startTime = performance.now();
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    
    // Use sine curve for smooth fade-in (equal-power)
    const gain = Math.sin(progress * Math.PI * 0.5);
    audio.volume = targetVolume * gain;
    
    if (progress < 1) {
      _crossfadeAnimationFrame = requestAnimationFrame(animate);
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
  
  _crossfadeAnimationFrame = requestAnimationFrame(animate);
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
  setState: (state: Partial<PlayerState>) => void
) {
  // Prepare next track
  clearCrossfadeAnimation();
  setAudioSource(inactiveAudio, nextTrack);
  inactiveAudio.currentTime = 0;
  inactiveAudio.volume = 0;
  
  // Preload and start playing
  inactiveAudio.load();
  
  const playPromise = inactiveAudio.play().catch((err) => {
    console.error('Manual crossfade failed:', err);
  });
  
  if (playPromise && durationMs > 0) {
    playPromise.then(() => {
      // Update state immediately
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
        activeAudio.volume = Math.max(0, startVolume * fadeOut);
        inactiveAudio.volume = targetVolume * fadeIn;
        
        if (progress < 1) {
          _crossfadeAnimationFrame = requestAnimationFrame(animate);
        } else {
          // Crossfade complete
          clearCrossfadeAnimation();
          activeAudio.pause();
          activeAudio.currentTime = 0;
          activeAudio.volume = targetVolume;
          inactiveAudio.volume = targetVolume;
          
          setState({ isCrossfading: false });
        }
      };
      
      _crossfadeAnimationFrame = requestAnimationFrame(animate);
    });
  } else {
    // No crossfade, instant switch
    activeAudio.pause();
    activeAudio.currentTime = 0;
    
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
    
    inactiveAudio.volume = targetVolume;
  }
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
  history: [],

  shuffle: false,
  repeat: 'off',
  manualFadeDuration: 0,
  autoFadeDuration: 6,

  isFullscreen: false,
  isFullscreenOpen: false,
  showLyrics: false,
  showQueue: true,

  primaryAudioRef: null,
  secondaryAudioRef: null,
  audioRef: null,
  activeAudioSlot: 0,
  isCrossfading: false,

  setAudioRefs: (primary, secondary) => set((state) => ({
    primaryAudioRef: primary,
    secondaryAudioRef: secondary,
    audioRef: state.activeAudioSlot === 0 ? primary : secondary,
  })),

  playTrack: (track, context, isAutoAdvance = false) => {
    const state = get();
    const audio = getActiveAudio(state);
    const inactiveAudio = getInactiveAudio(state);
    const targetVolume = getTargetVolume(state);

    let newQueue = state.queue;
    let newIndex = state.queueIndex;

    if (context && context.length > 0) {
      // Playing from a new context (e.g., album, playlist)
      newQueue = state.shuffle ? shuffleArray(context) : context;
      newIndex = newQueue.findIndex(t => t.id === track.id);
      if (newIndex === -1) newIndex = 0;
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
      hasAudio: !!audio,
      isFullscreen: state.isFullscreen,
    });
    // #endregion
    if (audio) {
      clearCrossfadeAnimation();
      resetAndStopAudio(audio, state);
      stopInactiveAudio(inactiveAudio);
      setAudioSource(audio, track);
    }

    const history = state.currentTrack
      ? [state.currentTrack, ...state.history.slice(0, 49)]
      : state.history;

    set({
      currentTrack: track,
      isPlaying: true,
      progress: 0,
      currentTime: 0,
      queue: newQueue,
      queueIndex: newIndex,
      history,
      isCrossfading: false,
      audioRef: audio,
    });

    const fadeDurationMs = isAutoAdvance ? state.autoFadeDuration * 1000 : state.manualFadeDuration * 1000;
    fadeInAudio(audio, targetVolume, fadeDurationMs);
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
    inactiveAudio.volume = 0;

    // Preload next track
    inactiveAudio.load();
    
    // Start playing next track (muted initially)
    const playPromise = inactiveAudio.play().catch((err) => {
      console.error('Crossfade play failed, falling back to direct switch:', err);
      reportTrackSwitchDebug('C', 'auto crossfade fallback to direct switch', {
        toTrackId: nextTrack.id,
        error: err.message,
      });
      get().playTrack(nextTrack, queue, true);
    });

    // Wait for play to start before beginning crossfade
    if (playPromise) {
      playPromise.then(() => {
        // Update state
        set({
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
          activeAudio.volume = Math.max(0, startVolume * fadeOut);
          inactiveAudio.volume = targetVolume * fadeIn;
          
          if (progress < 1) {
            _crossfadeAnimationFrame = requestAnimationFrame(animate);
          } else {
            // Crossfade complete
            clearCrossfadeAnimation();
            activeAudio.pause();
            activeAudio.currentTime = 0;
            activeAudio.volume = targetVolume;
            inactiveAudio.volume = targetVolume;
            
            set({ isCrossfading: false });
            
            reportTrackSwitchDebug('C', 'auto crossfade complete', {
              toTrackId: nextTrack.id,
              finalVolume: inactiveAudio.volume,
            });
          }
        };
        
        _crossfadeAnimationFrame = requestAnimationFrame(animate);
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
        (newState) => set(newState)
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
          (newState) => set(newState)
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
    const audio = getActiveAudio(get());
    if (audio) audio.volume = vol / 100;
    set({ volume: vol, isMuted: vol === 0 });
  },

  toggleMute: () => {
    const state = get();
    const audio = getActiveAudio(state);
    if (state.isMuted) {
      if (audio) audio.volume = state.volume / 100;
      set({ isMuted: false });
    } else {
      if (audio) audio.volume = 0;
      set({ isMuted: true });
    }
  },

  toggleShuffle: () => {
    const state = get();
    if (!state.shuffle) {
      const current = state.queue[state.queueIndex];
      const rest = state.queue.filter((_, i) => i !== state.queueIndex);
      const shuffled = [current, ...shuffleArray(rest)];
      set({ shuffle: true, queue: shuffled, queueIndex: 0 });
    } else {
      set({ shuffle: false });
    }
  },

  cycleRepeat: () => {
    const state = get();
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIdx = modes.indexOf(state.repeat);
    set({ repeat: modes[(currentIdx + 1) % 3] });
  },

  setManualFadeDuration: (seconds) => set({ manualFadeDuration: seconds }),
  setAutoFadeDuration: (seconds) => set({ autoFadeDuration: seconds }),
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
}));
