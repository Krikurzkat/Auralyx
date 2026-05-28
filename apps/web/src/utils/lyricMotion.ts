import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentLyricIndex, type LyricLine } from './lrcParser';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mix(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function smootherstep(progress: number) {
  const t = clamp(progress, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function softenLyricProgress(progress: number, gap: number) {
  const easedProgress = smootherstep(progress);
  const easeWeight = gap < 1 ? 0.35 : gap > 3.5 ? 0.48 : 0.58;

  return mix(progress, easedProgress, easeWeight);
}

function getContinuousLyricFocus(lyrics: LyricLine[], currentTime: number) {
  if (lyrics.length === 0) return -1;
  if (lyrics.length === 1) return 0;

  if (currentTime <= lyrics[0].time) {
    const leadInDuration = Math.max(lyrics[0].time, 0.001);
    const leadInProgress = smootherstep(clamp(currentTime / leadInDuration, 0, 1));
    return mix(-0.35, 0, leadInProgress);
  }

  const currentIndex = getCurrentLyricIndex(lyrics, currentTime);
  if (currentIndex < 0) return 0;
  if (currentIndex >= lyrics.length - 1) return lyrics.length - 1;

  const currentLine = lyrics[currentIndex];
  const nextLine = lyrics[currentIndex + 1];
  const gap = Math.max(0.001, nextLine.time - currentLine.time);
  const rawProgress = clamp((currentTime - currentLine.time) / gap, 0, 1);
  const easedProgress = softenLyricProgress(rawProgress, gap);

  return currentIndex + easedProgress;
}

export function useFluidPlaybackTime(currentTime: number, isPlaying: boolean) {
  const [displayTime, setDisplayTime] = useState(currentTime);
  const motionRef = useRef({
    value: currentTime,
    velocity: 0,
    reportedTime: currentTime,
    reportedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
  });

  useEffect(() => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const distance = currentTime - motionRef.current.value;

    motionRef.current.reportedTime = currentTime;
    motionRef.current.reportedAt = now;

    if (!isPlaying || Math.abs(distance) > 0.9 || !Number.isFinite(motionRef.current.value)) {
      motionRef.current.value = currentTime;
      motionRef.current.velocity = 0;
      setDisplayTime(currentTime);
    }
  }, [currentTime, isPlaying]);

  useEffect(() => {
    let frameId = 0;
    let lastFrameAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const step = (frameAt: number) => {
      const state = motionRef.current;
      const deltaSeconds = clamp((frameAt - lastFrameAt) / 1000, 0.001, 0.032);
      lastFrameAt = frameAt;

      const extrapolatedTime = isPlaying
        ? state.reportedTime + Math.max(0, (frameAt - state.reportedAt) / 1000)
        : state.reportedTime;
      const distance = extrapolatedTime - state.value;

      // Instantly snap to the target time if paused or if the distance is too large (seeking)
      if (!isPlaying || Math.abs(distance) > 0.9) {
        state.value = extrapolatedTime;
        state.velocity = 0;
      } else {
        const stiffness = isPlaying ? 36 : 24;
        const damping = 12 + Math.min(Math.abs(distance) * 26, 18);
        const acceleration = distance * stiffness - state.velocity * damping;

        state.velocity += acceleration * deltaSeconds;
        state.velocity *= Math.exp(-deltaSeconds * 1.25);
        state.value += state.velocity * deltaSeconds;

      }

      setDisplayTime(state.value);
      if (isPlaying) {
        frameId = window.requestAnimationFrame(step);
      }
    };

    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying]);

  return displayTime;
}

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
    precision = 0.0005,
    immediate = false,
    maxVelocity = Number.POSITIVE_INFINITY,
    snapThreshold = Number.POSITIVE_INFINITY,
  } = options;
  const [value, setValue] = useState(targetValue);
  const motionRef = useRef({
    value: targetValue,
    velocity: 0,
    target: targetValue,
  });

  useEffect(() => {
    motionRef.current.target = targetValue;
    const shouldSnap = Math.abs(targetValue - motionRef.current.value) > snapThreshold;

    if (immediate || shouldSnap || !Number.isFinite(motionRef.current.value)) {
      motionRef.current.value = targetValue;
      motionRef.current.velocity = 0;
      setValue(targetValue);
    }
  }, [immediate, snapThreshold, targetValue]);

  useEffect(() => {
    let frameId = 0;
    let lastFrameAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const step = (frameAt: number) => {
      const state = motionRef.current;
      
      if (immediate) {
        state.value = state.target;
        state.velocity = 0;
        setValue(state.value);
        return;
      }

      const deltaSeconds = clamp((frameAt - lastFrameAt) / 1000, 0.001, 0.032);
      lastFrameAt = frameAt;

      const distance = state.target - state.value;
      const adaptiveDamping = damping + Math.min(Math.abs(distance) * 8, damping * 0.9);
      const acceleration = distance * stiffness - state.velocity * adaptiveDamping;

      state.velocity += acceleration * deltaSeconds;
      state.velocity = clamp(state.velocity, -maxVelocity, maxVelocity);
      state.velocity *= Math.exp(-deltaSeconds * 1.1);
      state.value += state.velocity * deltaSeconds;

      if (Math.abs(distance) < precision && Math.abs(state.velocity) < precision) {
        state.value = state.target;
        state.velocity = 0;
      }

      setValue(state.value);
      if (!immediate) {
        frameId = window.requestAnimationFrame(step);
      }
    };

    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [damping, immediate, maxVelocity, precision, stiffness]);

  return value;
}

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
  const targetFocus = useMemo(() => getContinuousLyricFocus(lyrics, fluidTime), [lyrics, fluidTime]);
  const focusPosition = useMomentumValue(targetFocus, {
    stiffness: options.stiffness ?? 42,
    damping: options.damping ?? 17,
    precision: options.precision ?? 0.0004,
    maxVelocity: options.maxVelocity ?? 4.5,
    snapThreshold: options.snapThreshold ?? 4,
    immediate: !isPlaying,
  });

  const activeLyricIndex = useMemo(() => getCurrentLyricIndex(lyrics, fluidTime), [lyrics, fluidTime]);

  return {
    fluidTime,
    focusPosition,
    activeLyricIndex,
  };
}
