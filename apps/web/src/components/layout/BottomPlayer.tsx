import { usePlayerStore } from '../../stores/playerStore';
import { useLocalLibraryStore } from '../../stores/localLibraryStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUIStore } from '../../stores/uiStore';
import DevicesMenu from './DevicesMenu';
import { formatDuration } from '../../utils/formatters';
import { RiShuffleLine, RiSkipBackFill, RiPlayFill, RiPauseFill, RiSkipForwardFill, RiRepeatLine, RiRepeat2Line, RiRepeatOneLine, RiVolumeUpLine, RiVolumeMuteLine, RiPlayList2Line, RiMusic2Line, RiFullscreenLine, RiComputerLine, RiHeartLine, RiHeartFill } from 'react-icons/ri';
import { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhoneLayout } from '../../hooks/usePhoneLayout';
import { shallow } from 'zustand/shallow';
import AudioReactiveBars from '../ui/AudioReactiveBars';
import { connectLocalAudioForVisualization } from '../../utils/audioVisualizer';
import { isMobileDevice } from '../../utils/performanceOptimizations';
import { usePerformance } from '../../hooks/usePerformance';

export const bottomPlayerCoverRef: { current: HTMLElement | null } = { current: null };

// #region debug-point E:audio-event-reporter
const reportAudioEventDebug = (_hypothesisId: string, _msg: string, _data: Record<string, unknown> = {}) => {};
// #endregion

function MiniProgressTrack({ gradientColor1, gradientColor2 }: { gradientColor1: string; gradientColor2: string }) {
  const progress = usePlayerStore((state) => state.progress);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const seekAt = useCallback((clientX: number) => {
    const element = progressBarRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) return;
    seekTo(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, [seekTo]);

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    seekAt(event.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (event: MouseEvent) => seekAt(event.clientX);
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, seekAt]);

  return (
    <div
      ref={progressBarRef}
      className="mini-player-progress-track md:hidden"
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => !isDragging && setIsHovering(false)}
      onTouchStart={(event) => {
        setIsDragging(true);
        seekAt(event.touches[0].clientX);
      }}
      onTouchMove={(event) => {
        if (isDragging) seekAt(event.touches[0].clientX);
      }}
      onTouchEnd={() => setIsDragging(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: isHovering || isDragging ? '5px' : '3px',
        cursor: 'pointer',
        transition: 'height 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'rgba(255, 255, 255, 0.06)',
        borderRadius: '3px 3px 0 0',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`,
        background: `linear-gradient(90deg, ${gradientColor1}, ${gradientColor2})`,
        borderRadius: 'inherit', transition: isDragging ? 'none' : 'width 0.15s linear',
      }} />
      <div style={{
        position: 'absolute', top: '-3px', left: `${progress}%`, width: '8px', height: '8px',
        borderRadius: '50%', background: gradientColor1, boxShadow: `0 0 10px ${gradientColor1}`,
        transform: 'translateX(-50%)', opacity: isHovering || isDragging ? 1 : 0,
        transition: 'opacity 0.2s ease', pointerEvents: 'none',
      }} />
    </div>
  );
}

function DesktopProgressTrack({ gradientColor1, gradientColor2 }: { gradientColor1: string; gradientColor2: string }) {
  const { progress, currentTime, duration, seekTo } = usePlayerStore((state) => ({
    progress: state.progress,
    currentTime: state.currentTime,
    duration: state.duration,
    seekTo: state.seekTo,
  }), shallow);

  return (
    <div className="flex w-full items-center gap-2.5 mt-1" style={{ maxWidth: '480px' }}>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums', minWidth: '36px', textAlign: 'right', lineHeight: '1' }}>
        {formatDuration(Math.floor(currentTime))}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={progress}
        onChange={(event) => seekTo(Number(event.target.value))}
        className="accent-track h-1 flex-1 m-0 cursor-pointer block"
        style={{
          '--progress': `${progress}%`,
          background: `linear-gradient(90deg, ${gradientColor1} 0%, ${gradientColor2} ${progress}%, rgba(255,255,255,0.12) ${progress}%)`,
        } as React.CSSProperties}
      />
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums', minWidth: '36px', lineHeight: '1' }}>
        {formatDuration(Math.floor(duration))}
      </span>
    </div>
  );
}

export default function BottomPlayer() {
  const navigate = useNavigate();
  const primaryAudioRef = useRef<HTMLAudioElement>(null);
  const secondaryAudioRef = useRef<HTMLAudioElement>(null);
  
  const {
    currentTrack, isPlaying, volume, isMuted, shuffle, repeat, showLyrics, showQueue,
    setAudioRefs, togglePlay, nextTrack, prevTrack, setVolume, toggleMute,
    toggleShuffle, cycleRepeat, setShowLyrics, setShowQueue, setFullscreenOpen,
    setPlaybackPosition, setDuration, handleTrackEnded, maybeStartAutoCrossfade,
  } = usePlayerStore((state) => ({
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    volume: state.volume,
    isMuted: state.isMuted,
    shuffle: state.shuffle,
    repeat: state.repeat,
    showLyrics: state.showLyrics,
    showQueue: state.showQueue,
    setAudioRefs: state.setAudioRefs,
    togglePlay: state.togglePlay,
    nextTrack: state.nextTrack,
    prevTrack: state.prevTrack,
    setVolume: state.setVolume,
    toggleMute: state.toggleMute,
    toggleShuffle: state.toggleShuffle,
    cycleRepeat: state.cycleRepeat,
    setShowLyrics: state.setShowLyrics,
    setShowQueue: state.setShowQueue,
    setFullscreenOpen: state.setFullscreenOpen,
    setPlaybackPosition: state.setPlaybackPosition,
    setDuration: state.setDuration,
    handleTrackEnded: state.handleTrackEnded,
    maybeStartAutoCrossfade: state.maybeStartAutoCrossfade,
  }), shallow);

  const { likedTrackIds, toggleLike } = useLibraryStore();
  const { rightPanelView, setRightPanel } = useUIStore();

  const isLiked = currentTrack ? likedTrackIds.has(currentTrack.id) : false;
  const [showDevicesMenu, setShowDevicesMenu] = useState(false);
  const performanceSettings = usePerformance();

  const isQueueActive = showQueue && rightPanelView === 'queue';
  const isLyricsActive = showLyrics && rightPanelView === 'lyrics';

  const handleQueueTab = useCallback(() => {
    if (window.innerWidth < 1280) {
      navigate('/queue');
      return;
    }
    if (isQueueActive) {
      setShowQueue(false);
      setRightPanel('hidden');
    } else {
      setShowQueue(true);
      setShowLyrics(false);
      setRightPanel('queue');
    }
  }, [isQueueActive, navigate, setShowQueue, setShowLyrics, setRightPanel]);

  const handleLyricsTab = useCallback(() => {
    if (window.innerWidth < 1280) {
      setShowLyrics(true);
      setShowQueue(false);
      setFullscreenOpen(true);
      return;
    }
    if (isLyricsActive) {
      setShowLyrics(false);
      setRightPanel('hidden');
    } else {
      setShowLyrics(true);
      setShowQueue(false);
      setRightPanel('lyrics');
    }
  }, [isLyricsActive, setShowLyrics, setShowQueue, setRightPanel, setFullscreenOpen]);

  const titleContainerRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
  const isPhoneLayout = usePhoneLayout();
  const [showDesktopProgress, setShowDesktopProgress] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const update = () => setShowDesktopProgress(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    const checkOverflow = () => {
      if (titleContainerRef.current && titleTextRef.current) {
        setIsTitleOverflowing(titleTextRef.current.scrollWidth > titleContainerRef.current.clientWidth);
      }
    };
    
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [currentTrack?.title]);

  // Register audio refs once. Volume changes are handled by playerStore.setVolume,
  // because the active slot can switch between the two audio elements during crossfade.
  useEffect(() => {
    if (primaryAudioRef.current && secondaryAudioRef.current) {
      setAudioRefs(primaryAudioRef.current, secondaryAudioRef.current);
      primaryAudioRef.current.volume = usePlayerStore.getState().volume / 100;
      secondaryAudioRef.current.volume = 0;
    }
  }, [setAudioRefs]);

  // Attach the analyzer lazily to a currently playing local file. The normal
  // player stays on its existing route for sources that may require external CORS.
  useEffect(() => {
    const activeAudio = usePlayerStore.getState().audioRef;
    if (!activeAudio) return;
    // The actual element URL is authoritative; restored track metadata can lack
    // the original Blob even though the audio element still has a blob URL.
    void connectLocalAudioForVisualization([activeAudio]);
  }, [currentTrack?.id, currentTrack?.isLocal, currentTrack?.blob, isPlaying]);

  // Audio event handlers
  useEffect(() => {
    const audios = [primaryAudioRef.current, secondaryAudioRef.current].filter(Boolean) as HTMLAudioElement[];
    if (audios.length === 0) return;

    let clockTimeout: number | null = null;
    let lastReportedSec = -1;
    const syncIntervalMs = isMobileDevice() ? 100 : 50;
    const minPositionDelta = syncIntervalMs / 1000;

    const syncHighPrecisionTime = () => {
      clockTimeout = null;
      const state = usePlayerStore.getState();
      const activeAudio = state.audioRef;
      if (!activeAudio || activeAudio.paused || activeAudio.ended || !activeAudio.duration) return;

      const cur = activeAudio.currentTime;
      if (Math.abs(cur - lastReportedSec) >= minPositionDelta) {
        lastReportedSec = cur;
        setPlaybackPosition(cur, activeAudio.duration);
      }
      state.maybeStartAutoCrossfade();
      clockTimeout = window.setTimeout(syncHighPrecisionTime, syncIntervalMs);
    };

    const startHighPrecisionClock = () => {
      if (clockTimeout === null) {
        clockTimeout = window.setTimeout(syncHighPrecisionTime, syncIntervalMs);
      }
    };

    const cleanups = audios.map((audio) => {
      const getAudioPayload = (eventName: string) => {
        const state = usePlayerStore.getState();
        return {
          eventName,
          currentTrackId: state.currentTrack?.id ?? null,
          audioIsActiveRef: audio === state.audioRef,
          activeAudioSlot: state.activeAudioSlot,
          isPlaying: state.isPlaying,
          isCrossfading: state.isCrossfading,
          currentSrc: audio.currentSrc,
          paused: audio.paused,
          currentTime: audio.currentTime,
          duration: audio.duration,
          readyState: audio.readyState,
          networkState: audio.networkState,
          volume: audio.volume,
        };
      };

      const handleTimeUpdate = () => {
        const state = usePlayerStore.getState();
        if (audio !== state.audioRef) return;
        if (audio.duration) {
          if (Math.abs(audio.currentTime - lastReportedSec) >= minPositionDelta) {
            lastReportedSec = audio.currentTime;
            setPlaybackPosition(audio.currentTime, audio.duration);
          }
          state.maybeStartAutoCrossfade();
        }
      };

      const handleLoadedMetadata = () => {
        const state = usePlayerStore.getState();
        if (audio !== state.audioRef) return;

        // #region debug-point E:audio-loadedmetadata
        reportAudioEventDebug('E', 'audio loadedmetadata', getAudioPayload('loadedmetadata'));
        // #endregion

        setDuration(audio.duration);

        // Auto-repair 0:00 track duration bug
        if (state.currentTrack?.isLocal && state.currentTrack.duration === 0 && audio.duration > 0) {
          useLocalLibraryStore.getState().updateTrackDuration(state.currentTrack.id, Math.round(audio.duration));
        }
      };

      const handleEnded = () => {
        const state = usePlayerStore.getState();
        if (audio !== state.audioRef) return;
        // #region debug-point E:audio-ended
        reportAudioEventDebug('E', 'audio ended', getAudioPayload('ended'));
        // #endregion
        handleTrackEnded();
      };

      const handlePlay = () => {
        // #region debug-point E:audio-play
        reportAudioEventDebug('E', 'audio play', getAudioPayload('play'));
        // #endregion
        if (audio === usePlayerStore.getState().audioRef) startHighPrecisionClock();
      };

      const handlePlaying = () => {
        // #region debug-point E:audio-playing
        reportAudioEventDebug('E', 'audio playing', getAudioPayload('playing'));
        // #endregion
        if (audio === usePlayerStore.getState().audioRef) startHighPrecisionClock();
      };

      const handlePause = () => {
        // #region debug-point E:audio-pause
        reportAudioEventDebug('E', 'audio pause', getAudioPayload('pause'));
        // #endregion
        if (audio === usePlayerStore.getState().audioRef && clockTimeout !== null) {
          window.clearTimeout(clockTimeout);
          clockTimeout = null;
        }
      };

      const handleStalled = () => {
        // #region debug-point E:audio-stalled
        reportAudioEventDebug('E', 'audio stalled', getAudioPayload('stalled'));
        // #endregion
      };

      const handleWaiting = () => {
        // #region debug-point E:audio-waiting
        reportAudioEventDebug('E', 'audio waiting', getAudioPayload('waiting'));
        // #endregion
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('playing', handlePlaying);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('stalled', handleStalled);
      audio.addEventListener('waiting', handleWaiting);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('stalled', handleStalled);
        audio.removeEventListener('waiting', handleWaiting);
      };
    });

    // Keep the precise playback clock active only while audio is actually playing.
    if (usePlayerStore.getState().audioRef && !usePlayerStore.getState().audioRef?.paused) {
      startHighPrecisionClock();
    }

    return () => {
      if (clockTimeout !== null) window.clearTimeout(clockTimeout);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [handleTrackEnded, maybeStartAutoCrossfade, setPlaybackPosition, setDuration]);

  const repeatIcon = repeat === 'one' ? RiRepeatOneLine : repeat === 'all' ? RiRepeat2Line : RiRepeatLine;
  const RepeatIcon = repeatIcon;

  const openFullscreenPlayer = () => {
    if (!currentTrack) return;
    
    // Get the mini player cover element
    const miniCover = bottomPlayerCoverRef.current;
    if (!miniCover) {
      setFullscreenOpen(true);
      return;
    }

    // Get mini cover position
    const miniRect = miniCover.getBoundingClientRect();
    
    // Store the position for the fullscreen player to use
    (window as any).__miniPlayerCoverRect = {
      top: miniRect.top,
      left: miniRect.left,
      width: miniRect.width,
      height: miniRect.height,
    };
    
    setFullscreenOpen(true);
  };

  const handleTogglePlay = () => {
    const state = usePlayerStore.getState();
    if (state.audioRef) {
      // Call resume synchronously inside the user's play gesture so browsers
      // don't leave the Web Audio analyzer suspended.
      void connectLocalAudioForVisualization([state.audioRef]);
    }
    togglePlay();
  };

  // Gradient colors from the current track for ambient glow
  const gradientColor1 = currentTrack?.coverGradient?.[0] || 'var(--gradient-from)';
  const gradientColor2 = currentTrack?.coverGradient?.[1] || 'var(--gradient-to)';

  return (
    <>
      <audio ref={primaryAudioRef} preload="auto" />
      <audio ref={secondaryAudioRef} preload="auto" />
      <footer
        className={`mini-player-root fixed bottom-0 left-0 right-0 z-40 ${isPhoneLayout ? 'layout-phone' : ''}`}
      >
        {/* Main floating card */}
        <div
          className={`mini-player-card relative overflow-hidden ${isPhoneLayout ? 'layout-phone' : ''}`}
        >
          {/* Ambient glow behind card */}
          {currentTrack && performanceSettings.enableBlur && (
            <div
              className="absolute -inset-2 -z-10 opacity-30 blur-3xl"
              style={{
                background: `radial-gradient(ellipse at 30% 50%, ${gradientColor1}40, transparent 60%),
                             radial-gradient(ellipse at 70% 50%, ${gradientColor2}30, transparent 60%)`,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* ─── Interactive Progress Bar (top edge) ─── */}
          <MiniProgressTrack gradientColor1={gradientColor1} gradientColor2={gradientColor2} />

          {/* ─── Player Content ─── */}
          <div
            className="flex items-center justify-between w-full md:grid md:grid-cols-[1fr_auto_1fr]"
            style={{
              padding: isPhoneLayout ? '6px 10px 6px 10px' : '8px 16px 8px 16px',
              gap: isPhoneLayout ? '10px' : '16px',
            }}
          >
            {/* ─── Left: Album Art + Track Info ─── */}
            <div className="flex min-w-0 items-center gap-3 justify-start overflow-hidden">
              {currentTrack ? (
                <>
                  {/* Album Cover with ambient glow */}
                  <div className="relative shrink-0 group/cover">
                    {/* Subtle glow behind cover */}
                    {performanceSettings.enableBlur && <div
                      className="absolute -inset-1 rounded-2xl opacity-40 blur-md transition-opacity duration-500 group-hover/cover:opacity-60"
                      style={{
                        background: `linear-gradient(135deg, ${gradientColor1}, ${gradientColor2})`,
                        pointerEvents: 'none',
                      }}
                    />}
                    {currentTrack.coverUrl ? (
                      <img
                        ref={(node) => { bottomPlayerCoverRef.current = node; }}
                        src={currentTrack.coverUrl.startsWith('/') ? `http://localhost:3001${currentTrack.coverUrl}` : currentTrack.coverUrl}
                        alt={currentTrack.title}
                        className="relative cursor-pointer object-cover transition-all duration-300 group-hover/cover:scale-105"
                        style={{
                          width: isPhoneLayout ? '40px' : '48px',
                          height: isPhoneLayout ? '40px' : '48px',
                          borderRadius: '12px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        }}
                        onClick={openFullscreenPlayer}
                      />
                    ) : (
                      <div
                        ref={(node) => { bottomPlayerCoverRef.current = node; }}
                        className="relative flex items-center justify-center cursor-pointer transition-all duration-300 group-hover/cover:scale-105"
                        style={{
                          width: isPhoneLayout ? '40px' : '48px',
                          height: isPhoneLayout ? '40px' : '48px',
                          borderRadius: '12px',
                          background: `linear-gradient(135deg, ${gradientColor1}, ${gradientColor2})`,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        }}
                        onClick={openFullscreenPlayer}
                      >
                        <RiMusic2Line size={20} className="text-white/70" />
                      </div>
                    )}

                    {/* Cover art is kept completely clean */}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden" ref={titleContainerRef}>
                    {/* Track Title */}
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={openFullscreenPlayer}
                        className={`text-left min-w-0 hover:text-white transition-colors duration-200 ${isTitleOverflowing ? 'marquee-container-mask overflow-hidden' : 'truncate'}`}
                        style={{
                          fontSize: isPhoneLayout ? '12px' : '13.5px',
                          fontWeight: 650,
                          letterSpacing: '-0.015em',
                          color: 'rgba(255,255,255,0.95)',
                        }}
                      >
                        <div className={`whitespace-nowrap ${isTitleOverflowing ? 'animate-marquee inline-block' : 'truncate'}`}>
                          <span ref={titleTextRef} className={isTitleOverflowing ? 'pr-8' : ''}>
                            {currentTrack.title}
                          </span>
                          {isTitleOverflowing && (
                            <span className="pr-8" aria-hidden="true">
                              {currentTrack.title}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Equalizer when playing */}
                      {isPlaying && (
                        <AudioReactiveBars isActive={isPlaying} className="shrink-0 pointer-events-none" />
                      )}
                    </div>

                    {/* Artist & Album */}
                    <div
                      className="truncate text-left flex items-center gap-1.5 text-white/50 leading-snug mt-0.5"
                      style={{ fontSize: isPhoneLayout ? '11px' : '12px' }}
                    >
                      <button
                        onClick={() => navigate(`/artist/${currentTrack.artistId}`)}
                        className="hover:text-white/80 hover:underline truncate transition-colors duration-200 shrink-0 max-w-[60%]"
                      >
                        {currentTrack.artist}
                      </button>
                      {currentTrack.album && (
                        <>
                          <span className="text-white/25 shrink-0">•</span>
                          <span className="truncate text-white/40">
                            {currentTrack.album}
                          </span>
                        </>
                      )}
                    </div>
                  </div>


                  {/* Like button - visible on mobile */}
                  <button
                    onClick={() => currentTrack && toggleLike(currentTrack.id)}
                    className="shrink-0 md:hidden flex items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                    style={{
                      width: '32px',
                      height: '32px',
                    }}
                    aria-label={isLiked ? 'Unlike' : 'Like'}
                  >
                    {isLiked ? (
                      <RiHeartFill size={18} className="text-accent" />
                    ) : (
                      <RiHeartLine size={18} style={{ color: 'rgba(255,255,255,0.45)' }} />
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Empty state */}
                  <div
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: isPhoneLayout ? '40px' : '48px',
                      height: isPhoneLayout ? '40px' : '48px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <RiMusic2Line size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>No track playing</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>Select a song to start</div>
                  </div>
                </>
              )}
            </div>

            {/* ─── Center: Desktop Transport Controls ─── */}
            <div className="hidden md:flex flex-col items-center justify-center w-[360px] lg:w-[440px] xl:w-[480px] max-w-full mx-auto">
              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleShuffle}
                  className="mini-ctrl-btn relative rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] active:scale-90 flex flex-col items-center justify-center"
                  style={{ color: shuffle ? 'var(--accent)' : 'rgba(255,255,255,0.5)' }}
                  aria-label="Toggle shuffle"
                >
                  <RiShuffleLine size={16} />
                  {shuffle && (
                    <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent shadow-[0_0_4px_rgba(var(--gradient-from-rgb,6,182,212),0.6)]" />
                  )}
                </button>
                <button
                  onClick={prevTrack}
                  className="mini-ctrl-btn rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] active:scale-90"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  aria-label="Previous track"
                >
                  <RiSkipBackFill size={20} />
                </button>

                {/* Play/Pause - hero button */}
                <button
                  onClick={handleTogglePlay}
                  className="mini-play-btn flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#0a0a0a',
                    boxShadow: '0 4px 14px rgba(255,255,255,0.2)',
                    margin: '0 4px',
                  }}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <RiPauseFill size={20} /> : <RiPlayFill size={20} className="ml-[2px]" />}
                </button>

                <button
                  onClick={nextTrack}
                  className="mini-ctrl-btn rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] active:scale-90"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  aria-label="Next track"
                >
                  <RiSkipForwardFill size={20} />
                </button>
                <button
                  onClick={cycleRepeat}
                  className="mini-ctrl-btn relative rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] active:scale-90 flex flex-col items-center justify-center"
                  style={{ color: repeat !== 'off' ? 'var(--accent)' : 'rgba(255,255,255,0.5)' }}
                  aria-label="Toggle repeat"
                >
                  <RepeatIcon size={16} />
                  {repeat !== 'off' && (
                    <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent shadow-[0_0_4px_rgba(var(--gradient-from-rgb,6,182,212),0.6)]" />
                  )}
                </button>
              </div>

              {/* Time + Progress */}
              {showDesktopProgress && <DesktopProgressTrack gradientColor1={gradientColor1} gradientColor2={gradientColor2} />}
            </div>

            {/* ─── Mobile: Compact Controls ─── */}
            <div className="flex items-center md:hidden" style={{ gap: isPhoneLayout ? '0' : '2px' }}>
              <button
                onClick={prevTrack}
                className="rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                style={{
                  width: isPhoneLayout ? '36px' : '38px',
                  height: isPhoneLayout ? '36px' : '38px',
                  color: 'rgba(255,255,255,0.65)',
                }}
                aria-label="Previous track"
              >
                <RiSkipBackFill size={isPhoneLayout ? 18 : 20} />
              </button>

              {/* Mobile play/pause hero button */}
              <button
                onClick={handleTogglePlay}
                className="flex items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                style={{
                  width: isPhoneLayout ? '42px' : '44px',
                  height: isPhoneLayout ? '42px' : '44px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#0a0a0a',
                  boxShadow: '0 2px 12px rgba(255,255,255,0.1)',
                  margin: '0 2px',
                }}
                aria-label={isPlaying ? 'Pause playback' : 'Play track'}
              >
                {isPlaying ? (
                  <RiPauseFill size={isPhoneLayout ? 20 : 22} />
                ) : (
                  <RiPlayFill size={isPhoneLayout ? 20 : 22} className="ml-[2px]" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                style={{
                  width: isPhoneLayout ? '36px' : '38px',
                  height: isPhoneLayout ? '36px' : '38px',
                  color: 'rgba(255,255,255,0.65)',
                }}
                aria-label="Next track"
              >
                <RiSkipForwardFill size={isPhoneLayout ? 18 : 20} />
              </button>
            </div>

            {/* ─── Right: Desktop extras ─── */}
            <div className="hidden md:flex items-center justify-end gap-1.5 lg:gap-2 xl:gap-2.5 min-w-0">
              <button
                onClick={() => currentTrack && toggleLike(currentTrack.id)}
                className="rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] active:scale-90"
                style={{ color: isLiked ? 'var(--accent)' : 'rgba(255,255,255,0.45)' }}
                aria-label={isLiked ? 'Unlike' : 'Like'}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                {isLiked ? <RiHeartFill size={16} className="text-accent" /> : <RiHeartLine size={16} />}
              </button>
              <button
                onClick={handleQueueTab}
                className="mini-ctrl-btn relative rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] active:scale-90 flex flex-col items-center justify-center"
                style={{ color: isQueueActive ? 'var(--accent)' : 'rgba(255,255,255,0.45)' }}
                aria-label="Queue"
                title="Queue"
              >
                <RiPlayList2Line size={16} />
                {isQueueActive && (
                  <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent shadow-[0_0_4px_rgba(var(--gradient-from-rgb,6,182,212),0.6)]" />
                )}
              </button>
              <button
                onClick={handleLyricsTab}
                className="mini-ctrl-btn relative rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] active:scale-90 flex flex-col items-center justify-center"
                style={{ color: isLyricsActive ? 'var(--accent)' : 'rgba(255,255,255,0.45)' }}
                aria-label="Lyrics"
                title="Lyrics"
              >
                <RiMusic2Line size={16} />
                {isLyricsActive && (
                  <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent shadow-[0_0_4px_rgba(var(--gradient-from-rgb,6,182,212),0.6)]" />
                )}
              </button>
              <div className="relative flex items-center">
                <button
                  onClick={() => setShowDevicesMenu(!showDevicesMenu)}
                  className="mini-ctrl-btn relative rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] active:scale-90 flex flex-col items-center justify-center"
                  style={{ color: showDevicesMenu ? 'var(--accent)' : 'rgba(255,255,255,0.45)' }}
                  aria-label="Connect to a device"
                  title="Connect to a device"
                >
                  <RiComputerLine size={16} />
                  {showDevicesMenu && (
                    <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent shadow-[0_0_4px_rgba(var(--gradient-from-rgb,6,182,212),0.6)]" />
                  )}
                </button>
                <DevicesMenu
                  isOpen={showDevicesMenu}
                  onClose={() => setShowDevicesMenu(false)}
                  onOpenFullscreen={openFullscreenPlayer}
                />
              </div>

              {/* Volume cluster */}
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={toggleMute}
                  className="rounded-full p-1.5 transition-all duration-200 hover:bg-white/[0.06] active:scale-90"
                  style={{ color: isMuted || volume === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)' }}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  title={isMuted ? 'Unmute' : `Volume: ${volume}%`}
                >
                  {isMuted || volume === 0 ? <RiVolumeMuteLine size={16} /> : <RiVolumeUpLine size={16} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="accent-alt-track h-1"
                  style={{
                    '--progress': `${isMuted ? 0 : volume}%`,
                    width: '88px',
                  } as React.CSSProperties}
                  aria-label="Volume"
                  title={`Volume: ${isMuted ? 0 : volume}%`}
                />
              </div>

              <button
                onClick={openFullscreenPlayer}
                className="rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] hover:text-white active:scale-90"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                aria-label="Fullscreen"
                title="Fullscreen"
              >
                <RiFullscreenLine size={16} />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
