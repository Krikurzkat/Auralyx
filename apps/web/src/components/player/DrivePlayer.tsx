import { useCallback, useMemo, useLayoutEffect, useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { Track } from '../../types';
import { useLibraryStore } from '../../stores/libraryStore';
import { formatDuration, getLyricsForTrack } from '../../utils/formatters';
import { useFluidLyricMotion } from '../../utils/lyricMotion';
import { getCurrentLyricIndex } from '../../utils/lrcParser';
import { gsap } from 'gsap';
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
}

type CoverTransitionRect = Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>;

type DriveTransitionWindow = Window & {
  __fullscreenCoverRect?: CoverTransitionRect;
  __driveModeBackRect?: CoverTransitionRect;
  __clearDriveModeTransition?: () => void;
};

export default function DrivePlayer({ onClose, isEmbedded = false }: DrivePlayerProps) {
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
  } = usePlayerStore();

  const { likedTrackIds, toggleLike } = useLibraryStore();

  // Ref for Drive Mode cover animation
  const largeCoverRef = useRef<HTMLDivElement>(null); // Large cover in compact mode
  const prevRectsRef = useRef<{ large?: DOMRect; small?: DOMRect }>({});
  const smallCoverRef = useRef<HTMLDivElement>(null); // Small cover in lyrics mode
  const isAnimatingBackRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);
  const previousShowFullLyricsRef = useRef<boolean | null>(null); // Track previous state
  const driveModeTransitionRetryRef = useRef<number | null>(null);
  
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
    [currentTrack]
  );
  const isTabletLyricsViewport = lyricsViewport === 'tablet';
  const isDesktopLyricsViewport = lyricsViewport === 'desktop';
  const lyricHighlightAheadSeconds = isDesktopLyricsViewport ? 0.12 : isTabletLyricsViewport ? 0.1 : 0.08;
  const {
    fluidTime: lyricFluidTime,
    centeredFocusPosition: centeredLyricFocusPosition,
  } = useFluidLyricMotion(
    lyrics,
    currentTime + lyricHighlightAheadSeconds,
    isPlaying,
    {
      stiffness: 56,
      damping: 21,
      maxVelocity: 6,
      snapThreshold: 3,
    }
  );
  const activeLyricIndex = useMemo(
    () => getCurrentLyricIndex(lyrics, lyricFluidTime),
    [lyrics, lyricFluidTime]
  );
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
    background: `
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
  const lyricRowHeight = isDesktopLyricsViewport ? 154 : isTabletLyricsViewport ? 132 : 112;
  const lyricFontSize = isDesktopLyricsViewport
    ? 'clamp(1.4rem, 2.9vw, 2.45rem)'
    : isTabletLyricsViewport
      ? 'clamp(1.18rem, 3.2vw, 1.9rem)'
    : 'clamp(1.05rem, 4.8vw, 1.62rem)';
  const lyricDenseFontSize = isDesktopLyricsViewport
    ? 'clamp(1.08rem, 2.15vw, 1.82rem)'
    : isTabletLyricsViewport
      ? 'clamp(0.98rem, 2.45vw, 1.48rem)'
    : 'clamp(0.88rem, 3.9vw, 1.28rem)';
  const lyricCompactFontSize = isDesktopLyricsViewport
    ? 'clamp(0.96rem, 1.82vw, 1.42rem)'
    : isTabletLyricsViewport
      ? 'clamp(0.86rem, 2.05vw, 1.22rem)'
    : 'clamp(0.78rem, 3.35vw, 1.08rem)';
  const lyricUltraCompactFontSize = isDesktopLyricsViewport
    ? 'clamp(0.88rem, 1.55vw, 1.18rem)'
    : isTabletLyricsViewport
      ? 'clamp(0.78rem, 1.78vw, 1.02rem)'
    : 'clamp(0.68rem, 2.8vw, 0.94rem)';
  const lyricLineHeight = isDesktopLyricsViewport ? '1.18' : isTabletLyricsViewport ? '1.2' : '1.22';
  const lyricTrackOffset = lyricWindowCenter >= 0
    ? -(centeredLyricFocusPosition - lyricWindowStart + 0.5) * lyricRowHeight
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

  const toggleFullLyrics = useCallback(() => {
    if (largeCoverRef.current && smallCoverRef.current) {
      prevRectsRef.current = {
        large: largeCoverRef.current.getBoundingClientRect(),
        small: smallCoverRef.current.getBoundingClientRect(),
      };
    }
    setShowFullLyrics((prev) => !prev);
  }, []);




  // Animate large cover from fullscreen position to Drive Mode center position
  useLayoutEffect(() => {
    const largeCover = largeCoverRef.current;
    const driveWindow = window as DriveTransitionWindow;
    const fullscreenRect = driveWindow.__fullscreenCoverRect;

    if (driveModeTransitionRetryRef.current !== null) {
      window.clearTimeout(driveModeTransitionRetryRef.current);
      driveModeTransitionRetryRef.current = null;
    }
    
    // Only animate if we have fullscreen rect and we're in compact mode
    if (!largeCover || !fullscreenRect || showFullLyrics) {
      // Clear the callback if it exists
      if (driveWindow.__clearDriveModeTransition) {
        driveWindow.__clearDriveModeTransition();
        delete driveWindow.__clearDriveModeTransition;
      }
      return;
    }

    gsap.killTweensOf(largeCover);
    gsap.set(largeCover, {
      autoAlpha: 0,
      willChange: 'transform, opacity',
    });

    let retryCount = 0;
    const startTransition = () => {
      const driveRect = largeCover.getBoundingClientRect();
      
      if (driveRect.width === 0 || driveRect.height === 0) {
        retryCount += 1;
        if (retryCount > 10) {
          gsap.set(largeCover, { clearProps: 'all' });
          delete driveWindow.__fullscreenCoverRect;
          if (driveWindow.__clearDriveModeTransition) {
            driveWindow.__clearDriveModeTransition();
            delete driveWindow.__clearDriveModeTransition;
          }
          return;
        }
        driveModeTransitionRetryRef.current = window.setTimeout(startTransition, 50);
        return;
      }
      
      animateCoverTransition(largeCover, fullscreenRect, driveRect);
    };

    startTransition();

    return () => {
      if (driveModeTransitionRetryRef.current !== null) {
        window.clearTimeout(driveModeTransitionRetryRef.current);
        driveModeTransitionRetryRef.current = null;
      }
      gsap.killTweensOf(largeCover);
    };
  }, [showFullLyrics]); // Re-run when showFullLyrics changes
  
  const animateCoverTransition = (largeCover: HTMLDivElement, fullscreenRect: CoverTransitionRect, driveRect: DOMRect) => {
    // Calculate initial position (from fullscreen)
    const initialX = fullscreenRect.left - driveRect.left;
    const initialY = fullscreenRect.top - driveRect.top;
    const initialScaleX = fullscreenRect.width / driveRect.width;
    const initialScaleY = fullscreenRect.height / driveRect.height;
    
    // Set initial state at fullscreen position
    gsap.set(largeCover, {
      x: initialX,
      y: initialY,
      scaleX: initialScaleX,
      scaleY: initialScaleY,
      transformOrigin: 'top left',
      zIndex: 100,
      autoAlpha: 1,
      willChange: 'transform, opacity',
    });
    
    // Animate to Drive Mode position
    gsap.to(largeCover, {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 0.6,
      ease: 'expo.out',
      onComplete: () => {
        gsap.set(largeCover, { clearProps: 'all' });
        driveModeTransitionRetryRef.current = null;
        delete (window as DriveTransitionWindow).__fullscreenCoverRect;
        
        // Clear the transition flag in parent
        const parentWindow = (window.parent || window) as DriveTransitionWindow;
        if (parentWindow.__clearDriveModeTransition) {
          parentWindow.__clearDriveModeTransition();
          delete parentWindow.__clearDriveModeTransition;
        }
      }
    });
  };

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
      
      // Hide track info during animation
      const trackInfo = largeCover.parentElement?.querySelector('.text-center') as HTMLElement;
      if (trackInfo) {
        gsap.set(trackInfo, { opacity: 0 });
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
          
          // Show track info after animation completes
          if (trackInfo) {
            gsap.to(trackInfo, { opacity: 1, duration: 0.3, ease: 'power2.out' });
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

  const handleBack = () => {
    if (isAnimatingBackRef.current) return;
    
    const largeCover = largeCoverRef.current;
    if (!largeCover) {
      onClose();
      return;
    }
    
    isAnimatingBackRef.current = true;
    
    // Get current Drive Mode large cover position
    const driveRect = largeCover.getBoundingClientRect();
    
    // Store Drive Mode position for FullscreenPlayer to animate from
    (window as DriveTransitionWindow).__driveModeBackRect = {
      top: driveRect.top,
      left: driveRect.left,
      width: driveRect.width,
      height: driveRect.height,
    };
    
    // Fade out Drive Player UI before closing
    const container = containerRef.current;
    if (container) {
      const childrenToFade = Array.from(container.children).filter(
        child => !child.classList.contains('large-cover-container')
      );
      gsap.to(childrenToFade, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose
      });
    } else {
      onClose();
    }
  };

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
      className={`${isEmbedded ? 'absolute' : 'fixed h-screen w-screen'} inset-0 z-50 flex flex-col overflow-hidden text-white`}
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
      <div className={`flex items-center justify-between px-2 md:px-4 xl:px-6 pt-2 md:pt-4 pb-1 md:pb-2 shrink-0 relative z-10 transition-opacity duration-500 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button
          onClick={handleBack}
          className="drive-back-button inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-white/20 hover:border-white/30 active:scale-95"
          aria-label="Back to fullscreen player"
        >
          <RiArrowLeftLine size={18} />
          <span>Back</span>
        </button>
        
        <span className="drive-mode-label text-xs font-bold uppercase tracking-widest text-white/80 hidden xs:inline">
          Drive Mode
        </span>

        {/* Lyrics Toggle Button */}
        <button
          onClick={toggleFullLyrics}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-xl transition-all duration-300 ${
            showFullLyrics
              ? 'border-accent/50 bg-accent/30 text-accent hover:bg-accent/40'
              : 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30'
          }`}
          aria-label="Toggle lyrics view"
        >
          {showFullLyrics ? <RiImageLine size={18} /> : <RiMusic2Line size={18} />}
          <span>{showFullLyrics ? 'Compact' : 'Lyrics'}</span>
        </button>
      </div>

      {/* Compact Album Art & Track Info - Always render, control visibility */}
      <div className={`drive-track-info flex items-center gap-1.5 md:gap-3 px-2 md:px-4 xl:px-6 py-1.5 md:py-3 shrink-0 transition-opacity duration-300 ${showFullLyrics ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="relative shrink-0">
          <div 
            ref={smallCoverRef}
            id="drive-mode-cover"
            className="h-10 w-10 xs:h-11 xs:w-11 md:h-14 md:w-14 xl:h-16 xl:w-16 overflow-hidden rounded-lg md:rounded-2xl border border-white/20 shadow-lg"
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
          <h1 className="truncate text-[11px] xs:text-xs md:text-base xl:text-lg font-bold text-white">
            {currentTrack.title}
          </h1>
          <p className="truncate text-[9px] xs:text-[10px] md:text-sm text-white/60">
            {currentTrack.artist}
          </p>
        </div>

        <button
          onClick={() => toggleLike(currentTrack.id)}
          className={`flex h-7 w-7 xs:h-8 xs:w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-lg transition hover:scale-110 hover:bg-white/20 active:scale-95 shrink-0 transition-opacity duration-500 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
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
      <div className="drive-lyrics-container flex-1 relative overflow-hidden min-h-0 px-3 sm:px-5 md:px-8 xl:px-12">
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
                aria-hidden="true"
                className="drive-lyric-reading-lane pointer-events-none absolute left-1/2 top-1/2 h-[132px] w-full max-w-6xl -translate-x-1/2 -translate-y-1/2"
              />
              <div
                className="drive-lyric-track absolute left-0 right-0 top-1/2 flex flex-col items-center"
                style={{
                  transform: `translate3d(0, ${lyricTrackOffset.toFixed(2)}px, 0)`,
                  willChange: 'transform',
                }}
              >
                {visibleLyrics.map((line, index) => {
                  const actualIndex = lyricWindowStart + index;
                  const distance = Math.abs(actualIndex - centeredLyricFocusPosition);
                  const focusFactor = Math.max(0, 1 - distance * 0.78);
                  const bloomFactor = Math.sin(focusFactor * Math.PI * 0.5);
                  const depthFactor = Math.min(distance / 6, 1);
                  const scaleValue = 0.9 + bloomFactor * 0.12 - depthFactor * 0.025;
                  const isCurrent = actualIndex === activeLyricIndex;
                  const isPastLine = actualIndex < activeLyricIndex;
                  const isReadingLine = isCurrent || distance < 0.72;
                  const lyricLength = line.text.length;
                  const denseThreshold = isDesktopLyricsViewport ? 58 : isTabletLyricsViewport ? 48 : 36;
                  const veryDenseThreshold = isDesktopLyricsViewport ? 92 : isTabletLyricsViewport ? 76 : 58;
                  const ultraDenseThreshold = isDesktopLyricsViewport ? 132 : isTabletLyricsViewport ? 108 : 86;
                  const isDenseLine = lyricLength > denseThreshold;
                  const isVeryDenseLine = lyricLength > veryDenseThreshold;
                  const isUltraDenseLine = lyricLength > ultraDenseThreshold;
                  const opacityBase = isPastLine ? 0.2 : 0.34;
                  const opacityValue = Math.max(opacityBase, 1 - Math.pow(Math.min(distance / 6.4, 1), 1.45));
                  const textAlpha = Math.min(1, opacityBase + bloomFactor * (isCurrent ? 0.82 : 0.62)).toFixed(3);
                  const textColor = `rgba(255, 255, 255, ${textAlpha})`;
                  const textShadow = bloomFactor > 0.08
                    ? `0 0 ${Math.round(8 + bloomFactor * 16)}px color-mix(in srgb, var(--accent) ${Math.round(18 + bloomFactor * 28)}%, transparent), 0 4px 18px rgba(0,0,0,0.74)`
                    : '0 3px 14px rgba(0,0,0,0.78)';
                  const lineFontSize = isVeryDenseLine
                    ? isUltraDenseLine ? lyricUltraCompactFontSize : lyricCompactFontSize
                    : isDenseLine
                      ? lyricDenseFontSize
                      : lyricFontSize;
                  const lineHeight = isUltraDenseLine ? (isDesktopLyricsViewport ? '1.14' : '1.16') : lyricLineHeight;
                  const transitionScale = lyricsTransition === 'fade'
                    ? 1
                    : lyricsTransition === 'instant'
                      ? isCurrent ? 1 : 0.96
                      : scaleValue;
                  const transitionOpacity = lyricsTransition === 'instant'
                    ? isCurrent ? 1 : 0
                    : lyricsTransition === 'fade'
                      ? isCurrent ? 1 : Math.max(opacityBase, 1 - Math.min(distance, 2.8) * 0.34)
                      : opacityValue;
                  const slideShift = lyricsTransition === 'slide' ? (isCurrent ? 0 : isPastLine ? -10 : 10) : 0;
                  const cssTransition = lyricsTransition === 'smooth'
                    ? undefined
                    : lyricsTransition === 'instant'
                      ? 'opacity 80ms linear'
                      : 'transform 260ms ease, opacity 220ms ease';

                  return (
                    <div
                      key={`${line.time}-${actualIndex}`}
                      aria-current={isCurrent ? 'true' : undefined}
                      className="drive-lyric-line relative flex w-full items-center justify-center px-2 text-center md:px-10 xl:px-16"
                      style={{
                        height: `${lyricRowHeight}px`,
                        transform: `translate3d(0, ${slideShift}px, 0) scale(${transitionScale.toFixed(3)})`,
                        opacity: transitionOpacity,
                        zIndex: isReadingLine ? 12 : Math.max(1, 10 - Math.round(distance)),
                        willChange: 'transform, opacity',
                        transition: cssTransition,
                      }}
                    >
                      <div
                        aria-hidden="true"
                        className="drive-lyric-line-glow pointer-events-none absolute left-1/2 top-1/2 h-24 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2"
                        style={{
                          opacity: bloomFactor * 0.17,
                          transform: `translate3d(-50%, -50%, 0) scaleX(${(0.68 + bloomFactor * 0.26).toFixed(3)})`,
                          background: 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--accent) 34%, rgba(255,255,255,0.1)) 50%, transparent 100%)',
                        }}
                      />
                      <div
                        className="drive-lyric-text relative w-full font-bold"
                        style={{
                          maxWidth: isVeryDenseLine ? 'min(95vw, 1040px)' : 'min(92vw, 980px)',
                          fontSize: lineFontSize,
                          lineHeight,
                          letterSpacing: '0',
                          color: textColor,
                          textShadow,
                          fontWeight: isReadingLine ? '900' : '700',
                          textWrap: 'balance',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          hyphens: 'auto',
                        }}
                      >
                        {line.text || 'Instrumental break'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">♪</div>
                <p className="text-lg text-white/50">No lyrics available</p>
                <p className="text-sm text-white/30 mt-2">Enjoy the music</p>
              </div>
            </div>
          )}
        </div>

        {/* Compact Mode - Large Album Art */}
        <div 
          className={`large-cover-container absolute inset-0 flex items-center justify-center ${
            showFullLyrics ? 'pointer-events-none' : ''
          }`}
        >
          <div className="flex flex-col items-center gap-2 xs:gap-2.5 md:gap-4 xl:gap-6 max-w-md w-full px-3 md:px-6">
            {/* Large Album Art - Much smaller on mobile */}
            <div 
              ref={largeCoverRef}
              className={`relative w-[min(60vw,240px,44dvh)] xs:w-[min(55vw,260px,44dvh)] sm:w-[min(50vw,300px,44dvh)] md:w-[min(45vw,340px,44dvh)] xl:w-[min(40vw,380px,44dvh)] aspect-square rounded-xl md:rounded-2xl xl:rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 ${showFullLyrics ? 'opacity-0' : 'opacity-100'}`}
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
            <div className={`text-center w-full px-1 transition-opacity duration-300 ${!showFullLyrics ? 'opacity-100' : 'opacity-0'}`}>
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
      <div className={`shrink-0 px-2 md:px-4 xl:px-6 pb-2 xs:pb-3 md:pb-5 xl:pb-6 space-y-1.5 md:space-y-3 transition-opacity duration-500 ${isIdle ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Progress Bar */}
        <div className="drive-progress-bar w-full">
          <div
            onClick={handleSeek}
            className="group relative h-0.5 xs:h-1 md:h-1.5 xl:h-2 cursor-pointer rounded-full bg-white/20 backdrop-blur-sm transition-all hover:h-1.5 md:hover:h-2.5"
          >
            <div
              className="h-full rounded-full transition-all duration-100 shadow-md pointer-events-none"
              style={{ 
                width: `${progressPercent}%`,
                background: `linear-gradient(to right, var(--gradient-from), var(--gradient-to))`
              }}
            />
          </div>
          <div className="mt-0.5 md:mt-1.5 flex justify-between text-[8px] xs:text-[9px] md:text-xs font-semibold text-white/40">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Playback Controls Row - Much smaller on mobile */}
        <div className="drive-controls flex items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-4 xl:gap-5">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`flex h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 xl:h-11 xl:w-11 items-center justify-center rounded-full border backdrop-blur-xl shadow-md transition ${
              shuffle 
                ? 'bg-accent/30 border-accent/50 text-accent' 
                : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20 hover:text-white'
            }`}
            aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            {shuffle ? <RiShuffleFill className="w-3 h-3 xs:w-3.5 xs:h-3.5 md:w-4 md:h-4 xl:w-[18px] xl:h-[18px]" /> : <RiShuffleLine className="w-3 h-3 xs:w-3.5 xs:h-3.5 md:w-4 md:h-4 xl:w-[18px] xl:h-[18px]" />}
          </button>

          {/* Previous */}
          <button
            onClick={prevTrack}
            className="flex h-9 w-9 xs:h-10 xs:w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 xl:h-14 xl:w-14 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white shadow-md transition hover:bg-white/20 active:scale-90"
            aria-label="Previous track"
          >
            <RiSkipBackFill className="w-4 h-4 xs:w-4.5 xs:h-4.5 md:w-5 md:h-5 xl:w-6 xl:h-6" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="flex h-11 w-11 xs:h-12 xs:w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 xl:h-20 xl:w-20 items-center justify-center rounded-full bg-accent text-white shadow-xl shadow-accent/30 transition hover:scale-105 active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <RiPauseFill className="w-5 h-5 xs:w-6 xs:h-6 md:w-7 md:h-7 xl:w-9 xl:h-9" /> : <RiPlayFill className="ml-0.5 w-5 h-5 xs:w-6 xs:h-6 md:w-7 md:h-7 xl:w-9 xl:h-9" />}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            className="flex h-9 w-9 xs:h-10 xs:w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 xl:h-14 xl:w-14 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white shadow-md transition hover:bg-white/20 active:scale-90"
            aria-label="Next track"
          >
            <RiSkipForwardFill className="w-4 h-4 xs:w-4.5 xs:h-4.5 md:w-5 md:h-5 xl:w-6 xl:h-6" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`flex h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 xl:h-11 xl:w-11 items-center justify-center rounded-full border backdrop-blur-xl shadow-md transition ${
              repeat !== 'off'
                ? 'bg-accent/30 border-accent/50 text-accent' 
                : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20 hover:text-white'
            }`}
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
              className={`absolute inset-0 flex items-center gap-3 transition-all duration-500 ease-out ${
                isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
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
