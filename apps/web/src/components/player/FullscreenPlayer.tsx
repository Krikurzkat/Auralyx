import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUIStore } from '../../stores/uiStore';
import type { Track } from '../../types';
import { formatDuration, getLyricsForTrack } from '../../utils/formatters';
import { useFluidLyricMotion } from '../../utils/lyricMotion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { autoUpgradeTrackLyrics, hasSyncedLyricTimestamps } from '../../services/lyricsService';
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
import { shallow } from 'zustand/shallow';


// Shared ref for tracking clicked track covers
export const clickedTrackCoverRef: { current: HTMLElement | null } = { current: null };

type TransitionState = 'closed' | 'opening' | 'open' | 'closing';
type FullscreenLayoutProfile = 'desktop' | 'tablet' | 'mobile' | 'android' | 'iphone';
type ModeCoverTransition = {
  direction: 'to-drive' | 'to-fullscreen';
  clone: HTMLElement;
  source: HTMLElement;
  target?: HTMLElement;
  revealTargets?: HTMLElement[];
};

function FullscreenLyricsContent({
  lyrics,
  lyricVerticalPositions,
  lyricLineHeight,
  lyricLineGap,
  isMobileFullscreenLayout,
  isDesktopFullscreenLayout,
  lyricsDisplayMode,
  activeLyricGlowColor,
  lyricsMask,
}: {
  lyrics: ReturnType<typeof getLyricsForTrack>;
  lyricVerticalPositions: number[];
  lyricLineHeight: string;
  lyricLineGap: number;
  isMobileFullscreenLayout: boolean;
  isDesktopFullscreenLayout: boolean;
  lyricsDisplayMode: 'vertical' | 'karaoke' | 'spotlight' | 'clean';
  activeLyricGlowColor: string;
  lyricsMask: string;
}) {
  const currentTime = usePlayerStore((state) => state.isFullscreenOpen ? state.currentTime : 0);
  const isPlaying = usePlayerStore((state) => state.isFullscreenOpen && state.isPlaying && (state.showLyrics || !state.showQueue));
  const { centeredFocusPosition, activeLyricIndex } = useFluidLyricMotion(lyrics, currentTime, isPlaying);
  const isSynced = useMemo(() => lyrics.some((line) => line.time >= 0), [lyrics]);
  const desktopDisplayMode = isDesktopFullscreenLayout ? lyricsDisplayMode : 'vertical';
  const lyricWindowCenter = lyrics.length > 0
    ? Math.max(0, Math.min(lyrics.length - 1, Math.round(centeredFocusPosition)))
    : -1;
  const focusIndex = isSynced && activeLyricIndex >= 0
    ? activeLyricIndex
    : lyricWindowCenter;
  const lyricWindowStart = lyricWindowCenter >= 0
    ? Math.max(0, lyricWindowCenter - (isDesktopFullscreenLayout || isMobileFullscreenLayout ? 3 : 4))
    : 0;
  const lyricWindowEnd = lyricWindowCenter >= 0
    ? lyricWindowCenter + (isDesktopFullscreenLayout ? 5 : isMobileFullscreenLayout ? 5 : 7)
    : 0;
  const isSpotlight = isDesktopFullscreenLayout && desktopDisplayMode === 'spotlight' && isSynced;
  const renderWindowStart = isSpotlight ? focusIndex : lyricWindowStart;
  const visibleLyrics = isSpotlight
    ? lyrics.slice(focusIndex, focusIndex + 1)
    : lyrics.slice(lyricWindowStart, lyricWindowEnd);
  const focusedLyricVerticalPosition = useMemo(() => {
    if (lyricVerticalPositions.length === 0) return 0;
    const focus = Math.max(0, Math.min(lyricVerticalPositions.length - 1, centeredFocusPosition));
    const lowerIndex = Math.floor(focus);
    const upperIndex = Math.min(lyricVerticalPositions.length - 1, lowerIndex + 1);
    const fraction = focus - lowerIndex;
    return lyricVerticalPositions[lowerIndex]
      + (lyricVerticalPositions[upperIndex] - lyricVerticalPositions[lowerIndex]) * fraction;
  }, [lyricVerticalPositions, centeredFocusPosition]);

  return (
    <div
      className="relative w-full flex-1 max-w-3xl mx-auto overflow-hidden"
      style={{
        maskImage: lyricsMask,
        WebkitMaskImage: lyricsMask,
        // Lift only the phone lyric viewport; album art and playback controls
        // keep their existing positions and the lower fade stays with the text.
        transform: isMobileFullscreenLayout ? 'translate3d(0, -36px, 0)' : undefined,
      }}
    >
      {lyrics.length > 0 ? (
        <div className="absolute inset-0">
          {visibleLyrics.map((line, index) => {
            const actualIndex = renderWindowStart + index;
            const relativePosition = actualIndex - centeredFocusPosition;
            const distance = Math.abs(relativePosition);
            const yOffset = (lyricVerticalPositions[actualIndex] || 0) - focusedLyricVerticalPosition;
            const isCurrent = isSynced && actualIndex === activeLyricIndex;
            const isPreSinging = isSynced && activeLyricIndex < 0;
            const isFocus = actualIndex === focusIndex;
            const legacyFocusFactor = 1 - Math.min(distance, 1);
            const opacity = isDesktopFullscreenLayout
              ? (isFocus
                ? (isPreSinging ? 0.72 : 1)
                : desktopDisplayMode === 'clean'
                  ? Math.max(0.42, 0.74 - distance * 0.055)
                  : desktopDisplayMode === 'karaoke'
                    ? Math.max(0.14, 0.38 - distance * 0.09)
                    : Math.max(0.12, 0.42 - distance * 0.1))
              : 0.3 + legacyFocusFactor * 0.7;
            const blur = isDesktopFullscreenLayout && !isFocus
              ? desktopDisplayMode === 'vertical'
                ? Math.min(4.5, distance * 1.2)
                : desktopDisplayMode === 'karaoke'
                  ? Math.min(1.25, distance * 0.35)
                  : 0
              : isMobileFullscreenLayout && !isFocus
                ? Math.min(2.2, Math.max(0, distance - 1.6) * 0.8)
                : 0;
            const scale = isDesktopFullscreenLayout
              ? (isFocus
                ? desktopDisplayMode === 'spotlight' ? 1.08 : 1.04
                : desktopDisplayMode === 'clean' ? 1 : Math.max(0.9, 0.98 - distance * 0.025))
              : 1;
            const textShadow = isDesktopFullscreenLayout
              ? (isFocus
                ? desktopDisplayMode === 'karaoke'
                  ? `0 0 26px ${activeLyricGlowColor}99, 0 2px 18px rgba(0,0,0,0.8)`
                  : '0 2px 20px rgba(0,0,0,0.76)'
                : '0 2px 8px rgba(0,0,0,0.6)')
              : (isCurrent ? `0 0 16px ${activeLyricGlowColor}, 0 0 8px ${activeLyricGlowColor}80` : 'none');

            return (
              <div
                key={`${line.time}-${actualIndex}`}
                className="fullscreen-lyric-motion absolute w-full max-w-3xl left-1/2 px-8 text-center font-bold select-none pointer-events-none"
                style={{
                  top: '50%',
                  fontSize: isDesktopFullscreenLayout
                    ? (isFocus
                      ? desktopDisplayMode === 'spotlight' ? 'clamp(2rem, 4.1vw, 3.6rem)' : 'clamp(1.5rem, 3.1vw, 2.8rem)'
                      : desktopDisplayMode === 'clean' ? 'clamp(1.05rem, 1.7vw, 1.45rem)' : 'clamp(1.15rem, 2.15vw, 1.8rem)')
                    : 'clamp(1.1rem, 4.5vw, 1.5rem)',
                  lineHeight: lyricLineHeight,
                  ...(isDesktopFullscreenLayout || isMobileFullscreenLayout ? { filter: `blur(${blur.toFixed(2)}px)` } : {}),
                  transform: `translate3d(-50%, calc(-50% + ${(isDesktopFullscreenLayout ? yOffset : relativePosition * lyricLineGap).toFixed(2)}px), 0) scale(${scale})`,
                  opacity,
                  color: '#ffffff',
                  textShadow,
                  fontWeight: isDesktopFullscreenLayout ? (isFocus ? '850' : '650') : '700',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  willChange: 'transform, opacity',
                }}
              >
                <span>{line.text || '♪'}</span>
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
  );
}

function FullscreenProgressTrack() {
  const { progress, currentTime, duration, seekTo } = usePlayerStore((state) => ({
    progress: state.isFullscreenOpen ? state.progress : 0,
    currentTime: state.isFullscreenOpen ? state.currentTime : 0,
    duration: state.isFullscreenOpen ? state.duration : 0,
    seekTo: state.seekTo,
  }), shallow);

  return (
    <div className="fullscreen-progress-bar mt-2 mb-2 shrink-0 self-stretch px-1 md:w-full md:max-w-md md:self-auto md:px-0">
      <input
        type="range"
        min={0}
        max={100}
        value={progress}
        onChange={(event) => seekTo(Number(event.target.value))}
        className="accent-track h-1.5 w-full"
        style={{ '--progress': `${progress}%` } as CSSProperties}
      />
      <div className="mt-1 flex justify-between text-xs text-white/50">
        <span>{formatDuration(Math.floor(currentTime))}</span>
        <span>{formatDuration(Math.floor(duration))}</span>
      </div>
    </div>
  );
}

function FullscreenUpNext({ track }: { track: Track | null }) {
  const visible = usePlayerStore((state) => state.isFullscreenOpen && state.progress >= 75 && state.progress <= 80);
  return <UpNextPopup track={track} visible={visible} />;
}

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

  if (isIPad || (width >= 768 && width < 1280)) return 'tablet';
  if (width < 768) {
    if (isiPhone) return 'iphone';
    if (isAndroid) return 'android';
    // Some mobile browsers hide their device name (or request desktop sites).
    // Treat a phone-sized viewport as mobile so the compact lyrics layout is
    // still applied consistently.
    return 'mobile';
  }
  return 'desktop';
}

export default function FullscreenPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    shuffle,
    repeat,
    lyricsDisplayMode,
    isFullscreenOpen,
    queue,
    queueIndex,
    showLyrics,
    showQueue,
    togglePlay,
    nextTrack,
    prevTrack,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    playTrack,
    setFullscreenOpen,
  } = usePlayerStore((state) => ({
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    volume: state.volume,
    isMuted: state.isMuted,
    shuffle: state.shuffle,
    repeat: state.repeat,
    lyricsDisplayMode: state.lyricsDisplayMode,
    isFullscreenOpen: state.isFullscreenOpen,
    queue: state.queue,
    queueIndex: state.queueIndex,
    showLyrics: state.showLyrics,
    showQueue: state.showQueue,
    togglePlay: state.togglePlay,
    nextTrack: state.nextTrack,
    prevTrack: state.prevTrack,
    toggleMute: state.toggleMute,
    toggleShuffle: state.toggleShuffle,
    cycleRepeat: state.cycleRepeat,
    playTrack: state.playTrack,
    setFullscreenOpen: state.setFullscreenOpen,
  }), shallow);
  const { likedTrackIds, toggleLike } = useLibraryStore();
  const { isDriveModeOpen, setDriveModeOpen } = useUIStore();

  const [isFullscreenInteractable, setFullscreenInteractable] = useState(false);
  const [transitionState, setTransitionState] = useState<TransitionState>('closed');
  const [isDriveMode, setIsDriveMode] = useState(false);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
  const [isDesktopLyricLayout, setIsDesktopLyricLayout] = useState(false);
  const [lyricViewportWidth, setLyricViewportWidth] = useState(0);
  const [layoutProfile, setLayoutProfile] = useState<FullscreenLayoutProfile>(() => getFullscreenLayoutProfile());
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1280 : window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState(() => typeof window === 'undefined' ? 800 : window.innerHeight);

  const shellRef = useRef<HTMLDivElement>(null);
  const coverWrapperRef = useRef<HTMLDivElement>(null);
  const driveCoverRef = useRef<HTMLDivElement | null>(null);
  const driveModeButtonRef = useRef<HTMLButtonElement>(null);
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
  const modeCoverTransitionRef = useRef<ModeCoverTransition | null>(null);
  const modeCoverTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const modeTransitionBusyRef = useRef(false);
  const modeTransitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const container = lyricsContainerRef.current;
    if (!container) return;

    const updateWidth = () => setLyricViewportWidth(container.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const visualTrack = currentTrack;
  const isLyricsPanelActive = showLyrics || !showQueue;
  const isMobileFullscreenLayout = layoutProfile === 'android' || layoutProfile === 'iphone' || layoutProfile === 'mobile';
  const coverUrl = getTrackCoverUrl(visualTrack);
  const lyrics = useMemo(() => (visualTrack ? getLyricsForTrack(visualTrack.id, visualTrack.lyrics) : []), [visualTrack?.id, visualTrack?.lyrics]);

  // Auto-upgrade: normalize + fetch synced lyrics from LRCLIB when track changes
  useEffect(() => {
    if (!visualTrack) return;
    // Only upgrade if lyrics are missing or unsynced plain text
    if (!visualTrack.lyrics || !hasSyncedLyricTimestamps(visualTrack.lyrics)) {
      autoUpgradeTrackLyrics(visualTrack).catch(() => {});
    }
  }, [visualTrack?.id]);

  // Keep the active lyric centered while the text motion eases.

  const upcomingTracks = useMemo(() => {
    if (queueIndex < 0) return queue.slice(0, 5);
    return queue.slice(queueIndex + 1, queueIndex + 6);
  }, [queue, queueIndex]);

  const visibleUpcomingTracks = upcomingTracks.slice(0, 4);
  const shellShouldBeVisible = !!visualTrack && (isFullscreenOpen || transitionState !== 'closed');
  const RepeatIcon = repeat === 'one' ? RiRepeatOneLine : repeat === 'all' ? RiRepeat2Line : RiRepeatLine;
  const startColor = visualTrack?.coverGradient?.[0] || '#333333';
  const endColor = visualTrack?.coverGradient?.[1] || '#E8470A';
  const isPhoneFullscreenLayout = layoutProfile === 'android' || layoutProfile === 'iphone' || layoutProfile === 'mobile';
  const fullscreenBackgroundStyle = useMemo<CSSProperties>(() => ({
    // Keep the phone fullscreen canvas neutral so album-color ambience cannot
    // read as a persistent edge glow after the chorus HUD has been removed.
    background: isPhoneFullscreenLayout ? '#000000' : `
      radial-gradient(circle at 0% 0%, ${startColor}42 0%, transparent 42%),
      radial-gradient(circle at 100% 34%, ${endColor}36 0%, transparent 40%),
      radial-gradient(circle at 44% 105%, rgba(139, 92, 246, 0.24) 0%, transparent 45%),
      linear-gradient(180deg, ${startColor}30 0%, #0a0a0a 50%, #000000 100%)
    `,
    transform: 'translate3d(0,0,0)',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    contain: 'paint',
  }), [startColor, endColor, isPhoneFullscreenLayout]);
  
  const fullscreenGlassStyle = useMemo<CSSProperties>(() => ({
    background: 'linear-gradient(180deg, rgba(4, 4, 6, 0.82) 0%, rgba(6, 6, 8, 0.88) 45%, rgba(0, 0, 0, 0.94) 100%)',
    willChange: 'opacity',
    transform: 'translate3d(0,0,0)',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    contain: 'paint',
  }), []);
  const currentQueuePosition = queueIndex >= 0 ? queueIndex + 1 : 1;
  const isLiked = visualTrack ? likedTrackIds.has(visualTrack.id) : false;
  // Keep adjacent lyric rows compact on both large and small screens while
  // reserving extra room below only for lines that actually wrap.
  const lyricLineGap = isDesktopLyricLayout
    ? lyricsDisplayMode === 'karaoke' ? 62 : lyricsDisplayMode === 'spotlight' ? 36 : lyricsDisplayMode === 'clean' ? 42 : 52
    : isMobileFullscreenLayout ? 48 : 40;
  const lyricLineHeight = isDesktopLyricLayout ? '1.3' : '1.22';
  const lyricFontSizePx = typeof window === 'undefined'
    ? 24
    : Math.min(25.6, Math.max(18.4, window.innerWidth * 0.045));
  const lyricWrapCounts = useMemo(() => {
    if (typeof document === 'undefined' || lyrics.length === 0) return [] as number[];

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return lyrics.map(() => 1);
    context.font = `700 ${lyricFontSizePx}px Inter, sans-serif`;
    // The lyric rows have 32px horizontal padding on every layout profile.
    const maxWidth = Math.max(120, lyricViewportWidth - 64);

    return lyrics.map(({ text }) => {
      let rows = 1;
      for (const paragraph of text.split(/\n+/)) {
        let rowWidth = 0;
        for (const word of paragraph.split(/\s+/).filter(Boolean)) {
          const wordWidth = context.measureText(word).width;
          const spaceWidth = rowWidth === 0 ? 0 : context.measureText(' ').width;
          if (rowWidth > 0 && rowWidth + spaceWidth + wordWidth > maxWidth) {
            rows += 1;
            rowWidth = wordWidth;
          } else {
            rowWidth += spaceWidth + wordWidth;
          }
        }
      }
      return rows;
    });
  }, [lyrics, lyricFontSizePx, lyricViewportWidth, isDesktopLyricLayout]);
  const lyricVerticalPositions = useMemo(() => {
    const positions = new Array<number>(lyrics.length).fill(0);
    const lineHeightPx = lyricFontSizePx * parseFloat(lyricLineHeight);
    for (let index = 1; index < lyrics.length; index += 1) {
      const previousExtraRows = Math.max(0, (lyricWrapCounts[index - 1] || 1) - 1);
      const currentExtraRows = Math.max(0, (lyricWrapCounts[index] || 1) - 1);
      const autoSpacing = ((previousExtraRows + currentExtraRows) * lineHeightPx) / 2;
      positions[index] = positions[index - 1] + lyricLineGap + autoSpacing;
    }
    return positions;
  }, [lyrics.length, lyricWrapCounts, lyricFontSizePx, lyricLineHeight, lyricLineGap]);
  const fullscreenLyricsMask = isMobileFullscreenLayout
    ? 'linear-gradient(to bottom, transparent 0%, transparent 7%, black 18%, black 74%, transparent 94%, transparent 100%)'
    : 'linear-gradient(to bottom, transparent 0%, transparent 22%, black 29%, black 96%, transparent 100%)';
  const fullscreenQueueMask = 'linear-gradient(to bottom, transparent 0%, black 3%, black 98%, transparent 100%)';
  const isCompactLyricsLayout = isMobileFullscreenLayout || layoutProfile === 'tablet';
  const isPortraitStackedLayout = viewportHeight > viewportWidth;
  const fullscreenTabsTopOffset = useMemo(() => {
    if (isPortraitStackedLayout) return 0;
    if (layoutProfile === 'desktop' && viewportWidth < 768) return 118;
    switch (layoutProfile) {
      case 'desktop':
        return 150;
      case 'tablet':
        return 120;
      case 'android':
      case 'iphone':
      case 'mobile':
        return 0;
      default:
        return 0;
    }
  }, [isPortraitStackedLayout, layoutProfile, viewportWidth]);
  const fullscreenQueueHeaderTopOffset = isPortraitStackedLayout || isMobileFullscreenLayout
    ? 4
    : Math.max(56, fullscreenTabsTopOffset - 20);
  const fullscreenQueueListTopOffset = fullscreenQueueHeaderTopOffset + (isPortraitStackedLayout || isMobileFullscreenLayout ? 26 : 34);

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

  const clearModeCoverTransition = () => {
    if (modeTransitionTimeoutRef.current !== null) {
      window.clearTimeout(modeTransitionTimeoutRef.current);
      modeTransitionTimeoutRef.current = null;
    }
    modeCoverTimelineRef.current?.kill();
    modeCoverTimelineRef.current = null;

    const transition = modeCoverTransitionRef.current;
    if (transition) {
      if (transition.source.isConnected) {
        gsap.set(transition.source, { clearProps: 'opacity,willChange' });
      }
      if (transition.target?.isConnected) {
        gsap.set(transition.target, { clearProps: 'opacity,willChange' });
      }
      transition.clone.remove();
    }

    modeCoverTransitionRef.current = null;
    modeTransitionBusyRef.current = false;
  };

  const createModeCoverTransition = (
    source: HTMLElement,
    direction: ModeCoverTransition['direction'],
  ) => {
    const shell = shellRef.current;
    const rect = source.getBoundingClientRect();
    if (!shell || rect.width <= 0 || rect.height <= 0) return null;

    const clone = source.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, {
      position: 'fixed',
      boxSizing: 'border-box',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      margin: '0',
      flex: 'none',
      zIndex: '100000',
      pointerEvents: 'none',
      transform: 'none',
      opacity: '1',
      visibility: 'visible',
      transition: 'none',
      willChange: 'left, top, width, height, border-radius',
      borderRadius: window.getComputedStyle(source).borderRadius,
    });
    document.body.appendChild(clone);
    gsap.set(source, { opacity: 0, willChange: 'opacity' });

    const transition: ModeCoverTransition = { direction, clone, source };
    modeCoverTransitionRef.current = transition;
    modeTransitionBusyRef.current = true;
    modeTransitionTimeoutRef.current = window.setTimeout(clearModeCoverTransition, 1800);

    return { transition, rect };
  };

  const moveModeCoverToTarget = (target: HTMLElement) => {
    const transition = modeCoverTransitionRef.current;
    if (!transition) return;

    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      clearModeCoverTransition();
      return;
    }

    transition.target = target;
    gsap.set(target, { opacity: 0, willChange: 'opacity' });

    if (transition.direction === 'to-drive') {
      const driveDetails = target.parentElement?.querySelector<HTMLElement>('.drive-track-copy');
      transition.revealTargets = driveDetails ? [driveDetails] : [];
    } else {
      transition.revealTargets = selectWithinShell(
        '.fullscreen-close-btn, .fullscreen-track-meta, .fullscreen-tabs, .fullscreen-progress-bar, .fullscreen-controls, .fullscreen-lyrics-panel',
      );
    }
    gsapSetIfPresent(transition.revealTargets, { opacity: 0, y: 8, willChange: 'opacity,transform' });

    const timeline = gsap.timeline({
      onComplete: () => {
        if (modeCoverTransitionRef.current !== transition) return;
        modeCoverTimelineRef.current = null;
        gsap.set(target, { clearProps: 'opacity,willChange' });
        transition.clone.remove();
        if (transition.source.isConnected) {
          gsap.set(transition.source, { clearProps: 'opacity,willChange' });
        }
        gsap.to(transition.revealTargets || [], {
          opacity: 1,
          y: 0,
          duration: 0.24,
          ease: 'power2.out',
          clearProps: 'opacity,transform,willChange',
        });
        if (modeTransitionTimeoutRef.current !== null) {
          window.clearTimeout(modeTransitionTimeoutRef.current);
          modeTransitionTimeoutRef.current = null;
        }
        modeCoverTransitionRef.current = null;
        modeTransitionBusyRef.current = false;
      },
    });
    modeCoverTimelineRef.current = timeline;
    timeline.to(transition.clone, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      borderRadius: window.getComputedStyle(target).borderRadius,
      duration: 0.52,
      ease: 'power3.inOut',
    });
  };

  useEffect(() => {
    animateModeToggle(driveModeButtonRef.current, false, isDriveMode);
  }, [isDriveMode]);

  useEffect(() => {
    const updateLayoutProfile = () => {
      setLayoutProfile(getFullscreenLayoutProfile());
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
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
        willChange: 'transform, opacity',
      });

      gsap.fromTo(
        queueItems,
        {
          autoAlpha: 0,
          y: 14,
          scale: 0.98,
        },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.45,
          delay,
          stagger: {
            each: 0.05,
            from: 'start',
          },
          ease: 'power3.out',
          overwrite: 'auto',
          clearProps: 'transform,opacity,visibility,willChange',
          onComplete: () => {
            gsap.set(queueItems, { clearProps: 'willChange' });
          },
        }
      );
    });
  };

  const resetAnimatedState = () => {
    setIsDriveMode(false);
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
      clearModeCoverTransition();
    };
  }, []);

  // Initialize tab visibility and pill position
  useLayoutEffect(() => {
    // Wait for the opening effect to normalize the store to Queue first. The
    // fullscreen shell stays mounted between visits, so it may still carry the
    // previous Lyrics selection when this screen is reopened.
    if (!isFullscreenOpen || transitionState !== 'opening') return;

    const lyricsEl = lyricsContainerRef.current;
    const queueEl = queueContainerRef.current;
    
    if (lyricsEl && queueEl) {
      killTabTransition();
      
      if (isLyricsPanelActive) {
        gsap.set(lyricsEl, { visibility: 'visible', pointerEvents: 'auto', opacity: 1, y: 0, scale: 1 });
        gsap.set(queueEl, { visibility: 'hidden', pointerEvents: 'none', opacity: 0, y: 16, scale: 0.985 });
      } else {
        gsap.set(queueEl, { visibility: 'visible', pointerEvents: 'auto', opacity: 1, y: 0, scale: 1 });
        gsap.set(lyricsEl, { visibility: 'hidden', pointerEvents: 'none', opacity: 0, y: 16, scale: 0.985 });
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
          
          // Set initial text colors (frosted dark pill: white active, dimmed inactive)
          if (lyricsTabBtnRef.current && queueTabBtnRef.current) {
            gsap.set(lyricsTabBtnRef.current, { color: isLyricsPanelActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.38)' });
            gsap.set(queueTabBtnRef.current, { color: !isLyricsPanelActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.38)' });
          }
        }
      }
    }
  }, [isFullscreenOpen, transitionState]);

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

    // Opening the fullscreen player always starts on the queue tab.
    usePlayerStore.setState({ showQueue: true, showLyrics: false });

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

    setIsDriveMode(false);

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

    // The tab pill and tab-label color tweens are started separately from the
    // panel timeline. Kill them explicitly so none can keep sliding while the
    // fullscreen player is hidden in Drive Mode.
    [
      tabPillRef.current,
      lyricsTabBtnRef.current,
      queueTabBtnRef.current,
    ].forEach((target) => {
      if (target) gsap.killTweensOf(target);
    });
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
      duration: 0.48,
      ease: 'back.out(1.4)',
      overwrite: true,
    });

    // Active = bright white, inactive = dimmed white (both on dark frosted pill)
    gsap.to(lyricsBtn, {
      color: toLyrics ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.38)',
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to(queueBtn, {
      color: !toLyrics ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.38)',
      duration: 0.3,
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
        gsap.set([incoming, outgoing], { willChange: 'transform, opacity' });
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

    // ── Outgoing: clean fade + slight slide ──
    tl.to(outgoing, {
      opacity: 0,
      y: 16,
      scale: 0.985,
      duration: 0.32,
      ease: 'power2.in',
    }, 0);

    // ── Incoming: reveal smoothly ──
    tl.fromTo(incoming, {
      opacity: 0,
      y: 16,
      scale: 0.985,
    }, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.42,
      ease: 'power3.out',
    }, 0.1);

    // ── Stagger nested elements ──
    if (toLyrics) {
      // Lyric lines' custom React transform & opacity styles are kept intact to prevent GSAP conflicts
    } else {
      // Queue items float up with stagger
      const queueItems = incoming.querySelectorAll('.queue-item');
      if (queueItems.length > 0) {
        tl.fromTo(queueItems, {
          opacity: 0,
          y: 12,
          scale: 0.98,
        }, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.38,
          ease: 'power3.out',
          stagger: { each: 0.04, from: 'start' },
          clearProps: 'transform,opacity',
        }, '-=0.25');
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

    if (!isCompactLyricsLayout) {
      usePlayerStore.setState({ showLyrics: true, showQueue: false });
      runTabTransition(true);
      return;
    }

    // Capture the current layout so the cover, title, and tab area can move
    // together into their compact lyrics layout after React applies it.
    const cover = coverWrapperRef.current;
    const trackHeader = selectWithinShell('.fullscreen-track-meta');
    const tabs = selectWithinShell('.fullscreen-tabs');
    const panel = selectWithinShell('.fullscreen-lyrics-panel');
    const before = {
      cover: cover?.getBoundingClientRect(),
      trackHeader: trackHeader[0]?.getBoundingClientRect(),
      tabs: tabs[0]?.getBoundingClientRect(),
      panel: panel[0]?.getBoundingClientRect(),
    };

    usePlayerStore.setState({ showLyrics: true, showQueue: false });
    runTabTransition(true);

    requestAnimationFrame(() => {
      const nextCover = coverWrapperRef.current;
      const nextTrackHeader = selectWithinShell('.fullscreen-track-meta')[0];
      const nextTabs = selectWithinShell('.fullscreen-tabs')[0];
      const nextPanel = selectWithinShell('.fullscreen-lyrics-panel')[0];
      const coverRect = nextCover?.getBoundingClientRect();
      const trackHeaderRect = nextTrackHeader?.getBoundingClientRect();
      const tabsRect = nextTabs?.getBoundingClientRect();
      const panelRect = nextPanel?.getBoundingClientRect();

      if (nextCover && before.cover && coverRect?.width && coverRect.height) {
        gsap.set(nextCover, {
          x: before.cover.left - coverRect.left,
          y: before.cover.top - coverRect.top,
          width: before.cover.width,
          height: before.cover.height,
          borderRadius: '28px',
          transformOrigin: 'top left',
          force3D: true,
        });
        gsap.to(nextCover, {
          x: 0,
          y: 0,
          width: coverRect.width,
          height: coverRect.height,
          borderRadius: '16px',
          duration: 0.62,
          ease: 'power3.inOut',
          overwrite: 'auto',
          clearProps: 'x,y,width,height,borderRadius,transformOrigin',
        });
      }

      // Keep the title in place relative to the shrinking cover, while the
      // tabs and their content ride upward with the newly compact header.
      if (nextTrackHeader && before.trackHeader && trackHeaderRect) {
        gsap.fromTo(nextTrackHeader, {
          x: before.trackHeader.left - trackHeaderRect.left,
          y: before.trackHeader.top - trackHeaderRect.top,
        }, {
          x: 0,
          y: 0,
          duration: 0.52,
          ease: 'power3.inOut',
          overwrite: 'auto',
          clearProps: 'x,y',
        });
      }

      if (nextTabs && before.tabs && tabsRect) {
        gsap.fromTo(nextTabs, { y: before.tabs.top - tabsRect.top }, {
          y: 0,
          duration: 0.58,
          ease: 'power3.inOut',
          overwrite: 'auto',
          clearProps: 'y',
        });
      }

      if (nextPanel && before.panel && panelRect) {
        gsap.fromTo(nextPanel, { y: before.panel.top - panelRect.top }, {
          y: 0,
          duration: 0.62,
          ease: 'power3.inOut',
          overwrite: 'auto',
          clearProps: 'y',
        });
      }
    });
  }, [isLyricsPanelActive, isCompactLyricsLayout, runTabTransition]);

  const handleShowQueue = useCallback(() => {
    if (!isLyricsPanelActive) return; // already active

    if (!isCompactLyricsLayout) {
      usePlayerStore.setState({ showLyrics: false, showQueue: true });
      runTabTransition(false);
      return;
    }

    const cover = coverWrapperRef.current;
    const trackHeader = selectWithinShell('.fullscreen-track-meta');
    const tabs = selectWithinShell('.fullscreen-tabs');
    const panel = selectWithinShell('.fullscreen-lyrics-panel');
    const before = {
      cover: cover?.getBoundingClientRect(),
      trackHeader: trackHeader[0]?.getBoundingClientRect(),
      tabs: tabs[0]?.getBoundingClientRect(),
      panel: panel[0]?.getBoundingClientRect(),
    };

    usePlayerStore.setState({ showLyrics: false, showQueue: true });
    runTabTransition(false);

    requestAnimationFrame(() => {
      const nextCover = coverWrapperRef.current;
      const nextTrackHeader = selectWithinShell('.fullscreen-track-meta')[0];
      const nextTabs = selectWithinShell('.fullscreen-tabs')[0];
      const nextPanel = selectWithinShell('.fullscreen-lyrics-panel')[0];
      const coverRect = nextCover?.getBoundingClientRect();
      const trackHeaderRect = nextTrackHeader?.getBoundingClientRect();
      const tabsRect = nextTabs?.getBoundingClientRect();
      const panelRect = nextPanel?.getBoundingClientRect();

      if (nextCover && before.cover && coverRect?.width && coverRect.height) {
        gsap.set(nextCover, {
          x: before.cover.left - coverRect.left,
          y: before.cover.top - coverRect.top,
          width: before.cover.width,
          height: before.cover.height,
          borderRadius: '16px',
          transformOrigin: 'top left',
          force3D: true,
        });
        gsap.to(nextCover, {
          x: 0,
          y: 0,
          width: coverRect.width,
          height: coverRect.height,
          borderRadius: '28px',
          duration: 0.56,
          ease: 'power3.inOut',
          overwrite: 'auto',
          clearProps: 'x,y,width,height,borderRadius,transformOrigin',
        });
      }

      if (nextTrackHeader && before.trackHeader && trackHeaderRect) {
        gsap.fromTo(nextTrackHeader, {
          x: before.trackHeader.left - trackHeaderRect.left,
          y: before.trackHeader.top - trackHeaderRect.top,
        }, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: 'power3.inOut',
          overwrite: 'auto',
          clearProps: 'x,y',
        });
      }

      if (nextTabs && before.tabs && tabsRect) {
        gsap.fromTo(nextTabs, { y: before.tabs.top - tabsRect.top }, {
          y: 0,
          duration: 0.54,
          ease: 'power3.inOut',
          overwrite: 'auto',
          clearProps: 'y',
        });
      }

      if (nextPanel && before.panel && panelRect) {
        gsap.fromTo(nextPanel, { y: before.panel.top - panelRect.top }, {
          y: 0,
          duration: 0.58,
          ease: 'power3.inOut',
          overwrite: 'auto',
          clearProps: 'y',
        });
      }
    });
  }, [isLyricsPanelActive, isCompactLyricsLayout, runTabTransition]);

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

  // Sync if opened directly into Drive Mode from DevicesMenu
  useLayoutEffect(() => {
    if (isFullscreenOpen && isDriveModeOpen && !isDriveMode) {
      setIsDriveMode(true);
    }
  }, [isFullscreenOpen, isDriveModeOpen, isDriveMode]);

  // Mode changes should be a hard cut. If a fullscreen open/close or Lyrics/Queue
  // tween is still running when Drive Mode is entered or left, it can keep
  // moving the hidden player and become visible again on return. Stop those
  // timelines and put the fullscreen panels into their exact resting state.
  const settleFullscreenForModeSwitch = () => {
    clearCloseCanvasTimeout();
    clearAutoTransitionFrame();
    clearQueueAnimationFrame();
    killActiveTransition();
    killTabTransition();

    if (coverWrapperRef.current) {
      gsap.set(coverWrapperRef.current, {
        clearProps: 'x,y,scaleX,scaleY,opacity,transformOrigin,willChange',
      });
    }

    gsapSetIfPresent(selectWithinShell('.fullscreen-overlay-bg'), {
      opacity: 1,
      clearProps: 'willChange',
    });
    gsapSetIfPresent(selectWithinShell('.fullscreen-cover-2d'), {
      clearProps: 'willChange',
    });
    gsapSetIfPresent(
      selectWithinShell('.fullscreen-close-btn, .fullscreen-track-title, .fullscreen-artist, .fullscreen-track-badges, .fullscreen-tabs, .fullscreen-progress-bar, .fullscreen-controls, .fullscreen-lyrics-panel'),
      { clearProps: 'transform,opacity,scale,willChange' },
    );
    gsapSetIfPresent(selectWithinShell('.queue-item'), {
      clearProps: 'transform,opacity,willChange',
    });

    const lyricsPanel = lyricsContainerRef.current;
    const queuePanel = queueContainerRef.current;
    if (lyricsPanel && queuePanel) {
      gsap.set(lyricsPanel, {
        visibility: isLyricsPanelActive ? 'visible' : 'hidden',
        pointerEvents: isLyricsPanelActive ? 'auto' : 'none',
        opacity: isLyricsPanelActive ? 1 : 0,
        clearProps: 'transform',
      });
      gsap.set(queuePanel, {
        visibility: isLyricsPanelActive ? 'hidden' : 'visible',
        pointerEvents: isLyricsPanelActive ? 'none' : 'auto',
        opacity: isLyricsPanelActive ? 0 : 1,
        clearProps: 'transform',
      });
    }

    const pill = tabPillRef.current;
    const activeTab = isLyricsPanelActive ? lyricsTabBtnRef.current : queueTabBtnRef.current;
    const pillParent = pill?.parentElement;
    if (pill && activeTab && pillParent) {
      const parentRect = pillParent.getBoundingClientRect();
      const activeRect = activeTab.getBoundingClientRect();
      if (activeRect.width > 0) {
        gsap.set(pill, { x: activeRect.left - parentRect.left, width: activeRect.width });
      }
    }
    if (lyricsTabBtnRef.current && queueTabBtnRef.current) {
      gsap.set(lyricsTabBtnRef.current, {
        color: isLyricsPanelActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.38)',
      });
      gsap.set(queueTabBtnRef.current, {
        color: isLyricsPanelActive ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,1)',
      });
    }
  };

  const handleDriveCoverReady = (cover: HTMLDivElement) => {
    driveCoverRef.current = cover;
    if (modeCoverTransitionRef.current?.direction === 'to-drive') {
      moveModeCoverToTarget(cover);
    }
  };

  const handleEnterDriveMode = useCallback(() => {
    if (isDriveMode || modeTransitionBusyRef.current) return;

    settleFullscreenForModeSwitch();
    const source = coverWrapperRef.current;
    const coverTransition = source ? createModeCoverTransition(source, 'to-drive') : null;
    if (!coverTransition) {
      setFullscreenInteractable(true);
      setTransitionState('open');
      setDriveModeOpen(true);
      setIsDriveMode(true);
      return;
    }

    const { transition, rect } = coverTransition;
    const fadeTargets = selectWithinShell(
      '.fullscreen-close-btn, .fullscreen-track-meta, .fullscreen-tabs, .fullscreen-progress-bar, .fullscreen-controls, .fullscreen-lyrics-panel',
    );
    const timeline = gsap.timeline({
      onComplete: () => {
        if (modeCoverTransitionRef.current !== transition) return;
        modeCoverTimelineRef.current = null;
        setFullscreenInteractable(true);
        setTransitionState('open');
        setDriveModeOpen(true);
        setIsDriveMode(true);
      },
    });
    modeCoverTimelineRef.current = timeline;

    const scale = 1.08;
    const width = rect.width * scale;
    const height = rect.height * scale;
    timeline
      .to(transition.clone, {
        left: rect.left - (width - rect.width) / 2,
        top: rect.top - (height - rect.height) / 2,
        width,
        height,
        duration: 0.2,
        ease: 'power2.out',
      }, 0)
      .to(fadeTargets, {
        opacity: 0,
        y: -6,
        duration: 0.2,
        ease: 'power2.out',
        stagger: 0.015,
      }, 0);
  }, [isDriveMode, setDriveModeOpen, settleFullscreenForModeSwitch]);

  const handleCloseDriveMode = useCallback(() => {
    if (!isDriveMode || modeTransitionBusyRef.current) return;

    const source = driveCoverRef.current?.isConnected
      ? driveCoverRef.current
      : shellRef.current?.querySelector<HTMLElement>('.drive-cover-art');
    const coverTransition = source ? createModeCoverTransition(source, 'to-fullscreen') : null;
    if (!coverTransition) {
      settleFullscreenForModeSwitch();
      setFullscreenInteractable(true);
      setTransitionState('open');
      setDriveModeOpen(false);
      setIsDriveMode(false);
      return;
    }

    const { transition, rect } = coverTransition;
    const fadeTargets = selectWithinShell(
      '.drive-header, .drive-track-copy, .drive-bottom-panel, .drive-lyrics-container',
    );
    const timeline = gsap.timeline({
      onComplete: () => {
        if (modeCoverTransitionRef.current !== transition) return;
        modeCoverTimelineRef.current = null;
        settleFullscreenForModeSwitch();

        const revealTargets = selectWithinShell(
          '.fullscreen-close-btn, .fullscreen-track-meta, .fullscreen-tabs, .fullscreen-progress-bar, .fullscreen-controls, .fullscreen-lyrics-panel',
        );
        gsapSetIfPresent(revealTargets, { opacity: 0, y: 8, willChange: 'opacity,transform' });
        if (coverWrapperRef.current) {
          gsap.set(coverWrapperRef.current, { opacity: 0, willChange: 'opacity' });
        }

        setFullscreenInteractable(true);
        setTransitionState('open');
        setDriveModeOpen(false);
        setIsDriveMode(false);

        window.requestAnimationFrame(() => {
          const target = coverWrapperRef.current;
          if (target) {
            moveModeCoverToTarget(target);
          } else {
            clearModeCoverTransition();
          }
        });
      },
    });
    modeCoverTimelineRef.current = timeline;

    const scale = 1.08;
    const width = rect.width * scale;
    const height = rect.height * scale;
    timeline
      .to(transition.clone, {
        left: rect.left - (width - rect.width) / 2,
        top: rect.top - (height - rect.height) / 2,
        width,
        height,
        duration: 0.2,
        ease: 'power2.out',
      }, 0)
      .to(fadeTargets, {
        opacity: 0,
        y: -6,
        duration: 0.2,
        ease: 'power2.out',
        stagger: 0.015,
      }, 0);
  }, [isDriveMode, setDriveModeOpen, settleFullscreenForModeSwitch]);

  const toggleDriveMode = useCallback(() => {
    if (!isDriveMode) {
      handleEnterDriveMode();
    } else {
      handleCloseDriveMode();
    }
  }, [isDriveMode, handleEnterDriveMode, handleCloseDriveMode]);

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
      <div className="absolute inset-0 -z-10 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 25%, rgba(0,0,0,0.55) 52%, rgba(0,0,0,0.12) 78%, transparent 100%)' }} />

      {visualTrack ? (
        <div 
          className="absolute inset-0 flex h-full w-full flex-col overflow-hidden p-4 pt-6 md:p-8"
          style={{
            visibility: isDriveMode ? 'hidden' : 'visible',
            pointerEvents: isDriveMode ? 'none' : 'auto',
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
              <div className={`fullscreen-track-header order-1 flex w-full items-center ${isCompactLyricsLayout && isLyricsPanelActive ? 'max-w-2xl flex-row justify-center gap-3 sm:gap-4' : 'flex-col'}`}>
                <div
                  ref={coverWrapperRef}
                  className={`fullscreen-cover-wrapper relative flex flex-shrink-0 items-center justify-center overflow-hidden shadow-2xl ${isCompactLyricsLayout && isLyricsPanelActive ? 'h-16 w-16 max-h-16 max-w-16 rounded-2xl sm:h-20 sm:w-20 sm:max-h-20 sm:max-w-20' : 'h-[44vw] w-[44vw] max-h-[220px] max-w-[220px] rounded-[28px] sm:h-[240px] sm:w-[240px] md:h-[280px] md:w-[280px] xl:h-[360px] xl:w-[360px]'}`}
                  style={{
                    willChange: transitionState === 'opening' || transitionState === 'closing' ? 'transform, opacity' : 'auto',
                    position: 'relative',
                    transform: 'translateZ(0)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.16), 0 18px 48px rgba(0,0,0,0.7), 0 0 28px rgba(150,110,255,0.14)',
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
                  <div className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border border-white/20">
                    <span className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-gradient-to-b from-white/75 via-white/20 to-accent/70 shadow-[0_0_10px_rgba(255,255,255,0.35)]" />
                    <span className="absolute inset-y-3 right-0 w-[3px] rounded-full bg-gradient-to-b from-white/75 via-white/20 to-accent/70 shadow-[0_0_10px_rgba(255,255,255,0.35)]" />
                  </div>
                </div>

              <div className={`fullscreen-track-meta flex min-w-0 flex-col ${isCompactLyricsLayout && isLyricsPanelActive ? 'flex-1 items-start text-left' : 'mt-4 w-full items-center text-center landscape:mt-6 xl:mt-8'}`}>
                <div className={`flex w-full flex-col ${isCompactLyricsLayout && isLyricsPanelActive ? 'items-start text-left' : 'max-w-2xl items-center text-center'}`}>
                  <div ref={titleContainerRef} className={`overflow-hidden w-full ${isCompactLyricsLayout && isLyricsPanelActive ? 'px-0' : 'px-6 md:px-8 xl:px-0'}`}>
                    <h1 
                      ref={titleTextRef}
                      className={`fullscreen-track-title font-bold leading-tight ${isCompactLyricsLayout && isLyricsPanelActive ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl'} ${
                        isTitleOverflowing ? 'animate-marquee inline-block whitespace-nowrap' : 'truncate'
                      }`}
                    >
                      <span className={isTitleOverflowing ? 'pr-8' : ''}>{visualTrack.title}</span>
                      {isTitleOverflowing && (
                        <span className="pr-8" aria-hidden="true">{visualTrack.title}</span>
                      )}
                    </h1>
                  </div>
                  <p className={`fullscreen-artist mt-0.5 text-sm text-white/70 md:text-base truncate w-full ${isCompactLyricsLayout && isLyricsPanelActive ? 'text-left' : 'mt-1 text-base text-center md:text-lg'}`}>
                    {visualTrack.artist}
                  </p>
                  <div className={`fullscreen-track-badges mt-2 flex flex-wrap items-center gap-2 ${isCompactLyricsLayout && isLyricsPanelActive ? 'justify-start' : 'justify-center'}`}>
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
              </div>

              <div className="order-4 mt-4 flex w-full flex-col items-center justify-center gap-2 xl:mt-6">
                <FullscreenProgressTrack />

                  <div className="fullscreen-controls shrink-0 w-full max-w-md flex justify-center landscape:max-w-full xl:max-w-md">
                  <div className="grid w-full grid-cols-7 items-center px-2 xs:px-4 sm:px-0">
                    <button onClick={toggleShuffle} className={`justify-self-center p-1 sm:p-2 transition ${shuffle ? 'text-accent' : 'text-white/50 hover:text-white'}`}>
                      <RiShuffleLine size={24} />
                    </button>
                    <button onClick={() => toggleLike(visualTrack.id)} className="justify-self-center p-1 sm:p-2 transition hover:scale-110">
                      {isLiked ? <RiHeartFill size={24} className="text-accent" /> : <RiHeartLine size={24} className="text-white/50 hover:text-white" />}
                    </button>
                    <button onClick={prevTrack} className="justify-self-center p-1 sm:p-2 text-white/70 transition hover:text-white">
                      <RiSkipBackFill size={32} />
                    </button>
                    <button onClick={togglePlay} className="flex h-[60px] w-[60px] sm:h-16 sm:w-16 items-center justify-center justify-self-center rounded-full bg-white text-surface transition hover:scale-105 shrink-0">
                      {isPlaying ? <RiPauseFill size={32} /> : <RiPlayFill size={32} />}
                    </button>
                    <button onClick={nextTrack} className="justify-self-center p-1 sm:p-2 text-white/70 transition hover:text-white">
                      <RiSkipForwardFill size={32} />
                    </button>
                    <button onClick={toggleMute} className="justify-self-center p-1 sm:p-2 text-white/50 transition hover:text-white">
                      {isMuted || volume === 0 ? <RiVolumeMuteLine size={22} /> : <RiVolumeUpLine size={22} />}
                    </button>
                    <button onClick={cycleRepeat} className={`justify-self-center p-1 sm:p-2 transition ${repeat !== 'off' ? 'text-accent' : 'text-white/50 hover:text-white'}`}>
                      <RepeatIcon size={24} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="portrait:contents landscape:flex landscape:flex-col landscape:justify-center landscape:h-full landscape:col-start-2 landscape:row-start-1 landscape:min-w-0 landscape:pl-2 xl:flex xl:flex-col xl:justify-center xl:col-start-2 xl:row-start-1 xl:min-w-0 xl:pl-0">
              <div
                className="order-3 mt-3 flex w-full flex-1 flex-col items-center gap-3 min-h-0 md:mt-6 md:gap-6 landscape:mt-0 xl:mt-8"
                style={{ transform: isPortraitStackedLayout || isMobileFullscreenLayout ? undefined : 'translateY(-80px)' }}
              >
                <div
                  className="fullscreen-tabs relative z-10 flex min-h-12 w-full max-w-[22rem] items-center rounded-full p-1 shadow-2xl"
                  style={{
                    top: `${fullscreenTabsTopOffset}px`,
                    transform: 'translateZ(0)',
                    marginTop: undefined,
                    background: 'rgba(10,10,16,0.72)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: '0 4px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Animated active pill */}
                  <div
                    ref={tabPillRef}
                    className="absolute top-1 bottom-1 left-1 rounded-full z-0 pointer-events-none"
                    style={{
                      width: 'calc(50% - 6px)',
                      background: 'linear-gradient(135deg, color-mix(in srgb, var(--gradient-from) 25%, rgba(255,255,255,0.1)), color-mix(in srgb, var(--gradient-to) 18%, rgba(255,255,255,0.06)))',
                      boxShadow: '0 3px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.22)',
                      border: '1px solid color-mix(in srgb, var(--gradient-from) 36%, rgba(255,255,255,0.12))',
                      willChange: tabTransitionTlRef.current ? 'transform, width' : 'auto',
                      transform: 'translateZ(0)',
                    }}
                  />

                  {/* Lyrics tab */}
                  <button
                    ref={lyricsTabBtnRef}
                    onClick={handleShowLyrics}
                    className="relative z-10 flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 select-none outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                    style={{ willChange: 'color' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" opacity="0.85">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                    <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.025em' }}>Lyrics</span>
                  </button>

                  {/* Queue tab */}
                  <button
                    ref={queueTabBtnRef}
                    onClick={handleShowQueue}
                    className="relative z-10 flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 select-none outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                    style={{ willChange: 'color' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" opacity="0.85">
                      <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                    </svg>
                    <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.025em' }}>Queue</span>
                  </button>
                </div>

                <div className={`fullscreen-lyrics-panel relative flex flex-col flex-1 w-full min-h-0 xl:items-center mt-2 ${(isPortraitStackedLayout || isMobileFullscreenLayout) && showQueue ? '-mb-20' : '-mb-12'}`}>
                  
                  {/* Lyrics Container */}
                  <div
                    ref={lyricsContainerRef}
                    className="lyric-scroller absolute inset-0 flex flex-col items-center w-full h-full"
                    style={{ 
                      willChange: tabTransitionTlRef.current ? 'transform, opacity' : 'auto',
                      transform: 'translateZ(0)',
                    }}
                  >
                    <FullscreenLyricsContent
                      lyrics={lyrics}
                      lyricVerticalPositions={lyricVerticalPositions}
                      lyricLineHeight={lyricLineHeight}
                      lyricLineGap={lyricLineGap}
                      isMobileFullscreenLayout={isMobileFullscreenLayout}
                      isDesktopFullscreenLayout={layoutProfile === 'desktop'}
                      lyricsDisplayMode={lyricsDisplayMode}
                      activeLyricGlowColor={visualTrack?.coverGradient?.[0] || '#E8470A'}
                      lyricsMask={fullscreenLyricsMask}
                    />
                  </div>

                  {/* Queue Container */}
                  <div
                    ref={queueContainerRef}
                    className="absolute inset-0 flex flex-col max-w-3xl mx-auto w-full h-full overflow-hidden pb-12"
                    style={{ 
                      willChange: tabTransitionTlRef.current ? 'transform, opacity, filter' : 'auto',
                      transform: 'translateZ(0)',
                    }}
                  >
                    <div
                      className="queue-metadata absolute left-0 right-0 z-10 flex items-center justify-between shrink-0 px-2 pt-1"
                      style={{ top: `${fullscreenQueueHeaderTopOffset}px` }}
                    >
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

                    <div
                      className="absolute inset-x-0 bottom-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 [webkit-overflow-scrolling:touch] px-0 pb-12"
                      style={{
                        top: `${fullscreenQueueListTopOffset}px`,
                        maskImage: fullscreenQueueMask,
                        WebkitMaskImage: fullscreenQueueMask,
                      }}
                    >
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
        </div>
      ) : null}

      {/* Dynamic Up Next Popup (Only active when not in Drive mode) */}
      {!isDriveMode && <FullscreenUpNext track={queue[queueIndex + 1] || (repeat === 'all' ? queue[0] : null)} />}

      {/* Embedded Drive Player, shown immediately when Drive Mode is selected */}
      {isDriveMode && visualTrack && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[60] overflow-hidden">
          <DrivePlayer 
            onClose={handleCloseDriveMode}
            isEmbedded={true} 
            onLargeCoverReady={handleDriveCoverReady}
          />
        </div>,
        document.body,
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
