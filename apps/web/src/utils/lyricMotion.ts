import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentLyricIndex, type LyricLine } from './lrcParser';
import { isMobileDevice } from './performanceOptimizations';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smootherstep(progress: number) {
  const t = clamp(progress, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function getContinuousLyricFocus(lyrics: LyricLine[], currentTime: number) {
  if (lyrics.length === 0) return -1;
  if (lyrics.length === 1) return 0;

  // Before the first lyric: stay pinned at position 0
  if (currentTime <= lyrics[0].time) return 0;

  const currentIndex = getCurrentLyricIndex(lyrics, currentTime);
  if (currentIndex < 0) return 0;
  if (currentIndex >= lyrics.length - 1) return lyrics.length - 1;

  const currentLine = lyrics[currentIndex];
  const nextLine = lyrics[currentIndex + 1];
  const gap = Math.max(0.001, nextLine.time - currentLine.time);

  const transitionLeadTime = Math.min(0.55, gap * 0.35);
  const timeUntilNext = nextLine.time - currentTime;

  if (timeUntilNext > transitionLeadTime) return currentIndex;

  const transitionProgress = clamp(1 - (timeUntilNext / transitionLeadTime), 0, 1);
  return currentIndex + smootherstep(transitionProgress);
}

// ---------------------------------------------------------------------------
// Single shared rAF ticker — avoids N concurrent animation loops
// ---------------------------------------------------------------------------
type TickCallback = (dt: number, now: number) => void;
const REACT_MOTION_UPDATE_MS = 1000 / 30;
const MOBILE_MOTION_FRAME_MS = 1000 / 60;
const _subscribers = new Set<TickCallback>();
let _rafId = 0;
let _frameTimer: ReturnType<typeof setTimeout> | null = null;
let _lastTime = 0;

function scheduleNextTick() {
  if (_subscribers.size === 0) {
    _rafId = 0;
    _lastTime = 0;
    return;
  }
  if (isMobileDevice()) {
    // Mark the timer as a pending frame so a second subscriber cannot start
    // another animation loop before this one reaches requestAnimationFrame.
    _rafId = -1;
    _frameTimer = setTimeout(() => {
      _frameTimer = null;
      if (_subscribers.size > 0) {
        _rafId = requestAnimationFrame(_tick);
      } else {
        _rafId = 0;
        _lastTime = 0;
      }
    }, MOBILE_MOTION_FRAME_MS);
  } else {
    _rafId = requestAnimationFrame(_tick);
  }
}

function _tick(now: number) {
  const dt = _lastTime > 0 ? clamp((now - _lastTime) / 1000, 0.001, 0.032) : 0.016;
  _lastTime = now;
  _subscribers.forEach(cb => cb(dt, now));
  scheduleNextTick();
}

function subscribeTick(cb: TickCallback) {
  _subscribers.add(cb);
  if (_rafId === 0) {
    _lastTime = 0;
    scheduleNextTick();
  }
}

function unsubscribeTick(cb: TickCallback) {
  _subscribers.delete(cb);
  if (_subscribers.size === 0) {
    if (_frameTimer !== null) clearTimeout(_frameTimer);
    _frameTimer = null;
    if (_rafId > 0) cancelAnimationFrame(_rafId);
    _rafId = 0;
    _lastTime = 0;
  }
}

// ---------------------------------------------------------------------------
// Fluid playback time — extrapolates audio currentTime between store updates
// ---------------------------------------------------------------------------
export function useFluidPlaybackTime(currentTime: number, isPlaying: boolean) {
  const [displayTime, setDisplayTime] = useState(currentTime);
  const state = useRef({
    value: currentTime,
    reportedTime: currentTime,
    reportedAt: performance.now(),
    isPlaying,
  });

  // Sync reported time whenever store updates
  useEffect(() => {
    const now = performance.now();
    const jumped = Math.abs(currentTime - state.current.value) > 0.9;
    state.current.reportedTime = currentTime;
    state.current.reportedAt = now;
    state.current.isPlaying = isPlaying;
    if (!isPlaying || jumped) {
      state.current.value = currentTime;
      setDisplayTime(currentTime);
    }
  }, [currentTime, isPlaying]);

  useEffect(() => {
    let lastRenderAt = 0;
    const tick: TickCallback = (_dt, now) => {
      const s = state.current;
      if (!s.isPlaying) return;
      const extrapolated = s.reportedTime + (now - s.reportedAt) / 1000;
      const jumped = Math.abs(extrapolated - s.value) > 0.9;
      if (jumped) {
        s.value = extrapolated;
      } else {
        // Lightweight linear catch-up — no heavy spring needed here
        s.value += (extrapolated - s.value) * 0.12;
      }
      const updateInterval = isMobileDevice() ? 1000 / 20 : REACT_MOTION_UPDATE_MS;
      if (now - lastRenderAt >= updateInterval) {
        lastRenderAt = now;
        setDisplayTime(s.value);
      }
    };
    if (!isPlaying) return;
    subscribeTick(tick);
    return () => unsubscribeTick(tick);
  }, [isPlaying]);

  return displayTime;
}

// ---------------------------------------------------------------------------
// Spring value — settles automatically, no wasted frames after rest
// ---------------------------------------------------------------------------
export function useMomentumValue(
  targetValue: number,
  options: {
    stiffness?: number;
    damping?: number;
    precision?: number;
    immediate?: boolean;
    maxVelocity?: number;
    snapThreshold?: number;
  } = {}
) {
  const {
    stiffness = 34,
    damping = 13,
    precision = 0.002,
    immediate = false,
    maxVelocity = Number.POSITIVE_INFINITY,
    snapThreshold = Number.POSITIVE_INFINITY,
  } = options;

  const [value, setValue] = useState(targetValue);
  const spring = useRef({ value: targetValue, velocity: 0, target: targetValue, settled: true });
  const optsRef = useRef({ stiffness, damping, precision, immediate, maxVelocity, snapThreshold });

  // Keep latest opts accessible inside the tick without re-subscribing
  useEffect(() => {
    optsRef.current = { stiffness, damping, precision, immediate, maxVelocity, snapThreshold };
  });

  useEffect(() => {
    spring.current.target = targetValue;
    const s = spring.current;
    const jumped = Math.abs(targetValue - s.value) > optsRef.current.snapThreshold;
    if (optsRef.current.immediate || jumped || !Number.isFinite(s.value)) {
      s.value = targetValue;
      s.velocity = 0;
      s.settled = true;
      setValue(targetValue);
    } else {
      s.settled = false;
    }
  }, [targetValue, immediate, snapThreshold]);

  useEffect(() => {
    if (spring.current.settled || immediate) return;
    let lastRenderAt = 0;
    const tick: TickCallback = (dt, now) => {
      const s = spring.current;
      const o = optsRef.current;
      if (s.settled || o.immediate) return;

      const distance = s.target - s.value;
      const adaptiveDamping = o.damping + Math.min(Math.abs(distance) * 6, o.damping * 0.8);
      const accel = distance * o.stiffness - s.velocity * adaptiveDamping;

      s.velocity += accel * dt;
      s.velocity = clamp(s.velocity, -o.maxVelocity, o.maxVelocity);
      s.velocity *= Math.exp(-dt * 1.1);
      s.value += s.velocity * dt;

      if (Math.abs(distance) < o.precision && Math.abs(s.velocity) < o.precision) {
        s.value = s.target;
        s.velocity = 0;
        s.settled = true;
        unsubscribeTick(tick);
      }

      const updateInterval = isMobileDevice() ? 1000 / 20 : REACT_MOTION_UPDATE_MS;
      if (s.settled || now - lastRenderAt >= updateInterval) {
        lastRenderAt = now;
        setValue(s.value);
      }
    };
    subscribeTick(tick);
    return () => unsubscribeTick(tick);
  }, [targetValue, immediate]);

  return value;
}

// ---------------------------------------------------------------------------
// Fluid lyric motion — combines playback time + two springs
// ---------------------------------------------------------------------------
export function useFluidLyricMotion(
  lyrics: LyricLine[],
  currentTime: number,
  isPlaying: boolean,
  options: {
    stiffness?: number;
    damping?: number;
    precision?: number;
    maxVelocity?: number;
    snapThreshold?: number;
  } = {}
) {
  const fluidTime = useFluidPlaybackTime(currentTime, isPlaying);

  const targetFocus = useMemo(
    () => getContinuousLyricFocus(lyrics, fluidTime),
    [lyrics, fluidTime]
  );

  const focusPosition = useMomentumValue(targetFocus, {
    stiffness: options.stiffness ?? 120,
    damping: options.damping ?? 45,
    precision: options.precision ?? 0.005,
    maxVelocity: options.maxVelocity ?? 20,
    snapThreshold: options.snapThreshold ?? 4,
    immediate: !isPlaying,
  });

  // Active lyric index — raw currentTime, 70ms vocal attack lead
  const activeLyricIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;
    const vocalTime = currentTime + 0.07;
    if (vocalTime < lyrics[0].time) return -1;
    return getCurrentLyricIndex(lyrics, vocalTime);
  }, [lyrics, currentTime]);

  const centeredFocusPosition = useMomentumValue(
    activeLyricIndex < 0 ? 0 : activeLyricIndex,
    {
      stiffness: options.stiffness ?? 175,
      damping: options.damping ?? 48,
      precision: options.precision ?? 0.005,
      maxVelocity: options.maxVelocity ?? 28,
      snapThreshold: options.snapThreshold ?? 3,
      immediate: !isPlaying,
    }
  );

  return { fluidTime, focusPosition, centeredFocusPosition, activeLyricIndex };
}
