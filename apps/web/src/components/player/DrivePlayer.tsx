import { useCallback, useMemo, useLayoutEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { formatDuration, getLyricsForTrack } from '../../utils/formatters';
import { useFluidLyricMotion } from '../../utils/lyricMotion';
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
  
  // State for compact/full lyrics mode
  const [showFullLyrics, setShowFullLyrics] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  const lyrics = useMemo(
    () => (currentTrack ? getLyricsForTrack(currentTrack.id, currentTrack.lyrics) : []),
    [currentTrack]
  );
  // Perfect sync offset (900ms look-ahead)
  const { focusPosition: lyricFocusPosition, activeLyricIndex } = useFluidLyricMotion(lyrics, currentTime + 0.80, isPlaying);
  const lyricWindowCenter = lyrics.length > 0
    ? Math.max(0, Math.min(lyrics.length - 1, Math.floor(lyricFocusPosition)))
    : -1;
  const lyricWindowStart = lyricWindowCenter >= 0 ? Math.max(0, lyricWindowCenter - 5) : 0;
  const visibleLyrics = lyrics.slice(lyricWindowStart, lyricWindowCenter >= 0 ? lyricWindowCenter + 6 : 0);

  // Calculate cover URL early so it can be used in effects
  const coverUrl = currentTrack?.coverUrl?.startsWith('/')
    ? `http://localhost:3001${currentTrack.coverUrl}`
    : currentTrack?.coverUrl;

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
    const fullscreenRect = (window as any).__fullscreenCoverRect;
    
    // Only animate if we have fullscreen rect and we're in compact mode
    if (!largeCover || !fullscreenRect || showFullLyrics) {
      // Clear the callback if it exists
      if ((window as any).__clearDriveModeTransition) {
        (window as any).__clearDriveModeTransition();
        delete (window as any).__clearDriveModeTransition;
      }
      return;
    }
    
    // Wait for next frame to ensure Drive Mode is rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Get Drive Mode large cover final position
        const driveRect = largeCover.getBoundingClientRect();
        
        if (driveRect.width === 0 || driveRect.height === 0) {
          // Element not ready yet, try again
          setTimeout(() => {
            const retryRect = largeCover.getBoundingClientRect();
            if (retryRect.width > 0) {
              animateCoverTransition(largeCover, fullscreenRect, retryRect);
            }
          }, 50);
          return;
        }
        
        animateCoverTransition(largeCover, fullscreenRect, driveRect);
      });
    });
  }, [showFullLyrics]); // Re-run when showFullLyrics changes
  
  const animateCoverTransition = (largeCover: HTMLDivElement, fullscreenRect: any, driveRect: DOMRect) => {
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
        delete (window as any).__fullscreenCoverRect;
        
        // Clear the transition flag in parent
        const parentWindow = window.parent || window;
        if ((parentWindow as any).__clearDriveModeTransition) {
          (parentWindow as any).__clearDriveModeTransition();
          delete (parentWindow as any).__clearDriveModeTransition;
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
    (window as any).__driveModeBackRect = {
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

  // Get repeat icon based on mode
  const getRepeatIcon = () => {
    if (repeat === 'one') return <RiRepeat2Line size={20} />;
    if (repeat === 'all') return <RiRepeatFill size={20} />;
    return <RiRepeatLine size={20} />;
  };

  return (
    <div ref={containerRef} className={`${isEmbedded ? 'absolute' : 'fixed h-screen w-screen'} inset-0 z-50 flex flex-col overflow-hidden text-white`}>
      {/* Background Layer - Content to be blurred */}
      {!isEmbedded && (
        <div className="absolute inset-0 -z-20">
          {/* Animated gradient blobs */}
          <div className="drive-bg-blob absolute left-[-20%] top-[-20%] h-[600px] w-[600px] rounded-full opacity-60 animate-pulse-glow" 
            style={{ 
              background: `radial-gradient(circle, ${currentTrack.coverGradient?.[0] || '#FF6B35'} 0%, transparent 70%)`,
              filter: 'blur(80px)'
            }} 
          />
          <div className="drive-bg-blob absolute right-[-15%] top-[30%] h-[500px] w-[500px] rounded-full opacity-50 animate-pulse-glow" 
            style={{ 
              background: `radial-gradient(circle, ${currentTrack.coverGradient?.[1] || '#E8470A'} 0%, transparent 70%)`,
              filter: 'blur(80px)',
              animationDelay: '2s'
            }} 
          />
          <div className="drive-bg-blob absolute bottom-[-10%] left-[20%] h-[550px] w-[550px] rounded-full opacity-40 animate-pulse-glow" 
            style={{ 
              background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
              filter: 'blur(80px)',
              animationDelay: '4s'
            }} 
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{
            background: `linear-gradient(180deg, ${currentTrack.coverGradient?.[0] || '#1E1E22'}40 0%, #0a0a0a 50%, #000000 100%)`
          }} />
        </div>
      )}
      
      {/* Glassmorphism layer with extreme blur */}
      {!isEmbedded && (
        <div className="absolute inset-0 -z-10" style={{
          backdropFilter: 'blur(120px) saturate(180%)',
          WebkitBackdropFilter: 'blur(120px) saturate(180%)',
          background: 'rgba(13, 13, 13, 0.4)'
        }} />
      )}
      
      {/* Top Header - Compact */}
      <div className="flex items-center justify-between px-2 md:px-4 lg:px-6 pt-2 md:pt-4 pb-1 md:pb-2 shrink-0 relative z-10">
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
      <div className={`drive-track-info flex items-center gap-1.5 md:gap-3 px-2 md:px-4 lg:px-6 py-1.5 md:py-3 shrink-0 transition-opacity duration-300 ${showFullLyrics ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="relative shrink-0">
          <div 
            ref={smallCoverRef}
            id="drive-mode-cover"
            className="h-10 w-10 xs:h-11 xs:w-11 md:h-14 md:w-14 lg:h-16 lg:w-16 overflow-hidden rounded-lg md:rounded-2xl border border-white/20 shadow-lg"
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
          <h1 className="truncate text-[11px] xs:text-xs md:text-base lg:text-lg font-bold text-white">
            {currentTrack.title}
          </h1>
          <p className="truncate text-[9px] xs:text-[10px] md:text-sm text-white/60">
            {currentTrack.artist}
          </p>
        </div>

        <button
          onClick={() => toggleLike(currentTrack.id)}
          className="flex h-7 w-7 xs:h-8 xs:w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-lg transition hover:scale-110 hover:bg-white/20 active:scale-95 shrink-0"
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
      <div className="drive-lyrics-container flex-1 relative px-6 overflow-hidden min-h-0">
        {/* Lyrics Mode */}
        <div className={`absolute inset-0 ${showFullLyrics ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          {lyrics.length > 0 ? (
            <div className="absolute inset-0">
              {visibleLyrics.map((line, index) => {
                const actualIndex = lyricWindowStart + index;
                const relativePosition = actualIndex - lyricFocusPosition;
                const distance = Math.abs(relativePosition);
                const direction = relativePosition < 0 ? -1 : 1;
                const verticalOffset = direction * Math.pow(distance, 1.05) * 48; // Tighter spacing for Drive Mode
                // Reduced scale values to prevent overlap
                const scaleValue = 1.1 - Math.min(distance * 0.15, 0.45);
                const opacityValue = Math.max(0.08, 1 - distance * 0.2);
                const glow = Math.max(0, 1 - distance * 0.52);
                const isCurrent = actualIndex === activeLyricIndex;
                
                // Simplify for performance: no blur filter. Transition color from gray to white.
                // Add a lightweight theme-colored shadow for the active line.
                // Strictly use grey for non-active lines and white + shadow for active line
                const textColor = isCurrent ? '#ffffff' : 'rgb(128, 128, 128)';
                const textShadow = isCurrent ? `0 0 14px var(--accent)` : 'none';

                return (
                  <div
                    key={`${line.time}-${actualIndex}`}
                    className="absolute w-full max-w-3xl left-1/2 -translate-x-1/2 px-8 text-center font-bold"
                    style={{
                      top: '50%',
                      fontSize: 'clamp(0.85rem, 3.5vw, 1.35rem)', // Slightly smaller for better spacing
                      lineHeight: '1.4',
                      letterSpacing: '0.02em',
                      transform: `translate3d(-50%, calc(-50% + ${verticalOffset.toFixed(2)}px), 0) scale(${scaleValue.toFixed(3)})`,
                      opacity: opacityValue,
                      color: textColor,
                      textShadow,
                      fontWeight: isCurrent ? '900' : '700',
                      zIndex: isCurrent ? 10 : Math.max(1, 10 - Math.round(distance)),
                      willChange: 'transform, opacity, color',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      hyphens: 'auto',
                      whiteSpace: 'normal',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '1.3em',
                      maxHeight: '3.9em', // Allow up to 3 lines (1.3em × 3)
                    }}
                  >
                    {line.text || '♪'}
                  </div>
                );
              })}
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
          <div className="flex flex-col items-center gap-2 xs:gap-2.5 md:gap-4 lg:gap-6 max-w-md w-full px-3 md:px-6">
            {/* Large Album Art - Much smaller on mobile */}
            <div 
              ref={largeCoverRef}
              className={`relative w-[min(60vw,240px)] xs:w-[min(55vw,260px)] sm:w-[min(50vw,300px)] md:w-[min(45vw,340px)] lg:w-[min(40vw,380px)] aspect-square rounded-xl md:rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 ${showFullLyrics ? 'opacity-0' : 'opacity-100'}`}
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
                  <div className="text-white/40 text-4xl xs:text-5xl md:text-6xl lg:text-8xl">♪</div>
                </div>
              )}
            </div>
            
            {/* Track Info - Smaller text on mobile */}
            <div className={`text-center w-full px-1 transition-opacity duration-300 ${!showFullLyrics ? 'opacity-100' : 'opacity-0'}`}>
              <h2 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-0.5 md:mb-1 lg:mb-2 truncate leading-tight">{currentTrack.title}</h2>
              <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-white/60 truncate">{currentTrack.artist}</p>
              {currentTrack.album && (
                <p className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg text-white/40 mt-0.5 md:mt-1 truncate">{currentTrack.album}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls Section - Compact & Fixed */}
      <div className="shrink-0 px-2 md:px-4 lg:px-6 pb-2 xs:pb-3 md:pb-5 lg:pb-6 space-y-1.5 md:space-y-3">
        {/* Progress Bar */}
        <div className="drive-progress-bar w-full">
          <div
            onClick={handleSeek}
            className="group relative h-0.5 xs:h-1 md:h-1.5 lg:h-2 cursor-pointer rounded-full bg-white/20 backdrop-blur-sm transition-all hover:h-1.5 md:hover:h-2.5"
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
        <div className="drive-controls flex items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-4 lg:gap-5">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`flex h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full border backdrop-blur-xl shadow-md transition ${
              shuffle 
                ? 'bg-accent/30 border-accent/50 text-accent' 
                : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20 hover:text-white'
            }`}
            aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            {shuffle ? <RiShuffleFill className="w-3 h-3 xs:w-3.5 xs:h-3.5 md:w-4 md:h-4 lg:w-[18px] lg:h-[18px]" /> : <RiShuffleLine className="w-3 h-3 xs:w-3.5 xs:h-3.5 md:w-4 md:h-4 lg:w-[18px] lg:h-[18px]" />}
          </button>

          {/* Previous */}
          <button
            onClick={prevTrack}
            className="flex h-9 w-9 xs:h-10 xs:w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white shadow-md transition hover:bg-white/20 active:scale-90"
            aria-label="Previous track"
          >
            <RiSkipBackFill className="w-4 h-4 xs:w-4.5 xs:h-4.5 md:w-5 md:h-5 lg:w-6 lg:h-6" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="flex h-11 w-11 xs:h-12 xs:w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 items-center justify-center rounded-full bg-accent text-white shadow-xl shadow-accent/30 transition hover:scale-105 active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <RiPauseFill className="w-5 h-5 xs:w-6 xs:h-6 md:w-7 md:h-7 lg:w-9 lg:h-9" /> : <RiPlayFill className="ml-0.5 w-5 h-5 xs:w-6 xs:h-6 md:w-7 md:h-7 lg:w-9 lg:h-9" />}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            className="flex h-9 w-9 xs:h-10 xs:w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white shadow-md transition hover:bg-white/20 active:scale-90"
            aria-label="Next track"
          >
            <RiSkipForwardFill className="w-4 h-4 xs:w-4.5 xs:h-4.5 md:w-5 md:h-5 lg:w-6 lg:h-6" />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`flex h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full border backdrop-blur-xl shadow-md transition ${
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
    </div>
  );
}
