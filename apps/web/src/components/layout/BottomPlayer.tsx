import { usePlayerStore } from '../../stores/playerStore';
import { useLocalLibraryStore } from '../../stores/localLibraryStore';
import { formatDuration } from '../../utils/formatters';
import { RiShuffleLine, RiSkipBackFill, RiPlayFill, RiPauseFill, RiSkipForwardFill, RiRepeatLine, RiRepeat2Line, RiRepeatOneLine, RiVolumeUpLine, RiVolumeMuteLine, RiPlayList2Line, RiMusic2Line, RiFullscreenLine, RiComputerLine, RiHeartLine, RiHeartFill } from 'react-icons/ri';
import { useEffect, useRef, useState, useLayoutEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGalaxyS8PlusLayout } from '../../hooks/useGalaxyS8PlusLayout';
import { usePerformance } from '../../hooks/usePerformance';

export const bottomPlayerCoverRef: { current: HTMLElement | null } = { current: null };

// #region debug-point E:audio-event-reporter
const reportAudioEventDebug = (_hypothesisId: string, _msg: string, _data: Record<string, unknown> = {}) => {};
// #endregion

export default function BottomPlayer() {
  const navigate = useNavigate();
  const primaryAudioRef = useRef<HTMLAudioElement>(null);
  const secondaryAudioRef = useRef<HTMLAudioElement>(null);
  const performanceSettings = usePerformance();
  
  const {
    currentTrack, isPlaying, progress, currentTime, duration, volume, isMuted,
    shuffle, repeat, showLyrics, showQueue,
    setAudioRefs, togglePlay, nextTrack, prevTrack, seekTo, setVolume, toggleMute,
    toggleShuffle, cycleRepeat, toggleLyrics, toggleQueue, setFullscreenOpen,
    setProgress, setCurrentTime, setDuration, handleTrackEnded, maybeStartAutoCrossfade,
  } = usePlayerStore();

  const titleContainerRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
  const isGalaxyS8PlusLayout = useGalaxyS8PlusLayout();
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

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

  // Audio event handlers
  useEffect(() => {
    const audios = [primaryAudioRef.current, secondaryAudioRef.current].filter(Boolean) as HTMLAudioElement[];
    if (audios.length === 0) return;

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
          setProgress((audio.currentTime / audio.duration) * 100);
          setCurrentTime(audio.currentTime);
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
      };

      const handlePlaying = () => {
        // #region debug-point E:audio-playing
        reportAudioEventDebug('E', 'audio playing', getAudioPayload('playing'));
        // #endregion
      };

      const handlePause = () => {
        // #region debug-point E:audio-pause
        reportAudioEventDebug('E', 'audio pause', getAudioPayload('pause'));
        // #endregion
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

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [handleTrackEnded, maybeStartAutoCrossfade, setProgress, setCurrentTime, setDuration]);

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

  // Interactive progress bar drag handler
  const handleProgressInteraction = useCallback((clientX: number) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    seekTo(percent);
  }, [seekTo]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDraggingProgress(true);
    handleProgressInteraction(e.clientX);
  }, [handleProgressInteraction]);

  useEffect(() => {
    if (!isDraggingProgress) return;
    const handleMouseMove = (e: MouseEvent) => handleProgressInteraction(e.clientX);
    const handleMouseUp = () => setIsDraggingProgress(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingProgress, handleProgressInteraction]);

  // Gradient colors from the current track for ambient glow
  const gradientColor1 = currentTrack?.coverGradient?.[0] || 'var(--gradient-from)';
  const gradientColor2 = currentTrack?.coverGradient?.[1] || 'var(--gradient-to)';

  return (
    <>
      <audio ref={primaryAudioRef} preload="auto" />
      <audio ref={secondaryAudioRef} preload="auto" />
      <footer
        className={`mini-player-root fixed bottom-0 left-0 right-0 z-40 ${isGalaxyS8PlusLayout ? 'layout-galaxy-s8' : ''}`}
      >
        {/* Main floating card */}
        <div
          className={`mini-player-card relative overflow-hidden ${isGalaxyS8PlusLayout ? 'layout-galaxy-s8' : ''}`}
        >
          {/* Ambient glow behind card */}
          {currentTrack && (
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
          <div
            ref={progressBarRef}
            className="mini-player-progress-track md:hidden"
            onMouseDown={handleProgressMouseDown}
            onMouseEnter={() => setIsHoveringProgress(true)}
            onMouseLeave={() => !isDraggingProgress && setIsHoveringProgress(false)}
            onTouchStart={(e) => {
              setIsDraggingProgress(true);
              handleProgressInteraction(e.touches[0].clientX);
            }}
            onTouchMove={(e) => {
              if (isDraggingProgress) handleProgressInteraction(e.touches[0].clientX);
            }}
            onTouchEnd={() => setIsDraggingProgress(false)}
            style={{
              position: 'relative',
              width: '100%',
              height: isHoveringProgress || isDraggingProgress ? '5px' : '3px',
              cursor: 'pointer',
              transition: 'height 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              background: 'rgba(255, 255, 255, 0.06)',
              borderRadius: '3px 3px 0 0',
            }}
          >
            {/* Progress fill */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${gradientColor1}, ${gradientColor2})`,
                borderRadius: 'inherit',
                transition: isDraggingProgress ? 'none' : 'width 0.15s linear',
              }}
            />
            {/* Glow on the progress tip */}
            <div
              style={{
                position: 'absolute',
                top: '-3px',
                left: `${progress}%`,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: gradientColor1,
                boxShadow: `0 0 10px ${gradientColor1}`,
                transform: 'translateX(-50%)',
                opacity: isHoveringProgress || isDraggingProgress ? 1 : 0,
                transition: 'opacity 0.2s ease',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* ─── Player Content ─── */}
          <div
            className="flex items-center justify-between w-full"
            style={{
              padding: isGalaxyS8PlusLayout ? '6px 10px 6px 10px' : '8px 12px 8px 12px',
              gap: isGalaxyS8PlusLayout ? '10px' : '12px',
            }}
          >
            {/* ─── Left: Album Art + Track Info ─── */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {currentTrack ? (
                <>
                  {/* Album Cover with ambient glow */}
                  <div className="relative shrink-0 group/cover">
                    {/* Subtle glow behind cover */}
                    <div
                      className="absolute -inset-1 rounded-2xl opacity-40 blur-md transition-opacity duration-500 group-hover/cover:opacity-60"
                      style={{
                        background: `linear-gradient(135deg, ${gradientColor1}, ${gradientColor2})`,
                        pointerEvents: 'none',
                      }}
                    />
                    {currentTrack.coverUrl ? (
                      <img
                        ref={(node) => { bottomPlayerCoverRef.current = node; }}
                        src={currentTrack.coverUrl.startsWith('/') ? `http://localhost:3001${currentTrack.coverUrl}` : currentTrack.coverUrl}
                        alt={currentTrack.title}
                        className="relative cursor-pointer object-cover transition-all duration-300 group-hover/cover:scale-105"
                        style={{
                          width: isGalaxyS8PlusLayout ? '40px' : '48px',
                          height: isGalaxyS8PlusLayout ? '40px' : '48px',
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
                          width: isGalaxyS8PlusLayout ? '40px' : '48px',
                          height: isGalaxyS8PlusLayout ? '40px' : '48px',
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
                    <div className="flex items-center gap-2 min-w-0 max-w-full">
                      <button
                        onClick={openFullscreenPlayer}
                        className={`block min-w-0 shrink overflow-hidden text-left transition hover:text-white ${isTitleOverflowing ? 'marquee-container-mask' : ''}`}
                        style={{
                          fontSize: isGalaxyS8PlusLayout ? '13px' : '14px',
                          fontWeight: 600,
                          lineHeight: '1.3',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        <div className={`whitespace-nowrap ${isTitleOverflowing ? 'animate-marquee inline-block' : 'truncate'}`}>
                          <span ref={titleTextRef} className={isTitleOverflowing ? 'pr-8' : ''}>{currentTrack.title}</span>
                          {isTitleOverflowing && (
                            <span className="pr-8" aria-hidden="true">{currentTrack.title}</span>
                          )}
                        </div>
                      </button>

                      {/* Dynamic Equalizer next to the title when playing */}
                      {isPlaying && (
                        <div className="shrink-0 flex items-end gap-[2px] h-3.5 mb-[2px] pointer-events-none" aria-hidden="true">
                          <span className="w-[2px] bg-accent rounded-full animate-equalizer-1" style={{ animationDuration: '0.8s' }} />
                          <span className="w-[2px] bg-accent rounded-full animate-equalizer-2" style={{ animationDuration: '0.6s' }} />
                          <span className="w-[2px] bg-accent rounded-full animate-equalizer-3" style={{ animationDuration: '0.9s' }} />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/artist/${currentTrack.artistId}`)}
                      className="block w-full truncate text-left hover:underline"
                      style={{
                        fontSize: isGalaxyS8PlusLayout ? '11px' : '12px',
                        color: 'rgba(255,255,255,0.5)',
                        lineHeight: '1.3',
                        marginTop: '1px',
                      }}
                    >
                      {currentTrack.artist}
                    </button>
                  </div>

                  {/* Like button - visible on mobile */}
                  <button
                    onClick={() => setIsLiked(!isLiked)}
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
                      width: isGalaxyS8PlusLayout ? '40px' : '48px',
                      height: isGalaxyS8PlusLayout ? '40px' : '48px',
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
            <div className="hidden flex-col items-center md:flex lg:w-[520px] lg:shrink-0 flex-1 max-w-[520px]">
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
                  onClick={togglePlay}
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
              <div className="flex w-full items-center gap-2.5 mt-1" style={{ maxWidth: '480px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums', minWidth: '36px', textAlign: 'right', lineHeight: '1' }}>
                  {formatDuration(Math.floor(currentTime))}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={e => seekTo(Number(e.target.value))}
                  className="accent-track h-1 flex-1 m-0 cursor-pointer block"
                  style={{ 
                    '--progress': `${progress}%`,
                    background: `linear-gradient(90deg, ${gradientColor1} 0%, ${gradientColor2} ${progress}%, rgba(255,255,255,0.12) ${progress}%)`
                  } as React.CSSProperties}
                />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums', minWidth: '36px', lineHeight: '1' }}>
                  {formatDuration(Math.floor(duration))}
                </span>
              </div>
            </div>

            {/* ─── Mobile: Compact Controls ─── */}
            <div className="flex items-center md:hidden" style={{ gap: isGalaxyS8PlusLayout ? '0' : '2px' }}>
              <button
                onClick={prevTrack}
                className="rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                style={{
                  width: isGalaxyS8PlusLayout ? '36px' : '38px',
                  height: isGalaxyS8PlusLayout ? '36px' : '38px',
                  color: 'rgba(255,255,255,0.65)',
                }}
                aria-label="Previous track"
              >
                <RiSkipBackFill size={isGalaxyS8PlusLayout ? 18 : 20} />
              </button>

              {/* Mobile play/pause hero button */}
              <button
                onClick={togglePlay}
                className="flex items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                style={{
                  width: isGalaxyS8PlusLayout ? '42px' : '44px',
                  height: isGalaxyS8PlusLayout ? '42px' : '44px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#0a0a0a',
                  boxShadow: '0 2px 12px rgba(255,255,255,0.1)',
                  margin: '0 2px',
                }}
                aria-label={isPlaying ? 'Pause playback' : 'Play track'}
              >
                {isPlaying ? (
                  <RiPauseFill size={isGalaxyS8PlusLayout ? 20 : 22} />
                ) : (
                  <RiPlayFill size={isGalaxyS8PlusLayout ? 20 : 22} className="ml-[2px]" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                style={{
                  width: isGalaxyS8PlusLayout ? '36px' : '38px',
                  height: isGalaxyS8PlusLayout ? '36px' : '38px',
                  color: 'rgba(255,255,255,0.65)',
                }}
                aria-label="Next track"
              >
                <RiSkipForwardFill size={isGalaxyS8PlusLayout ? 18 : 20} />
              </button>
            </div>

            {/* ─── Right: Desktop extras ─── */}
            <div className="hidden flex-1 items-center justify-end gap-2.5 lg:flex">
              <button
                onClick={() => setIsLiked(!isLiked)}
                className="rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] active:scale-90"
                style={{ color: isLiked ? 'var(--accent)' : 'rgba(255,255,255,0.45)' }}
                aria-label={isLiked ? 'Unlike' : 'Like'}
              >
                {isLiked ? <RiHeartFill size={16} /> : <RiHeartLine size={16} />}
              </button>
              <button
                onClick={toggleQueue}
                className="mini-ctrl-btn relative rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] active:scale-90 flex flex-col items-center justify-center"
                style={{ color: showQueue ? 'var(--accent)' : 'rgba(255,255,255,0.45)' }}
                aria-label="Toggle queue"
              >
                <RiPlayList2Line size={16} />
                {showQueue && (
                  <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent shadow-[0_0_4px_rgba(var(--gradient-from-rgb,6,182,212),0.6)]" />
                )}
              </button>
              <button
                onClick={toggleLyrics}
                className="mini-ctrl-btn relative rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] active:scale-90 flex flex-col items-center justify-center"
                style={{ color: showLyrics ? 'var(--accent)' : 'rgba(255,255,255,0.45)' }}
                aria-label="Toggle lyrics"
              >
                <RiMusic2Line size={16} />
                {showLyrics && (
                  <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent shadow-[0_0_4px_rgba(var(--gradient-from-rgb,6,182,212),0.6)]" />
                )}
              </button>
              <button
                className="rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06]"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                aria-label="Devices"
              >
                <RiComputerLine size={16} />
              </button>

              {/* Volume cluster */}
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={toggleMute}
                  className="rounded-full p-1.5 transition-all duration-200 hover:bg-white/[0.06] active:scale-90"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
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
                />
              </div>

              <button
                onClick={openFullscreenPlayer}
                className="rounded-full p-2 transition-all duration-200 hover:bg-white/[0.06] hover:text-white active:scale-90"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                aria-label="Fullscreen"
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
