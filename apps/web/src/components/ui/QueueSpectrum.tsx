import { useEffect, useRef } from 'react';
import {
  connectLocalAudioForVisualization,
  readAudioWaveform,
  subscribeAudioSpectrum,
} from '../../utils/audioVisualizer';

interface QueueSpectrumProps {
  isActive: boolean;
  audioRef: HTMLAudioElement | null;
}

const BAR_COUNT = 128;
const FRAME_INTERVAL_MS = 1000 / 30;
const WAVEFORM_SMOOTHING = 0.24;

export default function QueueSpectrum({ isActive, audioRef }: QueueSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rawWaveformRef = useRef<number[]>(Array(BAR_COUNT).fill(0));
  const waveformRef = useRef<number[]>(Array(BAR_COUNT).fill(0));

  useEffect(() => {
    if (!isActive) return;
    if (audioRef) void connectLocalAudioForVisualization([audioRef]);
    return subscribeAudioSpectrum();
  }, [audioRef, isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let width = 0;
    let height = 0;
    let frameId = 0;
    let frameTimer: number | null = null;
    let gradient: CanvasGradient | null = null;

    const resize = () => {
      const pixelRatio = 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#fb7185');
      gradient.addColorStop(0.2, '#d946ef');
      gradient.addColorStop(0.4, '#8b5cf6');
      gradient.addColorStop(0.58, '#22d3ee');
      gradient.addColorStop(0.76, '#4ade80');
      gradient.addColorStop(0.9, '#facc15');
      gradient.addColorStop(1, '#a78bfa');
      if (!isActive) requestDraw();
    };

    const draw = () => {
      frameId = 0;
      const rawWaveform = rawWaveformRef.current;
      const waveform = waveformRef.current;
      if (!isActive) {
        rawWaveform.fill(0);
        waveform.fill(0);
      } else if (!readAudioWaveform(rawWaveform)) {
        rawWaveform.fill(0);
      }

      // Smooth the captured audio samples across the curve and across frames.
      for (let index = 0; index < BAR_COUNT; index += 1) {
        const previous = rawWaveform[Math.max(0, index - 1)];
        const current = rawWaveform[index];
        const next = rawWaveform[Math.min(BAR_COUNT - 1, index + 1)];
        const spatiallySmoothed = previous * 0.22 + current * 0.56 + next * 0.22;
        waveform[index] = waveform[index] * (1 - WAVEFORM_SMOOTHING) + spatiallySmoothed * WAVEFORM_SMOOTHING;
      }

      context.clearRect(0, 0, width, height);
      if (gradient) context.strokeStyle = gradient;
      context.shadowBlur = 0;

      const centerY = height / 2;
      // Draw one flowing waveform around the center baseline.
      const pointAt = (index: number) => {
        const sample = isActive ? waveform[index] / 100 : 0;
        const amplitude = Math.max(-1, Math.min(1, sample * 1.1));
        return {
          x: (index / (BAR_COUNT - 1)) * width,
          y: centerY - amplitude * height * 0.44,
        };
      };

      const firstPoint = pointAt(0);
      context.beginPath();
      context.moveTo(firstPoint.x, firstPoint.y);
      for (let index = 1; index < BAR_COUNT - 1; index += 1) {
        const point = pointAt(index);
        const nextPoint = pointAt(index + 1);
        context.quadraticCurveTo(point.x, point.y, (point.x + nextPoint.x) / 2, (point.y + nextPoint.y) / 2);
      }
      const lastPoint = pointAt(BAR_COUNT - 1);
      context.lineTo(lastPoint.x, lastPoint.y);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = 1.4;
      context.globalAlpha = isActive ? 0.88 : 0.24;
      context.stroke();

      // Keep a fine center beam so the waveform remains centered visually.
      context.globalAlpha = isActive ? 0.22 : 0.12;
      context.shadowBlur = 0;
      context.fillStyle = gradient || '#a855f7';
      context.fillRect(0, centerY - 0.5, width, 1);

      context.globalAlpha = 1;
      context.shadowBlur = 0;

      if (isActive && !document.hidden) {
        frameTimer = window.setTimeout(() => {
          frameTimer = null;
          if (!document.hidden && frameId === 0) frameId = requestAnimationFrame(draw);
        }, FRAME_INTERVAL_MS);
      }
    };

    const requestDraw = () => {
      if (!document.hidden && frameId === 0 && frameTimer === null) {
        frameId = requestAnimationFrame(draw);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = 0;
        if (frameTimer !== null) window.clearTimeout(frameTimer);
        frameTimer = null;
      } else {
        requestDraw();
      }
    };

    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);
    if (!observer) window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    requestDraw();

    return () => {
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (frameId) cancelAnimationFrame(frameId);
      if (frameTimer !== null) window.clearTimeout(frameTimer);
    };
  }, [isActive]);

  return (
    <div
      className="relative h-8 w-[128px] shrink-0"
      role="img"
      aria-label={isActive ? 'Live audio waveform' : 'Audio waveform paused'}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
    </div>
  );
}
