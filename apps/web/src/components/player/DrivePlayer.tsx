import { useCallback, useMemo, useLayoutEffect, useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { Track } from '../../types';
import { useLibraryStore } from '../../stores/libraryStore';
import { formatDuration, getLyricsForTrack } from '../../utils/formatters';
import { autoUpgradeTrackLyrics, hasSyncedLyricTimestamps } from '../../services/lyricsService';
import { useFluidLyricMotion } from '../../utils/lyricMotion';
import { useUIStore } from '../../stores/uiStore';
import { gsap } from 'gsap';
import { shallow } from 'zustand/shallow';
import {
  RiArrowLeftLine,
  RiSkipBackFill,
  RiPlayFill,
  RiPauseFill,
  RiSkipForwardFill,
  RiHeartLine,
  RiHeartFill,
  RiShuffleLine,
  RiShuffleFill,
  RiRepeatLine,
  RiRepeatFill,
  RiRepeat2Line,
  RiMusic2Line,
  RiImageLine,
} from 'react-icons/ri';

interface DrivePlayerProps {
  onClose: () => void;
  isEmbedded?: boolean;
  onLargeCoverReady?: (cover: HTMLDivElement) => void;
}

export default function DrivePlayer({ onClose, isEmbedded = false, onLargeCoverReady }: DrivePlayerProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    shuffle,
    repeat,
    toggleShuffle,
    cycleRepeat,
    queue,
    queueIndex,
    lyricsTransition,
    lyricsDisplayMode,
    setFullscreenOpen,
  } = usePlayerStore((state) => ({
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    duration: state.duration,
    togglePlay: state.togglePlay,
    nextTrack: state.nextTrack,
    prevTrack: state.prevTrack,
    seekTo: state.seekTo,
    shuffle: state.shuffle,
    repeat: state.repeat,
    toggleShuffle: state.toggleShuffle,
    cycleRepeat: state.cycleRepeat,
    queue: state.queue,
    queueIndex: state.queueIndex,
    lyricsTransition: state.lyricsTransition,
    lyricsDisplayMode: state.lyricsDisplayMode,
    setFullscreenOpen: state.setFullscreenOpen,
  }), shallow);

  const { likedTrackIds, toggleLike } = useLibraryStore();
  const { isDriveModeOpen, setDriveModeOpen } = useUIStore();

  // Ref for Drive Mode cover animation
  const largeCoverRef = useRef<HTMLDivElement>(null); // Large cover in compact mode
  const prevRectsRef = useRef<{ large?: DOMRect; small?: DOMRect }>({});
  const smallCoverRef = useRef<HTMLDivElement>(null); // Small cover in lyrics mode
  const isAnimatingBackRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);
  const hasReportedLargeCoverRef = useRef(false);
  const previousShowFullLyricsRef = useRef<boolean | null>(null); // Track previous state

  // State for compact/full lyrics mode
  const [showFullLyrics, setShowFullLyrics] = useState(false);

  // State for idle timeout to hide controls
  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef<number | null>(null);
  const [lyricsViewport, setLyricsViewport] = useState<'phone' | 'tablet' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    if (window.innerWidth >= 1280) return 'desktop';
    if (window.innerWidth >= 768) return 'tablet';
    return 'phone';
  });

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimeoutRef.current !== null) {
      window.clearTimeout(idleTimeoutRef.current);
    }
    idleTimeoutRef.current = window.setTimeout(() => {
      setIsIdle(true);
    }, 3000);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimeoutRef.current !== null) {
        window.clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    const updateViewportFlags = () => {
      if (window.innerWidth >= 1280) {
        setLyricsViewport('desktop');
      } else if (window.innerWidth >= 768) {
        setLyricsViewport('tablet');
      } else {
        setLyricsViewport('phone');
      }
    };

    updateViewportFlags();
    window.addEventListener('resize', updateViewportFlags);
    return () => window.removeEventListener('resize', updateViewportFlags);
  }, []);



  const lyrics = useMemo(
    () => (currentTrack ? getLyricsForTrack(currentTrack.id, currentTrack.lyrics) : []),
    [currentTrack?.id, currentTrack?.lyrics]
  );

  // Auto-upgrade: normalize + fetch synced lyrics from LRCLIB when track changes
  useEffect(() => {
    if (!currentTrack) return;
    if (!currentTrack.lyrics || !hasSyncedLyricTimestamps(currentTrack.lyrics)) {
      autoUpgradeTrackLyrics(currentTrack).catch(() => {});
    }
  }, [currentTrack?.id]);

  const isTabletLyricsViewport = lyricsViewport === 'tablet';
  const isDesktopLyricsViewport = lyricsViewport === 'desktop';
  const shouldAnimateLyrics = (isDriveModeOpen || isEmbedded) && isPlaying;
  const {
    centeredFocusPosition: centeredLyricFocusPosition,
    activeLyricIndex,
  } = useFluidLyricMotion(
    lyrics,
    currentTime,
    shouldAnimateLyrics
  );
  const isSynced = useMemo(() => lyrics.some((l) => l.time >= 0), [lyrics]);
  const lyricWindowAnchor = lyrics.length > 0
    ? Math.max(0, Math.min(lyrics.length - 1, Math.round(centeredLyricFocusPosition)))
    : -1;
  const lyricLinesBefore = isDesktopLyricsViewport ? 5 : 4;
  const lyricLinesAfter = isDesktopLyricsViewport ? 8 : isTabletLyricsViewport ? 7 : 6;
  const lyricWindowCenter = lyrics.length > 0
    ? Math.max(0, Math.min(lyrics.length - 1, Math.round(centeredLyricFocusPosition)))
    : -1;
  const lyricWindowStart = lyricWindowAnchor >= 0 ? Math.max(0, lyricWindowAnchor - lyricLinesBefore) : 0;
  const lyricWindowEnd = lyricWindowAnchor >= 0
    ? Math.min(lyrics.length, lyricWindowAnchor + lyricLinesAfter + 1)
    : 0;
  const visibleLyrics = lyrics.slice(lyricWindowStart, lyricWindowEnd);

  // Calculate cover URL early so it can be used in effects
  const coverUrl = currentTrack?.coverUrl?.startsWith('/')
    ? `http://localhost:3001${currentTrack.coverUrl}`
    : currentTrack?.coverUrl;
  const backgroundStartColor = currentTrack?.coverGradient?.[0] || '#FF6B35';
  const backgroundEndColor = currentTrack?.coverGradient?.[1] || '#E8470A';
  const driveBackgroundStyle = useMemo<CSSProperties>(() => ({
    backgroundColor: '#070709',
    backgroundImage: `
      radial-gradient(circle at 0% 0%, ${backgroundStartColor}42 0%, transparent 42%),
      radial-gradient(circle at 100% 34%, ${backgroundEndColor}36 0%, transparent 40%),
      radial-gradient(circle at 44% 105%, rgba(139, 92, 246, 0.24) 0%, transparent 45%),
      linear-gradient(180deg, ${backgroundStartColor}30 0%, #0a0a0a 50%, #000000 100%)
    `,
    transform: 'translate3d(0,0,0)',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    contain: 'paint',
  }), [backgroundStartColor, backgroundEndColor]);
  const driveGlassStyle = useMemo<CSSProperties>(() => ({
    background: 'rgba(8, 8, 10, 0.62)',
    transform: 'translate3d(0,0,0)',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    contain: 'paint',
  }), []);
  
  const lyricRowHeight = isDesktopLyricsViewport
    ? lyricsDisplayMode === 'karaoke' ? 138 : lyricsDisplayMode === 'spotlight' ? 104 : lyricsDisplayMode === 'clean' ? 94 : 118
    : isTabletLyricsViewport ? 98 : 82;
  const lyricFontSize = isDesktopLyricsViewport
    ? 'clamp(1.4rem, 2.9vw, 2.45rem)'
    : isTabletLyricsViewport
      ? 'clamp(1.18rem, 3.2vw, 1.9rem)'
      : 'clamp(1.15rem, 5.1vw, 1.78rem)';
  const lyricDenseFontSize = isDesktopLyricsViewport
    ? 'clamp(1.08rem, 2.15vw, 1.82rem)'
    : isTabletLyricsViewport
      ? 'clamp(0.98rem, 2.45vw, 1.48rem)'
      : 'clamp(0.98rem, 4.2vw, 1.4rem)';
  const lyricCompactFontSize = isDesktopLyricsViewport
    ? 'clamp(0.96rem, 1.82vw, 1.42rem)'
    : isTabletLyricsViewport
      ? 'clamp(0.86rem, 2.05vw, 1.22rem)'
      : 'clamp(0.85rem, 3.6vw, 1.16rem)';
  const lyricUltraCompactFontSize = isDesktopLyricsViewport
    ? 'clamp(0.88rem, 1.55vw, 1.18rem)'
    : isTabletLyricsViewport
      ? 'clamp(0.78rem, 1.78vw, 1.02rem)'
      : 'clamp(0.74rem, 3.05vw, 0.98rem)';
  const lyricLineHeight = isDesktopLyricsViewport ? '1.18' : isTabletLyricsViewport ? '1.2' : '1.22';
  const referenceTrackFocus = lyricsTransition === 'smooth' ? centeredLyricFocusPosition : activeLyricIndex;
  const lyricTrackOffset = lyricWindowCenter >= 0
    ? -(referenceTrackFocus - lyricWindowStart + 0.5) * lyricRowHeight
    : 0;

  // Intro animation for all elements - DISABLED for instant appearance
  useLayoutEffect(() => {
    if (hasAnimatedRef.current || !containerRef.current) return;
    hasAnimatedRef.current = true;

    // Skip all intro animations - just make everything visible immediately
    const container = containerRef.current;
    const backButton = container.querySelector('.drive-back-button');
    const driveModeLabel = container.querySelector('.drive-mode-label');
    const lyricsContainer = container.querySelector('.drive-lyrics-container');
    const progressBar = container.querySelector('.drive-progress-bar');
    const controls = container.querySelector('.drive-controls');

    // Set everything to visible immediately
    gsap.set([backButton, driveModeLabel, lyricsContainer, progressBar, controls], {
      opacity: 1,
      clearProps: 'transform',
    });
  }, []);

  useLayoutEffect(() => {
    if (isEmbedded && !hasReportedLargeCoverRef.current && largeCoverRef.current) {
      hasReportedLargeCoverRef.current = true;
      onLargeCoverReady?.(largeCoverRef.current);
    }
  }, [isEmbedded, onLargeCoverReady]);

  const toggleFullLyrics = useCallback(() => {
    if (largeCoverRef.current && smallCoverRef.current) {
      prevRectsRef.current = {
        large: largeCoverRef.current.getBoundingClientRect(),
        small: smallCoverRef.current.getBoundingClientRect(),
      };
    }
    setShowFullLyrics((prev) => !prev);
  }, []);






  // Fade in Drive Player UI - DISABLED for instant appearance
  useLayoutEffect(() => {
    // Skip fade animation - everything appears instantly
  }, []);
  // Lyrics container animation - DISABLED for instant appearance
  useLayoutEffect(() => {
    // Skip animation - lyrics appear instantly
  }, [showFullLyrics]);

  // Animate cover transition: large cover → small cover when switching to lyrics
  // Only runs when user clicks Compact/Lyrics button, NOT on initial mount
  useLayoutEffect(() => {
    // Skip animation if this is the first time we're seeing this state
    // Only animate when there's an actual state CHANGE
    if (previousShowFullLyricsRef.current === null) {
      previousShowFullLyricsRef.current = showFullLyrics;
      return;
    }

    // Skip if state hasn't actually changed
    if (previousShowFullLyricsRef.current === showFullLyrics) {
      return;
    }

    // Update the previous state
    previousShowFullLyricsRef.current = showFullLyrics;

    const largeCover = largeCoverRef.current;
    const smallCover = smallCoverRef.current;
    const trackCopy = largeCover?.parentElement?.querySelector('.drive-track-copy') as HTMLElement | null;

    // Let the view classes control track-copy opacity; old inline GSAP values
    // otherwise keep the details visible over the lyrics after switching back.
    if (trackCopy) {
      gsap.killTweensOf(trackCopy);
      gsap.set(trackCopy, { clearProps: 'opacity' });
    }

    if (!currentTrack) return;

    if (showFullLyrics) {
      // Switching to lyrics mode: animate large cover to small cover position
      if (!largeCover || !smallCover) return;

      gsap.killTweensOf([largeCover, smallCover]);
      gsap.set([largeCover, smallCover], { clearProps: 'all' });

      const largeRect = prevRectsRef.current.large || largeCover.getBoundingClientRect();
      const smallRect = smallCover.getBoundingClientRect();

      // Ensure both elements are visible and have valid dimensions
      if (largeRect.width === 0 || smallRect.width === 0) return;

      // Make large cover visible on top of everything during animation
      gsap.set(largeCover, {
        opacity: 1,
        zIndex: 200,
        position: 'fixed',
        left: largeRect.left,
        top: largeRect.top,
        width: largeRect.width,
        height: largeRect.height,
      });

      // Hide small cover initially
      gsap.set(smallCover, { opacity: 0 });

      // Animate large cover to small cover position
      gsap.to(largeCover, {
        left: smallRect.left,
        top: smallRect.top,
        width: smallRect.width,
        height: smallRect.height,
        borderRadius: '16px',
        duration: 0.6,
        ease: 'expo.out',
        onComplete: () => {
          // Reset and let CSS handle visibility
          gsap.set(largeCover, { clearProps: 'all' });
          gsap.set(smallCover, { clearProps: 'all' });
        }
      });
    } else {
      // Switching to compact mode: animate small cover to large cover position
      if (!largeCover || !smallCover) return;

      gsap.killTweensOf([largeCover, smallCover]);
      gsap.set([largeCover, smallCover], { clearProps: 'all' });

      const largeRect = largeCover.getBoundingClientRect();
      const smallRect = prevRectsRef.current.small || smallCover.getBoundingClientRect();

      // Ensure both elements have valid dimensions
      if (largeRect.width === 0 || smallRect.width === 0) return;

      // Keep the title from reflowing into the center while the cover is
      // temporarily lifted out of the player layout for its return animation.
      if (trackCopy) {
        gsap.set(trackCopy, { opacity: 0 });
      }

      // Make large cover visible and position it at small cover location
      gsap.set(largeCover, {
        opacity: 1,
        zIndex: 200,
        position: 'fixed',
        left: smallRect.left,
        top: smallRect.top,
        width: smallRect.width,
        height: smallRect.height,
        borderRadius: '16px',
      });

      // Hide small cover
      gsap.set(smallCover, { opacity: 0 });

      // Animate large cover back to its original position
      gsap.to(largeCover, {
        left: largeRect.left,
        top: largeRect.top,
        width: largeRect.width,
        height: largeRect.height,
        borderRadius: '24px',
        duration: 0.6,
        ease: 'expo.out',
        onComplete: () => {
          // Reset and let CSS handle visibility
          gsap.set(largeCover, { clearProps: 'all' });
          gsap.set(smallCover, { clearProps: 'all' });
          if (trackCopy) {
            gsap.set(trackCopy, { clearProps: 'opacity' });
          }
        }
      });
    }
  }, [showFullLyrics, currentTrack]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    seekTo(Math.max(0, Math.min(100, percent)));
  };

  const handleSeekKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;

    let nextTime = currentTime;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nextTime -= 5;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nextTime += 5;
    else if (e.key === 'PageDown') nextTime -= 10;
    else if (e.key === 'PageUp') nextTime += 10;
    else if (e.key === 'Home') nextTime = 0;
    else if (e.key === 'End') nextTime = duration;
    else return;

    e.preventDefault();
    seekTo((Math.max(0, Math.min(duration, nextTime)) / duration) * 100);
  };

  const handleBack = useCallback((e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    if (isAnimatingBackRef.current) {
      if (isDriveModeOpen) setDriveModeOpen(false);
      setFullscreenOpen(true);
      onClose();
      return;
    }
    isAnimatingBackRef.current = true;
    setTimeout(() => {
      isAnimatingBackRef.current = false;
    }, 550);

    // Always navigate to FullscreenPlayer when clicking Back in DrivePlayer
    setFullscreenOpen(true);

    if (isDriveModeOpen) {
      setDriveModeOpen(false);
    }

    onClose();
  }, [isDriveModeOpen, onClose, setDriveModeOpen, setFullscreenOpen]);

  // Escape key handler to return from Drive Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBack]);

  if (!currentTrack) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#1C1C1E] via-[#0D0D0D] to-[#000000]">
        <p className="text-xl text-white/70">No track currently playing</p>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLiked = likedTrackIds.has(currentTrack.id);
  const upNextTrack = queue[queueIndex + 1] || (repeat === 'all' && queue.length > 1 ? queue[0] : null);
  const andLaterTrack = queue[queueIndex + 2] || (
    repeat === 'all' && queue.length > 2
      ? queue[(queueIndex + 2) % queue.length]
      : null
  );

  // Get repeat icon based on mode
  const getRepeatIcon = () => {
    if (repeat === 'one') return <RiRepeat2Line size={20} />;
    if (repeat === 'all') return <RiRepeatFill size={20} />;
    return <RiRepeatLine size={20} />;
  };

  return (
    <div
      ref={containerRef}
      className={`drive-player-shell ${isEmbedded ? 'drive-player-embedded absolute' : 'fixed h-screen w-screen'} inset-0 z-50 flex flex-col overflow-hidden text-white`}
      onMouseMove={resetIdleTimer}
      onTouchStart={resetIdleTimer}
      onClick={resetIdleTimer}
      style={{ cursor: isIdle ? 'none' : 'default' }}
    >
      {/* Background Layer - stable gradients avoid flicker from huge blurred blobs */}
      {!isEmbedded && (
        <div className="absolute inset-0 -z-20" style={driveBackgroundStyle} />
      )}

      {/* Glassmorphism layer kept lightweight to avoid repaint flicker */}
      {!isEmbedded && (
        <div className="absolute inset-0 -z-10" style={driveGlassStyle} />
      )}


      {/* Top Header - Compact */}
      <div className={`drive-header flex items-center justify-between px-2 md:px-4 xl:px-6 pt-2 md:pt-4 pb-1 md:pb-2 shrink-0 relative z-50 transition-opacity duration-500 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
        <button
          type="button"
          onClick={handleBack}
          className="drive-header-button drive-back-button pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-white/20 hover:border-white/30 active:scale-95 cursor-pointer"
          aria-label="Back to fullscreen player"
        >
          <RiArrowLeftLine size={18} />
          <span>Back</span>
        </button>

        <span className="drive-mode-label text-xs font-bold uppercase tracking-widest text-white/80">
          Drive Mode
        </span>

        {/* Lyrics Toggle Button */}
        <button
          onClick={toggleFullLyrics}
          className={`drive-header-button drive-toggle-button inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-xl transition-all duration-300 ${showFullLyrics
            ? 'border-accent/50 bg-accent/30 text-accent hover:bg-accent/40'
            : 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30'
            }`}
          aria-label={showFullLyrics ? 'Return to player view' : 'Open lyrics view'}
          aria-pressed={showFullLyrics}
        >
          {showFullLyrics ? <RiImageLine size={18} /> : <RiMusic2Line size={18} />}
          <span>{showFullLyrics ? 'Player' : 'Lyrics'}</span>
        </button>
      </div>

      {/* Compact Album Art & Track Info - Always render, control visibility */}
      <div className={`drive-track-info flex items-center gap-1.5 md:gap-3 px-2 md:px-4 xl:px-6 py-1.5 md:py-3 shrink-0 transition-opacity duration-300 ${showFullLyrics ? 'is-visible opacity-100 pointer-events-auto' : 'is-hidden opacity-0 pointer-events-none'}`}>
        <div className="relative shrink-0">
          <div
            ref={smallCoverRef}
            id="drive-mode-cover"
            className="drive-lyrics-cover h-10 w-10 xs:h-11 xs:w-11 md:h-14 md:w-14 xl:h-16 xl:w-16 overflow-hidden rounded-lg md:rounded-2xl border border-white/20 shadow-lg"
          >
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
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="drive-lyrics-title truncate text-[11px] xs:text-xs md:text-base xl:text-lg font-bold text-white">
            {currentTrack.title}
          </h1>
          <p className="drive-lyrics-artist truncate text-[9px] xs:text-[10px] md:text-sm text-white/60">
            {currentTrack.artist}
          </p>
        </div>

        <button
          onClick={() => toggleLike(currentTrack.id)}
          className={`drive-like-control flex h-7 w-7 xs:h-8 xs:w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-lg transition hover:scale-110 hover:bg-white/20 active:scale-95 shrink-0 transition-opacity duration-500 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          {isLiked ? (
            <RiHeartFill className="w-3.5 h-3.5 md:w-5 md:h-5 text-accent" />
          ) : (
            <RiHeartLine className="w-3.5 h-3.5 md:w-5 md:h-5 text-white/80" />
          )}
        </button>
      </div>

      {/* Content Area - Always render both modes, control visibility */}
      <div className={`drive-lyrics-container flex-1 relative overflow-hidden min-h-0 px-3 sm:px-5 md:px-8 xl:px-12 ${showFullLyrics ? 'is-lyrics-view' : 'is-player-view'}`}>
        {/* Lyrics Mode */}
        <div className={`absolute inset-0 ${showFullLyrics ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          {lyrics.length > 0 ? (
            <div
              className="drive-lyrics-stage absolute inset-0"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 84%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 84%, transparent 100%)',
              }}
            >
              <div
                className="drive-lyric-track absolute left-0 right-0 top-1/2 flex flex-col items-center"
                style={{
                  transform: `translate3d(0, ${lyricTrackOffset.toFixed(2)}px, 0)`,
                  willChange: 'transform',
                  transition: lyricsTransition === 'smooth' || lyricsTransition === 'instant' ? undefined : 'transform 90ms ease-out',
                }}
              >
                {visibleLyrics.map((line, index) => {
                  const actualIndex = lyricWindowStart + index;
                  const relativePosition = actualIndex - centeredLyricFocusPosition;
                  const distance = Math.abs(relativePosition);
                  
                  const isCurrent = isSynced && actualIndex === activeLyricIndex;

                  // During intro: all lines uniformly dim until singer starts
                  const isPreSinging = isSynced && activeLyricIndex < 0;
                  const desktopFocusIndex = isSynced && activeLyricIndex >= 0
                    ? activeLyricIndex
                    : Math.round(centeredLyricFocusPosition);
                  const isDesktopFocus = actualIndex === desktopFocusIndex;
                  const desktopSpotlight = isDesktopLyricsViewport && isSynced && lyricsDisplayMode === 'spotlight';
                  if (desktopSpotlight && !isDesktopFocus) return null;

                  // Refined studio depth-of-field & opacity hierarchy:
                  const opacity = isDesktopLyricsViewport
                    ? (isDesktopFocus
                      ? (isPreSinging ? 0.72 : 1)
                      : lyricsDisplayMode === 'clean'
                        ? Math.max(0.42, 0.74 - distance * 0.055)
                        : lyricsDisplayMode === 'karaoke'
                          ? Math.max(0.14, 0.38 - distance * 0.09)
                          : Math.max(0.12, 0.46 - distance * 0.1))
                    : (!isSynced
                      ? 0.85
                      : isPreSinging
                        ? 0.22
                        : (isCurrent ? 1.0 : Math.max(0.12, 0.40 - distance * 0.12)));
                  const scale = isDesktopLyricsViewport
                    ? (isDesktopFocus
                      ? lyricsDisplayMode === 'spotlight' ? 1.08 : 1.05
                      : lyricsDisplayMode === 'clean' ? 1 : Math.max(0.9, 0.98 - distance * 0.025))
                    : (!isSynced
                      ? 1.0
                      : isPreSinging
                        ? 0.97
                        : (isCurrent ? 1.04 : Math.max(0.92, 0.98 - distance * 0.03)));
                  const blur = isDesktopLyricsViewport && !isDesktopFocus
                    ? lyricsDisplayMode === 'vertical'
                      ? Math.min(5, distance * 1.15)
                      : lyricsDisplayMode === 'karaoke'
                        ? Math.min(1.25, distance * 0.35)
                        : 0
                    : 0;
                  
                  // Adaptive font size based on text length
                  const lyricLength = line.text.length;
                  const fontSize = lyricLength > 100 
                    ? lyricUltraCompactFontSize 
                    : lyricLength > 70 
                      ? lyricCompactFontSize 
                      : lyricLength > 50 
                        ? lyricDenseFontSize 
                        : lyricFontSize;
                  
                  // Pure, crisp typography: NO colored neon glow or accent outlines
                  const textShadow = isDesktopLyricsViewport && isDesktopFocus && lyricsDisplayMode === 'karaoke'
                    ? `0 0 26px ${currentTrack?.coverGradient?.[0] || '#FF6B35'}99, 0 2px 18px rgba(0,0,0,0.8)`
                    : (isCurrent && !isPreSinging)
                      ? '0 2px 20px rgba(0,0,0,0.85), 0 0 16px rgba(255,255,255,0.2), 0 1px 4px rgba(0,0,0,0.9)'
                    : '0 2px 8px rgba(0,0,0,0.6)';

                  return (
                    <div
                      key={`${line.time}-${actualIndex}`}
                      className={`drive-lyric-line relative flex w-full items-center justify-center px-2 text-center md:px-10 xl:px-16 select-none pointer-events-none ${isCurrent ? 'is-active' : ''} ${isDesktopLyricsViewport ? 'drive-lyric-desktop-depth' : ''}`}
                      style={{
                        height: `${lyricRowHeight}px`,
                        transform: `scale(${scale})`,
                        opacity,
                        ...(isDesktopLyricsViewport ? { filter: `blur(${blur.toFixed(2)}px)` } : {}),
                      }}
                    >
                      <div
                        className="relative w-full"
                        style={{
                          maxWidth: 'min(95vw, 1040px)',
                          fontSize: isDesktopLyricsViewport && isDesktopFocus && lyricsDisplayMode === 'spotlight'
                            ? 'clamp(2rem, 4vw, 3.5rem)'
                            : fontSize,
                          lineHeight: lyricLineHeight,
                          color: '#ffffff',
                          textShadow,
                          fontWeight: isCurrent ? '900' : '700',
                          letterSpacing: '-0.02em',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          WebkitFontSmoothing: 'antialiased',
                        }}
                      >
                        {line.text || '♪'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="drive-empty-lyrics absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">♪</div>
                <p className="drive-empty-lyrics-title text-lg text-white/50">No lyrics available</p>
                <p className="drive-empty-lyrics-caption text-sm text-white/30 mt-2">Enjoy the music</p>
              </div>
            </div>
          )}
        </div>

        {/* Compact Mode - Large Album Art */}
        <div
          className={`large-cover-container absolute inset-0 flex items-center justify-center ${showFullLyrics ? 'pointer-events-none' : ''
            }`}
        >
          <div className="drive-cover-layout flex flex-col items-center gap-2 xs:gap-2.5 md:gap-4 xl:gap-6 max-w-md w-full px-3 md:px-6">
            {/* Large Album Art - Much smaller on mobile */}
            <div
              ref={largeCoverRef}
              data-drive-mode-large-cover
              className={`drive-cover-art relative w-[min(60vw,240px,44dvh)] xs:w-[min(55vw,260px,44dvh)] sm:w-[min(50vw,300px,44dvh)] md:w-[min(45vw,340px,44dvh)] xl:w-[min(40vw,380px,44dvh)] aspect-square rounded-xl md:rounded-2xl xl:rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 ${showFullLyrics ? 'opacity-0' : 'opacity-100'}`}
            >
              {coverUrl ? (
                <img src={coverUrl} alt={currentTrack.title} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${currentTrack.coverGradient?.[0] || '#333'}, ${currentTrack.coverGradient?.[1] || '#222'})`,
                  }}
                >
                  <div className="text-white/40 text-4xl xs:text-5xl md:text-6xl xl:text-8xl">♪</div>
                </div>
              )}
            </div>

            {/* Track Info - Smaller text on mobile */}
            <div className={`drive-track-copy text-center w-full px-1 transition-opacity duration-300 ${!showFullLyrics ? 'opacity-100' : 'opacity-0'}`}>
              <h2 className="text-base xs:text-lg sm:text-xl md:text-2xl xl:text-3xl font-bold text-white mb-0.5 md:mb-1 xl:mb-2 truncate leading-tight">{currentTrack.title}</h2>
              <p className="text-xs xs:text-sm sm:text-base md:text-lg xl:text-xl text-white/60 truncate">{currentTrack.artist}</p>
              {currentTrack.album && (
                <p className="text-[10px] xs:text-xs sm:text-sm md:text-base xl:text-lg text-white/40 mt-0.5 md:mt-1 truncate">{currentTrack.album}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls Section - Compact & Fixed */}
      <div className={`drive-bottom-panel shrink-0 px-2 md:px-4 xl:px-6 pb-2 xs:pb-3 md:pb-5 xl:pb-6 space-y-1.5 md:space-y-3 transition-opacity duration-500 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Progress Bar */}
        <div className="drive-progress-bar w-full">
          <div
            onClick={handleSeek}
            onKeyDown={handleSeekKeyDown}
            className="drive-seek-area group relative flex h-8 cursor-pointer items-center"
            role="slider"
            aria-label="Playback position"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(currentTime)}
            aria-valuetext={`${formatDuration(currentTime)} of ${formatDuration(duration)}`}
            tabIndex={0}
          >
            <div className="drive-seek-track absolute inset-x-0 h-1.5 rounded-full bg-white/20 transition-all group-hover:h-2">
              <div
                className="h-full rounded-full transition-all duration-100 shadow-md pointer-events-none"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(to right, var(--gradient-from), var(--gradient-to))`
                }}
              />
            </div>
          </div>
          <div className="drive-time-labels mt-0.5 md:mt-1.5 flex justify-between text-[8px] xs:text-[9px] md:text-xs font-semibold text-white/40">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Playback Controls Row - Much smaller on mobile */}
        <div className="drive-controls flex items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-4 xl:gap-5">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`drive-action-control flex h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 xl:h-11 xl:w-11 items-center justify-center rounded-full border backdrop-blur-xl shadow-md transition ${shuffle
              ? 'bg-accent/30 border-accent/50 text-accent'
              : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            data-active={shuffle}
            aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            {shuffle ? <RiShuffleFill className="w-3 h-3 xs:w-3.5 xs:h-3.5 md:w-4 md:h-4 xl:w-[18px] xl:h-[18px]" /> : <RiShuffleLine className="w-3 h-3 xs:w-3.5 xs:h-3.5 md:w-4 md:h-4 xl:w-[18px] xl:h-[18px]" />}
          </button>

          {/* Previous */}
          <button
            onClick={prevTrack}
            className="drive-skip-control flex h-9 w-9 xs:h-10 xs:w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 xl:h-14 xl:w-14 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white shadow-md transition hover:bg-white/20 active:scale-90"
            aria-label="Previous track"
          >
            <RiSkipBackFill className="w-4 h-4 xs:w-4.5 xs:h-4.5 md:w-5 md:h-5 xl:w-6 xl:h-6" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="drive-primary-control flex h-11 w-11 xs:h-12 xs:w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 xl:h-20 xl:w-20 items-center justify-center rounded-full bg-accent text-white shadow-xl shadow-accent/30 transition hover:scale-105 active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <RiPauseFill className="w-5 h-5 xs:w-6 xs:h-6 md:w-7 md:h-7 xl:w-9 xl:h-9" /> : <RiPlayFill className="ml-0.5 w-5 h-5 xs:w-6 xs:h-6 md:w-7 md:h-7 xl:w-9 xl:h-9" />}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            className="drive-skip-control flex h-9 w-9 xs:h-10 xs:w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 xl:h-14 xl:w-14 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white shadow-md transition hover:bg-white/20 active:scale-90"
            aria-label="Next track"
          >
            <RiSkipForwardFill className="w-4 h-4 xs:w-4.5 xs:h-4.5 md:w-5 md:h-5 xl:w-6 xl:h-6" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`drive-action-control flex h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 xl:h-11 xl:w-11 items-center justify-center rounded-full border backdrop-blur-xl shadow-md transition ${repeat !== 'off'
              ? 'bg-accent/30 border-accent/50 text-accent'
              : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20 hover:text-white'
              }`}
            data-active={repeat !== 'off'}
            aria-label={`Repeat ${repeat}`}
          >
            {getRepeatIcon()}
          </button>
        </div>

      </div>

      {/* Up Next stays outside the auto-hiding controls container. */}
      <UpNextPopup
        track={upNextTrack}
        laterTrack={andLaterTrack}
        visible={Boolean(upNextTrack) && progressPercent >= 73}
        cycleEnabled={progressPercent >= 73}
        isDriveMode={true}
      />
    </div>
  );
}

/* ─── Up Next Dynamic Popup Component ─── */
interface UpNextPopupProps {
  track: Track | null;
  laterTrack?: Track | null;
  visible: boolean;
  cycleEnabled?: boolean;
  isDriveMode?: boolean;
}

function UpNextPopup({ track, laterTrack = null, visible, cycleEnabled = false, isDriveMode = false }: UpNextPopupProps) {
  const [showLaterTrack, setShowLaterTrack] = useState(false);

  useEffect(() => {
    setShowLaterTrack(false);

    if (!visible || !cycleEnabled || !laterTrack) return undefined;

    const interval = window.setInterval(() => {
      setShowLaterTrack((current) => !current);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [visible, cycleEnabled, laterTrack, track?.id]);

  if (!track) return null;
  const headline = showLaterTrack && laterTrack ? 'And Later' : 'Up Next';

  return (
    <div className={`upnext-popup-card ${isDriveMode ? 'drive-mode' : ''} ${visible ? 'visible' : 'hidden'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          {headline}
        </span>
        <div className="upnext-soundwave">
          <div className="upnext-bar" style={{ height: '40%' }}></div>
          <div className="upnext-bar" style={{ height: '70%' }}></div>
          <div className="upnext-bar" style={{ height: '100%' }}></div>
          <div className="upnext-bar" style={{ height: '50%' }}></div>
        </div>
      </div>
      <div className="relative min-h-[56px]">
        {[track, laterTrack].map((queuedTrack, index) => {
          if (!queuedTrack) return null;

          const isLaterSlot = index === 1;
          const isActive = showLaterTrack === isLaterSlot;
          const slotGradient = queuedTrack.coverGradient || ['#3b82f6', '#1e3a8a'];

          return (
            <div
              key={`${isLaterSlot ? 'later' : 'next'}-${queuedTrack.id}`}
              className={`absolute inset-0 flex items-center gap-3 transition-all duration-500 ease-out ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                }`}
              aria-hidden={!isActive}
            >
              {queuedTrack.coverUrl ? (
                <img
                  src={queuedTrack.coverUrl}
                  alt={queuedTrack.title}
                  className="h-12 w-12 rounded-xl object-cover shadow-md border border-white/10"
                />
              ) : (
                <div
                  className="h-12 w-12 rounded-xl border border-white/10 shadow-md animate-gradient"
                  style={{ background: `linear-gradient(135deg, ${slotGradient[0]}, ${slotGradient[1]})` }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate text-left">{queuedTrack.title}</div>
                <div className="text-[11px] text-softText truncate text-left">{queuedTrack.artist}</div>
                <div className="text-[10px] text-white/35 truncate text-left">{queuedTrack.album || 'Unknown Album'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
