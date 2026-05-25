import { useMemo, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useNavigate } from 'react-router-dom';
import ContentCard from '../components/cards/ContentCard';
import { usePlayerStore } from '../stores/playerStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import type { LocalTrack } from '../services/localDb';
import { clickedTrackCoverRef } from '../components/player/FullscreenPlayer';
import { RiPlayFill, RiTimeLine, RiFireLine, RiMusic2Line, RiFolderMusicLine, RiPlayListLine, RiUserLine, RiBarChartBoxLine, RiTrophyLine, RiHeadphoneLine } from 'react-icons/ri';

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

  const topListenedTracks = useMemo(() => getMostPlayed(3), [getMostPlayed]);
  const recentTracks = useMemo(() => getRecentlyPlayed(8), [getRecentlyPlayed]);
  const userPlaylists = useMemo(() => localPlaylists.slice(0, 5), [localPlaylists]);

  // Calculate Quick Stats
  const quickStats = useMemo(() => {
    const now = Date.now();
    
    // Get today's start (midnight local time)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    // Tracks played today (since midnight)
    const tracksPlayedToday = Object.entries(lastPlayed).filter(
      ([_, timestamp]) => timestamp >= todayStartMs
    ).length;

    // Total listening time (sum of all track durations)
    const totalMinutes = Math.floor(
      localTracks.reduce((sum, track) => sum + track.duration, 0) / 60
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
    localTracks.forEach(track => {
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
      localTracks.forEach(track => {
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
      totalTracks: localTracks.length,
    };
  }, [localTracks, lastPlayed]);

  // Aggregate popular artists based on local tracks
  const popularArtists = useMemo(() => {
    const artistCounts: Record<string, number> = {};
    const artistImages: Record<string, [string, string]> = {};
    localTracks.forEach(t => {
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
  }, [localTracks]);

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

  const handleJumpBackInPlay = (track: LocalTrack, button: HTMLButtonElement) => {
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
      playTrack(track, localTracks);
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
    <div className="page-enter space-y-8 pb-8 px-4 md:px-0">
      {/* Mobile columns */}
      <section className="md:hidden">
        <div className="rounded-[24px] border border-white/5 bg-gradient-to-br from-card/90 to-surface/80 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
              <RiBarChartBoxLine size={16} className="text-accent" />
            </div>
            <h2 className="text-sm font-bold text-white">Your Stats</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Tracks Played Today */}
            <div className="group rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 p-3 transition hover:border-accent/40 hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-1">
                <RiHeadphoneLine size={14} className="text-accent" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent/80">Today</span>
              </div>
              <div className="text-2xl font-black text-white">{quickStats.tracksPlayedToday}</div>
              <div className="text-[11px] text-softText">tracks played</div>
            </div>

            {/* Listening Streak */}
            <div className="group rounded-2xl bg-gradient-to-br from-gradient-from/10 to-gradient-to/5 border border-gradient-to/20 p-3 transition hover:border-gradient-to/40 hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-1">
                <RiFireLine size={14} className="text-gradient-to" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gradient-to/80">Streak</span>
              </div>
              <div className="text-2xl font-black text-white">{quickStats.streak}</div>
              <div className="text-[11px] text-softText">day{quickStats.streak !== 1 ? 's' : ''}</div>
            </div>

            {/* Total Library */}
            <div className="group rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-3 transition hover:border-white/20 hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-1">
                <RiMusic2Line size={14} className="text-white/70" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Library</span>
              </div>
              <div className="text-2xl font-black text-white">{quickStats.totalTracks}</div>
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
      <section className="hidden gap-4 md:grid lg:grid-cols-[1.5fr_0.5fr]">
        <div ref={heroRef} className="group relative min-h-[420px] overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1A1A1A] via-[#1F1F1F] to-[#151515] p-8 shadow-2xl border border-white/5 flex flex-col justify-between">
          {/* Animated Background Blobs */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute left-[-15%] top-[-20%] h-[380px] w-[380px] rounded-full bg-accent/40 blur-[100px] animate-pulse-glow" />
            <div className="absolute right-[-10%] top-[8%] h-[320px] w-[320px] rounded-full bg-accentAlt/30 blur-[90px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-[-25%] left-[35%] h-[280px] w-[280px] rounded-full bg-white/15 blur-[80px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
          </div>
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent pointer-events-none" />

          <div ref={contentRef} className="relative z-10 max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-accent backdrop-blur-sm shadow-lg">
              <RiFireLine size={14} className="animate-pulse" />
              Total Music Library
            </div>
            <h1 className="text-5xl font-black leading-[1.1] md:text-7xl text-white tracking-tight drop-shadow-2xl">
              Most Listened <br/>
              <span className="text-gradient">Music</span>
            </h1>
            <p className="max-w-md text-base text-white/90 md:text-lg leading-relaxed font-medium">
              Experience the pinnacle of offline listening. Dive into your most popular, frequently played music tracks available exclusively on your Total Music platform.
            </p>
            <div className="flex flex-wrap gap-4 pointer-events-auto">
              <button
                onClick={() => { if (topListenedTracks[0]) playTrack(topListenedTracks[0], localTracks); }}
                disabled={topListenedTracks.length === 0}
                className="group flex items-center gap-3 rounded-full bg-theme-gradient px-8 py-4 text-base font-bold text-white transition-all hover:scale-[1.05] hover:shadow-glow-lg active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-glow"
              >
                <RiPlayFill size={24} className="group-hover:scale-110 transition-transform" /> 
                Play Most Listened
              </button>
              <button
                onClick={() => navigate('/local')}
                className="group rounded-full border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-xl transition-all hover:bg-white/20 hover:border-white/50 hover:scale-[1.05] active:scale-95 shadow-lg"
              >
                Open Library
              </button>
            </div>
          </div>
          
          {/* Top Tracks Cards - Enhanced */}
          <div className="grid gap-4 md:grid-cols-3 relative z-10">
            {topListenedTracks.map((track, index) => (
              <button
                key={track.id}
                onClick={() => playTrack(track, localTracks)}
                className="group rounded-2xl bg-black/50 p-4 text-left backdrop-blur-xl transition-all hover:bg-black/70 hover:scale-[1.03] border border-white/10 hover:border-white/20 shadow-xl hover:shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="h-16 w-16 flex-shrink-0 rounded-xl object-cover shadow-lg group-hover:shadow-glow-sm transition-shadow"
                    />
                  ) : (
                    <div
                      className="h-16 w-16 flex-shrink-0 rounded-xl shadow-lg group-hover:shadow-glow-sm transition-shadow"
                      style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent mb-1">
                      Top {index + 1}
                    </div>
                    <div className="truncate text-sm font-bold text-white group-hover:text-accent transition-colors">{track.title}</div>
                    <div className="truncate text-xs text-white/70">{track.artist}</div>
                  </div>
                </div>
              </button>
            ))}
            {topListenedTracks.length === 0 && (
              <div className="rounded-2xl bg-black/50 p-5 text-sm text-white/70 backdrop-blur-xl md:col-span-3 border border-white/10 flex items-center gap-4">
                <RiFolderMusicLine size={32} className="text-white/40" />
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
                  <div className="text-3xl font-black text-white mb-1">{localTracks.length}</div>
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
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accentAlt/15">
                <RiTimeLine size={20} className="text-gradient-to" />
              </div>
              <h2 className="text-2xl font-bold">Jump back in</h2>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
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
                    className="jump-back-cover h-14 w-14 flex-shrink-0 rounded-xl object-cover shadow-md group-hover:shadow-glow-sm transition-shadow"
                  />
                ) : (
                  <div
                    className="jump-back-cover h-14 w-14 flex-shrink-0 rounded-xl shadow-md group-hover:shadow-glow-sm transition-shadow"
                    style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
                  />
                )}
                <span className="flex-1 truncate text-sm font-bold text-white group-hover:text-accent transition-colors">{track.title}</span>
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-glow-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                  <RiPlayFill size={20} className="ml-0.5" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Playlists — Enhanced */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Your Playlists</h2>
          <button onClick={() => navigate('/local')} className="text-sm font-semibold text-softText transition hover:text-white">View all</button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Popular Artists in Library</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
