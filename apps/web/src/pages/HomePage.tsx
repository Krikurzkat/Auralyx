import { useMemo, useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useNavigate } from 'react-router-dom';
import ContentCard from '../components/cards/ContentCard';
import { usePlayerStore } from '../stores/playerStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { usePerformance } from '../hooks/usePerformance';
import type { Track } from '../types';
import { clickedTrackCoverRef } from '../components/player/FullscreenPlayer';
import { RiAlbumLine, RiPlayFill, RiTimeLine, RiFireLine, RiMusic2Line, RiFolderMusicLine, RiUserLine, RiBarChartBoxLine, RiTrophyLine, RiHeadphoneLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import { shallow } from 'zustand/shallow';

type SpotlightAlbum = {
  id: string;
  title: string;
  artist: string;
  coverGradient: [string, string];
  coverUrl?: string;
  coverUrls: string[];
  plays: number;
  trackCount: number;
};

function mergeUniqueTracks(...groups: Track[][]): Track[] {
  const seen = new Set<string>();
  return groups.flat().filter((track) => {
    const key = track.id || track._id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTrackByline(track: Track, plays: number) {
  const artist = track.artist?.trim();
  if (artist && !/^\d+$/.test(artist)) return artist;
  return plays > 0 ? `${plays} ${plays === 1 ? 'play' : 'plays'}` : 'In your library';
}

export default function HomePage() {
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying, setFullscreenOpen } = usePlayerStore((state) => ({
    playTrack: state.playTrack,
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    setFullscreenOpen: state.setFullscreenOpen,
  }), shallow);
  const performanceSettings = usePerformance();
  const {
    localTracks, localPlaylists, isLoaded, loadLibrary,
    getMostPlayed, getRecentlyPlayed, lastPlayed, playCounts
  } = useLocalLibraryStore();
  const [featuredTrackIndex, setFeaturedTrackIndex] = useState(0);

  useEffect(() => {
    if (!isLoaded) loadLibrary();
  }, [isLoaded, loadLibrary]);

  const allTracks = useMemo(() => mergeUniqueTracks(localTracks), [localTracks]);
  const topListenedTracks = useMemo(
    () => getMostPlayed(3),
    [getMostPlayed, localTracks]
  );
  const recentTracks = useMemo(
    () => getRecentlyPlayed(8),
    [getRecentlyPlayed, localTracks]
  );
  const userPlaylists = useMemo(() => localPlaylists.slice(0, 5), [localPlaylists]);
  const spotlightAlbums = useMemo<SpotlightAlbum[]>(() => {
    const albumMap = new Map<string, SpotlightAlbum>();

    allTracks.forEach((track) => {
      const albumTitle = track.album || 'Unknown Album';
      const albumId = track.albumId || albumTitle;
      const key = `${albumId}-${albumTitle}`;
      const existing = albumMap.get(key);
      const plays = playCounts[track.id] || 0;

      if (existing) {
        existing.plays += plays;
        existing.trackCount += 1;
        if (track.coverUrl && !existing.coverUrls.includes(track.coverUrl)) {
          existing.coverUrls.push(track.coverUrl);
        }
        if (!existing.coverUrl && track.coverUrl) {
          existing.coverUrl = track.coverUrl;
        }
        return;
      }

      albumMap.set(key, {
        id: albumId,
        title: albumTitle,
        artist: track.artist || 'Unknown Artist',
        coverGradient: track.coverGradient || ['#333', '#222'],
        coverUrl: track.coverUrl,
        coverUrls: track.coverUrl ? [track.coverUrl] : [],
        plays,
        trackCount: 1,
      });
    });

    return Array.from(albumMap.values()).sort((a, b) => {
      if (b.plays !== a.plays) return b.plays - a.plays;
      return b.trackCount - a.trackCount;
    }).slice(0, 8);
  }, [allTracks, playCounts]);
  const [spotlightAlbumIndex, setSpotlightAlbumIndex] = useState(0);
  const [spotlightCoverIndex, setSpotlightCoverIndex] = useState(0);
  const mostPlayedAlbum = spotlightAlbums[spotlightAlbumIndex] || null;
  const activeAlbumCoverUrl = mostPlayedAlbum?.coverUrls[
    spotlightCoverIndex % Math.max(mostPlayedAlbum.coverUrls.length, 1)
  ] || mostPlayedAlbum?.coverUrl;
  const featureTrack = topListenedTracks.length > 0
    ? topListenedTracks[featuredTrackIndex % topListenedTracks.length]
    : recentTracks[0] || allTracks[0] || null;

  useEffect(() => {
    setSpotlightAlbumIndex((current) => (
      spotlightAlbums.length === 0 ? 0 : Math.min(current, spotlightAlbums.length - 1)
    ));
  }, [spotlightAlbums.length]);

  useEffect(() => {
    setSpotlightCoverIndex(0);
  }, [mostPlayedAlbum?.id]);

  useEffect(() => {
    if (isPlaying || spotlightAlbums.length <= 1) return undefined;

    const interval = window.setInterval(() => {
      setSpotlightAlbumIndex((current) => (current + 1) % spotlightAlbums.length);
    }, 9000);

    return () => window.clearInterval(interval);
  }, [isPlaying, spotlightAlbums.length]);

  useEffect(() => {
    const coverCount = mostPlayedAlbum?.coverUrls.length || 0;
    if (isPlaying || coverCount <= 1) return undefined;

    const interval = window.setInterval(() => {
      setSpotlightCoverIndex((current) => (current + 1) % coverCount);
    }, 3600);

    return () => window.clearInterval(interval);
  }, [isPlaying, mostPlayedAlbum?.id, mostPlayedAlbum?.coverUrls.length]);

  const changeSpotlightAlbum = (direction: -1 | 1) => {
    if (spotlightAlbums.length <= 1) return;

    setSpotlightAlbumIndex((current) => (
      (current + direction + spotlightAlbums.length) % spotlightAlbums.length
    ));
  };

  // Calculate Quick Stats
  const quickStats = useMemo(() => {
    // Get today's start (midnight local time)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    // Tracks played today (since midnight)
    const tracksPlayedToday = Object.values(lastPlayed).filter(
      (timestamp) => timestamp >= todayStartMs
    ).length;

    // Total listening time (sum of all track durations)
    const totalMinutes = Math.floor(
      allTracks.reduce((sum, track) => sum + track.duration, 0) / 60
    );

    // Calculate streak (consecutive days with plays)
    let streak = 0;
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Check if there's any play today first
    const hasPlayToday = Object.values(lastPlayed).some(
      timestamp => timestamp >= todayStartMs
    );
    
    if (hasPlayToday) {
      streak = 1; // Today counts
      
      // Check previous days
      for (let i = 1; i < 365; i++) {
        const dayStart = todayStartMs - (i * dayMs);
        const dayEnd = dayStart + dayMs;
        
        const hasPlayInDay = Object.values(lastPlayed).some(
          timestamp => timestamp >= dayStart && timestamp < dayEnd
        );
        
        if (!hasPlayInDay) break;
        streak++;
      }
    }

    // Top genre based on play counts (most played genre)
    const genrePlayCounts: Record<string, number> = {};
    allTracks.forEach(track => {
      if (track.genre) {
        const plays = playCounts[track.id] || 0;
        genrePlayCounts[track.genre] = (genrePlayCounts[track.genre] || 0) + plays;
      }
    });
    
    // If no plays yet, fall back to most common genre in library
    let topGenre = 'Various';
    if (Object.keys(genrePlayCounts).length > 0) {
      const sortedByPlays = Object.entries(genrePlayCounts).sort((a, b) => b[1] - a[1]);
      if (sortedByPlays.length > 0 && sortedByPlays[0][1] > 0) {
        topGenre = sortedByPlays[0][0];
      }
    } else {
      // Fallback: most common genre in library
      const genreCounts: Record<string, number> = {};
      allTracks.forEach(track => {
        if (track.genre) {
          genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
        }
      });
      topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Various';
    }

    return {
      tracksPlayedToday,
      totalMinutes,
      streak,
      topGenre,
      totalTracks: allTracks.length,
    };
  }, [allTracks, lastPlayed, playCounts]);

  // Aggregate popular artists based on local tracks
  const popularArtists = useMemo(() => {
    const artistCounts: Record<string, number> = {};
    const artistImages: Record<string, [string, string]> = {};
    allTracks.forEach(t => {
      artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
      if (!artistImages[t.artist] && t.coverGradient) {
        artistImages[t.artist] = t.coverGradient;
      }
    });
    return Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        id: name,
        name,
        trackCount: count,
        gradient: artistImages[name] || ['#333', '#222'],
      }));
  }, [allTracks]);

  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!contentRef.current || !isLoaded) return;
    
    // Staggered entrance for hero content
    gsap.from(contentRef.current.children, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out",
      delay: 0.2
    });
  }, { scope: heroRef, dependencies: [isLoaded] });

  const handleJumpBackInPlay = (track: Track, button: HTMLButtonElement) => {
    const coverElement = button.querySelector('.jump-back-cover') as HTMLElement | null;
    if (coverElement) {
      clickedTrackCoverRef.current = coverElement;
    }

    gsap.fromTo(button,
      { scale: 1 },
      {
        scale: 0.98,
        duration: 0.15,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      }
    );

    if (currentTrack?.id !== track.id) {
      playTrack(track, allTracks);
    }

    window.setTimeout(() => {
      setFullscreenOpen(true);
    }, 100);
  };

  if (!isLoaded) {
    return (
      <div className="page-enter space-y-8 animate-pulse p-4 md:p-6">
        <div className="h-[380px] rounded-[28px] bg-white/5" />
        <div className="space-y-4">
          <div className="h-6 w-48 rounded bg-white/10" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[0.8] rounded-2xl bg-white/5 p-4 space-y-3">
                <div className="aspect-square w-full rounded-xl bg-white/10" />
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-5 sm:space-y-8 pb-8 px-3 sm:px-4 md:px-0">
      {/* Mobile columns */}
      <section className="md:hidden">
        <section
          aria-label="Featured music"
          className="liquid-glass-surface relative isolate mb-4 overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-card via-surface to-background p-3.5 shadow-xl"
        >
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full opacity-20 blur-3xl"
            style={{ background: featureTrack?.coverGradient?.[0] || 'var(--accent)' }}
          />
          <div className="relative flex min-w-0 items-center gap-3">
            <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-lg">
              {featureTrack?.coverUrl ? (
                <img src={featureTrack.coverUrl} alt={featureTrack.title || 'Featured music'} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${featureTrack?.coverGradient?.[0] || '#7c3aed'}, ${featureTrack?.coverGradient?.[1] || '#111827'})` }}>
                  <RiMusic2Line size={34} className="text-white/80" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/55 to-transparent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="inline-flex min-w-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-accent">
                  <RiFireLine size={11} /> Most played
                </div>
                {topListenedTracks.length > 1 && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFeaturedTrackIndex(index => (index - 1 + topListenedTracks.length) % topListenedTracks.length)}
                      aria-label="Previous most played track"
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/65 transition hover:bg-white/10 hover:text-white active:scale-95"
                    ><RiArrowLeftSLine size={16} /></button>
                    <span className="min-w-7 text-center text-[9px] tabular-nums text-white/45">{(featuredTrackIndex % topListenedTracks.length) + 1}/{topListenedTracks.length}</span>
                    <button
                      type="button"
                      onClick={() => setFeaturedTrackIndex(index => (index + 1) % topListenedTracks.length)}
                      aria-label="Next most played track"
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/65 transition hover:bg-white/10 hover:text-white active:scale-95"
                    ><RiArrowRightSLine size={16} /></button>
                  </div>
                )}
              </div>
              <h1 className="line-clamp-2 text-[17px] font-black leading-tight text-white">
                {featureTrack?.title || 'Your Music'}
              </h1>
              <p className="mt-1 truncate text-[11px] font-medium text-white/55">
                {featureTrack ? getTrackByline(featureTrack, playCounts[featureTrack.id] || 0) : 'Your local library'}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => featureTrack && playTrack(featureTrack, allTracks)}
                  disabled={!featureTrack}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-theme-gradient px-3.5 text-[11px] font-bold text-white shadow-glow-sm transition active:scale-95 disabled:opacity-50"
                >
                  <RiPlayFill size={15} /> Play
                </button>
                <button
                  onClick={() => navigate('/local')}
                  className="inline-flex h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 text-[11px] font-semibold text-white/75 transition active:scale-95"
                >
                  Library
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="liquid-glass-surface rounded-2xl border border-white/5 bg-gradient-to-br from-card/90 to-surface/80 p-3 backdrop-blur-xl">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15">
              <RiBarChartBoxLine size={14} className="text-accent" />
            </div>
            <h2 className="text-[13px] font-bold text-white">Your Stats</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* Tracks Played Today */}
            <div className="liquid-glass-edge rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 to-accent/5 px-2.5 py-2">
              <div className="mb-0.5 flex items-center gap-1.5">
                <RiHeadphoneLine size={12} className="text-accent" />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-accent/80">Today</span>
              </div>
              <div className="text-lg font-black leading-tight text-white">{quickStats.tracksPlayedToday}<span className="ml-1 text-[9px] font-medium text-softText">played</span></div>
            </div>

            {/* Listening Streak */}
            <div className="liquid-glass-edge rounded-xl border border-gradient-to/20 bg-gradient-to-br from-gradient-from/10 to-gradient-to/5 px-2.5 py-2">
              <div className="mb-0.5 flex items-center gap-1.5">
                <RiFireLine size={12} className="text-gradient-to" />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-gradient-to/80">Streak</span>
              </div>
              <div className="text-lg font-black leading-tight text-white">{quickStats.streak}<span className="ml-1 text-[9px] font-medium text-softText">day{quickStats.streak !== 1 ? 's' : ''}</span></div>
            </div>

            {/* Total Library */}
            <div className="liquid-glass-edge rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 px-2.5 py-2">
              <div className="mb-0.5 flex items-center gap-1.5">
                <RiMusic2Line size={12} className="text-white/70" />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/60">Library</span>
              </div>
              <div className="text-lg font-black leading-tight text-white">{quickStats.totalTracks}<span className="ml-1 text-[9px] font-medium text-softText">tracks</span></div>
            </div>

            {/* Top Genre */}
            <div className="liquid-glass-edge min-w-0 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 px-2.5 py-2">
              <div className="mb-0.5 flex items-center gap-1.5">
                <RiTrophyLine size={12} className="text-purple-400" />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-purple-400/80">Top Genre</span>
              </div>
              <div className="truncate text-[13px] font-black leading-tight text-white">{quickStats.topGenre}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile top tracks */}
      <section className="md:hidden">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent">Your rotation</p>
            <h2 className="text-lg font-black text-white">Top Tracks</h2>
          </div>
          {topListenedTracks.length > 0 && (
            <button onClick={() => navigate('/local')} className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-semibold text-white/65">All tracks</button>
          )}
        </div>
        <div className="liquid-glass-edge overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] px-2.5">
          {topListenedTracks.length > 0 ? topListenedTracks.map((track, index) => (
            <button
              key={track.id}
              onClick={() => playTrack(track, allTracks)}
              className={`flex w-full items-center gap-2.5 py-2.5 text-left ${index < topListenedTracks.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
            >
              <span className="w-4 shrink-0 text-center text-[10px] font-bold tabular-nums text-white/35">{String(index + 1).padStart(2, '0')}</span>
              {track.coverUrl ? (
                <img src={track.coverUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold text-white">{track.title}</span>
                <span className="mt-0.5 block truncate text-[10px] text-white/45">{getTrackByline(track, playCounts[track.id] || 0)}</span>
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-white/40">{Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}</span>
              <RiPlayFill size={14} className="ml-0.5 shrink-0 text-accent" />
            </button>
          )) : (
            <button onClick={() => navigate('/local')} className="flex w-full items-center gap-3 py-4 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><RiMusic2Line size={18} /></span>
              <span><span className="block text-xs font-bold text-white">Build your rotation</span><span className="text-[10px] text-white/45">Add music to see your top tracks</span></span>
            </button>
          )}
        </div>
      </section>

      {/* Hero Banner - Enhanced */}
      <section className="hidden items-start gap-4 md:grid md:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[1.5fr_0.5fr]">
        <div
          ref={heroRef}
          className="home-hero-glass group relative overflow-hidden rounded-[28px]"
        >
          <div className="pointer-events-none absolute inset-px z-0 rounded-[27px] border border-white/[0.06]" />
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.08),transparent_28%)]" />
          {/* Animated accent edge line */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] z-20 rounded-l-[28px] overflow-hidden">
            <div className="h-full w-full bg-theme-gradient opacity-70" />
          </div>

          {/* Animated Background Blobs */}
          {performanceSettings.enableHeavyAnimations && !isPlaying && (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <div className="absolute left-[-12%] top-[-18%] h-[340px] w-[340px] rounded-full bg-gradient-from/20 blur-[110px] animate-pulse-glow" />
              <div className="absolute right-[15%] top-[5%] h-[280px] w-[280px] rounded-full bg-gradient-to/15 blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.2s' }} />
              <div className="absolute bottom-[-20%] left-[40%] h-[240px] w-[240px] rounded-full bg-purple-500/12 blur-[90px] animate-pulse-glow" style={{ animationDelay: '2.4s' }} />
            </div>
          )}
          
          {/* Gradient Overlays */}
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/34 via-black/12 to-white/[0.04] pointer-events-none" />
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/18 via-transparent to-white/[0.05] pointer-events-none" />

          {/* Two-zone layout: Left content | Right track list */}
          <div className="relative z-10 flex">
            {/* Left Zone — Hero content + Album spotlight */}
            <div className="flex-1 min-w-0 p-5 xl:p-6 flex flex-col justify-between gap-5">
              <div className="home-hero-feature-grid grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] xl:grid-cols-[minmax(0,1fr)_270px] xl:gap-6 items-start">
                <div ref={contentRef} className="home-hero-copy max-w-lg space-y-3">
                  <div className="hero-badge-shimmer inline-flex items-center gap-2 rounded-full border border-accent/35 bg-black/30 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent backdrop-blur-md">
                    <RiFireLine size={12} className={performanceSettings.enableHeavyAnimations && !isPlaying ? 'animate-pulse' : ''} />
                    Your Music Library
                  </div>
                  <h1 className="text-3xl font-black leading-[1.02] md:text-[1.85rem] xl:text-[2.5rem] text-white tracking-tight drop-shadow-[0_3px_18px_rgba(0,0,0,0.8)]">
                    Most Listened <br/>
                    <span className="text-gradient">Music</span>
                  </h1>
                  <p className="max-w-md text-sm md:text-xs xl:text-[0.9rem] text-white/[0.82] leading-relaxed font-semibold drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                    Dive into your most popular, frequently played tracks from your offline music library.
                  </p>
                  <div className="flex flex-wrap gap-3 pointer-events-auto pt-1">
                    <button
                      onClick={() => { if (topListenedTracks[0]) playTrack(topListenedTracks[0], allTracks); }}
                      disabled={topListenedTracks.length === 0}
                      className="group/btn flex items-center gap-2 rounded-full bg-theme-gradient px-5 py-2.5 text-sm md:px-4 md:py-2 md:text-xs xl:px-6 xl:py-2.5 xl:text-sm font-bold text-white transition-all hover:scale-[1.05] hover:shadow-glow-lg active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-glow"
                    >
                      <RiPlayFill size={18} className="group-hover/btn:scale-110 transition-transform" /> 
                      Play Top Track
                    </button>
                    <button
                      onClick={() => navigate('/local')}
                      className="rounded-full border border-white/20 bg-white/[0.06] px-5 py-2.5 text-sm md:px-4 md:py-2 md:text-xs xl:px-6 xl:py-2.5 xl:text-sm font-semibold text-white/90 backdrop-blur-xl transition-all hover:bg-white/15 hover:border-white/35 hover:scale-[1.05] active:scale-95"
                    >
                      Open Library
                    </button>
                  </div>
                </div>

                {/* Album Cover — visible on all md+ screens, next to text */}
                <div className="home-hero-album-cover hidden items-start justify-end md:flex">
                  <div className="group/album relative aspect-square w-full max-w-[160px] overflow-hidden rounded-[18px] border border-white/[0.18] bg-black/20 text-left shadow-2xl shadow-black/50 ring-1 ring-white/[0.06] backdrop-blur-xl transition-all hover:scale-[1.03] hover:border-accent/35 xl:max-w-[240px] xl:rounded-[22px]">
                    <button
                      onClick={() => {
                        if (mostPlayedAlbum) navigate(`/album/${encodeURIComponent(mostPlayedAlbum.id)}`);
                      }}
                      disabled={!mostPlayedAlbum}
                      className="absolute inset-0 h-full w-full text-left disabled:pointer-events-none"
                      aria-label={mostPlayedAlbum ? `Open ${mostPlayedAlbum.title}` : 'Open most listened album'}
                    >
                      {activeAlbumCoverUrl ? (
                        <img
                          key={activeAlbumCoverUrl}
                          src={activeAlbumCoverUrl}
                          alt={mostPlayedAlbum?.title || 'Most Listened Album'}
                          className="h-full w-full object-cover transition duration-500 ease-out group-hover/album:scale-[1.05]"
                        />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{
                            background: `linear-gradient(135deg, ${mostPlayedAlbum?.coverGradient?.[0] || '#6d28d9'}, ${mostPlayedAlbum?.coverGradient?.[1] || '#0f766e'})`,
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/24 to-black/12" />
                      <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-black/60 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-accent shadow-lg backdrop-blur-md xl:left-3 xl:top-3 xl:px-2.5 xl:py-1 xl:text-[9px]">
                        <RiAlbumLine size={10} />
                        Top Album
                      </div>
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 min-w-0 xl:bottom-3 xl:left-3 xl:right-3">
                        <div className="truncate text-xs font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-colors group-hover/album:text-accent xl:text-sm">{mostPlayedAlbum?.title || 'Most Listened'}</div>
                        <div className="truncate text-[10px] font-semibold text-white/75 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] xl:text-[11px]">{mostPlayedAlbum?.artist || 'Total Music Library'}</div>
                        {mostPlayedAlbum && (
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-accent">{mostPlayedAlbum.plays} play{mostPlayedAlbum.plays === 1 ? '' : 's'}</span>
                            <span className="text-[9px] text-white/30">·</span>
                            <span className="text-[9px] font-semibold text-white/[0.65]">{mostPlayedAlbum.trackCount} track{mostPlayedAlbum.trackCount === 1 ? '' : 's'}</span>
                          </div>
                        )}
                      </div>
                    </button>

                    {spotlightAlbums.length > 1 && (
                      <div className="pointer-events-none absolute inset-x-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between opacity-0 transition-opacity duration-300 group-hover/album:opacity-100">
                        <button
                          type="button"
                          onClick={() => changeSpotlightAlbum(-1)}
                          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 hover:text-accent active:scale-90"
                          aria-label="Previous album cover"
                        >
                          <RiArrowLeftSLine size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => changeSpotlightAlbum(1)}
                          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 hover:text-accent active:scale-90"
                          aria-label="Next album cover"
                        >
                          <RiArrowRightSLine size={18} />
                        </button>
                      </div>
                    )}

                    {mostPlayedAlbum && mostPlayedAlbum.coverUrls.length > 1 && (
                      <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-20 flex max-w-[60px] gap-1 xl:bottom-3 xl:right-3">
                        {mostPlayedAlbum.coverUrls.slice(0, 4).map((coverUrl, index) => (
                          <span
                            key={`${coverUrl}-${index}`}
                            className={`h-1.5 rounded-full transition-all ${
                              index === spotlightCoverIndex % mostPlayedAlbum.coverUrls.length
                                ? 'w-3.5 bg-accent'
                                : 'w-1.5 bg-white/40'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden md:flex w-px self-stretch my-4 bg-gradient-to-b from-transparent via-white/10 to-transparent flex-shrink-0" />

            {/* Right Zone — Top Tracks list */}
            <div className="hidden md:flex flex-col w-[220px] xl:w-[260px] flex-shrink-0 p-4 xl:p-5 gap-2.5">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15">
                  <RiBarChartBoxLine size={12} className="text-accent" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/[0.78] drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">Top Tracks</span>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {topListenedTracks.map((track, index) => (
                  <button
                    key={track.id}
                    onClick={() => playTrack(track, allTracks)}
                    className="liquid-glass-edge group/track flex items-center gap-2.5 rounded-xl border border-white/[0.1] bg-black/[0.24] p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-white/[0.18] hover:bg-white/[0.11]"
                  >
                    <div className="relative flex-shrink-0">
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="h-10 w-10 rounded-lg object-cover shadow-md"
                        />
                      ) : (
                        <div
                          className="h-10 w-10 rounded-lg shadow-md"
                          style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
                        />
                      )}
                      <div className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[8px] font-black text-white shadow-sm">
                        {index + 1}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)] transition-colors group-hover/track:text-accent">{track.title}</div>
                      <div className="truncate text-[10px] font-medium text-white/[0.68]">{track.artist}</div>
                    </div>
                    <div className="flex-shrink-0 opacity-0 group-hover/track:opacity-100 transition-opacity">
                      <RiPlayFill size={14} className="text-accent" />
                    </div>
                  </button>
                ))}
                {topListenedTracks.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-4 gap-2">
                    <RiFolderMusicLine size={24} className="text-white/20" />
                    <span className="text-[11px] text-white/40 leading-snug">Start playing to see your top tracks here</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side Stats Card - Your Stats */}
        <div className="space-y-4">
          <div className="liquid-glass-surface relative w-full rounded-[32px] border border-white/10 bg-gradient-to-br from-card via-surface to-background p-8 flex flex-col overflow-hidden shadow-xl">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
                  <RiBarChartBoxLine size={16} className="text-accent" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Your Stats</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* TODAY Card */}
                <div className="liquid-glass-edge rounded-2xl border border-white/10 bg-glass backdrop-blur-2xl/50 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <RiHeadphoneLine size={14} className="text-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Today</span>
                  </div>
                  <div className="text-3xl font-black text-white mb-1">0</div>
                  <div className="text-xs text-dimText">tracks played</div>
                </div>

                {/* STREAK Card */}
                <div className="liquid-glass-edge rounded-2xl border border-white/10 bg-glass backdrop-blur-2xl/50 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <RiFireLine size={14} className="text-gradient-to" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gradient-to">Streak</span>
                  </div>
                  <div className="text-3xl font-black text-white mb-1">0</div>
                  <div className="text-xs text-dimText">days</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* LIBRARY Card */}
                <div className="liquid-glass-edge rounded-2xl border border-white/10 bg-glass backdrop-blur-2xl/50 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <RiMusic2Line size={14} className="text-white/70" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Library</span>
                  </div>
                  <div className="text-3xl font-black text-white mb-1">{allTracks.length}</div>
                  <div className="text-xs text-dimText">total tracks</div>
                </div>

                {/* TOP GENRE Card */}
                <div className="liquid-glass-edge rounded-2xl border border-purple-500/20 bg-purple-950/30 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <RiTrophyLine size={14} className="text-purple-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Top Genre</span>
                  </div>
                  <div className="text-lg font-black text-white mb-1 truncate">Various</div>
                  <div className="text-xs text-dimText">most played</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jump back in — Enhanced */}
      {recentTracks.length > 0 && (
        <section>
          <div className="mb-3 sm:mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-accentAlt/15">
                <RiTimeLine size={18} className="text-gradient-to" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold">Jump back in</h2>
            </div>
            {recentTracks.length > 3 && (
              <button 
                onClick={() => navigate('/local')} 
                className="group flex items-center gap-2 text-sm font-semibold text-softText transition hover:text-white"
              >
                Show all
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-1">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
          <div className="-mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-1 scrollbar-hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 md:grid-cols-3">
            {recentTracks.slice(0, 3).map(track => (
              <button
                key={track.id}
                onClick={(event) => handleJumpBackInPlay(track, event.currentTarget)}
                className="group flex w-[220px] shrink-0 snap-start items-center gap-3 rounded-2xl border border-white/5 bg-gradient-to-br from-card/80 to-surface/60 p-3 text-left shadow-lg backdrop-blur-sm transition-all hover:border-white/10 hover:from-card hover:to-surface sm:w-auto sm:gap-4 sm:hover:scale-[1.02] sm:hover:shadow-xl"
              >
                {track.coverUrl ? (
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="jump-back-cover h-11 w-11 sm:h-14 sm:w-14 flex-shrink-0 rounded-lg sm:rounded-xl object-cover shadow-md group-hover:shadow-glow-sm transition-shadow"
                  />
                ) : (
                  <div
                    className="jump-back-cover h-11 w-11 sm:h-14 sm:w-14 flex-shrink-0 rounded-lg sm:rounded-xl shadow-md group-hover:shadow-glow-sm transition-shadow"
                    style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
                  />
                )}
                <span className="flex-1 truncate text-xs sm:text-sm font-bold text-white group-hover:text-accent transition-colors">{track.title}</span>
                <div className="flex h-9 w-9 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-glow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:scale-110">
                  <RiPlayFill size={20} className="ml-0.5" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Playlists — Enhanced */}
      <section>
        <div className="mb-3 sm:mb-5 flex items-center justify-between">
          <h2 className="text-lg sm:text-2xl font-bold">Your Playlists</h2>
          <button onClick={() => navigate('/local')} className="text-sm font-semibold text-softText transition hover:text-white">View all</button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5 xl:grid-cols-6">
          <div className="sm:hidden">
            {userPlaylists.slice(0, 3).map(pl => (
              <button key={pl.id} onClick={() => navigate('/local')} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-2.5 text-left">
                {pl.coverUrl ? <img src={pl.coverUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/80" style={{ background: `linear-gradient(135deg, ${pl.coverGradient?.[0] || '#7c3aed'}, ${pl.coverGradient?.[1] || '#111827'})` }}><RiFolderMusicLine size={18} /></span>}
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-white">{pl.title}</span><span className="mt-0.5 block text-[10px] text-white/45">{pl.trackIds.length} tracks</span></span>
                <span className="text-sm text-white/35">›</span>
              </button>
            ))}
          </div>
          {userPlaylists.map(pl => (
            <div key={pl.id} className="hidden sm:block">
              <ContentCard
                id={pl.id}
                title={pl.title}
                subtitle={`${pl.trackIds.length} tracks`}
                gradient={pl.coverGradient}
                coverUrl={pl.coverUrl}
                type="playlist"
                onClick={() => navigate('/local')}
              />
            </div>
          ))}
          {userPlaylists.length === 0 && (
            <div className="col-span-full flex flex-row items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-gradient-to-br from-white/5 to-transparent p-3 text-left backdrop-blur-sm sm:flex-col sm:py-16 sm:text-center">
              <div className="mb-0 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 sm:mb-4 sm:h-16 sm:w-16 sm:rounded-2xl">
                <RiFolderMusicLine size={22} className="text-accent sm:text-[32px]" />
              </div>
              <div className="min-w-0 flex-1 sm:flex-none">
                <p className="mb-0.5 text-xs font-bold text-white sm:mb-2 sm:text-base">No playlists yet</p>
                <p className="mb-0 text-[10px] text-dimText sm:mb-5 sm:text-sm">Create one to organize your music.</p>
              </div>
              <button onClick={() => navigate('/local')} className="shrink-0 rounded-full bg-theme-gradient px-3.5 py-2 text-[10px] font-bold shadow-glow-sm transition-transform hover:scale-105 sm:px-6 sm:py-3 sm:text-sm">
                Create
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Popular Artists — Enhanced */}
      <section>
        <div className="mb-3 sm:mb-5 flex items-center justify-between">
          <h2 className="text-lg sm:text-2xl font-bold">Popular Artists in Library</h2>
        </div>
        <div className="hidden grid-cols-3 gap-4 sm:grid md:grid-cols-4 xl:grid-cols-5 xl:grid-cols-6">
          {popularArtists.map(artist => (
            <ContentCard
              key={artist.id}
              id={artist.id}
              title={artist.name}
              subtitle={`${artist.trackCount} tracks`}
              gradient={artist.gradient}
              type="artist"
              round
            />
          ))}
          {popularArtists.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4">
                <RiUserLine size={32} className="text-dimText" />
              </div>
              <p className="text-sm text-dimText">
                Import music to discover popular artists.
              </p>
            </div>
          )}
        </div>
        <div className="space-y-2 sm:hidden">
          {popularArtists.filter(artist => !/^\d+$/.test(artist.name.trim())).length > 0 ? (
            popularArtists.filter(artist => !/^\d+$/.test(artist.name.trim())).slice(0, 4).map(artist => (
              <button key={artist.id} onClick={() => navigate(`/artist/${encodeURIComponent(artist.id)}`)} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-2.5 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white/85" style={{ background: `linear-gradient(135deg, ${artist.gradient[0]}, ${artist.gradient[1]})` }}>{artist.name.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-white">{artist.name}</span><span className="mt-0.5 block text-[10px] text-white/45">{artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}</span></span>
                <span className="text-sm text-white/35">›</span>
              </button>
            ))
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/45"><RiUserLine size={18} /></span>
              <span><span className="block text-xs font-semibold text-white/75">No artist names yet</span><span className="mt-0.5 block text-[10px] text-white/40">Add artist tags to your tracks to see them here.</span></span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
