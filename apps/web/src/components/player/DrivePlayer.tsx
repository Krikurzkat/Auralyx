import { useMemo, useLayoutEffect, useRef, useState } from 'react';
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
}

export default function DrivePlayer({ onClose }: DrivePlayerProps) {
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
  const smallCoverRef = useRef<HTMLDivElement>(null); // Small cover in lyrics mode
  const isAnimatingBackRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);
  
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

  // Intro animation for all elements
  useLayoutEffect(() => {
    if (hasAnimatedRef.current || !containerRef.current) return;
    hasAnimatedRef.current = true;

    const container = containerRef.current;
    
    // Select elements to animate
    const backButton = container.querySelector('.drive-back-button');
    const driveModeLabel = container.querySelector('.drive-mode-label');
    const lyricsContainer = container.querySelector('.drive-lyrics-container');
    const progressBar = container.querySelector('.drive-progress-bar');
    const controls = container.querySelector('.drive-controls');

    // Ensure all elements start visible (in case animation fails)
    gsap.set([backButton, driveModeLabel, lyricsContainer, progressBar, controls], {
      opacity: 1,
      clearProps: 'transform',
    });

    // Create timeline for staggered animations
    const tl = gsap.timeline();

    // Animate background blobs
    tl.from(container.querySelectorAll('.drive-bg-blob'), {
      scale: 0.8,
      opacity: 0,
      duration: 1.2,
      ease: 'power4.out',
      stagger: 0.2,
    }, 0);

    // Animate back button
    if (backButton) {
      tl.from(backButton, {
        opacity: 0,
        scale: 0.8,
        x: -20,
        duration: 0.4,
        ease: 'back.out(2)',
        clearProps: 'all',
      }, 0.2);
    }

    // Animate Drive Mode label
    if (driveModeLabel) {
      tl.from(driveModeLabel, {
        opacity: 0,
        y: -10,
        duration: 0.35,
        ease: 'power3.out',
        clearProps: 'all',
      }, 0.25);
    }

    // Note: track info animation removed - it's controlled by showFullLyrics state

    // Animate lyrics container
    if (lyricsContainer) {
      tl.from(lyricsContainer, {
        opacity: 0,
        scale: 0.95,
        duration: 0.6,
        ease: 'power4.out',
        clearProps: 'all',
      }, 0.4);
    }

    // Animate progress bar
    if (progressBar) {
      tl.from(progressBar, {
        opacity: 0,
        scaleX: 0,
        duration: 0.5,
        ease: 'power3.out',
        transformOrigin: 'left center',
        clearProps: 'all',
      }, 0.5);
    }

    // Animate controls
    if (controls) {
      tl.from(controls, {
        opacity: 0,
        y: 30,
        scale: 0.95,
        duration: 0.5,
        ease: 'power4.out',
        clearProps: 'all',
      }, 0.55);
    }
  }, []);

  // Animate large cover from fullscreen position to Drive Mode center position
  useLayoutEffect(() => {
    const largeCover = largeCoverRef.current;
    const fullscreenRect = (window as any).__fullscreenCoverRect;
    
    if (!largeCover || !fullscreenRect || showFullLyrics) return; // Only animate in compact mode
    
    // Get Drive Mode large cover final position
    const driveRect = largeCover.getBoundingClientRect();
    
    // Calculate initial position (from fullscreen)
    const initialX = fullscreenRect.left - driveRect.left;
    const initialY = fullscreenRect.top - driveRect.top;
    const initialScaleX = fullscreenRect.width / driveRect.width;
    const initialScaleY = fullscreenRect.height / driveRect.height;
    
    // Set initial state
    gsap.set(largeCover, {
      x: initialX,
      y: initialY,
      scaleX: initialScaleX,
      scaleY: initialScaleY,
      transformOrigin: 'top left',
      zIndex: 100,
    });
    
    // Animate to final position
    gsap.to(largeCover, {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 0.6,
      ease: 'expo.out',
      delay: 0.1,
      onComplete: () => {
        gsap.set(largeCover, { clearProps: 'zIndex' });
      }
    });
    
    // Clear the stored rect
    delete (window as any).__fullscreenCoverRect;
  }, [showFullLyrics]); // Re-run when showFullLyrics changes

  // Animate transition between compact and full lyrics mode
  useLayoutEffect(() => {
    if (!lyricsContainerRef.current) return;
    
    const container = lyricsContainerRef.current;
    
    // Animate in
    gsap.fromTo(container,
      {
        opacity: 0,
        scale: 0.95,
        y: 20,
      },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: 'power3.out',
      }
    );
  }, [showFullLyrics]);

  // Animate cover transition: large cover → small cover when switching to lyrics
  useLayoutEffect(() => {
    const largeCover = largeCoverRef.current;
    const smallCover = smallCoverRef.current;
    
    if (!currentTrack) return;
    
    if (showFullLyrics) {
      // Switching to lyrics mode: animate large cover to small cover position
      if (!largeCover || !smallCover) return;
      
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const largeRect = largeCover.getBoundingClientRect();
        const smallRect = smallCover.getBoundingClientRect();
        
        // Ensure both elements are visible and have valid dimensions
        if (largeRect.width === 0 || smallRect.width === 0) return;
        
        // Calculate transform values
        const deltaX = smallRect.left - largeRect.left;
        const deltaY = smallRect.top - largeRect.top;
        const scaleX = smallRect.width / largeRect.width;
        const scaleY = smallRect.height / largeRect.height;
        
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
            // Hide large cover and show small cover
            gsap.set(largeCover, { 
              opacity: 0,
              clearProps: 'position,left,top,width,height,zIndex'
            });
            gsap.set(smallCover, { opacity: 1 });
          }
        });
      }, 50);
      
      return () => clearTimeout(timer);
    } else {
      // Switching to compact mode: animate small cover to large cover position
      if (!largeCover || !smallCover) return;
      
      const timer = setTimeout(() => {
        const largeRect = largeCover.getBoundingClientRect();
        const smallRect = smallCover.getBoundingClientRect();
        
        // Ensure both elements have valid dimensions
        if (largeRect.width === 0 || smallRect.width === 0) return;
        
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
            // Clean up transform properties
            gsap.set(largeCover, { 
              clearProps: 'position,left,top,width,height,borderRadius,zIndex'
            });
          }
        });
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [showFullLyrics, currentTrack]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekTo(percent * duration);
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
    
    // Close Drive Mode - FullscreenPlayer will handle the animation
    onClose();
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
    <div ref={containerRef} className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden text-white">
      {/* Background Layer - Content to be blurred */}
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
      
      {/* Glassmorphism layer with extreme blur */}
      <div className="absolute inset-0 -z-10" style={{
        backdropFilter: 'blur(120px) saturate(180%)',
        WebkitBackdropFilter: 'blur(120px) saturate(180%)',
        background: 'rgba(13, 13, 13, 0.4)'
      }} />
      
      {/* Top Header - Compact */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 relative z-10">
        <button
          onClick={handleBack}
          className="drive-back-button flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-white/20 hover:border-white/30 active:scale-95"
          aria-label="Back to fullscreen player"
        >
          <RiArrowLeftLine size={20} />
          <span>Back</span>
        </button>
        
        <span className="drive-mode-label text-xs font-bold uppercase tracking-widest text-white/80">
          Drive Mode
        </span>

        {/* Lyrics Toggle Button */}
        <button
          onClick={() => setShowFullLyrics(!showFullLyrics)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur-xl transition-all duration-300 ${
            showFullLyrics
              ? 'border-accent/50 bg-accent/30 text-accent hover:bg-accent/40'
              : 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30'
          }`}
          aria-label="Toggle lyrics view"
        >
          {showFullLyrics ? <RiImageLine size={18} /> : <RiMusic2Line size={18} />}
          <span className="hidden sm:inline">{showFullLyrics ? 'Lyrics' : 'Compact'}</span>
        </button>
      </div>

      {/* Compact Album Art & Track Info - Only render in lyrics mode */}
      {showFullLyrics && (
        <div className="drive-track-info flex items-center gap-3 px-4 py-3 shrink-0 transition-opacity duration-300">
          <div 
            className="relative shrink-0"
          >
            <div 
              ref={smallCoverRef}
              id="drive-mode-cover"
              className="h-16 w-16 overflow-hidden rounded-2xl border border-white/20 shadow-lg"
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
            <h1 className="truncate text-base font-bold text-white">
              {currentTrack.title}
            </h1>
            <p className="truncate text-sm text-white/60">
              {currentTrack.artist}
            </p>
          </div>

          <button
            onClick={() => toggleLike(currentTrack.id)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-lg transition hover:scale-110 hover:bg-white/20 active:scale-95 shrink-0"
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            {isLiked ? (
              <RiHeartFill size={20} className="text-accent" />
            ) : (
              <RiHeartLine size={20} className="text-white/80" />
            )}
          </button>
        </div>
      )}

      {/* Hidden small cover for animation reference - always rendered */}
      <div className="absolute opacity-0 pointer-events-none -z-50">
        <div 
          ref={smallCoverRef}
          className="h-16 w-16 overflow-hidden rounded-2xl"
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
                const verticalOffset = direction * Math.pow(distance, 1.3) * 130; // Increased for multi-line support
                // Reduced scale values to prevent overlap
                const scaleValue = 1.1 - Math.min(distance * 0.15, 0.45);
                const opacityValue = Math.max(0.08, 1 - distance * 0.2);
                const blurAmount = Math.min(8, Math.pow(distance, 1.3) * 1.1);
                const glow = Math.max(0, 1 - distance * 0.52);
                const isCurrent = actualIndex === activeLyricIndex;

                return (
                  <div
                    key={`${line.time}-${actualIndex}`}
                    className="absolute w-full max-w-3xl left-1/2 -translate-x-1/2 px-8 text-center font-bold"
                    style={{
                      top: '50%',
                      fontSize: '1.5rem', // Fixed font size - scaling handles size changes
                      lineHeight: '1.3',
                      transform: `translate3d(-50%, calc(-50% + ${verticalOffset.toFixed(2)}px), 0) scale(${scaleValue.toFixed(3)})`,
                      opacity: opacityValue,
                      filter: `blur(${blurAmount.toFixed(2)}px) saturate(${(0.76 + glow * 0.5).toFixed(2)})`,
                      color: 'white',
                      textShadow: isCurrent
                        ? `0 0 ${Math.round(60 * glow)}px rgba(255,255,255,0.8), 0 0 ${Math.round(30 * glow)}px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.3)`
                        : `0 0 ${Math.round(18 * glow)}px rgba(255,255,255,${0.06 + glow * 0.1})`,
                      fontWeight: isCurrent ? '900' : '700',
                      zIndex: isCurrent ? 10 : Math.max(1, 10 - Math.round(distance)),
                      willChange: 'transform, opacity, filter',
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
        <div className={`absolute inset-0 flex items-center justify-center ${!showFullLyrics ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col items-center gap-6 max-w-md w-full">
            {/* Large Album Art */}
            <div 
              ref={largeCoverRef}
              className="relative w-full aspect-square max-w-sm rounded-3xl overflow-hidden shadow-2xl ring-2 ring-white/10"
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
                  <div className="text-white/40 text-8xl">♪</div>
                </div>
              )}
            </div>
            
            {/* Track Info */}
            <div className="text-center w-full">
              <h2 className="text-3xl font-bold text-white mb-2 truncate">{currentTrack.title}</h2>
              <p className="text-xl text-white/60 truncate">{currentTrack.artist}</p>
              {currentTrack.album && (
                <p className="text-base text-white/40 mt-1 truncate">{currentTrack.album}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls Section - Compact & Fixed */}
      <div className="shrink-0 px-4 pb-6 space-y-3">
        {/* Progress Bar */}
        <div className="drive-progress-bar w-full">
          <div
            onClick={handleSeek}
            className="group relative h-1.5 cursor-pointer rounded-full bg-white/20 backdrop-blur-sm transition-all hover:h-2"
          >
            <div
              className="h-full rounded-full transition-all duration-100 shadow-md pointer-events-none"
              style={{ 
                width: `${progressPercent}%`,
                background: `linear-gradient(to right, var(--gradient-from), var(--gradient-to))`
              }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-white/40">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Playback Controls Row */}
        <div className="drive-controls flex items-center justify-center gap-4">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl shadow-md transition ${
              shuffle 
                ? 'bg-accent/30 border-accent/50 text-accent' 
                : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20 hover:text-white'
            }`}
            aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            {shuffle ? <RiShuffleFill size={18} /> : <RiShuffleLine size={18} />}
          </button>

          {/* Previous */}
          <button
            onClick={prevTrack}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white shadow-md transition hover:bg-white/20 active:scale-90"
            aria-label="Previous track"
          >
            <RiSkipBackFill size={22} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-xl shadow-accent/30 transition hover:scale-105 active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <RiPauseFill size={32} /> : <RiPlayFill size={32} className="ml-1" />}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white shadow-md transition hover:bg-white/20 active:scale-90"
            aria-label="Next track"
          >
            <RiSkipForwardFill size={22} />
          </button>

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl shadow-md transition ${
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
