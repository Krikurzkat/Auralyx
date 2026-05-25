import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import type { Track } from '../../types';
import { formatDuration, getLyricsForTrack } from '../../utils/formatters';
import { useFluidLyricMotion } from '../../utils/lyricMotion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  RiArrowLeftLine,
  RiShuffleLine,
  RiSkipBackFill,
  RiPlayFill,
  RiPauseFill,
  RiSkipForwardFill,
  RiRepeatLine,
  RiRepeat2Line,
  RiRepeatOneLine,
  RiHeartLine,
  RiHeartFill,
  RiVolumeUpLine,
  RiVolumeMuteLine,
  RiCarLine,
} from 'react-icons/ri';
import { gsap } from 'gsap';
import { bottomPlayerCoverRef } from '../layout/BottomPlayer';
import DrivePlayer from './DrivePlayer';

type TransitionState = 'closed' | 'opening' | 'settling' | 'open' | 'closing';

// Shared ref for tracking clicked track covers
export const clickedTrackCoverRef: { current: HTMLElement | null } = { current: null };

function getTrackCoverUrl(track: Track | null) {
  if (!track?.coverUrl) return null;
  return track.coverUrl.startsWith('/') ? `http://localhost:3001${track.coverUrl}` : track.coverUrl;
}

export default function FullscreenPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    isFullscreenOpen,
    queue,
    queueIndex,
    showLyrics,
    showQueue,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleLyrics,
    toggleQueue,
    playTrack,
    setFullscreenOpen,
  } = usePlayerStore();
  const { likedTrackIds, toggleLike } = useLibraryStore();

  const [isFullscreenInteractable, setFullscreenInteractable] = useState(false);
  const [transitionState, setTransitionState] = useState<TransitionState>('closed');
  const [isDriveMode, setIsDriveMode] = useState(false);
  const [isDriveModeTransitioning, setIsDriveModeTransitioning] = useState(false);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const coverWrapperRef = useRef<HTMLDivElement>(null);
  const driveModeButtonRef = useRef<HTMLButtonElement>(null);
  const driveModeTransitionRef = useRef<gsap.core.Timeline | null>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLHeadingElement>(null);
  const previousOpenRef = useRef(isFullscreenOpen);
  const activeTransitionRef = useRef<gsap.core.Timeline | null>(null);
  const closeCanvasTimeoutRef = useRef<number | null>(null);
  const previousTrackIdRef = useRef<string | null>(null);
  const autoTransitionFrameRef = useRef<number | null>(null);
  const queueAnimationFrameRef = useRef<number | null>(null);

  const visualTrack = currentTrack;
  const coverUrl = getTrackCoverUrl(visualTrack);
  const lyrics = useMemo(() => (visualTrack ? getLyricsForTrack(visualTrack.id, visualTrack.lyrics) : []), [visualTrack]);
  // Perfect sync offset (800ms look-ahead) – matches DrivePlayer
  const { focusPosition: lyricFocusPosition, activeLyricIndex } = useFluidLyricMotion(lyrics, currentTime + 0.90, isPlaying);
  const lyricWindowCenter = lyrics.length > 0
    ? Math.max(0, Math.min(lyrics.length - 1, Math.floor(lyricFocusPosition)))
    : -1;
  const lyricWindowStart = lyricWindowCenter >= 0 ? Math.max(0, lyricWindowCenter - 4) : 0;
  const visibleLyrics = lyrics.slice(lyricWindowStart, lyricWindowCenter >= 0 ? lyricWindowCenter + 7 : 0);

  const upcomingTracks = useMemo(() => {
    if (queueIndex < 0) return queue.slice(0, 5);
    return queue.slice(queueIndex + 1, queueIndex + 6);
  }, [queue, queueIndex]);

  const visibleUpcomingTracks = upcomingTracks.slice(0, 4);
  const shellShouldBeVisible = !!visualTrack && (isFullscreenOpen || transitionState !== 'closed');
  const RepeatIcon = repeat === 'one' ? RiRepeatOneLine : repeat === 'all' ? RiRepeat2Line : RiRepeatLine;
  const startColor = visualTrack?.coverGradient?.[0] || '#333333';
  const currentQueuePosition = queueIndex >= 0 ? queueIndex + 1 : 1;
  const isLyricsPanelActive = showLyrics || !showQueue;
  const panelTitle = isLyricsPanelActive ? 'Lyrics' : 'Up Next';
  const isLiked = visualTrack ? likedTrackIds.has(visualTrack.id) : false;

  const animateModeToggle = (button: HTMLButtonElement | null, hovered: boolean, active: boolean) => {
    if (!button) return;
    const icon = button.querySelector('svg');

    gsap.to(button, {
      scale: hovered ? 1.05 : active ? 1.03 : 1,
      y: hovered ? -2 : 0,
      boxShadow: active
        ? '0 14px 30px rgba(232,71,10,0.22)'
        : hovered
        ? '0 12px 24px rgba(0,0,0,0.24)'
        : '0 0px 0px rgba(0,0,0,0)',
      duration: 0.22,
      ease: 'power2.out',
      overwrite: 'auto',
      force3D: true,
    });

    if (icon) {
      gsap.to(icon, {
        rotation: hovered ? 12 : 0,
        scale: active ? 1.08 : hovered ? 1.04 : 1,
        duration: 0.22,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const pressModeToggle = (button: HTMLButtonElement | null) => {
    if (!button) return;
    gsap.to(button, {
      scale: 0.96,
      duration: 0.1,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const selectWithinShell = (selector: string) => {
    if (!shellRef.current) return [] as HTMLElement[];
    return Array.from(shellRef.current.querySelectorAll<HTMLElement>(selector));
  };

  const gsapSetIfPresent = (targets: HTMLElement[], vars: gsap.TweenVars) => {
    if (targets.length > 0) {
      gsap.set(targets, vars);
    }
  };

  useEffect(() => {
    animateModeToggle(driveModeButtonRef.current, false, isDriveMode);
  }, [isDriveMode]);

  const clearCloseCanvasTimeout = () => {
    if (closeCanvasTimeoutRef.current !== null) {
      window.clearTimeout(closeCanvasTimeoutRef.current);
      closeCanvasTimeoutRef.current = null;
    }
  };

  const clearAutoTransitionFrame = () => {
    if (autoTransitionFrameRef.current !== null) {
      window.cancelAnimationFrame(autoTransitionFrameRef.current);
      autoTransitionFrameRef.current = null;
    }
  };

  const clearQueueAnimationFrame = () => {
    if (queueAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(queueAnimationFrameRef.current);
      queueAnimationFrameRef.current = null;
    }
  };

  const animateUpNextQueueItems = (delay = 0) => {
    clearQueueAnimationFrame();
    queueAnimationFrameRef.current = window.requestAnimationFrame(() => {
      const queueItems = selectWithinShell('.queue-item');
      if (queueItems.length === 0) return;

      gsap.killTweensOf(queueItems);
      gsap.set(queueItems, {
        willChange: 'transform, opacity, filter',
      });

      gsap.fromTo(
        queueItems,
        {
          autoAlpha: 0,
          y: 18,
          scale: 0.972,
          filter: 'blur(10px)',
        },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.64,
          delay,
          stagger: {
            each: 0.065,
            from: 'start',
          },
          ease: 'power4.out',
          overwrite: 'auto',
          clearProps: 'transform,opacity,visibility,filter,willChange',
        }
      );
    });
  };

  const resetAnimatedState = () => {
    const coverWrapper = coverWrapperRef.current;
    const shell = shellRef.current;
    if (!coverWrapper || !shell) return;

    gsapSetIfPresent(selectWithinShell('.fullscreen-overlay-bg'), { opacity: 0 });
    gsapSetIfPresent(selectWithinShell('.fullscreen-cover-2d'), { opacity: 1 });
    gsapSetIfPresent(selectWithinShell('.fullscreen-close-btn, .fullscreen-track-title, .fullscreen-artist, .fullscreen-track-badges, .fullscreen-tabs, .fullscreen-progress-bar, .fullscreen-controls, .fullscreen-lyrics-panel'), {
      clearProps: 'transform,opacity,scale',
    });
    gsapSetIfPresent(selectWithinShell('.queue-item'), {
      clearProps: 'transform,opacity',
    });
    gsap.set(coverWrapper, { clearProps: 'x,y,scaleX,scaleY,transformOrigin,opacity' });
  };

  const killActiveTransition = () => {
    gsap.killTweensOf('.fullscreen-cover-wrapper');
    activeTransitionRef.current?.kill();
    activeTransitionRef.current = null;
  };

  useEffect(() => {
    return () => {
      killActiveTransition();
      clearCloseCanvasTimeout();
      clearAutoTransitionFrame();
      clearQueueAnimationFrame();
    };
  }, []);

  useEffect(() => {
    if (!currentTrack) {
      clearCloseCanvasTimeout();
      clearAutoTransitionFrame();
      killActiveTransition();
      setFullscreenInteractable(false);
      setTransitionState('closed');
      resetAnimatedState();
      if (isFullscreenOpen) {
        setFullscreenOpen(false);
      }
      previousTrackIdRef.current = null;
      return;
    }

    // Detect automatic track change (when track finishes playing)
    if (previousTrackIdRef.current && previousTrackIdRef.current !== currentTrack.id && isFullscreenOpen && transitionState === 'open') {
      clearAutoTransitionFrame();
      autoTransitionFrameRef.current = window.requestAnimationFrame(() => {
        autoTransitionFrameRef.current = null;
        handleAutoTrackTransition();
      });
    }

    previousTrackIdRef.current = currentTrack.id;
  }, [currentTrack, isFullscreenOpen, setFullscreenOpen, transitionState]);

  // Check if title overflows and needs marquee
  useLayoutEffect(() => {
    const checkOverflow = () => {
      if (titleContainerRef.current && titleTextRef.current) {
        setIsTitleOverflowing(titleTextRef.current.scrollWidth > titleContainerRef.current.clientWidth);
      }
    };
    
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [visualTrack?.title]);

  useLayoutEffect(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = isFullscreenOpen;

    if (!visualTrack || !isFullscreenOpen || wasOpen) return;

    clearCloseCanvasTimeout();
    killActiveTransition();
    setFullscreenInteractable(false);
    setTransitionState('opening');

    requestAnimationFrame(() => {
      const coverWrapper = coverWrapperRef.current;
      if (!coverWrapper) return;

      resetAnimatedState();

      const measured = clickedTrackCoverRef.current?.getBoundingClientRect() 
        ?? bottomPlayerCoverRef.current?.getBoundingClientRect() 
        ?? null;
      const finalCoverRect = coverWrapper.getBoundingClientRect();

      if (measured && finalCoverRect.width && finalCoverRect.height) {
        gsap.set(coverWrapper, {
          x: measured.x - finalCoverRect.x,
          y: measured.y - finalCoverRect.y,
          scaleX: measured.width / finalCoverRect.width,
          scaleY: measured.height / finalCoverRect.height,
          transformOrigin: 'top left',
          opacity: 1,
        });
      } else {
        gsap.set(coverWrapper, {
          x: 0,
          y: 36,
          scaleX: 0.84,
          scaleY: 0.84,
          transformOrigin: 'center center',
          opacity: 1,
        });
      }

      // Clear the clicked cover ref after using it
      clickedTrackCoverRef.current = null;

      // Set initial visibility for all elements
      gsap.set(selectWithinShell('.fullscreen-tabs, .fullscreen-track-badges'), {
        opacity: 1,
        clearProps: 'transform,scale',
      });

      const openTl = gsap.timeline({
        onComplete: () => {
          activeTransitionRef.current = null;
          setFullscreenInteractable(true);
          setTransitionState('open');
        },
      });

      activeTransitionRef.current = openTl;
      const queueItems = selectWithinShell('.queue-item');
      openTl
        .to(selectWithinShell('.fullscreen-overlay-bg'), {
          opacity: 1,
          duration: 0.4,
          ease: 'power3.out',
        }, 0)
        .to(coverWrapper, {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 0.6,
          ease: 'expo.out',
        }, 0)
        .from(selectWithinShell('.fullscreen-close-btn'), {
          opacity: 0,
          scale: 0.8,
          y: -10,
          duration: 0.35,
          ease: 'back.out(2)',
        }, 0.25)
        .from(selectWithinShell('.fullscreen-track-title'), {
          y: 30,
          opacity: 0,
          duration: 0.5,
          ease: 'power4.out',
        }, 0.2)
        .from(selectWithinShell('.fullscreen-artist'), {
          y: 20,
          opacity: 0,
          duration: 0.45,
          ease: 'power4.out',
        }, 0.25)
        .from(selectWithinShell('.fullscreen-track-badges'), {
          y: 15,
          opacity: 0,
          duration: 0.4,
          ease: 'power3.out',
        }, 0.3)
        .from(selectWithinShell('.fullscreen-tabs'), {
          y: 20,
          opacity: 0,
          scale: 0.95,
          duration: 0.45,
          ease: 'power3.out',
        }, 0.35)
        .from(selectWithinShell('.fullscreen-lyrics-panel'), {
          y: 50,
          opacity: 0,
          scale: 0.98,
          duration: 0.55,
          ease: 'power4.out',
        }, 0.4)
        .from(selectWithinShell('.fullscreen-progress-bar'), {
          opacity: 0,
          scaleX: 0,
          duration: 0.5,
          ease: 'power3.out',
          transformOrigin: 'left center',
        }, 0.45)
        .from(selectWithinShell('.fullscreen-controls'), {
          y: 40,
          opacity: 0,
          scale: 0.95,
          duration: 0.5,
          ease: 'power4.out',
        }, 0.5);

      if (queueItems.length > 0) {
        openTl.fromTo(queueItems, {
          y: 20,
          opacity: 0,
          scale: 0.95,
        }, {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 1.0,
          ease: 'power4.out',
          stagger: {
            each: 0.1,
            from: 'start',
          },
        }, 0.6);
      }
    });
  }, [isFullscreenOpen, visualTrack]);

  const startCloseTransition = () => {
    if (!visualTrack || !isFullscreenOpen) return;

    clearCloseCanvasTimeout();
    killActiveTransition();
    setFullscreenInteractable(false);
    setTransitionState('closing');

    const coverWrapper = coverWrapperRef.current;
    if (!coverWrapper) {
      setTransitionState('closed');
      setFullscreenOpen(false);
      return;
    }

    const target = bottomPlayerCoverRef.current?.getBoundingClientRect() ?? null;
    const currentRect = coverWrapper.getBoundingClientRect();
    const targetX = target ? target.x - currentRect.x : 0;
    const targetY = target ? target.y - currentRect.y : 0;
    const targetScaleX = target ? target.width / currentRect.width : 0.22;
    const targetScaleY = target ? target.height / currentRect.height : 0.22;

    const closeTl = gsap.timeline({
      onComplete: () => {
        clearCloseCanvasTimeout();
        setTransitionState('closed');
        setFullscreenOpen(false);
        resetAnimatedState();
      },
    });

    activeTransitionRef.current = closeTl;
    const queueItems = selectWithinShell('.queue-item');
    if (queueItems.length > 0) {
      closeTl.to(queueItems, {
        opacity: 0,
        y: -20,
        duration: 0.4,
        stagger: {
          each: 0.06,
          from: 'end',
        },
        ease: 'power2.in',
      }, 0);
    }
    closeTl
      .add(() => {
        closeCanvasTimeoutRef.current = null;
      }, 0.25)
      .to(selectWithinShell('.fullscreen-controls'), {
        opacity: 0,
        y: 20,
        scale: 0.95,
        duration: 0.25,
        ease: 'power2.in',
      }, 0.15)
      .to(selectWithinShell('.fullscreen-progress-bar'), {
        opacity: 0,
        scaleX: 0,
        duration: 0.2,
        ease: 'power2.in',
        transformOrigin: 'left center',
      }, 0.15)
      .to(selectWithinShell('.fullscreen-lyrics-panel'), {
        opacity: 0,
        y: 20,
        scale: 0.98,
        duration: 0.25,
        ease: 'power2.in',
      }, 0.15)
      .to(selectWithinShell('.fullscreen-tabs'), {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
      }, 0.15)
      .to(selectWithinShell('.fullscreen-track-badges'), {
        opacity: 0,
        y: -10,
        duration: 0.2,
        ease: 'power2.in',
      }, 0.15)
      .to(selectWithinShell('.fullscreen-track-title, .fullscreen-artist'), {
        opacity: 0,
        y: -15,
        duration: 0.25,
        stagger: 0.03,
        ease: 'power2.in',
      }, 0.15)
      .to(selectWithinShell('.fullscreen-close-btn'), {
        opacity: 0,
        scale: 0.7,
        duration: 0.2,
        ease: 'power2.in',
      }, 0.15)
      .to(selectWithinShell('.fullscreen-overlay-bg'), {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in',
      }, 0.15)
      .to(coverWrapper, {
        x: targetX,
        y: targetY,
        scaleX: targetScaleX,
        scaleY: targetScaleY,
        duration: 0.45,
        ease: 'expo.inOut',
      }, 0.2);
  };

  const handleShowLyrics = () => {
    if (!showLyrics) toggleLyrics();
    if (showQueue) toggleQueue();
  };

  const handleShowQueue = () => {
    if (!showQueue) toggleQueue();
    if (showLyrics) toggleLyrics();
  };

  const handleTrackClick = (track: Track, clickedIndex: number) => {
    const coverWrapper = coverWrapperRef.current;
    const trackTitle = selectWithinShell('.fullscreen-track-title')[0];
    const trackArtist = selectWithinShell('.fullscreen-artist')[0];
    const queueItems = selectWithinShell('.queue-item');
    
    if (!coverWrapper || !trackTitle || !trackArtist) {
      playTrack(track, queue);
      return;
    }

    // Find the clicked queue item to get its cover position
    const clickedQueueItem = queueItems[clickedIndex];
    if (!clickedQueueItem) {
      playTrack(track, queue);
      return;
    }

    const clickedCover = clickedQueueItem.querySelector('img, div') as HTMLElement;
    if (!clickedCover) {
      playTrack(track, queue);
      return;
    }

    // Get positions for animation
    const clickedCoverRect = clickedCover.getBoundingClientRect();
    const mainCoverRect = coverWrapper.getBoundingClientRect();

    // Create a clone of the clicked cover for animation
    const coverClone = clickedCover.cloneNode(true) as HTMLElement;
    coverClone.style.position = 'fixed';
    coverClone.style.left = `${clickedCoverRect.left}px`;
    coverClone.style.top = `${clickedCoverRect.top}px`;
    coverClone.style.width = `${clickedCoverRect.width}px`;
    coverClone.style.height = `${clickedCoverRect.height}px`;
    coverClone.style.borderRadius = '12px';
    coverClone.style.zIndex = '100';
    coverClone.style.pointerEvents = 'none';
    coverClone.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.5)';
    document.body.appendChild(coverClone);

    // Create animation timeline
    const tl = gsap.timeline({
      onComplete: () => {
        clearQueueAnimationFrame();
        document.body.removeChild(coverClone);
      }
    });

    // Step 1: Fade out track name and artist (0.25s)
    tl.to([trackTitle, trackArtist], {
      opacity: 0,
      y: -10,
      duration: 0.25,
      ease: 'power2.out',
    }, 0);

    // Step 2: Move cover clone up to main cover position (0.7s with power4.out)
    tl.to(coverClone, {
      left: mainCoverRect.left,
      top: mainCoverRect.top,
      width: mainCoverRect.width,
      height: mainCoverRect.height,
      borderRadius: '28px',
      duration: 0.7,
      ease: 'power4.out',
      onStart: () => {
        // Play track when animation starts
        playTrack(track, queue);
      },
      onUpdate: function() {
        // Fade out the clone as it reaches the destination
        if (this.progress() > 0.6) {
          gsap.set(coverClone, { opacity: 1 - (this.progress() - 0.6) / 0.4 });
        }
      }
    }, 0.25);

    // Crossfade removed - album cover stays visible during track change

    // Step 4: Fade in new track name and artist (0.4s)
    tl.to([trackTitle, trackArtist], {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: 'power3.out',
    }, 0.95);

    // Step 5: Reveal the refreshed Up Next list after the track switch settles.
    tl.add(() => {
      animateUpNextQueueItems(0.02);
    }, 0.96);
  };

  const handleAutoTrackTransition = () => {
    if (!isFullscreenOpen || transitionState !== 'open') return;
    animateUpNextQueueItems();
  };

  const toggleDriveMode = () => {
    if (isDriveModeTransitioning) return;
    
    const coverWrapper = coverWrapperRef.current;
    if (!coverWrapper) {
      setIsDriveMode(!isDriveMode);
      return;
    }

    setIsDriveModeTransitioning(true);

    if (!isDriveMode) {
      // Entering Drive Mode - store fullscreen cover position for animation
      const fullscreenRect = coverWrapper.getBoundingClientRect();
      
      // Store the fullscreen position for DrivePlayer to use
      (window as any).__fullscreenCoverRect = {
        top: fullscreenRect.top,
        left: fullscreenRect.left,
        width: fullscreenRect.width,
        height: fullscreenRect.height,
      };
      
      // Kill any existing animation
      if (driveModeTransitionRef.current) {
        driveModeTransitionRef.current.kill();
      }

      // Switch to Drive Mode immediately - DrivePlayer will handle the animation
      setIsDriveMode(true);
      setIsDriveModeTransitioning(false);
    } else {
      // Exiting Drive Mode - just switch back
      setIsDriveMode(false);
      setIsDriveModeTransitioning(false);
    }
  };

  // Animate cover when returning from Drive Mode
  useLayoutEffect(() => {
    if (!isDriveMode && coverWrapperRef.current) {
      const driveModeRect = (window as any).__driveModeBackRect;
      
      if (driveModeRect) {
        const coverWrapper = coverWrapperRef.current;
        const finalRect = coverWrapper.getBoundingClientRect();
        
        // Calculate initial position (from Drive Mode)
        const initialX = driveModeRect.left - finalRect.left;
        const initialY = driveModeRect.top - finalRect.top;
        const initialScaleX = driveModeRect.width / finalRect.width;
        const initialScaleY = driveModeRect.height / finalRect.height;
        
        // Set initial state
        gsap.set(coverWrapper, {
          x: initialX,
          y: initialY,
          scaleX: initialScaleX,
          scaleY: initialScaleY,
          transformOrigin: 'top left',
        });
        
        // Animate to final position
        gsap.to(coverWrapper, {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 0.5,
          ease: 'expo.out',
        });
        
        // Clear the stored rect
        delete (window as any).__driveModeBackRect;
      }
    }
  }, [isDriveMode]);

  // Show DrivePlayer when drive mode is active
  if (isDriveMode && visualTrack) {
    return <DrivePlayer onClose={() => setIsDriveMode(false)} />;
  }

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        display: shellShouldBeVisible ? 'block' : 'none',
        opacity: shellShouldBeVisible ? 1 : 0,
        pointerEvents: isFullscreenInteractable ? 'auto' : 'none',
        transform: 'translateZ(0)',
      }}
    >
      {/* Background Layer - Content to be blurred */}
      <div className="absolute inset-0 -z-30">
        {/* Animated gradient blobs */}
        <div className="absolute left-[-20%] top-[-20%] h-[600px] w-[600px] rounded-full opacity-60 animate-pulse-glow" 
          style={{ 
            background: `radial-gradient(circle, ${visualTrack?.coverGradient?.[0] || '#FF6B35'} 0%, transparent 70%)`,
            filter: 'blur(80px)'
          }} 
        />
        <div className="absolute right-[-15%] top-[30%] h-[500px] w-[500px] rounded-full opacity-50 animate-pulse-glow" 
          style={{ 
            background: `radial-gradient(circle, ${visualTrack?.coverGradient?.[1] || '#E8470A'} 0%, transparent 70%)`,
            filter: 'blur(80px)',
            animationDelay: '2s'
          }} 
        />
        <div className="absolute bottom-[-10%] left-[20%] h-[550px] w-[550px] rounded-full opacity-40 animate-pulse-glow" 
          style={{ 
            background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
            filter: 'blur(80px)',
            animationDelay: '4s'
          }} 
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(180deg, ${startColor}40 0%, #0a0a0a 50%, #000000 100%)`
        }} />
      </div>

      {/* Glassmorphism layer with extreme blur */}
      <div
        className="fullscreen-overlay-bg absolute inset-0 -z-20"
        style={{
          backdropFilter: 'blur(120px) saturate(180%)',
          WebkitBackdropFilter: 'blur(120px) saturate(180%)',
          background: 'rgba(13, 13, 13, 0.4)',
          willChange: 'opacity',
        }}
        onClick={(e) => {
          e.stopPropagation();
          startCloseTransition();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      />

      {visualTrack ? (
        <div 
          className="relative flex h-full w-full flex-col overflow-hidden p-4 pt-6 md:p-8"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="fullscreen-close-btn mb-3 flex w-full justify-between items-center">
            <button
              onClick={startCloseTransition}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-white/20 hover:border-white/30"
              aria-label="Go back"
            >
              <RiArrowLeftLine size={22} />
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-3">
              <button
                ref={driveModeButtonRef}
                data-gsap-ignore
                onMouseEnter={() => animateModeToggle(driveModeButtonRef.current, true, isDriveMode)}
                onMouseLeave={() => animateModeToggle(driveModeButtonRef.current, false, isDriveMode)}
                onPointerDown={() => pressModeToggle(driveModeButtonRef.current)}
                onPointerUp={() => animateModeToggle(driveModeButtonRef.current, true, isDriveMode)}
                onClick={toggleDriveMode}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur-xl transition ${
                  isDriveMode 
                    ? 'border-accent/50 bg-accent/30 text-accent hover:bg-accent/40' 
                    : 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30'
                }`}
                aria-label="Toggle drive mode"
              >
                <RiCarLine size={22} />
                <span>Drive Mode</span>
              </button>
            </div>
          </div>

          <div className="m-auto flex h-full w-full max-w-5xl flex-col items-center justify-between gap-4 overflow-hidden pt-0 lg:flex-row lg:gap-12 lg:pt-0">
            <div
              ref={coverWrapperRef}
              className="fullscreen-cover-wrapper relative flex h-[44vw] w-[44vw] max-h-[220px] max-w-[220px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[28px] shadow-2xl sm:h-[280px] sm:w-[280px] md:h-[360px] md:w-[360px]"
              style={{
                willChange: 'transform, opacity',
                opacity: 1,
                position: 'relative',
              }}
            >
              <div className="absolute inset-0">
                <div className="fullscreen-cover-2d absolute inset-0">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={visualTrack.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{ background: `linear-gradient(135deg, ${visualTrack.coverGradient?.[0] || '#333333'}, ${visualTrack.coverGradient?.[1] || '#222222'})` }}
                    />
                  )}
                </div>

                {/* 3D Vinyl removed - only show album cover */}
              </div>
            </div>

            <div className="flex w-full max-w-lg flex-1 flex-col items-center justify-between overflow-hidden lg:items-start">
              <div className="w-full">
                <div className="text-center lg:text-left">
                  <div ref={titleContainerRef} className="overflow-hidden">
                    <h1 
                      ref={titleTextRef}
                      className={`fullscreen-track-title text-2xl font-bold leading-tight md:text-3xl ${
                        isTitleOverflowing ? 'animate-marquee inline-block whitespace-nowrap' : 'truncate'
                      }`}
                    >
                      <span className={isTitleOverflowing ? 'pr-8' : ''}>{visualTrack.title}</span>
                      {isTitleOverflowing && (
                        <span className="pr-8" aria-hidden="true">{visualTrack.title}</span>
                      )}
                    </h1>
                  </div>
                  <p className="fullscreen-artist mt-1 text-base text-white/70 md:text-lg truncate">
                    {visualTrack.artist}
                  </p>
                  <div className="fullscreen-track-badges mt-2 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                    <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80 shadow-md">
                      Queue {currentQueuePosition}/{Math.max(queue.length, 1)}
                    </span>
                    <span className="rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80 shadow-md">
                      {visualTrack.isLocal ? 'Local Track' : 'Streaming'}
                    </span>
                    {repeat !== 'off' ? (
                      <span className="rounded-full border border-accent/40 bg-accent/20 backdrop-blur-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-accent shadow-md">
                        {repeat === 'one' ? 'Repeat One' : 'Repeat All'}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="my-3 flex w-full max-w-md flex-1 flex-col gap-2.5 overflow-hidden">
                  <div className="fullscreen-tabs flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-1.5 shadow-lg">
                    <button
                      onClick={handleShowLyrics}
                      className={`flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                        isLyricsPanelActive ? 'bg-white text-black shadow-md' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      Lyrics
                    </button>
                    <button
                      onClick={handleShowQueue}
                      className={`flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                        !isLyricsPanelActive ? 'bg-white text-black shadow-md' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      Queue
                    </button>
                  </div>

                  <div className="fullscreen-lyrics-panel min-h-0 rounded-[24px] border border-white/20 bg-white/10 backdrop-blur-2xl p-3 shadow-2xl md:p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">{panelTitle}</h2>
                      <div className="flex items-end gap-1">
                        {[0, 1, 2, 3].map((bar) => (
                          <span
                            key={bar}
                            className={`w-1 rounded-full bg-accent/80 ${isPlaying ? 'animate-[bounce_0.9s_ease-in-out_infinite]' : ''}`}
                            style={{
                              height: `${10 + bar * 5}px`,
                              animationDelay: `${bar * 0.12}s`,
                              opacity: isPlaying ? 1 : 0.45,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {isLyricsPanelActive ? (
                      <div className="relative h-[280px] w-full overflow-hidden sm:h-[400px] md:h-[480px]">
                        {lyrics.length > 0 ? (
                          <div className="absolute inset-0">
                            {visibleLyrics.map((line, index) => {
                              const actualIndex = lyricWindowStart + index;
                              const relativePosition = actualIndex - lyricFocusPosition;
                              const distance = Math.abs(relativePosition);
                              const direction = relativePosition < 0 ? -1 : 1;
                              const drift = direction * Math.pow(distance, 1.3) * 125; // Reduced from 150px to 90px for tighter spacing
                              const scale = 1.1 - Math.min(distance * 0.15, 0.45); // Match DrivePlayer
                              const opacity = Math.max(0.08, 1 - distance * 0.2);
                              const blur = Math.min(8, Math.pow(distance, 1.3) * 1.1);
                              const glow = Math.max(0, 1 - distance * 0.52);
                              const isCurrent = actualIndex === activeLyricIndex;

                              return (
                                <div
                                  key={`${line.time}-${actualIndex}`}
                                  className="absolute left-0 right-0 top-1/2 px-6 text-center font-bold"
                                  style={{
                                    fontSize: '1.25rem', // Fixed font size for stable wrapping
                                    lineHeight: '1.4', // Increased line height for better readability
                                    transform: `translate3d(0, ${drift.toFixed(2)}px, 0) translateY(-50%) scale(${scale.toFixed(3)})`,
                                    opacity,
                                    filter: `blur(${blur.toFixed(2)}px) saturate(${(0.76 + glow * 0.5).toFixed(2)})`,
                                    color: 'white',
                                    textShadow: isCurrent
                                      ? `0 0 ${Math.round(60 * glow)}px rgba(255,255,255,0.8), 0 0 ${Math.round(30 * glow)}px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.3)`
                                      : `0 0 ${Math.round(18 * glow)}px rgba(255,255,255,${0.06 + glow * 0.1})`,
                                    fontWeight: isCurrent ? '900' : '700',
                                    willChange: 'transform, opacity, filter',
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    hyphens: 'auto',
                                    whiteSpace: 'normal',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '1.4em', // Match line height
                                    maxHeight: '4.2em', // Allow up to 3 lines (1.4em × 3)
                                  }}
                                >
                                  {line.text || '♪'}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-white/5 p-2.5 text-sm text-white/60 text-center">
                            ♪ Lyrics are not available for this track ♪
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="max-h-[280px] overflow-hidden sm:max-h-[400px] md:max-h-[480px] flex items-center justify-center">
                        <div className="space-y-2 w-full">
                          {visibleUpcomingTracks.length > 0 ? (
                            visibleUpcomingTracks.map((track, index) => {
                              const queuedCoverUrl = getTrackCoverUrl(track);
                              return (
                                <button
                                  key={`${track.id}-${index}`}
                                  onClick={() => handleTrackClick(track, index)}
                                  className="queue-item flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/5"
                                >
                                  {queuedCoverUrl ? (
                                    <img
                                      src={queuedCoverUrl}
                                      alt={track.title}
                                      className="h-11 w-11 rounded-xl object-cover"
                                    />
                                  ) : (
                                    <div
                                      className="h-11 w-11 rounded-xl"
                                      style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333333'}, ${track.coverGradient?.[1] || '#222222'})` }}
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-white">{track.title}</div>
                                    <div className="truncate text-xs text-white/50">{track.artist}</div>
                                  </div>
                                  <span className="text-xs font-semibold text-white/40">#{index + 1}</span>
                                </button>
                              );
                            })
                          ) : (
                            <div className="rounded-2xl bg-white/5 p-3 text-sm text-white/60 text-center">
                              No tracks queued after this one.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="fullscreen-progress-bar mb-2 w-full max-w-md">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(event) => seekTo(Number(event.target.value))}
                  className="accent-track h-1.5 w-full"
                  style={{ '--progress': `${progress}%` } as React.CSSProperties}
                />
                <div className="mt-1 flex justify-between text-xs text-white/50">
                  <span>{formatDuration(Math.floor(currentTime))}</span>
                  <span>{formatDuration(Math.floor(duration))}</span>
                </div>
              </div>

              <div className="fullscreen-controls">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button onClick={toggleShuffle} className={`p-2 transition ${shuffle ? 'text-accent' : 'text-white/50 hover:text-white'}`}>
                    <RiShuffleLine size={22} />
                  </button>
                  <button onClick={() => toggleLike(visualTrack.id)} className="p-2 transition hover:scale-110">
                    {isLiked ? <RiHeartFill size={22} className="text-accent" /> : <RiHeartLine size={22} className="text-white/50 hover:text-white" />}
                  </button>
                  <button onClick={prevTrack} className="p-2 text-white/70 transition hover:text-white">
                    <RiSkipBackFill size={28} />
                  </button>
                  <button onClick={togglePlay} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-surface transition hover:scale-105">
                    {isPlaying ? <RiPauseFill size={28} /> : <RiPlayFill size={28} className="ml-1" />}
                  </button>
                  <button onClick={nextTrack} className="p-2 text-white/70 transition hover:text-white">
                    <RiSkipForwardFill size={28} />
                  </button>
                  <button onClick={toggleMute} className="p-2 text-white/50 transition hover:text-white">
                    {isMuted || volume === 0 ? <RiVolumeMuteLine size={20} /> : <RiVolumeUpLine size={20} />}
                  </button>
                  <button onClick={cycleRepeat} className={`p-2 transition ${repeat !== 'off' ? 'text-accent' : 'text-white/50 hover:text-white'}`}>
                    <RepeatIcon size={22} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
