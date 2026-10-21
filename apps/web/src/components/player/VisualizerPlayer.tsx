import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { formatDuration } from '../../utils/formatters';
import { useEffect, useState, useRef } from 'react';
import {
  RiArrowLeftLine,
  RiSkipBackFill,
  RiPlayFill,
  RiPauseFill,
  RiSkipForwardFill,
  RiHeartLine,
  RiHeartFill,
  RiShuffleLine,
  RiRepeatLine,
  RiRepeat2Line,
  RiRepeatOneLine,
  RiEqualizerLine,
  RiPulseLine,
  RiSoundModuleLine,
} from 'react-icons/ri';
import { shallow } from 'zustand/shallow';
import {
  connectLocalAudioForVisualization,
  readAudioSpectrum,
  subscribeAudioSpectrum,
} from '../../utils/audioVisualizer';
import { isMobileDevice } from '../../utils/performanceOptimizations';

type VisualizerMode = 'bars' | 'wave' | 'circular';

interface VisualizerPlayerProps {
  onClose: () => void;
}

export default function VisualizerPlayer({ onClose }: VisualizerPlayerProps) {
  const {
    currentTrack,
    audioRef,
    isPlaying,
    shuffle,
    repeat,
    togglePlay,
    nextTrack,
    prevTrack,
    toggleShuffle,
    cycleRepeat,
  } = usePlayerStore((state) => ({
    currentTrack: state.currentTrack,
    audioRef: state.audioRef,
    isPlaying: state.isPlaying,
    shuffle: state.shuffle,
    repeat: state.repeat,
    togglePlay: state.togglePlay,
    nextTrack: state.nextTrack,
    prevTrack: state.prevTrack,
    toggleShuffle: state.toggleShuffle,
    cycleRepeat: state.cycleRepeat,
  }), shallow);

  const { likedTrackIds, toggleLike } = useLibraryStore();

  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('bars');
  const mobilePerformanceMode = isMobileDevice();
  const audioDataRef = useRef<number[]>(Array(mobilePerformanceMode ? 32 : 48).fill(0));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const isLiked = currentTrack ? likedTrackIds.has(currentTrack.id) : false;
  const RepeatIcon = repeat === 'one' ? RiRepeatOneLine : repeat === 'all' ? RiRepeat2Line : RiRepeatLine;

  // Keep the canvas connected even when the small player indicators are hidden.
  useEffect(() => {
    if (!audioRef) return;
    void connectLocalAudioForVisualization([audioRef]);
  }, [currentTrack?.id, currentTrack?.isLocal, currentTrack?.blob, audioRef, isPlaying]);

  // The shared sampler refreshes the FFT buffer once for both the canvas and UI bars.
  useEffect(() => {
    if (!isPlaying) return;
    return subscribeAudioSpectrum();
  }, [isPlaying]);

  // Canvas visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let barGradient: CanvasGradient;
    let waveGradient: CanvasGradient;
    let circularGradient: CanvasGradient;

    const resize = () => {
      // This large canvas is a backdrop; rendering above native CSS resolution
      // costs a lot of fill work without improving the visible spectrum.
      const pixelRatio = 1;
      canvas.width = canvas.offsetWidth * pixelRatio;
      canvas.height = canvas.offsetHeight * pixelRatio;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      barGradient = ctx.createLinearGradient(0, height, 0, 0);
      barGradient.addColorStop(0, '#E8470A');
      barGradient.addColorStop(0.5, '#FF6B35');
      barGradient.addColorStop(1, '#FFB627');
      waveGradient = ctx.createLinearGradient(0, 0, width, 0);
      waveGradient.addColorStop(0, '#E8470A');
      waveGradient.addColorStop(0.5, '#FF6B35');
      waveGradient.addColorStop(1, '#FFB627');
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.3;
      circularGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.5);
      circularGradient.addColorStop(0, '#E8470A');
      circularGradient.addColorStop(0.5, '#FF6B35');
      circularGradient.addColorStop(1, '#FFB627');
    };

    resize();
    const frameIntervalMs = mobilePerformanceMode ? 1000 / 20 : 1000 / 30;
    let frameTimer: number | null = null;
    let draw = (_frameAt: number) => {};
    const scheduleNextFrame = () => {
      if (!isPlaying || document.hidden || frameTimer !== null) return;
      frameTimer = window.setTimeout(() => {
        frameTimer = null;
        if (!document.hidden && animationRef.current === null) {
          animationRef.current = requestAnimationFrame(draw);
        }
      }, frameIntervalMs);
    };
    draw = (_frameAt: number) => {
      animationRef.current = null;
      if (!isPlaying || !readAudioSpectrum(audioDataRef.current)) {
        audioDataRef.current.fill(0);
      }
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      ctx.clearRect(0, 0, width, height);

      if (visualizerMode === 'bars') {
        drawBars(ctx, width, height, barGradient);
      } else if (visualizerMode === 'wave') {
        drawWave(ctx, width, height, waveGradient);
      } else if (visualizerMode === 'circular') {
        drawCircular(ctx, width, height, circularGradient);
      }

      scheduleNextFrame();
    };

    const startDrawing = () => {
      if (animationRef.current === null && frameTimer === null) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };
    const handleResize = () => {
      resize();
      if (!isPlaying) startDrawing();
    };
    const handleVisibility = () => {
      if (document.hidden) {
        if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        if (frameTimer !== null) window.clearTimeout(frameTimer);
        frameTimer = null;
      } else {
        startDrawing();
      }
    };
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    if (!document.hidden) startDrawing();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = null;
      if (frameTimer !== null) window.clearTimeout(frameTimer);
    };
  }, [visualizerMode, isPlaying, mobilePerformanceMode]);

  const drawBars = (ctx: CanvasRenderingContext2D, width: number, height: number, gradient: CanvasGradient) => {
    const audioData = audioDataRef.current;
    const barCount = audioData.length;
    const barWidth = width / barCount;
    audioData.forEach((value, i) => {
      const barHeight = (value / 100) * height * 0.8;
      const x = i * barWidth;
      const y = height - barHeight;

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - 2, barHeight);

      // Reflection
      ctx.globalAlpha = 0.2;
      ctx.fillRect(x, height, barWidth - 2, -barHeight * 0.3);
      ctx.globalAlpha = 1;
    });
  };

  const drawWave = (ctx: CanvasRenderingContext2D, width: number, height: number, gradient: CanvasGradient) => {
    const audioData = audioDataRef.current;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const sliceWidth = width / audioData.length;

    audioData.forEach((value, i) => {
      const x = i * sliceWidth;
      const y = height / 2 + ((value - 50) / 100) * height * 0.4;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Second wave (offset)
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    audioData.forEach((value, i) => {
      const x = i * sliceWidth;
      const y = height / 2 + ((value - 50) / 100) * height * 0.3 + 20;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const drawCircular = (ctx: CanvasRenderingContext2D, width: number, height: number, gradient: CanvasGradient) => {
    const audioData = audioDataRef.current;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;

    audioData.forEach((value, i) => {
      const angle = (i / audioData.length) * Math.PI * 2 - Math.PI / 2;
      const barHeight = (value / 100) * radius * 0.8;

      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Inner circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(232, 71, 10, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  if (!currentTrack) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <p className="text-white/70">No track currently playing</p>
      </div>
    );
  }

  const coverUrl = currentTrack.coverUrl?.startsWith('/')
    ? `http://localhost:3001${currentTrack.coverUrl}`
    : currentTrack.coverUrl;

  return (
    <div className="fixed inset-0 z-50 flex h-screen flex-col justify-between overflow-hidden bg-gradient-to-b from-[#0A0A0C] via-[#121216] to-[#050506] text-white">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-6">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/95 shadow-md backdrop-blur-md transition hover:bg-white/10 active:scale-95"
          aria-label="Exit visualizer"
        >
          <RiArrowLeftLine size={20} />
          <span>Exit Visualizer</span>
        </button>

        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-black/30 p-1 backdrop-blur-md">
          <button
            onClick={() => setVisualizerMode('bars')}
            className={`rounded-full p-2.5 transition active:scale-90 ${
              visualizerMode === 'bars'
                ? 'bg-accent text-white shadow-glow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            aria-label="Bar visualizer"
          >
            <RiEqualizerLine size={18} />
          </button>
          <button
            onClick={() => setVisualizerMode('wave')}
            className={`rounded-full p-2.5 transition active:scale-90 ${
              visualizerMode === 'wave'
                ? 'bg-accent text-white shadow-glow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            aria-label="Wave visualizer"
          >
            <RiPulseLine size={18} />
          </button>
          <button
            onClick={() => setVisualizerMode('circular')}
            className={`rounded-full p-2.5 transition active:scale-90 ${
              visualizerMode === 'circular'
                ? 'bg-accent text-white shadow-glow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            aria-label="Circular visualizer"
          >
            <RiSoundModuleLine size={18} />
          </button>
        </div>
      </div>

      {/* Visualizer Canvas Area (flex-1 and min-h-0 prevents container overflow) */}
      <div className="flex flex-1 min-h-0 items-center justify-center p-6">
        <canvas
          ref={canvasRef}
          className="h-full w-full rounded-2xl bg-black/10 border border-white/5 shadow-inner"
          style={{ maxWidth: '1000px', maxHeight: '420px' }}
        />
      </div>

      {/* Player Controls Panel */}
      <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-10">
        <div className="mx-auto max-w-4xl">
          {/* Track Details Row */}
          <div className="mb-5 flex items-center gap-4">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-lg">
              {coverUrl ? (
                <img src={coverUrl} alt={currentTrack.title} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, ${currentTrack.coverGradient?.[0] || '#333'}, ${currentTrack.coverGradient?.[1] || '#222'})`,
                  }}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="truncate text-lg font-bold text-white">{currentTrack.title}</h1>
              <p className="truncate text-sm font-medium text-white/60">{currentTrack.artist}</p>
            </div>

            <button
              onClick={() => toggleLike(currentTrack.id)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white/80 transition hover:bg-white/10 active:scale-95"
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              {isLiked ? <RiHeartFill size={22} className="text-accent" /> : <RiHeartLine size={22} />}
            </button>
          </div>

          <VisualizerProgress />

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleShuffle}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 ${
                  shuffle ? 'bg-accent/15 text-accent border border-accent/20' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
                aria-label="Toggle shuffle"
              >
                <RiShuffleLine size={20} />
              </button>
              <button
                onClick={cycleRepeat}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 ${
                  repeat !== 'off' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
                aria-label="Toggle repeat"
              >
                <RepeatIcon size={20} />
              </button>
            </div>

            <div className="flex items-center gap-5">
              <button
                onClick={prevTrack}
                className="flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition hover:bg-white/5 active:scale-90"
                aria-label="Previous track"
              >
                <RiSkipBackFill size={26} />
              </button>

              <button
                onClick={togglePlay}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/25 transition hover:scale-105 active:scale-95"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <RiPauseFill size={32} /> : <RiPlayFill size={32} className="ml-1" />}
              </button>

              <button
                onClick={nextTrack}
                className="flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition hover:bg-white/5 active:scale-90"
                aria-label="Next track"
              >
                <RiSkipForwardFill size={26} />
              </button>
            </div>

            {/* Spacer to balance items */}
            <div className="w-20" />
          </div>
        </div>
      </div>

    </div>
  );
}

function VisualizerProgress() {
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    seekTo(percent * duration);
  };

  return (
    <div className="mb-5">
      <div
        onClick={handleSeek}
        className="group relative h-1.5 cursor-pointer rounded-full bg-white/10 transition-all hover:h-2"
      >
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${progressPercent}%`,
            background: `linear-gradient(to right, var(--gradient-from), var(--gradient-to))`,
          }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs font-semibold text-white/40">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  );
}
