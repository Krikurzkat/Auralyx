import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import type { Track } from '../../types';
import { formatDuration, getLyricsForTrack } from '../../utils/formatters';
import { useFluidLyricMotion } from '../../utils/lyricMotion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, type CSSProperties } from 'react';
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


// Shared ref for tracking clicked track covers
export const clickedTrackCoverRef: { current: HTMLElement | null } = { current: null };

type TransitionState = 'closed' | 'opening' | 'open' | 'closing';
type FullscreenLayoutProfile = 'desktop' | 'tablet' | 'android' | 'iphone';

function getTrackCoverUrl(track: Track | null) {
  if (!track?.coverUrl) return null;
  return track.coverUrl.startsWith('/') ? `http://localhost:3001${track.coverUrl}` : track.coverUrl;
}

function getFullscreenLayoutProfile(): FullscreenLayoutProfile {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  const userAgent = window.navigator.userAgent || '';
  const isiPhone = /iPhone|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isIPad = /iPad/i.test(userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

  if (isiPhone && width < 768) return 'iphone';
  if (isAndroid && width < 768) return 'android';
  if (isIPad || (width >= 768 && width < 1280)) return 'tablet';
  return 'desktop';
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
  const [isDesktopLyricLayout, setIsDesktopLyricLayout] = useState(false);
  const [layoutProfile, setLayoutProfile] = useState<FullscreenLayoutProfile>(() => getFullscreenLayoutProfile());

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

  // GSAP Tab Transition refs
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const queueContainerRef = useRef<HTMLDivElement>(null);
  const tabPillRef = useRef<HTMLDivElement>(null);
  const lyricsTabBtnRef = useRef<HTMLButtonElement>(null);
  const queueTabBtnRef = useRef<HTMLButtonElement>(null);
  const tabTransitionTlRef = useRef<gsap.core.Timeline | null>(null);

  const visualTrack = currentTrack;
  const coverUrl = getTrackCoverUrl(visualTrack);
  const lyrics = useMemo(() => (visualTrack ? getLyricsForTrack(visualTrack.id, visualTrack.lyrics) : []), [visualTrack]);
  // Keep the active lyric centered while the text motion eases.
  const {
    centeredFocusPosition: centeredLyricFocusPosition,
    activeLyricIndex,
  } = useFluidLyricMotion(lyrics, currentTime + 0.12, isPlaying);
  const lyricWindowCenter = lyrics.length > 0
    ? Math.max(0, Math.min(lyrics.length - 1, Math.round(centeredLyricFocusPosition)))
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
  const endColor = visualTrack?.coverGradient?.[1] || '#E8470A';
  const fullscreenBackgroundStyle = useMemo<CSSProperties>(() => ({
    background: `
      radial-gradient(circle at 0% 0%, ${startColor}42 0%, transparent 42%),
      radial-gradient(circle at 100% 34%, ${endColor}36 0%, transparent 40%),
      radial-gradient(circle at 44% 105%, rgba(139, 92, 246, 0.24) 0%, transparent 45%),
      linear-gradient(180deg, ${startColor}30 0%, #0a0a0a 50%, #000000 100%)
    `,
    transform: 'translate3d(0,0,0)',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    contain: 'paint',
  }), [startColor, endColor]);
  const fullscreenGlassStyle = useMemo<CSSProperties>(() => ({
    background: 'linear-gradient(180deg, rgba(4, 4, 6, 0.78) 0%, rgba(6, 6, 8, 0.84) 45%, rgba(0, 0, 0, 0.9) 100%)',
    willChange: 'opacity',
    transform: 'translate3d(0,0,0)',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    contain: 'paint',
  }), []);
  const currentQueuePosition = queueIndex >= 0 ? queueIndex + 1 : 1;
  const isLyricsPanelActive = showLyrics || !showQueue;
  const isLiked = visualTrack ? likedTrackIds.has(visualTrack.id) : false;
  const lyricLineGap = isDesktopLyricLayout ? 72 : 56;
  const lyricLineHeight = isDesktopLyricLayout ? '1.42' : '1.3';
  const fullscreenTabsTopOffset = useMemo(() => {
    switch (layoutProfile) {
      case 'desktop':
        return 32;
      case 'tablet':
        return 18;
      case 'android':
        return 6;
      case 'iphone':
        return 2;
      default:
        return 0;
    }
  }, [layoutProfile]);

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

  useEffect(() => {
    const updateLayoutProfile = () => {
      setLayoutProfile(getFullscreenLayoutProfile());
    };

    updateLayoutProfile();
    window.addEventListener('resize', updateLayoutProfile);
    return () => window.removeEventListener('resize', updateLayoutProfile);
  }, []);

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
          onComplete: () => {
            // Ensure will-change is cleared
            gsap.set(queueItems, { clearProps: 'willChange' });
          },
        }
      );
    });
  };

  const resetAnimatedState = () => {
    const coverWrapper = coverWrapperRef.current;
    const shell = shellRef.current;
    if (!coverWrapper || !shell) return;

    gsapSetIfPresent(selectWithinShell('.fullscreen-overlay-bg'), { opacity: 0, clearProps: 'willChange' });
    gsapSetIfPresent(selectWithinShell('.fullscreen-cover-2d'), { clearProps: 'willChange' });
    gsapSetIfPresent(selectWithinShell('.fullscreen-close-btn, .fullscreen-track-title, .fullscreen-artist, .fullscreen-track-badges, .fullscreen-tabs, .fullscreen-progress-bar, .fullscreen-controls, .fullscreen-lyrics-panel'), {
      clearProps: 'transform,opacity,scale,willChange',
    });
    gsapSetIfPresent(selectWithinShell('.queue-item'), {
      clearProps: 'transform,opacity,willChange',
    });
    gsap.set(coverWrapper, { clearProps: 'x,y,scaleX,scaleY,opacity,transformOrigin,willChange' });
  };

  const killActiveTransition = () => {
    gsap.killTweensOf('.fullscreen-cover-wrapper');
    activeTransitionRef.current?.kill();
    activeTransitionRef.current = null;
  };

  useEffect(() => {
    return () => {
      killActiveTransition();
      if (tabTransitionTlRef.current) {
        tabTransitionTlRef.current.kill();
        tabTransitionTlRef.current = null;
      }
      clearCloseCanvasTimeout();
      clearAutoTransitionFrame();
      clearQueueAnimationFrame();
    };
  }, []);

  // Initialize tab visibility and pill position
  useLayoutEffect(() => {
    if (!isFullscreenOpen) return;

    const lyricsEl = lyricsContainerRef.current;
    const queueEl = queueContainerRef.current;
    
    if (lyricsEl && queueEl) {
      killTabTransition();
      
      if (isLyricsPanelActive) {
        gsap.set(lyricsEl, { visibility: 'visible', pointerEvents: 'auto', opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' });
        gsap.set(queueEl, { visibility: 'hidden', pointerEvents: 'none', opacity: 0, y: 20, scale: 0.985, filter: 'blur(10px)' });
      } else {
        gsap.set(queueEl, { visibility: 'visible', pointerEvents: 'auto', opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' });
        gsap.set(lyricsEl, { visibility: 'hidden', pointerEvents: 'none', opacity: 0, y: 20, scale: 0.985, filter: 'blur(10px)' });
      }
    }
    
    if (tabPillRef.current) {
      const activeBtn = isLyricsPanelActive ? lyricsTabBtnRef.current : queueTabBtnRef.current;
      const parent = tabPillRef.current.parentElement;
      if (activeBtn && parent) {
        const parentRect = parent.getBoundingClientRect();
        const targetRect = activeBtn.getBoundingClientRect();
        if (targetRect.width > 0) {
          gsap.set(tabPillRef.current, {
            x: targetRect.left - parentRect.left,
            width: targetRect.width,
          });
          
          // Set initial text colors
          if (lyricsTabBtnRef.current && queueTabBtnRef.current) {
            gsap.set(lyricsTabBtnRef.current, { color: isLyricsPanelActive ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,0.85)' });
            gsap.set(queueTabBtnRef.current, { color: !isLyricsPanelActive ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,0.85)' });
          }
        }
      }
    }
  }, [isFullscreenOpen]);

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

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1280px)');
    const updateLyricLayout = () => setIsDesktopLyricLayout(desktopQuery.matches);

    updateLyricLayout();
    desktopQuery.addEventListener('change', updateLyricLayout);
    return () => desktopQuery.removeEventListener('change', updateLyricLayout);
  }, []);

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

      // Set initial visibility for all elements - prevent flickering
      gsap.set(selectWithinShell('.fullscreen-tabs, .fullscreen-track-badges'), {
        opacity: 1,
        clearProps: 'transform,scale,willChange',
      });
      
      // Ensure cover is visible
      gsap.set(selectWithinShell('.fullscreen-cover-2d'), {
        opacity: 1,
        clearProps: 'willChange',
      });

      const openTl = gsap.timeline({
        onStart: () => {
          // Set will-change only during animation
          gsap.set(coverWrapper, { willChange: 'transform' });
        },
        onComplete: () => {
          activeTransitionRef.current = null;
          setFullscreenInteractable(true);
          setTransitionState('open');
          // Clear will-change after animation
          gsap.set(coverWrapper, { clearProps: 'willChange' });
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
      onStart: () => {
        // Set will-change only during animation
        gsap.set(coverWrapper, { willChange: 'transform' });
      },
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

  // ──────────────────────────────────────────────────
  // GSAP Cinematic Tab Transition System
  // ──────────────────────────────────────────────────

  const killTabTransition = useCallback(() => {
    if (tabTransitionTlRef.current) {
      tabTransitionTlRef.current.kill();
      tabTransitionTlRef.current = null;
    }
  }, []);

  const animateTabPill = useCallback((toLyrics: boolean) => {
    const pill = tabPillRef.current;
    const lyricsBtn = lyricsTabBtnRef.current;
    const queueBtn = queueTabBtnRef.current;
    if (!pill || !lyricsBtn || !queueBtn) return;

    const targetBtn = toLyrics ? lyricsBtn : queueBtn;
    const parentRect = pill.parentElement?.getBoundingClientRect();
    const targetRect = targetBtn.getBoundingClientRect();
    if (!parentRect) return;

    gsap.to(pill, {
      x: targetRect.left - parentRect.left,
      width: targetRect.width,
      duration: 0.5,
      ease: 'back.out(1.4)',
      overwrite: true,
    });

    // Animate text colors
    gsap.to(lyricsBtn, {
      color: toLyrics ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,0.85)',
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to(queueBtn, {
      color: !toLyrics ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,0.85)',
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, []);

  const runTabTransition = useCallback((toLyrics: boolean) => {
    killTabTransition();

    const lyricsEl = lyricsContainerRef.current;
    const queueEl = queueContainerRef.current;
    if (!lyricsEl || !queueEl) return;

    const outgoing = toLyrics ? queueEl : lyricsEl;
    const incoming = toLyrics ? lyricsEl : queueEl;

    // Animate the pill first
    animateTabPill(toLyrics);

    const tl = gsap.timeline({
      onStart: () => {
        // Set will-change for performance during transition
        gsap.set([incoming, outgoing], { willChange: 'transform, opacity, filter' });
        // Make both visible during transition
        gsap.set(incoming, { visibility: 'visible', pointerEvents: 'none' });
        gsap.set(outgoing, { pointerEvents: 'none' });
      },
      onComplete: () => {
        // Final state: active panel gets interactions
        gsap.set(outgoing, { visibility: 'hidden', pointerEvents: 'none', clearProps: 'willChange' });
        gsap.set(incoming, { pointerEvents: 'auto', clearProps: 'willChange' });
        tabTransitionTlRef.current = null;
      },
    });
    tabTransitionTlRef.current = tl;

    // ── Outgoing: fade + blur + drift down ──
    tl.to(outgoing, {
      opacity: 0,
      y: 24,
      scale: 0.985,
      filter: 'blur(12px)',
      duration: 0.55,
      ease: 'power3.in',
    }, 0);

    // ── Incoming: set initial state then reveal ──
    tl.set(incoming, {
      opacity: 0,
      y: 20,
      scale: 0.985,
      filter: 'blur(10px)',
    }, 0.15);

    tl.to(incoming, {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: 0.7,
      ease: 'expo.out',
    }, 0.2);

    // ── Stagger nested elements ──
    if (toLyrics) {
      // Lyric lines' custom React transform & opacity styles are kept intact to prevent GSAP conflicts
    } else {
      // Queue items float up with stagger
      const queueItems = incoming.querySelectorAll('.queue-item');
      if (queueItems.length > 0) {
        tl.fromTo(queueItems, {
          opacity: 0,
          y: 18,
          scale: 0.97,
          filter: 'blur(6px)',
        }, {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.55,
          ease: 'power4.out',
          stagger: { each: 0.06, from: 'start' },
          clearProps: 'transform,opacity,filter',
        }, '-=0.35');
      }

      // Queue empty state dissolves in
      const emptyState = incoming.querySelector('.queue-empty-state');
      if (emptyState) {
        tl.fromTo(emptyState, {
          opacity: 0,
          scale: 0.95,
        }, {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: 'power2.out',
        }, '-=0.25');
      }
    }

  }, [killTabTransition, animateTabPill, selectWithinShell]);

  const handleShowLyrics = useCallback(() => {
    if (isLyricsPanelActive) return; // already active
    if (!showLyrics) toggleLyrics();
    if (showQueue) toggleQueue();
    runTabTransition(true);
  }, [isLyricsPanelActive, showLyrics, showQueue, toggleLyrics, toggleQueue, runTabTransition]);

  const handleShowQueue = useCallback(() => {
    if (!isLyricsPanelActive) return; // already active
    if (!showQueue) toggleQueue();
    if (showLyrics) toggleLyrics();
    runTabTransition(false);
  }, [isLyricsPanelActive, showQueue, showLyrics, toggleQueue, toggleLyrics, runTabTransition]);

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

    if (!isDriveMode) {
      // Entering Drive Mode
      setIsDriveModeTransitioning(true);
      
      // Store fullscreen cover position for animation
      const fullscreenRect = coverWrapper.getBoundingClientRect();
      (window as any).__fullscreenCoverRect = {
        top: fullscreenRect.top,
        left: fullscreenRect.left,
        width: fullscreenRect.width,
        height: fullscreenRect.height,
      };
      
      // Provide callback for DrivePlayer to clear transition flag
      (window as any).__clearDriveModeTransition = () => {
        setIsDriveModeTransitioning(false);
      };
      
      // Kill any existing animation
      if (driveModeTransitionRef.current) {
        driveModeTransitionRef.current.kill();
      }

      // Mount DrivePlayer immediately so mobile taps do not depend on the fade callback.
      setIsDriveMode(true);

      // Fade out fullscreen UI (but keep cover visible for animation)
      const tl = gsap.timeline();
      driveModeTransitionRef.current = tl;
      
      // Fade out UI elements only (not the cover)
      tl.to(selectWithinShell('.fullscreen-close-btn, .fullscreen-track-title, .fullscreen-artist, .fullscreen-track-badges, .fullscreen-tabs, .fullscreen-lyrics-panel, .fullscreen-progress-bar, .fullscreen-controls'), {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
      }, 0);
      
    } else {
      // Exiting Drive Mode - switch back immediately
      setIsDriveMode(false);
      // Transition flag will be cleared by the return animation useLayoutEffect
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
        
        // Set initial state with opacity 0
        gsap.set(coverWrapper, {
          x: initialX,
          y: initialY,
          scaleX: initialScaleX,
          scaleY: initialScaleY,
          transformOrigin: 'top left',
          opacity: 0,
        });
        
        // Animate to final position with fade in
        gsap.to(coverWrapper, {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          duration: 0.5,
          ease: 'expo.out',
          onComplete: () => {
            gsap.set(coverWrapper, { clearProps: 'all' });
            delete (window as any).__driveModeBackRect;
            setIsDriveModeTransitioning(false);
          }
        });
        
        // Fade in fullscreen UI elements
        gsap.to(selectWithinShell('.fullscreen-close-btn, .fullscreen-track-title, .fullscreen-artist, .fullscreen-track-badges, .fullscreen-tabs, .fullscreen-lyrics-panel, .fullscreen-progress-bar, .fullscreen-controls'), {
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
          delay: 0.2,
        });
      } else {
        setIsDriveModeTransitioning(false);
      }
    }
  }, [isDriveMode]);

  // DrivePlayer is embedded inline below to share the background layer

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
      {/* Background Layer - stable gradients avoid flicker from huge blurred blobs */}
      <div className="absolute inset-0 -z-30" style={fullscreenBackgroundStyle} />

      {/* Glassmorphism layer kept lightweight to avoid repaint flicker */}
      <div
        className="fullscreen-overlay-bg absolute inset-0 -z-20"
        style={fullscreenGlassStyle}
        onClick={(e) => {
          e.stopPropagation();
          startCloseTransition();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      />

      {/* Bottom-to-top black gradient fade */}
      <div className="absolute inset-0 -z-10 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,0.4) 50%, transparent 75%)' }} />

      {visualTrack ? (
        <div 
          className="absolute inset-0 flex h-full w-full flex-col overflow-hidden p-4 pt-6 md:p-8"
          style={{
            // Keep visible during transition so cover can be seen
            opacity: isDriveMode && !isDriveModeTransitioning ? 0 : 1,
            pointerEvents: isDriveMode || isDriveModeTransitioning ? 'none' : 'auto',
            // Only hide after transition completes
            visibility: isDriveMode && !isDriveModeTransitioning ? 'hidden' : 'visible',
            willChange: isDriveModeTransitioning ? 'opacity' : 'auto',
            transform: 'translateZ(0)',
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="fullscreen-close-btn relative z-20 mb-3 flex w-full items-center justify-between">
            <button
              onClick={startCloseTransition}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-white/20 hover:border-white/30"
              aria-label="Go back"
            >
              <RiArrowLeftLine size={18} />
              <span>Back</span>
            </button>
            
            <div className="pointer-events-auto flex items-center gap-3">
              <button
                ref={driveModeButtonRef}
                data-gsap-ignore
                onMouseEnter={() => animateModeToggle(driveModeButtonRef.current, true, isDriveMode)}
                onMouseLeave={() => animateModeToggle(driveModeButtonRef.current, false, isDriveMode)}
                onPointerDown={() => pressModeToggle(driveModeButtonRef.current)}
                onPointerUp={() => animateModeToggle(driveModeButtonRef.current, true, isDriveMode)}
                onClick={toggleDriveMode}
                className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-xl transition ${
                  isDriveMode 
                    ? 'border-accent/50 bg-accent/30 text-accent hover:bg-accent/40' 
                    : 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30'
                }`}
                aria-label="Toggle drive mode"
              >
                <RiCarLine size={18} />
                <span>Drive Mode</span>
              </button>
            </div>
          </div>

          <div className="m-auto h-full w-full max-w-6xl overflow-hidden pt-0 pb-4 flex flex-col landscape:grid landscape:grid-cols-[minmax(360px,448px)_minmax(0,1fr)] landscape:gap-x-12 landscape:items-center landscape:overflow-visible xl:grid xl:grid-cols-[448px_minmax(0,1fr)] xl:gap-x-12 xl:items-center xl:justify-center relative">
            
            <div className="portrait:contents landscape:flex landscape:flex-col landscape:justify-center landscape:h-full landscape:col-start-1 landscape:row-start-1 landscape:min-w-0 xl:flex xl:flex-col xl:justify-center xl:h-full xl:col-start-1 xl:row-start-1">
              <div className="order-1 flex w-full justify-center">
                <div
                  ref={coverWrapperRef}
                  className="fullscreen-cover-wrapper relative flex h-[44vw] w-[44vw] max-h-[220px] max-w-[220px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[28px] shadow-2xl sm:h-[240px] sm:w-[240px] md:h-[280px] md:w-[280px] xl:h-[360px] xl:w-[360px]"
                  style={{
                    willChange: transitionState === 'opening' || transitionState === 'closing' || isDriveModeTransitioning ? 'transform, opacity' : 'auto',
                    opacity: isDriveMode ? 0 : undefined,
                    position: 'relative',
                    transform: 'translateZ(0)',
                  }}
                >
                  <div className="absolute inset-0" style={{ transform: 'translateZ(0)' }}>
                    <div className="fullscreen-cover-2d absolute inset-0" style={{ willChange: 'auto' }}>
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={visualTrack.title}
                          className="h-full w-full object-cover"
                          style={{ transform: 'translateZ(0)' }}
                        />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{ 
                            background: `linear-gradient(135deg, ${visualTrack.coverGradient?.[0] || '#333333'}, ${visualTrack.coverGradient?.[1] || '#222222'})`,
                            transform: 'translateZ(0)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-2 mt-4 flex flex-col items-center landscape:mt-6 xl:mt-8 w-full">
                <div className="flex w-full max-w-2xl flex-col items-center text-center">
                  <div ref={titleContainerRef} className="overflow-hidden w-full px-6 md:px-8 xl:px-0">
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
                  <p className="fullscreen-artist mt-1 text-base text-white/70 md:text-lg truncate w-full">
                    {visualTrack.artist}
                  </p>
                  <div className="fullscreen-track-badges mt-2 flex flex-wrap items-center justify-center gap-2">
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
              </div>

              <div className="order-4 mt-4 flex w-full flex-col items-center justify-center gap-2 xl:mt-6">
                <div className="fullscreen-progress-bar mt-2 mb-2 shrink-0 self-stretch px-1 md:w-full md:max-w-md md:self-auto md:px-0">
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

                <div className="fullscreen-controls shrink-0 w-full max-w-md flex justify-center landscape:max-w-full xl:max-w-md">
                  <div className="flex items-center justify-between sm:justify-center gap-1 sm:gap-4 w-full px-2 xs:px-4 sm:px-0">
                    <button onClick={toggleShuffle} className={`p-1 sm:p-2 transition ${shuffle ? 'text-accent' : 'text-white/50 hover:text-white'}`}>
                      <RiShuffleLine size={24} />
                    </button>
                    <button onClick={() => toggleLike(visualTrack.id)} className="p-1 sm:p-2 transition hover:scale-110">
                      {isLiked ? <RiHeartFill size={24} className="text-accent" /> : <RiHeartLine size={24} className="text-white/50 hover:text-white" />}
                    </button>
                    <button onClick={prevTrack} className="p-1 sm:p-2 text-white/70 transition hover:text-white">
                      <RiSkipBackFill size={32} />
                    </button>
                    <button onClick={togglePlay} className="flex h-[60px] w-[60px] sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white text-surface transition hover:scale-105 shrink-0 mx-2 sm:mx-0">
                      {isPlaying ? <RiPauseFill size={32} /> : <RiPlayFill size={32} className="ml-1" />}
                    </button>
                    <button onClick={nextTrack} className="p-1 sm:p-2 text-white/70 transition hover:text-white">
                      <RiSkipForwardFill size={32} />
                    </button>
                    <button onClick={toggleMute} className="p-1 sm:p-2 text-white/50 transition hover:text-white">
                      {isMuted || volume === 0 ? <RiVolumeMuteLine size={22} /> : <RiVolumeUpLine size={22} />}
                    </button>
                    <button onClick={cycleRepeat} className={`p-1 sm:p-2 transition ${repeat !== 'off' ? 'text-accent' : 'text-white/50 hover:text-white'}`}>
                      <RepeatIcon size={24} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="portrait:contents landscape:flex landscape:flex-col landscape:justify-center landscape:h-full landscape:col-start-2 landscape:row-start-1 landscape:min-w-0 landscape:pl-2 xl:flex xl:flex-col xl:justify-center xl:col-start-2 xl:row-start-1 xl:min-w-0 xl:pl-0">
              <div className="order-3 mt-6 xl:mt-8 flex w-full flex-1 flex-col items-center gap-6 min-h-0 landscape:mt-0">
                <div
                  className="fullscreen-tabs relative z-10 flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-1.5 shadow-lg"
                  style={{
                    top: `${fullscreenTabsTopOffset}px`,
                    transform: 'translateZ(0)',
                  }}
                >
                  <div
                    ref={tabPillRef}
                    className="absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-white shadow-md z-0 pointer-events-none"
                    style={{
                      width: 'calc(50% - 9px)',
                      willChange: tabTransitionTlRef.current ? 'transform, width' : 'auto',
                      transform: 'translateZ(0)',
                    }}
                  />
                  <button
                    ref={lyricsTabBtnRef}
                    onClick={handleShowLyrics}
                    className="relative z-10 flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-250 select-none outline-none"
                    style={{ willChange: 'color' }}
                  >
                    Lyrics
                  </button>
                  <button
                    ref={queueTabBtnRef}
                    onClick={handleShowQueue}
                    className="relative z-10 flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-250 select-none outline-none"
                    style={{ willChange: 'color' }}
                  >
                    Queue
                  </button>
                </div>

                <div className="fullscreen-lyrics-panel relative flex flex-col flex-1 w-full min-h-0 xl:items-center mt-2 -mb-12">
                  
                  {/* Lyrics Container */}
                  <div
                    ref={lyricsContainerRef}
                    className="absolute inset-0 flex flex-col items-center w-full h-full"
                    style={{ 
                      willChange: tabTransitionTlRef.current ? 'transform, opacity, filter' : 'auto',
                      transform: 'translateZ(0)',
                    }}
                  >
                    <div className="relative w-full flex-1 max-w-3xl mx-auto" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' }}>
                      {lyrics.length > 0 ? (
                        <div className="absolute inset-0">
                          {visibleLyrics.map((line, index) => {
                            const actualIndex = lyricWindowStart + index;
                            const relativePosition = actualIndex - centeredLyricFocusPosition;
                            const distance = Math.abs(relativePosition);
                            const direction = relativePosition < 0 ? -1 : 1;
                            const verticalOffset = direction * Math.pow(distance, 1.05) * lyricLineGap;
                            
                            // Scale down less aggressively to keep them readable when tighter
                            const focusFactor = Math.max(0, 1 - distance);
                            const bloomFactor = Math.sin(focusFactor * Math.PI / 2);
                            const baseOpacity = Math.max(0, 1 - distance * 0.22);
                            const opacityValue = baseOpacity + bloomFactor * (1 - baseOpacity);
                            
                            // Simplify for performance: no blur filter. Transition color from gray to white.
                            // Strictly use grey for non-active lines and white + shadow for active line
                            const isCurrent = actualIndex === activeLyricIndex;
                            const textColor = isCurrent ? '#ffffff' : 'rgb(128, 128, 128)';
                            const textShadow = isCurrent ? `0 0 14px var(--accent)` : 'none';
                            const scaleValue = 0.985 + (1 - 0.985) * bloomFactor - Math.min(distance * 0.05, 0.15);

                            return (
                              <div
                                key={`${line.time}-${actualIndex}`}
                                data-lyric-line
                                className="fullscreen-lyric-line-wrapper absolute w-full max-w-3xl left-1/2 -translate-x-1/2 px-8 text-center font-bold"
                                style={{
                                  top: '50%',
                                  fontSize: 'clamp(1.1rem, 4.5vw, 1.5rem)',
                                  lineHeight: lyricLineHeight,
                                  transform: `translate3d(-50%, calc(-50% + ${verticalOffset.toFixed(2)}px), 0) scale(${scaleValue.toFixed(3)})`,
                                  opacity: opacityValue,
                                  color: textColor,
                                  textShadow,
                                  fontWeight: '700',
                                  zIndex: Math.max(1, 10 - Math.round(distance)),
                                  willChange: 'transform, opacity, color',
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                  hyphens: 'auto',
                                  whiteSpace: 'normal',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minHeight: '1.3em',
                                  maxHeight: '3.9em',
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
                  </div>

                  {/* Queue Container */}
                  <div
                    ref={queueContainerRef}
                    className="absolute inset-0 flex flex-col max-w-3xl mx-auto w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 [webkit-overflow-scrolling:touch] pb-12"
                    style={{ 
                      willChange: tabTransitionTlRef.current ? 'transform, opacity, filter' : 'auto',
                      transform: 'translateZ(0)',
                      maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)'
                    }}
                  >
                    <div className="queue-metadata mb-2 flex items-center justify-between shrink-0 px-2 pt-1">
                      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Up Next</h2>
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

                    <div className="space-y-1.2 w-full pt-0.9">
                      {visibleUpcomingTracks.length > 0 ? (
                        visibleUpcomingTracks.map((track, index) => {
                          const queuedCoverUrl = getTrackCoverUrl(track);
                          return (
                            <button
                              key={`${track.id}-${index}`}
                              onClick={() => handleTrackClick(track, index)}
                              className="queue-item flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-white/10 border border-transparent hover:border-white/5"
                            >
                              {queuedCoverUrl ? (
                                <img
                                  src={queuedCoverUrl}
                                  alt={track.title}
                                  className="h-10 w-10 shrink-0 rounded-xl object-cover"
                                />
                              ) : (
                                <div
                                  className="h-10 w-10 shrink-0 rounded-xl"
                                  style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333333'}, ${track.coverGradient?.[1] || '#222222'})` }}
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-semibold leading-tight text-white">{track.title}</div>
                                <div className="truncate text-[11px] text-white/50">{track.artist}</div>
                              </div>
                              <span className="shrink-0 text-[11px] font-semibold text-right text-white/40">{`#${index + 1}`}</span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="queue-empty-state mt-8 rounded-2xl bg-white/5 p-6 text-sm text-white/50 text-center max-w-md mx-auto border border-white/10 backdrop-blur-md">
                          No tracks queued after this one.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Dynamic Up Next Popup (Only active when not in Drive mode) */}
      {!isDriveMode && (
        <UpNextPopup 
          track={queue[queueIndex + 1] || (repeat === 'all' ? queue[0] : null)}
          visible={progress >= 75 && progress <= 80 && isFullscreenOpen}
        />
      )}

      {/* Embedded Drive Player for background sharing */}
      {isDriveMode && visualTrack && (
        <div 
          className="absolute inset-0 z-40"
          style={{ 
            willChange: isDriveModeTransitioning ? 'opacity, transform' : 'auto',
            transform: 'translateZ(0)',
          }}
        >
          <DrivePlayer 
            onClose={() => {
              setIsDriveModeTransitioning(true);
              setIsDriveMode(false);
            }} 
            isEmbedded={true} 
          />
        </div>
      )}
    </div>
  );
}

/* ─── Up Next Dynamic Popup Component ─── */
interface UpNextPopupProps {
  track: Track | null;
  visible: boolean;
  isDriveMode?: boolean;
}

function UpNextPopup({ track, visible, isDriveMode = false }: UpNextPopupProps) {
  if (!track) return null;
  const coverGradient = track.coverGradient || ['#3b82f6', '#1e3a8a'];

  return (
    <div className={`upnext-popup-card ${isDriveMode ? 'drive-mode' : ''} ${visible ? 'visible' : 'hidden'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Up Next
        </span>
        <div className="upnext-soundwave">
          <div className="upnext-bar" style={{ height: '40%' }}></div>
          <div className="upnext-bar" style={{ height: '70%' }}></div>
          <div className="upnext-bar" style={{ height: '100%' }}></div>
          <div className="upnext-bar" style={{ height: '50%' }}></div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            className="h-12 w-12 rounded-xl object-cover shadow-md border border-white/10"
          />
        ) : (
          <div
            className="h-12 w-12 rounded-xl border border-white/10 shadow-md animate-gradient"
            style={{ background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate text-left">{track.title}</div>
          <div className="text-[11px] text-softText truncate text-left">{track.artist}</div>
        </div>
      </div>
    </div>
  );
}
