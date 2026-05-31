import { useMemo, useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useNavigate } from 'react-router-dom';
import ContentCard from '../components/cards/ContentCard';
import { usePlayerStore } from '../stores/playerStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import type { Track } from '../types';
import { clickedTrackCoverRef } from '../components/player/FullscreenPlayer';
import { RiAlbumLine, RiPlayFill, RiTimeLine, RiFireLine, RiMusic2Line, RiFolderMusicLine, RiUserLine, RiBarChartBoxLine, RiTrophyLine, RiHeadphoneLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import NebulaDust from '../components/ui/NebulaDust';

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

export default function HomePage() {
  const navigate = useNavigate();
  const { playTrack, currentTrack, setFullscreenOpen } = usePlayerStore();
  const {
    localTracks, localPlaylists, isLoaded, loadLibrary,
    getMostPlayed, getRecentlyPlayed, lastPlayed, playCounts
  } = useLocalLibraryStore();

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

  useEffect(() => {
    setSpotlightAlbumIndex((current) => (
      spotlightAlbums.length === 0 ? 0 : Math.min(current, spotlightAlbums.length - 1)
    ));
  }, [spotlightAlbums.length]);

  useEffect(() => {
    setSpotlightCoverIndex(0);
  }, [mostPlayedAlbum?.id]);

  useEffect(() => {
    if (spotlightAlbums.length <= 1) return undefined;

    const interval = window.setInterval(() => {
      setSpotlightAlbumIndex((current) => (current + 1) % spotlightAlbums.length);
    }, 9000);

    return () => window.clearInterval(interval);
  }, [spotlightAlbums.length]);

  useEffect(() => {
    const coverCount = mostPlayedAlbum?.coverUrls.length || 0;
    if (coverCount <= 1) return undefined;

    const interval = window.setInterval(() => {
      setSpotlightCoverIndex((current) => (current + 1) % coverCount);
    }, 3600);

    return () => window.clearInterval(interval);
  }, [mostPlayedAlbum?.id, mostPlayedAlbum?.coverUrls.length]);

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
        <div className="rounded-2xl sm:rounded-[24px] border border-white/5 bg-gradient-to-br from-card/90 to-surface/80 p-3 sm:p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
              <RiBarChartBoxLine size={16} className="text-accent" />
            </div>
            <h2 className="text-sm font-bold text-white">Your Stats</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Tracks Played Today */}
            <div className="group rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 p-3 transition hover:border-accent/40 hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-1">
                <RiHeadphoneLine size={14} className="text-accent" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent/80">Today</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{quickStats.tracksPlayedToday}</div>
              <div className="text-[11px] text-softText">tracks played</div>
            </div>

            {/* Listening Streak */}
            <div className="group rounded-2xl bg-gradient-to-br from-gradient-from/10 to-gradient-to/5 border border-gradient-to/20 p-3 transition hover:border-gradient-to/40 hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-1">
                <RiFireLine size={14} className="text-gradient-to" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gradient-to/80">Streak</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{quickStats.streak}</div>
              <div className="text-[11px] text-softText">day{quickStats.streak !== 1 ? 's' : ''}</div>
            </div>

            {/* Total Library */}
            <div className="group rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-3 transition hover:border-white/20 hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-1">
                <RiMusic2Line size={14} className="text-white/70" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Library</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{quickStats.totalTracks}</div>
              <div className="text-[11px] text-softText">total tracks</div>
            </div>

            {/* Top Genre */}
            <div className="group rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 p-3 transition hover:border-purple-500/40 hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-1">
                <RiTrophyLine size={14} className="text-purple-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400/80">Top Genre</span>
              </div>
              <div className="text-lg font-black text-white truncate">{quickStats.topGenre}</div>
              <div className="text-[11px] text-softText">most played</div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Banner - Enhanced */}
      <section className="hidden items-start gap-4 md:grid md:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[1.5fr_0.5fr]">
        <div ref={heroRef} className="group relative min-h-[360px] overflow-hidden rounded-[24px] bg-gradient-to-br from-[#1A1A1A] via-[#1F1F1F] to-[#151515] p-5 shadow-2xl border border-white/5 flex flex-col justify-between gap-4 xl:min-h-[280px] xl:p-4">
          {/* Animated Background Blobs */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute left-[-15%] top-[-20%] h-[380px] w-[380px] rounded-full bg-accent/40 blur-[100px] animate-pulse-glow" />
            <div className="absolute right-[-10%] top-[8%] h-[320px] w-[320px] rounded-full bg-accentAlt/30 blur-[90px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-[-25%] left-[35%] h-[280px] w-[280px] rounded-full bg-white/15 blur-[80px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
          </div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent pointer-events-none" />

          {/* Particle Nebula Dust */}
          <NebulaDust id="hero-nebula" />

          <div className="home-hero-feature-grid relative z-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_300px_180px] xl:grid-cols-[minmax(0,1fr)_280px_270px] xl:gap-8">
            <div ref={contentRef} className="max-w-lg space-y-3 md:border-r md:border-white/15 md:pr-5 xl:pr-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent backdrop-blur-sm shadow-lg">
                <RiFireLine size={12} className="animate-pulse" />
                Total Music Library
              </div>
              <h1 className="text-3xl font-black leading-[0.98] md:text-[1.85rem] xl:text-[2.15rem] text-white tracking-tight drop-shadow-2xl">
                Most Listened <br/>
                <span className="text-gradient">Music</span>
              </h1>
              <p className="max-w-md text-sm md:text-xs xl:text-sm text-white/90 leading-snug font-medium">
                Experience the pinnacle of offline listening. Dive into your most popular, frequently played music tracks available exclusively on your Total Music platform.
              </p>
              <div className="flex flex-wrap gap-3 pointer-events-auto">
                <button
                  onClick={() => { if (topListenedTracks[0]) playTrack(topListenedTracks[0], allTracks); }}
                  disabled={topListenedTracks.length === 0}
                  className="group flex items-center gap-2 rounded-full bg-theme-gradient px-5 py-2.5 text-sm md:px-4 md:py-2 md:text-xs xl:px-5 xl:py-2.5 xl:text-sm font-bold text-white transition-all hover:scale-[1.05] hover:shadow-glow-lg active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-glow"
                >
                  <RiPlayFill size={18} className="group-hover:scale-110 transition-transform" /> 
                  Play Most Listened
                </button>
                <button
                  onClick={() => navigate('/local')}
                  className="group rounded-full border-2 border-white/30 bg-white/10 px-5 py-2.5 text-sm md:px-4 md:py-2 md:text-xs xl:px-5 xl:py-2.5 xl:text-sm font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/20 hover:border-white/50 hover:scale-[1.05] active:scale-95 shadow-lg"
                >
                  Open Library
                </button>
              </div>
            </div>

            <div className="home-hero-album-copy hidden items-start justify-start md:flex xl:translate-x-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent backdrop-blur-sm shadow-lg">
                  <RiAlbumLine size={12} />
                  Best Album
                </div>
                <h2 className="max-w-[260px] text-left text-3xl font-black leading-[0.98] text-white tracking-tight drop-shadow-2xl md:text-[1.85rem] xl:text-[2.15rem]">
                  <span className="whitespace-nowrap">Most Listened</span> <br />
                  <span className="text-gradient">Album</span>
                </h2>
                <p className="max-w-[250px] text-sm md:text-xs xl:text-sm font-medium leading-snug text-white/85">
                  Your top album based on repeat plays and listening history across your local music library.
                </p>
                {mostPlayedAlbum && (
                  <div className="flex max-w-[250px] flex-wrap gap-2 pt-1">
                    <div className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                      {mostPlayedAlbum.plays} play{mostPlayedAlbum.plays === 1 ? '' : 's'}
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
                      {mostPlayedAlbum.trackCount} track{mostPlayedAlbum.trackCount === 1 ? '' : 's'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="home-hero-album-cover hidden items-center justify-end md:flex xl:translate-x-3">
              <div className="group relative aspect-square w-full max-w-[180px] overflow-hidden rounded-[22px] border border-white/10 bg-white/5 text-left shadow-2xl shadow-black/40 transition-all hover:scale-[1.02] hover:border-accent/30 xl:max-w-[250px]">
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
                      className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{
                        background: `linear-gradient(135deg, ${mostPlayedAlbum?.coverGradient?.[0] || '#6d28d9'}, ${mostPlayedAlbum?.coverGradient?.[1] || '#0f766e'})`,
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-white/10" />
                  <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/20 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-accent backdrop-blur-md shadow-glow-sm">
                    <RiAlbumLine size={11} />
                    Album
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 min-w-0">
                    <div className="truncate text-sm font-black text-white transition-colors group-hover:text-accent">{mostPlayedAlbum?.title || 'Most Listened'}</div>
                    <div className="truncate text-[11px] text-white/65">{mostPlayedAlbum?.artist || 'Total Music Library'}</div>
                    {mostPlayedAlbum && (
                      <div className="mt-0.5 text-[10px] font-semibold text-white/35">
                        {mostPlayedAlbum.plays} play{mostPlayedAlbum.plays === 1 ? '' : 's'}
                      </div>
                    )}
                  </div>
                </button>

                {spotlightAlbums.length > 1 && (
                  <div className="pointer-events-none absolute inset-x-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => changeSpotlightAlbum(-1)}
                      className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 hover:text-accent active:scale-95"
                      aria-label="Previous album cover"
                    >
                      <RiArrowLeftSLine size={22} />
                    </button>
                    <button
                      type="button"
                      onClick={() => changeSpotlightAlbum(1)}
                      className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 hover:text-accent active:scale-95"
                      aria-label="Next album cover"
                    >
                      <RiArrowRightSLine size={22} />
                    </button>
                  </div>
                )}

                {mostPlayedAlbum && mostPlayedAlbum.coverUrls.length > 1 && (
                  <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex max-w-[72px] gap-1">
                    {mostPlayedAlbum.coverUrls.slice(0, 4).map((coverUrl, index) => (
                      <span
                        key={`${coverUrl}-${index}`}
                        className={`h-1.5 rounded-full transition-all ${
                          index === spotlightCoverIndex % mostPlayedAlbum.coverUrls.length
                            ? 'w-4 bg-accent'
                            : 'w-1.5 bg-white/45'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Top Tracks Cards - Enhanced */}
          <div className="grid gap-2.5 md:grid-cols-3 relative z-10">
            {topListenedTracks.map((track, index) => (
              <button
                key={track.id}
                onClick={() => playTrack(track, allTracks)}
                className="group rounded-xl bg-black/50 p-2.5 text-left backdrop-blur-xl transition-all hover:bg-black/70 hover:scale-[1.03] border border-white/10 hover:border-white/20 shadow-xl hover:shadow-2xl"
              >
                <div className="flex items-center gap-2.5">
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="h-10 w-10 flex-shrink-0 rounded-lg object-cover shadow-lg group-hover:shadow-glow-sm transition-shadow"
                    />
                  ) : (
                    <div
                      className="h-10 w-10 flex-shrink-0 rounded-lg shadow-lg group-hover:shadow-glow-sm transition-shadow"
                      style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent mb-0.5">
                      Top {index + 1}
                    </div>
                    <div className="truncate text-xs font-bold text-white group-hover:text-accent transition-colors">{track.title}</div>
                    <div className="truncate text-[11px] text-white/70">{track.artist}</div>
                  </div>
                </div>
              </button>
            ))}
            {topListenedTracks.length === 0 && (
              <div className="rounded-xl bg-black/50 p-4 text-sm text-white/70 backdrop-blur-xl md:col-span-3 border border-white/10 flex items-center gap-3">
                <RiFolderMusicLine size={26} className="text-white/40" />
                <span>Your most listened music will appear here once you start playing.</span>
              </div>
            )}
          </div>
        </div>

        {/* Side Stats Card - Your Stats */}
        <div className="space-y-4">
          <div className="relative w-full rounded-[32px] border border-white/10 bg-gradient-to-br from-card via-surface to-background p-8 flex flex-col overflow-hidden shadow-xl">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
              <RiMusic2Line size={160} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
                  <RiBarChartBoxLine size={16} className="text-accent" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Your Stats</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* TODAY Card */}
                <div className="rounded-2xl border border-white/10 bg-glass backdrop-blur-2xl/50 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <RiHeadphoneLine size={14} className="text-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Today</span>
                  </div>
                  <div className="text-3xl font-black text-white mb-1">0</div>
                  <div className="text-xs text-dimText">tracks played</div>
                </div>

                {/* STREAK Card */}
                <div className="rounded-2xl border border-white/10 bg-glass backdrop-blur-2xl/50 p-4 backdrop-blur-sm">
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
                <div className="rounded-2xl border border-white/10 bg-glass backdrop-blur-2xl/50 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <RiMusic2Line size={14} className="text-white/70" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Library</span>
                  </div>
                  <div className="text-3xl font-black text-white mb-1">{allTracks.length}</div>
                  <div className="text-xs text-dimText">total tracks</div>
                </div>

                {/* TOP GENRE Card */}
                <div className="rounded-2xl border border-purple-500/20 bg-purple-950/30 p-4 backdrop-blur-sm">
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
          <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2 md:grid-cols-3">
            {recentTracks.slice(0, 3).map(track => (
              <button
                key={track.id}
                onClick={(event) => handleJumpBackInPlay(track, event.currentTarget)}
                className="group flex items-center gap-4 rounded-2xl bg-gradient-to-br from-card/80 to-surface/60 p-3 text-left transition-all hover:from-card hover:to-surface hover:scale-[1.02] border border-white/5 hover:border-white/10 shadow-lg hover:shadow-xl backdrop-blur-sm"
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
                <div className="flex h-9 w-9 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-glow-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
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
        <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 xl:grid-cols-6">
          {userPlaylists.map(pl => (
            <ContentCard
              key={pl.id}
              id={pl.id}
              title={pl.title}
              subtitle={`${pl.trackIds.length} tracks`}
              gradient={pl.coverGradient}
              coverUrl={pl.coverUrl}
              type="playlist"
              onClick={() => navigate('/local')}
            />
          ))}
          {userPlaylists.length === 0 && (
            <div className="col-span-full py-16 rounded-3xl border-2 border-dashed border-white/10 bg-gradient-to-br from-white/5 to-transparent flex flex-col items-center justify-center text-center backdrop-blur-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 mb-4">
                <RiFolderMusicLine size={32} className="text-accent" />
              </div>
              <p className="text-base font-bold text-white mb-2">No playlists found</p>
              <p className="text-sm text-dimText mb-5">Create your first playlist in the Library.</p>
              <button onClick={() => navigate('/local')} className="px-6 py-3 bg-theme-gradient rounded-full text-sm font-bold hover:scale-105 transition-transform shadow-glow-sm">
                Go to Library
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
        <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 xl:grid-cols-6">
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
      </section>
    </div>
  );
}
