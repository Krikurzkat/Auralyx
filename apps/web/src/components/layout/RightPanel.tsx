import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import { formatDuration, getLyricsForTrack } from '../../utils/formatters';
import { RiDeleteBinLine } from 'react-icons/ri';
import { useMemo, useEffect, useRef, useState } from 'react';
import { useFluidLyricMotion } from '../../utils/lyricMotion';
import RightPanelParticles from '../ui/RightPanelParticles';
import { usePerformance } from '../../hooks/usePerformance';
import { useAuthStore } from '../../stores/authStore';
import {
  getFriendListeningActivity,
  subscribeToFriendActivity,
  type FriendListeningActivity,
} from '../../services/socialActivity';
import { isSupabaseConfigured } from '../../services/supabase';

function ActivityEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-softText">
        --
      </div>
      <h3 className="text-sm font-semibold text-white/85">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-dimText">{body}</p>
    </div>
  );
}

export default function RightPanel() {
  const { currentTrack, queue, queueIndex, isPlaying, currentTime, progress, showQueue, showLyrics, removeFromQueue, playTrack } = usePlayerStore();
  const { rightPanelView, setRightPanel, reduceMotion, toggleReduceMotion } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const performanceSettings = usePerformance();
  const [friendActivity, setFriendActivity] = useState<FriendListeningActivity[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const queueContainerRef = useRef<HTMLDivElement>(null);
  const activeTrackRef = useRef<HTMLDivElement>(null);

  // Track previous view for directional tab transitions
  const prevViewRef = useRef(rightPanelView);
  const [tabTransitionClass, setTabTransitionClass] = useState('rp-tab-enter-active');
  const tabOrder: readonly string[] = ['queue', 'lyrics', 'activity'];

  useEffect(() => {
    if (prevViewRef.current !== rightPanelView) {
      const prevIdx = tabOrder.indexOf(prevViewRef.current);
      const nextIdx = tabOrder.indexOf(rightPanelView);
      const direction = nextIdx > prevIdx ? 'right' : 'left';
      setTabTransitionClass(`rp-tab-enter-from-${direction}`);
      // Force reflow then activate
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTabTransitionClass('rp-tab-enter-active');
        });
      });
      prevViewRef.current = rightPanelView;
    }
  }, [rightPanelView]);

  const lyrics = useMemo(() => {
    return currentTrack ? getLyricsForTrack(currentTrack.id, currentTrack.lyrics) : [];
  }, [currentTrack]);

  // Use the fluid physics-based lyric motion system (same as FullscreenPlayer/DrivePlayer)
  const {
    centeredFocusPosition: centeredLyricFocusPosition,
    activeLyricIndex: fluidActiveLyricIndex,
  } = useFluidLyricMotion(
    lyrics,
    currentTime + 0.12,
    isPlaying
  );

  // Compute a visible window of lyrics around the focus position
  const lyricWindowCenter = lyrics.length > 0
    ? Math.max(0, Math.min(lyrics.length - 1, Math.round(centeredLyricFocusPosition)))
    : -1;
  const LYRIC_WINDOW_RADIUS = 5;
  const lyricWindowStart = lyricWindowCenter >= 0 ? Math.max(0, lyricWindowCenter - LYRIC_WINDOW_RADIUS) : 0;
  const visibleLyrics = lyrics.slice(lyricWindowStart, lyricWindowCenter >= 0 ? lyricWindowCenter + LYRIC_WINDOW_RADIUS + 2 : 0);

  // Get previously played tracks (completed tracks that should stay in the queue)
  const previousTracks = queueIndex > 0 ? queue.slice(0, queueIndex) : [];
  const upNext = queue.slice(queueIndex + 1);

  // Auto-scroll to center the active track in queue when it is the 3rd or later track
  useEffect(() => {
    if (activeTrackRef.current && queueContainerRef.current) {
      const container = queueContainerRef.current;
      const activeItem = activeTrackRef.current;
      
      if (previousTracks.length >= 2) {
        const containerHeight = container.clientHeight;
        const itemTop = activeItem.offsetTop;
        const itemHeight = activeItem.clientHeight;
        
        const scrollTo = itemTop - (containerHeight / 2) + (itemHeight / 2);
        
        container.scrollTo({
          top: scrollTo,
          behavior: 'smooth'
        });
      } else {
        container.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }
  }, [currentTrack?.id, previousTracks.length]);

  // Queue entrance animation tracking
  const [queueMounted, setQueueMounted] = useState(false);
  useEffect(() => {
    if (rightPanelView === 'queue') {
      setQueueMounted(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setQueueMounted(true);
        });
      });
    }
  }, [rightPanelView]);

  useEffect(() => {
    if (rightPanelView !== 'activity' || !isSupabaseConfigured || !user) {
      setFriendActivity([]);
      return;
    }

    let isMounted = true;

    const loadActivity = async () => {
      setIsActivityLoading(true);
      try {
        const activity = await getFriendListeningActivity(user.id);
        if (isMounted) setFriendActivity(activity);
      } catch (error) {
        console.warn('Failed to load friend activity:', error);
        if (isMounted) setFriendActivity([]);
      } finally {
        if (isMounted) setIsActivityLoading(false);
      }
    };

    loadActivity();
    const unsubscribe = subscribeToFriendActivity(user.id, loadActivity);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [rightPanelView, user]);

  if (!showQueue && !showLyrics) return null;


  return (
    <aside className="hidden w-[320px] flex-shrink-0 border-l border-white/5 bg-glass-heavy backdrop-blur-2xl/60 xl:block">
      <div className="flex h-full flex-col overflow-y-auto p-4 pb-24 scrollbar-hidden">
        {/* Panel tabs */}
        <div className="mb-4 flex items-center gap-1 rounded-xl bg-glass backdrop-blur-2xl/60 p-1">
          {(['queue', 'lyrics', 'activity'] as const).map(view => (
            <button
              key={view}
              onClick={() => setRightPanel(view)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium capitalize transition-all duration-300 ${
                rightPanelView === view ? 'bg-glass-card backdrop-blur-xl text-white shadow-lg' : 'text-dimText hover:text-softText'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Queue view */}
        {rightPanelView === 'queue' && (
          <div className={`rp-tab-panel ${tabTransitionClass}`}>
            {/* Unified Queue Timeline */}
            <div className="relative overflow-visible rounded-2xl border border-white/10">
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                {!reduceMotion && performanceSettings.enableParticles && (
                  <RightPanelParticles
                    variant="queue"
                    colors={currentTrack?.coverGradient as [string, string] | undefined}
                  />
                )}
                {currentTrack && performanceSettings.enableHeavyAnimations && (
                  <div className="absolute inset-0 opacity-30">
                    <div 
                      className="absolute w-full h-full"
                      style={{
                        background: `radial-gradient(circle at 30% 50%, ${currentTrack.coverGradient?.[0] || '#666'}30, transparent 70%)`,
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="relative rounded-2xl bg-white/5 backdrop-blur-md p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 border border-white/20">
                      <span className="text-sm">🎵</span>
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white/95">Queue</h3>
                      <p className="text-[10px] text-white/50">
                        {currentTrack ? `${previousTracks.length + upNext.length + 1} tracks` : `${upNext.length} tracks`}
                      </p>
                    </div>
                  </div>
                  {isPlaying && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/15 border border-accent/30">
                      <div className="w-1 h-1 rounded-full bg-accent animate-pulse" style={{ animationDuration: '1.5s' }} />
                      <span className="text-[8px] font-black uppercase tracking-wider text-accent">Live</span>
                    </div>
                  )}
                </div>

                {/* Path Timeline */}
                <div ref={queueContainerRef} className="relative max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                  {currentTrack || upNext.length > 0 ? (
                    <div className="relative pl-2 pt-3">
                      {/* Vertical Path Line */}
                      <div className="absolute left-[38px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent/45 via-white/15 to-white/5" />

                      {/* Previously Played Tracks (Completed) */}
                      {previousTracks.map((track, i) => {
                        const staggerIdx = i;
                        return (
                          <div
                            key={`prev-${track.id}-${i}`}
                            className={`relative mb-8 rp-queue-item ${queueMounted ? 'rp-queue-item-visible' : ''}`}
                            style={{ '--queue-stagger': staggerIdx } as React.CSSProperties}
                          >
                            <div className="relative flex items-start gap-4 group">
                              <div className="absolute left-[32px] -translate-x-1/2 top-0 -bottom-8 w-2 pointer-events-none" style={{ zIndex: 0 }}>
                                <div className="absolute inset-0 bg-black/40" />
                                <div 
                                  className="absolute top-0 left-0 right-0"
                                  style={{ 
                                    height: '100%',
                                    background: 'linear-gradient(to bottom, var(--accent), color-mix(in srgb, var(--accent) 62%, white 12%))',
                                    boxShadow: '0 0 8px color-mix(in srgb, var(--accent) 55%, transparent)'
                                  }}
                                />
                              </div>
                              <div className="relative flex-shrink-0">
                                <svg className="absolute -inset-1 h-[72px] w-[72px] overflow-visible" style={{ zIndex: 1 }} viewBox="0 0 72 72">
                                  <circle cx="36" cy="36" r="34" stroke="rgba(0,0,0,0.4)" strokeWidth="3" fill="none" />
                                  <path
                                    d="M 36 2 A 34 34 0 0 1 36 70"
                                    stroke="color-mix(in srgb, var(--accent) 74%, white 10%)"
                                    strokeWidth="5"
                                    fill="none"
                                    strokeLinecap="round"
                                    style={{
                                      filter: 'drop-shadow(0 0 3px color-mix(in srgb, var(--accent) 42%, transparent))'
                                    }}
                                  />
                                  <path
                                    d="M 36 2 A 34 34 0 0 0 36 70"
                                    stroke="color-mix(in srgb, var(--accent) 74%, white 10%)"
                                    strokeWidth="5"
                                    fill="none"
                                    strokeLinecap="round"
                                    style={{
                                      filter: 'drop-shadow(0 0 3px color-mix(in srgb, var(--accent) 42%, transparent))'
                                    }}
                                  />
                                </svg>
                                <button onClick={() => playTrack(track, queue)} className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-accent/40 transition-all duration-300 group-hover:scale-105" style={{ zIndex: 2 }}>
                                  {track.coverUrl ? (
                                    <img src={track.coverUrl.startsWith('/') ? `http://localhost:3001${track.coverUrl}` : track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }} />
                                  )}
                                </button>
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border border-black/50 bg-green-500" style={{ zIndex: 3 }}>✓</div>
                              </div>
                              <div className="flex-1 pt-2 min-w-0">
                                <div className="truncate text-sm font-bold text-white mb-1">{track.title}</div>
                                <div className="truncate text-xs text-white/70 mb-2">{track.artist}</div>
                                {track.album && (<div className="truncate text-[10px] text-white/50 mb-2">{track.album}</div>)}
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent rounded-full" style={{ width: '100%' }} />
                                  </div>
                                  <span className="text-[10px] font-semibold text-white/50">{formatDuration(track.duration)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Now Playing Track */}
                      {currentTrack && (
                        <div
                          ref={activeTrackRef}
                          className={`relative mb-8 rp-queue-item ${queueMounted ? 'rp-queue-item-visible' : ''}`}
                          style={{ '--queue-stagger': previousTracks.length } as React.CSSProperties}
                        >
                          <div className="relative flex items-start gap-4 group min-h-[100px]">
                            <div className="absolute left-[32px] -translate-x-1/2 top-0 -bottom-8 w-2 pointer-events-none" style={{ zIndex: 0 }}>
                              <div className="absolute inset-0 bg-black/40" />
                              <div 
                                className="absolute top-0 left-0 right-0 h-[66px]"
                                style={{ 
                                    background: 'linear-gradient(to bottom, var(--accent), color-mix(in srgb, var(--accent) 58%, transparent))',
                                    boxShadow: '0 0 12px color-mix(in srgb, var(--accent) 58%, transparent)'
                                }}
                              />
                              <div className="absolute top-[66px] bottom-0 left-0 right-0 bg-transparent">
                                <div 
                                  className="w-full transition-all duration-300"
                                  style={{ 
                                    height: `${progress > 50 ? ((progress - 50) / 50) * 100 : 0}%`,
                                    background: 'var(--accent)',
                                    boxShadow: '0 0 18px color-mix(in srgb, var(--accent) 68%, transparent), 0 0 34px color-mix(in srgb, var(--accent) 34%, transparent), inset 0 0 8px rgba(255, 255, 255, 0.26)'
                                  }}
                                />
                              </div>
                            </div>
                            <div className="relative flex-shrink-0">
                              <div className="rp-now-playing-pulse absolute -inset-2 rounded-full" />
                              <svg className="absolute -inset-1 h-[72px] w-[72px] overflow-visible" style={{ zIndex: 1 }} viewBox="0 0 72 72">
                                <circle cx="36" cy="36" r="34" stroke="rgba(0,0,0,0.4)" strokeWidth="3" fill="none" />
                                {progress > 0 && (
                                  <path
                                    d={`M 36 2 A 34 34 0 0 1 ${36 + 34 * Math.sin((Math.min(progress, 50) / 50) * Math.PI)} ${36 - 34 * Math.cos((Math.min(progress, 50) / 50) * Math.PI)}`}
                                    stroke="var(--accent)"
                                    strokeWidth="5"
                                    fill="none"
                                    strokeLinecap="round"
                                    className="transition-all duration-300"
                                    style={{
                                      filter: 'drop-shadow(0 0 5px var(--accent)) drop-shadow(0 0 9px color-mix(in srgb, var(--accent) 28%, transparent))'
                                    }}
                                  />
                                )}
                                {progress > 0 && (
                                  <path
                                    d={`M 36 2 A 34 34 0 0 0 ${36 - 34 * Math.sin((Math.min(progress, 50) / 50) * Math.PI)} ${36 - 34 * Math.cos((Math.min(progress, 50) / 50) * Math.PI)}`}
                                    stroke="var(--accent)"
                                    strokeWidth="5"
                                    fill="none"
                                    strokeLinecap="round"
                                    className="transition-all duration-300"
                                    style={{
                                      filter: 'drop-shadow(0 0 5px var(--accent)) drop-shadow(0 0 9px color-mix(in srgb, var(--accent) 28%, transparent))'
                                    }}
                                  />
                                )}
                              </svg>
                              <div className="rp-now-playing-cover relative w-16 h-16 rounded-full overflow-hidden border-2 border-accent/70 shadow-lg" style={{ zIndex: 2 }}>
                                {currentTrack.coverUrl ? (
                                  <img src={currentTrack.coverUrl.startsWith('/') ? `http://localhost:3001${currentTrack.coverUrl}` : currentTrack.coverUrl} alt={currentTrack.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${currentTrack.coverGradient?.[0] || '#333'}, ${currentTrack.coverGradient?.[1] || '#222'})` }} />
                                )}
                              </div>
                              <div className="absolute -bottom-1 left-1/2 z-[3] -translate-x-1/2 rounded-full border border-accent/40 bg-black/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-accent shadow-lg backdrop-blur-md">
                                Now
                              </div>
                            </div>
                            <div className="flex-1 pt-2 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="truncate text-sm font-black text-white">{currentTrack.title}</div>
                                {isPlaying && (
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    {[0, 1, 2].map((i) => (<div key={i} className="w-0.5 bg-accent rounded-full animate-[bounce_0.8s_ease-in-out_infinite]" style={{ height: `${6 + i * 2}px`, animationDelay: `${i * 0.1}s` }} />))}
                                  </div>
                                )}
                              </div>
                              <div className="truncate text-xs text-white/80">{currentTrack.artist}</div>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-accent">
                                  Playing
                                </span>
                                <span className="text-[10px] font-semibold text-white/40">{formatDuration(Math.floor(currentTime))}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Up Next Tracks */}
                      {upNext.map((track, i) => {
                        const staggerIdx = previousTracks.length + (currentTrack ? 1 : 0) + i;
                        return (
                          <div
                            key={`${track.id}-${i}`}
                            className={`relative mb-8 last:mb-0 rp-queue-item ${queueMounted ? 'rp-queue-item-visible' : ''}`}
                            style={{ '--queue-stagger': staggerIdx } as React.CSSProperties}
                          >
                            <div className="relative flex items-start gap-4 group">
                              <div className="absolute left-[32px] -translate-x-1/2 top-0 -bottom-8 w-2 pointer-events-none" style={{ zIndex: 0 }}>
                                <div className="absolute inset-0 bg-black/40" />
                              </div>
                              <div className="relative flex-shrink-0">
                                <svg className="absolute -inset-1 h-[72px] w-[72px] overflow-visible" style={{ zIndex: 1 }} viewBox="0 0 72 72">
                                  <circle cx="36" cy="36" r="34" stroke="rgba(0,0,0,0.4)" strokeWidth="3" fill="none" />
                                </svg>
                                <button onClick={() => playTrack(track, queue)} className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-accent/60 transition-all duration-300 group-hover:scale-110" style={{ zIndex: 2 }}>
                                  {track.coverUrl ? (
                                    <img src={track.coverUrl.startsWith('/') ? `http://localhost:3001${track.coverUrl}` : track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }} />
                                  )}
                                </button>
                                <div className="absolute -top-1 -right-1 z-[3] flex h-5 min-w-5 items-center justify-center rounded-full border border-white/10 bg-black/70 px-1 text-[9px] font-black text-white/55 backdrop-blur-md">
                                  {i + 1}
                                </div>
                              </div>
                              <div className="flex-1 pt-2 min-w-0">
                                <div className="truncate text-sm font-bold text-white mb-1">{track.title}</div>
                                <div className="truncate text-xs text-white/70 mb-2">{track.artist}</div>
                                {track.album && (<div className="truncate text-[10px] text-white/50 mb-2">{track.album}</div>)}
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent/30 rounded-full" style={{ width: '0%' }} />
                                  </div>
                                  <span className="text-[10px] font-semibold text-white/50">{formatDuration(track.duration)}</span>
                                </div>
                              </div>
                              <button onClick={() => removeFromQueue(queueIndex + 1 + i)} className="opacity-0 group-hover:opacity-100 mt-3 rounded-lg p-1.5 text-white/60 transition-all hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/30">
                                <RiDeleteBinLine size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-white/10">
                      <div className="bg-white/5 backdrop-blur-md p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center bg-white/10 border border-white/20"><span className="text-3xl">🎵</span></div>
                        <h3 className="text-sm font-bold text-white/80 mb-2">Queue is Empty</h3>
                        <p className="text-xs text-white/50 leading-relaxed">Add more tracks to keep<br />the music flowing</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lyrics view — Physics-based kinetic lyrics */}
        {rightPanelView === 'lyrics' && (
          <div className={`rp-tab-panel ${tabTransitionClass}`}>
            {currentTrack ? (
              <div className="relative rounded-3xl overflow-hidden">
                {/* Animated Background Blobs */}
                <div className="absolute inset-0 overflow-hidden">
                  {!reduceMotion && performanceSettings.enableParticles && (
                    <RightPanelParticles
                      variant="lyrics"
                      colors={currentTrack.coverGradient as [string, string] | undefined}
                    />
                  )}
                  {performanceSettings.enableHeavyAnimations && (
                    <>
                      <div 
                        className="absolute w-64 h-64 rounded-full opacity-30"
                        style={{
                          background: `radial-gradient(circle, ${currentTrack.coverGradient?.[0] || '#666'}, transparent)`,
                          top: '-20%',
                          right: '-20%',
                          filter: performanceSettings.enableBlur ? `blur(${performanceSettings.maxBlurRadius}px)` : 'none',
                        }}
                      />
                      <div 
                        className="absolute w-64 h-64 rounded-full opacity-20"
                        style={{
                          background: `radial-gradient(circle, ${currentTrack.coverGradient?.[1] || '#444'}, transparent)`,
                          bottom: '-30%',
                          left: '-20%',
                          filter: performanceSettings.enableBlur ? `blur(${performanceSettings.maxBlurRadius}px)` : 'none',
                        }}
                      />
                    </>
                  )}
                </div>

                {/* Glass Container */}
                <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-3xl p-6 shadow-2xl">
                  {/* Floating Header */}
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${currentTrack.coverGradient?.[0] || '#666'}40, ${currentTrack.coverGradient?.[1] || '#444'}20)`,
                          }}
                        >
                          <span className="text-lg">🎵</span>
                        </div>
                        {isPlaying && (
                          <div 
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent border-2 border-black animate-pulse"
                            style={{ animationDuration: '2s' }}
                          />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white/95">Synced Lyrics</h3>
                        <p className="text-[10px] text-white/50 mt-0.5">{lyrics.length} lines</p>
                      </div>
                    </div>
                    {isPlaying && (
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/40 backdrop-blur-md shadow-lg">
                        <div className="flex gap-0.5">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="w-0.5 bg-accent rounded-full animate-[bounce_0.8s_ease-in-out_infinite]"
                              style={{
                                height: '8px',
                                animationDelay: `${i * 0.15}s`,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-accent ml-1">Live</span>
                      </div>
                    )}
                  </div>

                  {/* Kinetic Lyrics Container */}
                  <div 
                    ref={lyricsContainerRef}
                    className="relative overflow-hidden"
                    style={{
                      height: '420px',
                      maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
                    }}
                  >
                    {lyrics.length > 0 ? (
                      <div className="absolute inset-0">
                        {visibleLyrics.map((line, index) => {
                          const actualIndex = lyricWindowStart + index;
                          const relativePosition = actualIndex - centeredLyricFocusPosition;
                          const distance = Math.abs(relativePosition);
                          const direction = relativePosition < 0 ? -1 : 1;

                          // Kinetic vertical offset: Significantly increased spacing to accommodate multi-line wrapped text
                          // at the larger font size, ensuring lines never overlap.
                          const verticalOffset = direction * Math.pow(distance, 1.15) * 110;

                          // Scale breathing: bloom toward the focused line
                          const focusFactor = Math.max(0, 1 - distance);
                          const bloomFactor = Math.sin(focusFactor * Math.PI / 2);

                          // Opacity bloom
                          const baseOpacity = Math.max(0, 1 - distance * 0.28);
                          const opacityValue = baseOpacity + bloomFactor * (1 - baseOpacity);

                          // Scale
                          const scaleValue = 0.92 + 0.08 * bloomFactor - Math.min(distance * 0.04, 0.12);

                          // Horizontal slide for active line
                          const horizontalShift = bloomFactor * 6;

                          // Active line detection
                          const isCurrent = actualIndex === fluidActiveLyricIndex;

                          // Color + glow
                          const textColor = isCurrent ? '#ffffff' : `rgba(255, 255, 255, ${0.35 + focusFactor * 0.25})`;
                          const textShadow = isCurrent
                            ? `0 0 16px var(--accent), 0 2px 8px rgba(0,0,0,0.5)`
                            : `0 1px 4px rgba(0,0,0,${0.3 + distance * 0.1})`;

                          return (
                            <div
                              key={`${line.time}-${actualIndex}`}
                              className="rp-lyric-line absolute w-full left-0 px-3 text-left"
                              style={{
                                top: '50%',
                                fontSize: '1.1rem',
                                lineHeight: '1.4',
                                transform: `translate3d(${horizontalShift.toFixed(1)}px, calc(-50% + ${verticalOffset.toFixed(1)}px), 0) scale(${scaleValue.toFixed(3)})`,
                                opacity: opacityValue,
                                color: textColor,
                                textShadow,
                                fontWeight: isCurrent ? '900' : '700',
                                letterSpacing: isCurrent ? '0.015em' : '0',
                                zIndex: Math.max(1, 10 - Math.round(distance)),
                                willChange: 'transform, opacity, color',
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'normal',
                              }}
                            >
                              {/* Accent glow bar for active line */}
                              {isCurrent && (
                                <div
                                  className="absolute -left-1 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-accent rp-lyric-glow-bar"
                                  style={{
                                    height: '70%',
                                    boxShadow: '0 0 10px var(--accent), 0 0 20px var(--accent)',
                                  }}
                                />
                              )}
                              {line.text || '♪'}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl mb-3 opacity-60">♪</div>
                          <p className="text-sm text-white/40">No lyrics available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-3xl overflow-hidden">
                <div className="backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-3xl p-12 text-center shadow-2xl">
                  <div 
                    className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                    }}
                  >
                    <span className="text-4xl">🎵</span>
                  </div>
                  <h3 className="text-base font-bold text-white/80 mb-2">No Lyrics Available</h3>
                  <p className="text-sm text-white/50">Play a song to see synced lyrics</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Friend activity view */}
        {rightPanelView === 'activity' && (
          <div className={`rp-tab-panel ${tabTransitionClass} space-y-3`}>
            <div className="text-xs font-semibold uppercase tracking-wider text-dimText">Friend Activity</div>
            {!isSupabaseConfigured ? (
              <ActivityEmptyState title="Supabase is not connected" body="Add your Supabase URL and publishable key to enable friend activity." />
            ) : !user ? (
              <ActivityEmptyState title="Log in to see friends" body="Friend listening status appears after you sign in." />
            ) : friendActivity.length === 0 ? (
              <ActivityEmptyState
                title={isActivityLoading ? 'Loading activity' : 'No friend activity yet'}
                body={isActivityLoading ? 'Checking what your friends are listening to...' : 'Listening status will appear here after friends are added.'}
              />
            ) : friendActivity.map((friend, i) => (
              <div
                key={friend.userId}
                className={`flex items-start gap-3 rounded-xl p-3 transition hover:bg-white/5 rp-queue-item ${queueMounted ? 'rp-queue-item-visible' : ''}`}
                style={{ '--queue-stagger': i } as React.CSSProperties}
              >
                {friend.avatarUrl ? (
                  <img src={friend.avatarUrl} alt={friend.displayName} className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                    {friend.displayName[0]?.toUpperCase() || 'A'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{friend.displayName}</div>
                  <div className="truncate text-xs text-softText">Listening to {friend.trackTitle} by {friend.artist}</div>
                  <div className="text-[11px] text-dimText">{friend.isPlaying ? 'Playing now' : 'Paused'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings / Accessibility (Always at bottom) */}
        <div className="mt-auto pt-8">
          <div className="rounded-xl bg-glass backdrop-blur-2xl/40 p-3">
            <label className="flex cursor-pointer items-center justify-between text-sm">
              <span className="text-softText font-medium">Reduce Motion (3D)</span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={reduceMotion} onChange={toggleReduceMotion} />
                <div className={`block h-5 w-9 rounded-full transition-colors ${reduceMotion ? 'bg-accent' : 'bg-white/10'}`} />
                <div className={`dot absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-transform ${reduceMotion ? 'translate-x-4' : ''}`} />
              </div>
            </label>
            <p className="mt-1.5 text-[10px] text-dimText leading-tight">
              Disables 3D visualizers and particle effects to save battery and reduce motion.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
