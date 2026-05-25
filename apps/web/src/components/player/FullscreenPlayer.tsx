import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import type { Track } from '../../types';
import { formatDuration, getLyricsForTrack } from '../../utils/formatters';
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

function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
  const expanded = sanitized.length === 3
    ? sanitized.split('').map((char) => `${char}${char}`).join('')
    : sanitized;
  const value = Number.parseInt(expanded, 16);

  if (Number.isNaN(value)) return [51, 51, 51];

  return [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
  ];
}

function SpinningVinyl3D({ track }: { track: Track }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) return;

    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;

      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;

      varying vec2 v_uv;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec3 u_color_a;
      uniform vec3 u_color_b;

      mat2 rotation2d(float angle) {
        float s = sin(angle);
        float c = cos(angle);
        return mat2(c, -s, s, c);
      }

      void main() {
        vec2 uv = v_uv - 0.5;
        float aspect = u_resolution.x / max(u_resolution.y, 1.0);
        uv.x *= aspect;

        vec2 rotated = rotation2d(u_time * 0.6) * uv;
        float dist = length(rotated);
        float discMask = 1.0 - smoothstep(0.47, 0.5, dist);
        float holeMask = smoothstep(0.05, 0.075, dist);

        float angle = atan(rotated.y, rotated.x);
        float grooves = 0.5 + 0.5 * sin((dist * 220.0) - (u_time * 10.0));
        float sheen = 0.5 + 0.5 * cos(angle * 5.0 - u_time * 2.8);
        float pulse = 0.5 + 0.5 * sin(u_time * 1.8);

        vec3 baseColor = mix(u_color_a, u_color_b, clamp((rotated.y * 0.5) + 0.5, 0.0, 1.0));
        vec3 vinylColor = mix(vec3(0.03, 0.03, 0.04), baseColor * 0.72, smoothstep(0.14, 0.28, 0.42 - dist));
        vinylColor += grooves * 0.06;
        vinylColor += sheen * 0.08;

        float labelMask = 1.0 - smoothstep(0.12, 0.16, dist);
        vec3 labelColor = mix(baseColor * 0.95, vec3(0.96, 0.96, 0.98), 0.22 + pulse * 0.08);
        vec3 color = mix(vinylColor, labelColor, labelMask);

        float rim = smoothstep(0.38, 0.47, dist) * 0.18;
        color += rim;
        color *= discMask * holeMask;

        gl_FragColor = vec4(color, discMask * holeMask);
      }
    `;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
      ]),
      gl.STATIC_DRAW,
    );

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const colorALocation = gl.getUniformLocation(program, 'u_color_a');
    const colorBLocation = gl.getUniformLocation(program, 'u_color_b');

    const colorA = hexToRgb(track.coverGradient?.[0] || '#E8470A').map((value) => value / 255);
    const colorB = hexToRgb(track.coverGradient?.[1] || '#222222').map((value) => value / 255);

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = (time: number) => {
      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform3f(colorALocation, colorA[0], colorA[1], colorA[2]);
      gl.uniform3f(colorBLocation, colorB[0], colorB[1], colorB[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frameRef.current = window.requestAnimationFrame(render);
    };

    resize();
    frameRef.current = window.requestAnimationFrame(render);
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [track]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />;
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

  const [show3DCanvas, setShow3DCanvas] = useState(false);
  const [isFullscreenInteractable, setFullscreenInteractable] = useState(false);
  const [transitionState, setTransitionState] = useState<TransitionState>('closed');
  const [isDriveMode, setIsDriveMode] = useState(false);

  const shellRef = useRef<HTMLDivElement>(null);
  const coverWrapperRef = useRef<HTMLDivElement>(null);
  const driveModeButtonRef = useRef<HTMLButtonElement>(null);
  const previousOpenRef = useRef(isFullscreenOpen);
  const activeTransitionRef = useRef<gsap.core.Timeline | null>(null);
  const closeCanvasTimeoutRef = useRef<number | null>(null);
  const previousTrackIdRef = useRef<string | null>(null);
  const autoTransitionFrameRef = useRef<number | null>(null);
  const queueAnimationFrameRef = useRef<number | null>(null);

  const visualTrack = currentTrack;
  const coverUrl = getTrackCoverUrl(visualTrack);
  const lyrics = useMemo(() => (visualTrack ? getLyricsForTrack(visualTrack.id) : []), [visualTrack]);

  const currentLyricIndex = useMemo(() => {
    if (!lyrics.length) return -1;
    for (let i = lyrics.length - 1; i >= 0; i -= 1) {
      if (currentTime >= lyrics[i].time) return i;
    }
    return 0;
  }, [lyrics, currentTime]);

  const upcomingTracks = useMemo(() => {
    if (queueIndex < 0) return queue.slice(0, 5);
    return queue.slice(queueIndex + 1, queueIndex + 6);
  }, [queue, queueIndex]);

  const visibleUpcomingTracks = upcomingTracks.slice(0, 3);
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

    gsap.set(selectWithinShell('.fullscreen-overlay-bg'), { opacity: 0 });
    gsap.set(selectWithinShell('.fullscreen-cover-2d'), { opacity: 1 });
    gsap.set(selectWithinShell('.fullscreen-cover-3d'), { opacity: 0 });
    gsap.set(selectWithinShell('.fullscreen-close-btn, .fullscreen-track-title, .fullscreen-artist, .fullscreen-progress-bar, .fullscreen-controls, .fullscreen-lyrics-panel'), {
      clearProps: 'transform,opacity',
    });
    gsap.set(selectWithinShell('.queue-item'), {
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
    if (show3DCanvas && transitionState === 'settling') {
      const crossfadeTl = gsap.timeline({
        onComplete: () => {
          activeTransitionRef.current = null;
          setTransitionState('open');
        },
      });

      activeTransitionRef.current = crossfadeTl;
      gsap.set(selectWithinShell('.fullscreen-cover-3d'), { opacity: 0 });
      crossfadeTl
        .to(selectWithinShell('.fullscreen-cover-2d'), {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.inOut',
        }, 0)
        .to(selectWithinShell('.fullscreen-cover-3d'), {
          opacity: 1,
          duration: 0.4,
          ease: 'power2.inOut',
        }, 0);

      return () => {
        crossfadeTl.kill();
      };
    }

    return undefined;
  }, [show3DCanvas, transitionState]);

  useEffect(() => {
    if (!currentTrack) {
      clearCloseCanvasTimeout();
      clearAutoTransitionFrame();
      killActiveTransition();
      setShow3DCanvas(false);
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

  useLayoutEffect(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = isFullscreenOpen;

    if (!visualTrack || !isFullscreenOpen || wasOpen) return;

    clearCloseCanvasTimeout();
    killActiveTransition();
    setShow3DCanvas(false);
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

      const openTl = gsap.timeline({
        onComplete: () => {
          activeTransitionRef.current = null;
          setShow3DCanvas(true);
          setFullscreenInteractable(true);
          setTransitionState('settling');
        },
      });

      activeTransitionRef.current = openTl;
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
        .from(selectWithinShell('.fullscreen-progress-bar'), {
          opacity: 0,
          scaleX: 0,
          duration: 0.5,
          ease: 'power3.out',
          transformOrigin: 'left center',
        }, 0.35)
        .from(selectWithinShell('.fullscreen-controls'), {
          y: 40,
          opacity: 0,
          scale: 0.95,
          duration: 0.5,
          ease: 'power4.out',
        }, 0.3)
        .from(selectWithinShell('.fullscreen-lyrics-panel'), {
          y: 50,
          opacity: 0,
          scale: 0.98,
          duration: 0.55,
          ease: 'power4.out',
        }, 0.4)
        .fromTo(selectWithinShell('.queue-item'), {
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
      setShow3DCanvas(false);
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
        setShow3DCanvas(false);
        setTransitionState('closed');
        setFullscreenOpen(false);
        resetAnimatedState();
      },
    });

    activeTransitionRef.current = closeTl;
    closeTl
      .to(selectWithinShell('.queue-item'), {
        opacity: 0,
        y: -20,
        duration: 0.4,
        stagger: {
          each: 0.06,
          from: 'end',
        },
        ease: 'power2.in',
      }, 0)
      .to(selectWithinShell('.fullscreen-cover-3d'), {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.out',
      }, 0.25)
      .to(selectWithinShell('.fullscreen-cover-2d'), {
        opacity: 1,
        duration: 0.2,
        ease: 'power2.out',
      }, 0.25)
      .add(() => {
        closeCanvasTimeoutRef.current = null;
        setShow3DCanvas(false);
      }, 0.45)
      .to(selectWithinShell('.fullscreen-controls, .fullscreen-track-title, .fullscreen-artist, .fullscreen-lyrics-panel, .fullscreen-progress-bar'), {
        opacity: 0,
        y: 20,
        duration: 0.25,
        stagger: 0.04,
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

    // Step 3: Crossfade main cover (happens during move-up)
    tl.to(selectWithinShell('.fullscreen-cover-2d'), {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.inOut',
    }, 0.5);

    tl.to(selectWithinShell('.fullscreen-cover-2d'), {
      opacity: 1,
      duration: 0.3,
      ease: 'power2.inOut',
    }, 0.8);

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

  // Show DrivePlayer when drive mode is active
  if (isDriveMode && visualTrack) {
    return <DrivePlayer onClose={() => setIsDriveMode(false)} />;
  }

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        opacity: shellShouldBeVisible ? 1 : 0,
        pointerEvents: isFullscreenInteractable ? 'auto' : 'none',
        transform: 'translateZ(0)',
      }}
    >
      <div
        className="fullscreen-overlay-bg absolute inset-0 backdrop-blur-3xl"
        style={{
          background: `linear-gradient(180deg, ${startColor}33 0%, rgba(13, 13, 13, 0.85) 56%, rgba(13, 13, 13, 0.95) 100%)`,
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
                onClick={() => setIsDriveMode(!isDriveMode)}
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

                {show3DCanvas ? (
                  <div className="fullscreen-cover-3d absolute inset-0" style={{ opacity: 0 }}>
                    <SpinningVinyl3D key={visualTrack.id} track={visualTrack} />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex w-full max-w-lg flex-1 flex-col items-center justify-between overflow-hidden lg:items-start">
              <div className="w-full">
                <div className="text-center lg:text-left">
                  <h1 className="fullscreen-track-title text-2xl font-bold leading-tight md:text-3xl">
                    {visualTrack.title}
                  </h1>
                  <p className="fullscreen-artist mt-1 text-base text-white/70 md:text-lg">
                    {visualTrack.artist}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
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
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-1.5 shadow-lg">
                    <button
                      onClick={handleShowLyrics}
                      className={`flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        isLyricsPanelActive ? 'bg-white text-surface shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      Lyrics
                    </button>
                    <button
                      onClick={handleShowQueue}
                      className={`flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        !isLyricsPanelActive ? 'bg-white text-surface shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white'
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
                      <div className="max-h-[90px] overflow-hidden sm:max-h-[180px]">
                        {lyrics.length > 0 ? (
                          <div className="space-y-1.5">
                            {lyrics.slice(Math.max(0, currentLyricIndex - 1), currentLyricIndex + 4).map((line, index) => {
                              const actualIndex = Math.max(0, currentLyricIndex - 1) + index;
                              return (
                                <div
                                  key={actualIndex}
                                  className={`text-base font-medium ${
                                    actualIndex === currentLyricIndex ? 'text-white' : 'text-white/40'
                                  }`}
                                >
                                  {line.text || '♪'}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="rounded-2xl bg-white/5 p-2.5 text-sm text-white/60 text-center">
                              ♪ Lyrics are not available for this track ♪
                            </div>
                            <label className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-white/20 hover:border-white/30 cursor-pointer">
                              <input
                                type="file"
                                accept=".lrc"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // TODO: Implement LRC file import
                                    console.log('Import LRC file:', file.name);
                                  }
                                }}
                              />
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              Import Lyrics (.lrc)
                            </label>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
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
                          <div className="rounded-2xl bg-white/5 p-3 text-sm text-white/60">
                            No tracks queued after this one.
                          </div>
                        )}
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
