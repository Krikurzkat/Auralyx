import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useNavigate } from 'react-router-dom';
import ContentCard from '../components/cards/ContentCard';
import { usePlayerStore } from '../stores/playerStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { clickedTrackCoverRef } from '../components/player/FullscreenPlayer';
import { RiAlbumLine, RiPlayFill, RiTimeLine, RiFireLine, RiMusic2Line, RiFolderMusicLine, RiUserLine, RiBarChartBoxLine, RiTrophyLine, RiHeadphoneLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import NebulaDust from '../components/ui/NebulaDust';
function mergeUniqueTracks(...groups) {
    const seen = new Set();
    return groups.flat().filter((track) => {
        const key = track.id || track._id;
        if (!key || seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
export default function HomePage() {
    const navigate = useNavigate();
    const { playTrack, currentTrack, setFullscreenOpen } = usePlayerStore();
    const { localTracks, localPlaylists, isLoaded, loadLibrary, getMostPlayed, getRecentlyPlayed, lastPlayed, playCounts } = useLocalLibraryStore();
    useEffect(() => {
        if (!isLoaded)
            loadLibrary();
    }, [isLoaded, loadLibrary]);
    const allTracks = useMemo(() => mergeUniqueTracks(localTracks), [localTracks]);
    const topListenedTracks = useMemo(() => getMostPlayed(3), [getMostPlayed, localTracks]);
    const recentTracks = useMemo(() => getRecentlyPlayed(8), [getRecentlyPlayed, localTracks]);
    const userPlaylists = useMemo(() => localPlaylists.slice(0, 5), [localPlaylists]);
    const spotlightAlbums = useMemo(() => {
        const albumMap = new Map();
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
            if (b.plays !== a.plays)
                return b.plays - a.plays;
            return b.trackCount - a.trackCount;
        }).slice(0, 8);
    }, [allTracks, playCounts]);
    const [spotlightAlbumIndex, setSpotlightAlbumIndex] = useState(0);
    const [spotlightCoverIndex, setSpotlightCoverIndex] = useState(0);
    const mostPlayedAlbum = spotlightAlbums[spotlightAlbumIndex] || null;
    const activeAlbumCoverUrl = mostPlayedAlbum?.coverUrls[spotlightCoverIndex % Math.max(mostPlayedAlbum.coverUrls.length, 1)] || mostPlayedAlbum?.coverUrl;
    useEffect(() => {
        setSpotlightAlbumIndex((current) => (spotlightAlbums.length === 0 ? 0 : Math.min(current, spotlightAlbums.length - 1)));
    }, [spotlightAlbums.length]);
    useEffect(() => {
        setSpotlightCoverIndex(0);
    }, [mostPlayedAlbum?.id]);
    useEffect(() => {
        if (spotlightAlbums.length <= 1)
            return undefined;
        const interval = window.setInterval(() => {
            setSpotlightAlbumIndex((current) => (current + 1) % spotlightAlbums.length);
        }, 9000);
        return () => window.clearInterval(interval);
    }, [spotlightAlbums.length]);
    useEffect(() => {
        const coverCount = mostPlayedAlbum?.coverUrls.length || 0;
        if (coverCount <= 1)
            return undefined;
        const interval = window.setInterval(() => {
            setSpotlightCoverIndex((current) => (current + 1) % coverCount);
        }, 3600);
        return () => window.clearInterval(interval);
    }, [mostPlayedAlbum?.id, mostPlayedAlbum?.coverUrls.length]);
    const changeSpotlightAlbum = (direction) => {
        if (spotlightAlbums.length <= 1)
            return;
        setSpotlightAlbumIndex((current) => ((current + direction + spotlightAlbums.length) % spotlightAlbums.length));
    };
    // Calculate Quick Stats
    const quickStats = useMemo(() => {
        // Get today's start (midnight local time)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartMs = todayStart.getTime();
        // Tracks played today (since midnight)
        const tracksPlayedToday = Object.values(lastPlayed).filter((timestamp) => timestamp >= todayStartMs).length;
        // Total listening time (sum of all track durations)
        const totalMinutes = Math.floor(allTracks.reduce((sum, track) => sum + track.duration, 0) / 60);
        // Calculate streak (consecutive days with plays)
        let streak = 0;
        const dayMs = 24 * 60 * 60 * 1000;
        // Check if there's any play today first
        const hasPlayToday = Object.values(lastPlayed).some(timestamp => timestamp >= todayStartMs);
        if (hasPlayToday) {
            streak = 1; // Today counts
            // Check previous days
            for (let i = 1; i < 365; i++) {
                const dayStart = todayStartMs - (i * dayMs);
                const dayEnd = dayStart + dayMs;
                const hasPlayInDay = Object.values(lastPlayed).some(timestamp => timestamp >= dayStart && timestamp < dayEnd);
                if (!hasPlayInDay)
                    break;
                streak++;
            }
        }
        // Top genre based on play counts (most played genre)
        const genrePlayCounts = {};
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
        }
        else {
            // Fallback: most common genre in library
            const genreCounts = {};
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
        const artistCounts = {};
        const artistImages = {};
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
    const heroRef = useRef(null);
    const contentRef = useRef(null);
    useGSAP(() => {
        if (!contentRef.current || !isLoaded)
            return;
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
    const handleJumpBackInPlay = (track, button) => {
        const coverElement = button.querySelector('.jump-back-cover');
        if (coverElement) {
            clickedTrackCoverRef.current = coverElement;
        }
        gsap.fromTo(button, { scale: 1 }, {
            scale: 0.98,
            duration: 0.15,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1,
        });
        if (currentTrack?.id !== track.id) {
            playTrack(track, allTracks);
        }
        window.setTimeout(() => {
            setFullscreenOpen(true);
        }, 100);
    };
    if (!isLoaded) {
        return (_jsxs("div", { className: "page-enter space-y-8 animate-pulse p-4 md:p-6", children: [_jsx("div", { className: "h-[380px] rounded-[28px] bg-white/5" }), _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "h-6 w-48 rounded bg-white/10" }), _jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6", children: [...Array(6)].map((_, i) => (_jsxs("div", { className: "aspect-[0.8] rounded-2xl bg-white/5 p-4 space-y-3", children: [_jsx("div", { className: "aspect-square w-full rounded-xl bg-white/10" }), _jsx("div", { className: "h-4 w-3/4 rounded bg-white/10" }), _jsx("div", { className: "h-3 w-1/2 rounded bg-white/10" })] }, i))) })] })] }));
    }
    return (_jsxs("div", { className: "page-enter space-y-5 sm:space-y-8 pb-8 px-3 sm:px-4 md:px-0", children: [_jsx("section", { className: "md:hidden", children: _jsxs("div", { className: "rounded-2xl sm:rounded-[24px] border border-white/5 bg-gradient-to-br from-card/90 to-surface/80 p-3 sm:p-4 backdrop-blur-xl", children: [_jsxs("div", { className: "mb-3 flex items-center gap-2", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20", children: _jsx(RiBarChartBoxLine, { size: 16, className: "text-accent" }) }), _jsx("h2", { className: "text-sm font-bold text-white", children: "Your Stats" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 sm:gap-3", children: [_jsxs("div", { className: "group rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 p-3 transition hover:border-accent/40 hover:scale-[1.02]", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(RiHeadphoneLine, { size: 14, className: "text-accent" }), _jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-accent/80", children: "Today" })] }), _jsx("div", { className: "text-xl sm:text-2xl font-black text-white", children: quickStats.tracksPlayedToday }), _jsx("div", { className: "text-[11px] text-softText", children: "tracks played" })] }), _jsxs("div", { className: "group rounded-2xl bg-gradient-to-br from-gradient-from/10 to-gradient-to/5 border border-gradient-to/20 p-3 transition hover:border-gradient-to/40 hover:scale-[1.02]", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(RiFireLine, { size: 14, className: "text-gradient-to" }), _jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-gradient-to/80", children: "Streak" })] }), _jsx("div", { className: "text-xl sm:text-2xl font-black text-white", children: quickStats.streak }), _jsxs("div", { className: "text-[11px] text-softText", children: ["day", quickStats.streak !== 1 ? 's' : ''] })] }), _jsxs("div", { className: "group rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-3 transition hover:border-white/20 hover:scale-[1.02]", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(RiMusic2Line, { size: 14, className: "text-white/70" }), _jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-white/60", children: "Library" })] }), _jsx("div", { className: "text-xl sm:text-2xl font-black text-white", children: quickStats.totalTracks }), _jsx("div", { className: "text-[11px] text-softText", children: "total tracks" })] }), _jsxs("div", { className: "group rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 p-3 transition hover:border-purple-500/40 hover:scale-[1.02]", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(RiTrophyLine, { size: 14, className: "text-purple-400" }), _jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-purple-400/80", children: "Top Genre" })] }), _jsx("div", { className: "text-lg font-black text-white truncate", children: quickStats.topGenre }), _jsx("div", { className: "text-[11px] text-softText", children: "most played" })] })] })] }) }), _jsxs("section", { className: "hidden items-start gap-4 md:grid md:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[1.5fr_0.5fr]", children: [_jsxs("div", { ref: heroRef, className: "home-hero-glass group relative overflow-hidden rounded-[28px]", children: [_jsx("div", { className: "pointer-events-none absolute inset-px z-0 rounded-[27px] border border-white/[0.06]" }), _jsx("div", { className: "pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.08),transparent_28%)]" }), _jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[3px] z-20 rounded-l-[28px] overflow-hidden", children: _jsx("div", { className: "h-full w-full bg-theme-gradient opacity-70" }) }), _jsxs("div", { className: "absolute inset-0 z-0 overflow-hidden pointer-events-none", children: [_jsx("div", { className: "absolute left-[-12%] top-[-18%] h-[340px] w-[340px] rounded-full bg-gradient-from/20 blur-[110px] animate-pulse-glow" }), _jsx("div", { className: "absolute right-[15%] top-[5%] h-[280px] w-[280px] rounded-full bg-gradient-to/15 blur-[100px] animate-pulse-glow", style: { animationDelay: '1.2s' } }), _jsx("div", { className: "absolute bottom-[-20%] left-[40%] h-[240px] w-[240px] rounded-full bg-purple-500/12 blur-[90px] animate-pulse-glow", style: { animationDelay: '2.4s' } })] }), _jsx("div", { className: "absolute inset-0 z-0 bg-gradient-to-r from-black/34 via-black/12 to-white/[0.04] pointer-events-none" }), _jsx("div", { className: "absolute inset-0 z-0 bg-gradient-to-t from-black/18 via-transparent to-white/[0.05] pointer-events-none" }), _jsx(NebulaDust, { id: "hero-nebula" }), _jsxs("div", { className: "relative z-10 flex", children: [_jsx("div", { className: "flex-1 min-w-0 p-5 xl:p-6 flex flex-col justify-between gap-5", children: _jsxs("div", { className: "home-hero-feature-grid grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] xl:grid-cols-[minmax(0,1fr)_270px] xl:gap-6 items-start", children: [_jsxs("div", { ref: contentRef, className: "home-hero-copy max-w-lg space-y-3", children: [_jsxs("div", { className: "hero-badge-shimmer inline-flex items-center gap-2 rounded-full border border-accent/35 bg-black/30 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent backdrop-blur-md", children: [_jsx(RiFireLine, { size: 12, className: "animate-pulse" }), "Your Music Library"] }), _jsxs("h1", { className: "text-3xl font-black leading-[1.02] md:text-[1.85rem] xl:text-[2.5rem] text-white tracking-tight drop-shadow-[0_3px_18px_rgba(0,0,0,0.8)]", children: ["Most Listened ", _jsx("br", {}), _jsx("span", { className: "text-gradient", children: "Music" })] }), _jsx("p", { className: "max-w-md text-sm md:text-xs xl:text-[0.9rem] text-white/[0.82] leading-relaxed font-semibold drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]", children: "Dive into your most popular, frequently played tracks from your offline music library." }), _jsxs("div", { className: "flex flex-wrap gap-3 pointer-events-auto pt-1", children: [_jsxs("button", { onClick: () => { if (topListenedTracks[0])
                                                                        playTrack(topListenedTracks[0], allTracks); }, disabled: topListenedTracks.length === 0, className: "group/btn flex items-center gap-2 rounded-full bg-theme-gradient px-5 py-2.5 text-sm md:px-4 md:py-2 md:text-xs xl:px-6 xl:py-2.5 xl:text-sm font-bold text-white transition-all hover:scale-[1.05] hover:shadow-glow-lg active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-glow", children: [_jsx(RiPlayFill, { size: 18, className: "group-hover/btn:scale-110 transition-transform" }), "Play Top Track"] }), _jsx("button", { onClick: () => navigate('/local'), className: "rounded-full border border-white/20 bg-white/[0.06] px-5 py-2.5 text-sm md:px-4 md:py-2 md:text-xs xl:px-6 xl:py-2.5 xl:text-sm font-semibold text-white/90 backdrop-blur-xl transition-all hover:bg-white/15 hover:border-white/35 hover:scale-[1.05] active:scale-95", children: "Open Library" })] })] }), _jsx("div", { className: "home-hero-album-cover hidden items-start justify-end md:flex", children: _jsxs("div", { className: "group/album relative aspect-square w-full max-w-[160px] overflow-hidden rounded-[18px] border border-white/[0.18] bg-black/20 text-left shadow-2xl shadow-black/50 ring-1 ring-white/[0.06] backdrop-blur-xl transition-all hover:scale-[1.03] hover:border-accent/35 xl:max-w-[240px] xl:rounded-[22px]", children: [_jsxs("button", { onClick: () => {
                                                                    if (mostPlayedAlbum)
                                                                        navigate(`/album/${encodeURIComponent(mostPlayedAlbum.id)}`);
                                                                }, disabled: !mostPlayedAlbum, className: "absolute inset-0 h-full w-full text-left disabled:pointer-events-none", "aria-label": mostPlayedAlbum ? `Open ${mostPlayedAlbum.title}` : 'Open most listened album', children: [activeAlbumCoverUrl ? (_jsx("img", { src: activeAlbumCoverUrl, alt: mostPlayedAlbum?.title || 'Most Listened Album', className: "h-full w-full object-cover transition duration-500 ease-out group-hover/album:scale-[1.05]" }, activeAlbumCoverUrl)) : (_jsx("div", { className: "h-full w-full", style: {
                                                                            background: `linear-gradient(135deg, ${mostPlayedAlbum?.coverGradient?.[0] || '#6d28d9'}, ${mostPlayedAlbum?.coverGradient?.[1] || '#0f766e'})`,
                                                                        } })), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/88 via-black/24 to-black/12" }), _jsxs("div", { className: "absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-black/60 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-accent shadow-lg backdrop-blur-md xl:left-3 xl:top-3 xl:px-2.5 xl:py-1 xl:text-[9px]", children: [_jsx(RiAlbumLine, { size: 10 }), "Top Album"] }), _jsxs("div", { className: "absolute bottom-2.5 left-2.5 right-2.5 min-w-0 xl:bottom-3 xl:left-3 xl:right-3", children: [_jsx("div", { className: "truncate text-xs font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-colors group-hover/album:text-accent xl:text-sm", children: mostPlayedAlbum?.title || 'Most Listened' }), _jsx("div", { className: "truncate text-[10px] font-semibold text-white/75 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] xl:text-[11px]", children: mostPlayedAlbum?.artist || 'Total Music Library' }), mostPlayedAlbum && (_jsxs("div", { className: "mt-0.5 flex items-center gap-1.5", children: [_jsxs("span", { className: "text-[9px] font-bold text-accent", children: [mostPlayedAlbum.plays, " play", mostPlayedAlbum.plays === 1 ? '' : 's'] }), _jsx("span", { className: "text-[9px] text-white/30", children: "\u00B7" }), _jsxs("span", { className: "text-[9px] font-semibold text-white/[0.65]", children: [mostPlayedAlbum.trackCount, " track", mostPlayedAlbum.trackCount === 1 ? '' : 's'] })] }))] })] }), spotlightAlbums.length > 1 && (_jsxs("div", { className: "pointer-events-none absolute inset-x-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between opacity-0 transition-opacity duration-300 group-hover/album:opacity-100", children: [_jsx("button", { type: "button", onClick: () => changeSpotlightAlbum(-1), className: "pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 hover:text-accent active:scale-90", "aria-label": "Previous album cover", children: _jsx(RiArrowLeftSLine, { size: 18 }) }), _jsx("button", { type: "button", onClick: () => changeSpotlightAlbum(1), className: "pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 hover:text-accent active:scale-90", "aria-label": "Next album cover", children: _jsx(RiArrowRightSLine, { size: 18 }) })] })), mostPlayedAlbum && mostPlayedAlbum.coverUrls.length > 1 && (_jsx("div", { className: "pointer-events-none absolute bottom-2.5 right-2.5 z-20 flex max-w-[60px] gap-1 xl:bottom-3 xl:right-3", children: mostPlayedAlbum.coverUrls.slice(0, 4).map((coverUrl, index) => (_jsx("span", { className: `h-1.5 rounded-full transition-all ${index === spotlightCoverIndex % mostPlayedAlbum.coverUrls.length
                                                                        ? 'w-3.5 bg-accent'
                                                                        : 'w-1.5 bg-white/40'}` }, `${coverUrl}-${index}`))) }))] }) })] }) }), _jsx("div", { className: "hidden md:flex w-px self-stretch my-4 bg-gradient-to-b from-transparent via-white/10 to-transparent flex-shrink-0" }), _jsxs("div", { className: "hidden md:flex flex-col w-[220px] xl:w-[260px] flex-shrink-0 p-4 xl:p-5 gap-2.5", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("div", { className: "flex h-6 w-6 items-center justify-center rounded-md bg-accent/15", children: _jsx(RiBarChartBoxLine, { size: 12, className: "text-accent" }) }), _jsx("span", { className: "text-[11px] font-bold uppercase tracking-[0.16em] text-white/[0.78] drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]", children: "Top Tracks" })] }), _jsxs("div", { className: "flex flex-col gap-2 flex-1", children: [topListenedTracks.map((track, index) => (_jsxs("button", { onClick: () => playTrack(track, allTracks), className: "group/track flex items-center gap-2.5 rounded-xl border border-white/[0.1] bg-black/[0.24] p-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-white/[0.18] hover:bg-white/[0.11]", children: [_jsxs("div", { className: "relative flex-shrink-0", children: [track.coverUrl ? (_jsx("img", { src: track.coverUrl, alt: track.title, className: "h-10 w-10 rounded-lg object-cover shadow-md" })) : (_jsx("div", { className: "h-10 w-10 rounded-lg shadow-md", style: { background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` } })), _jsx("div", { className: "absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[8px] font-black text-white shadow-sm", children: index + 1 })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-xs font-bold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)] transition-colors group-hover/track:text-accent", children: track.title }), _jsx("div", { className: "truncate text-[10px] font-medium text-white/[0.68]", children: track.artist })] }), _jsx("div", { className: "flex-shrink-0 opacity-0 group-hover/track:opacity-100 transition-opacity", children: _jsx(RiPlayFill, { size: 14, className: "text-accent" }) })] }, track.id))), topListenedTracks.length === 0 && (_jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-center py-4 gap-2", children: [_jsx(RiFolderMusicLine, { size: 24, className: "text-white/20" }), _jsx("span", { className: "text-[11px] text-white/40 leading-snug", children: "Start playing to see your top tracks here" })] }))] })] })] })] }), _jsx("div", { className: "space-y-4", children: _jsxs("div", { className: "relative w-full rounded-[32px] border border-white/10 bg-gradient-to-br from-card via-surface to-background p-8 flex flex-col overflow-hidden shadow-xl", children: [_jsx("div", { className: "absolute top-0 right-0 p-8 opacity-[0.03]", children: _jsx(RiMusic2Line, { size: 160 }) }), _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center gap-2 mb-6", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15", children: _jsx(RiBarChartBoxLine, { size: 16, className: "text-accent" }) }), _jsx("h3", { className: "text-2xl font-black text-white tracking-tight", children: "Your Stats" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 mb-3", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-glass backdrop-blur-2xl/50 p-4 backdrop-blur-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(RiHeadphoneLine, { size: 14, className: "text-accent" }), _jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-accent", children: "Today" })] }), _jsx("div", { className: "text-3xl font-black text-white mb-1", children: "0" }), _jsx("div", { className: "text-xs text-dimText", children: "tracks played" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-glass backdrop-blur-2xl/50 p-4 backdrop-blur-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(RiFireLine, { size: 14, className: "text-gradient-to" }), _jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-gradient-to", children: "Streak" })] }), _jsx("div", { className: "text-3xl font-black text-white mb-1", children: "0" }), _jsx("div", { className: "text-xs text-dimText", children: "days" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-glass backdrop-blur-2xl/50 p-4 backdrop-blur-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(RiMusic2Line, { size: 14, className: "text-white/70" }), _jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-white/70", children: "Library" })] }), _jsx("div", { className: "text-3xl font-black text-white mb-1", children: allTracks.length }), _jsx("div", { className: "text-xs text-dimText", children: "total tracks" })] }), _jsxs("div", { className: "rounded-2xl border border-purple-500/20 bg-purple-950/30 p-4 backdrop-blur-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(RiTrophyLine, { size: 14, className: "text-purple-400" }), _jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-purple-400", children: "Top Genre" })] }), _jsx("div", { className: "text-lg font-black text-white mb-1 truncate", children: "Various" }), _jsx("div", { className: "text-xs text-dimText", children: "most played" })] })] })] })] }) })] }), recentTracks.length > 0 && (_jsxs("section", { children: [_jsxs("div", { className: "mb-3 sm:mb-5 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 sm:gap-3", children: [_jsx("div", { className: "flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-accentAlt/15", children: _jsx(RiTimeLine, { size: 18, className: "text-gradient-to" }) }), _jsx("h2", { className: "text-lg sm:text-2xl font-bold", children: "Jump back in" })] }), recentTracks.length > 3 && (_jsxs("button", { onClick: () => navigate('/local'), className: "group flex items-center gap-2 text-sm font-semibold text-softText transition hover:text-white", children: ["Show all", _jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", className: "transition-transform group-hover:translate-x-1", children: _jsx("path", { d: "M6 12L10 8L6 4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })] }))] }), _jsx("div", { className: "grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2 md:grid-cols-3", children: recentTracks.slice(0, 3).map(track => (_jsxs("button", { onClick: (event) => handleJumpBackInPlay(track, event.currentTarget), className: "group flex items-center gap-4 rounded-2xl bg-gradient-to-br from-card/80 to-surface/60 p-3 text-left transition-all hover:from-card hover:to-surface hover:scale-[1.02] border border-white/5 hover:border-white/10 shadow-lg hover:shadow-xl backdrop-blur-sm", children: [track.coverUrl ? (_jsx("img", { src: track.coverUrl, alt: track.title, className: "jump-back-cover h-11 w-11 sm:h-14 sm:w-14 flex-shrink-0 rounded-lg sm:rounded-xl object-cover shadow-md group-hover:shadow-glow-sm transition-shadow" })) : (_jsx("div", { className: "jump-back-cover h-11 w-11 sm:h-14 sm:w-14 flex-shrink-0 rounded-lg sm:rounded-xl shadow-md group-hover:shadow-glow-sm transition-shadow", style: { background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` } })), _jsx("span", { className: "flex-1 truncate text-xs sm:text-sm font-bold text-white group-hover:text-accent transition-colors", children: track.title }), _jsx("div", { className: "flex h-9 w-9 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-glow-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110", children: _jsx(RiPlayFill, { size: 20, className: "ml-0.5" }) })] }, track.id))) })] })), _jsxs("section", { children: [_jsxs("div", { className: "mb-3 sm:mb-5 flex items-center justify-between", children: [_jsx("h2", { className: "text-lg sm:text-2xl font-bold", children: "Your Playlists" }), _jsx("button", { onClick: () => navigate('/local'), className: "text-sm font-semibold text-softText transition hover:text-white", children: "View all" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 xl:grid-cols-6", children: [userPlaylists.map(pl => (_jsx(ContentCard, { id: pl.id, title: pl.title, subtitle: `${pl.trackIds.length} tracks`, gradient: pl.coverGradient, coverUrl: pl.coverUrl, type: "playlist", onClick: () => navigate('/local') }, pl.id))), userPlaylists.length === 0 && (_jsxs("div", { className: "col-span-full py-16 rounded-3xl border-2 border-dashed border-white/10 bg-gradient-to-br from-white/5 to-transparent flex flex-col items-center justify-center text-center backdrop-blur-sm", children: [_jsx("div", { className: "flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 mb-4", children: _jsx(RiFolderMusicLine, { size: 32, className: "text-accent" }) }), _jsx("p", { className: "text-base font-bold text-white mb-2", children: "No playlists found" }), _jsx("p", { className: "text-sm text-dimText mb-5", children: "Create your first playlist in the Library." }), _jsx("button", { onClick: () => navigate('/local'), className: "px-6 py-3 bg-theme-gradient rounded-full text-sm font-bold hover:scale-105 transition-transform shadow-glow-sm", children: "Go to Library" })] }))] })] }), _jsxs("section", { children: [_jsx("div", { className: "mb-3 sm:mb-5 flex items-center justify-between", children: _jsx("h2", { className: "text-lg sm:text-2xl font-bold", children: "Popular Artists in Library" }) }), _jsxs("div", { className: "grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 xl:grid-cols-6", children: [popularArtists.map(artist => (_jsx(ContentCard, { id: artist.id, title: artist.name, subtitle: `${artist.trackCount} tracks`, gradient: artist.gradient, type: "artist", round: true }, artist.id))), popularArtists.length === 0 && (_jsxs("div", { className: "col-span-full py-12 text-center", children: [_jsx("div", { className: "inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4", children: _jsx(RiUserLine, { size: 32, className: "text-dimText" }) }), _jsx("p", { className: "text-sm text-dimText", children: "Import music to discover popular artists." })] }))] })] })] }));
}
