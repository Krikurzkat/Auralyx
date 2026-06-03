import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import ContentCard from '../components/cards/ContentCard';
import TrackRow from '../components/cards/TrackRow';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { RiPlayFill, RiPauseFill, RiUserFollowLine, RiUserFollowFill, RiMoreLine, RiShuffleLine } from 'react-icons/ri';
import { formatListeners } from '../utils/formatters';
export default function ArtistPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
    const { followedArtistIds, toggleFollowArtist } = useLibraryStore();
    const { localTracks } = useLocalLibraryStore();
    const artistName = decodeURIComponent(id || '');
    const artistTracks = useMemo(() => {
        return localTracks.filter(t => (t.artistId === id || t.artist === artistName)).sort((a, b) => b.plays - a.plays);
    }, [localTracks, id, artistName]);
    const artist = useMemo(() => {
        if (artistTracks.length === 0)
            return null;
        const t = artistTracks[0];
        return {
            id: t.artistId || t.artist,
            name: t.artist,
            monthlyListeners: artistTracks.reduce((acc, t) => acc + t.plays, 0) * 100, // mock calculation
            avatarUrl: t.coverUrl,
            avatarGradient: t.coverGradient || ['#333', '#222'],
        };
    }, [artistTracks]);
    // Derive albums from artist's tracks
    const artistAlbums = useMemo(() => {
        const albumMap = new Map();
        artistTracks.forEach(t => {
            if (t.album && !albumMap.has(t.album)) {
                albumMap.set(t.album, {
                    id: t.albumId || t.album,
                    title: t.album,
                    artist: t.artist,
                    year: t.year || new Date().getFullYear(),
                    coverUrl: t.coverUrl,
                    coverGradient: t.coverGradient || ['#333', '#222'],
                });
            }
        });
        return Array.from(albumMap.values()).sort((a, b) => b.year - a.year);
    }, [artistTracks]);
    if (!artist) {
        return (_jsxs("div", { className: "flex h-64 flex-col items-center justify-center text-softText gap-4", children: [_jsx("div", { children: "Artist not found locally" }), _jsx("button", { onClick: () => navigate('/local'), className: "rounded-full bg-white/10 px-4 py-2 hover:bg-white/20 transition", children: "Go to Local Library" })] }));
    }
    const isCurrentArtist = artistTracks.some(t => currentTrack?.id === t.id);
    const isFollowed = followedArtistIds.has(artist.id);
    const handlePlayAll = () => {
        if (isCurrentArtist && isPlaying) {
            togglePlay();
        }
        else if (artistTracks.length > 0) {
            playTrack(artistTracks[0], artistTracks);
        }
    };
    return (_jsxs("div", { className: "page-enter pb-8", children: [_jsxs("div", { className: "relative mb-4 sm:mb-8 h-[220px] sm:h-[320px] md:h-[400px] overflow-hidden rounded-[24px] sm:rounded-[28px]", children: [artist.avatarUrl ? (_jsx("img", { src: artist.avatarUrl, alt: artist.name, className: "absolute inset-0 h-full w-full object-cover" })) : (_jsx("div", { className: "absolute inset-0", style: { background: `linear-gradient(135deg, ${artist.avatarGradient[0]}, ${artist.avatarGradient[1]})` } })), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" }), _jsxs("div", { className: "absolute bottom-0 left-0 p-4 sm:p-6 md:p-8", children: [_jsxs("div", { className: "mb-1 sm:mb-2 flex items-center gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-white/80", children: [_jsx("span", { className: "flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] sm:text-xs text-white", children: "\u2713" }), "Local Artist"] }), _jsx("h1", { className: "text-2xl sm:text-3xl font-black md:text-5xl", children: artist.name }), _jsxs("div", { className: "mt-2 sm:mt-4 text-xs sm:text-sm text-white/70", children: [formatListeners(artist.monthlyListeners), " local plays"] })] })] }), _jsxs("div", { className: "mb-4 sm:mb-8 flex items-center gap-3 px-4 md:px-0", children: [_jsxs("button", { onClick: handlePlayAll, className: "flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-accent text-white shadow-glow transition hover:scale-105 hover:bg-accent-hover", children: [isCurrentArtist && isPlaying ? _jsx(RiPauseFill, { size: 22, className: "sm:hidden" }) : _jsx(RiPlayFill, { size: 22, className: "ml-0.5 sm:hidden" }), isCurrentArtist && isPlaying ? _jsx(RiPauseFill, { size: 28, className: "hidden sm:block" }) : _jsx(RiPlayFill, { size: 28, className: "ml-1 hidden sm:block" })] }), _jsxs("button", { className: "rounded-full bg-glass-card backdrop-blur-xl p-2.5 sm:p-3.5 text-softText transition hover:bg-card-hover hover:text-white", children: [_jsx(RiShuffleLine, { size: 18, className: "sm:hidden" }), _jsx(RiShuffleLine, { size: 22, className: "hidden sm:block" })] }), _jsxs("button", { onClick: () => toggleFollowArtist(artist.id), className: `flex items-center gap-1.5 rounded-full border px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition ${isFollowed
                            ? 'border-white text-white hover:border-white/70 hover:text-white/70'
                            : 'border-white/30 text-white hover:border-white'}`, children: [isFollowed ? _jsx(RiUserFollowFill, { size: 15, className: "sm:hidden" }) : _jsx(RiUserFollowLine, { size: 15, className: "sm:hidden" }), isFollowed ? _jsx(RiUserFollowFill, { size: 18, className: "hidden sm:block" }) : _jsx(RiUserFollowLine, { size: 18, className: "hidden sm:block" }), isFollowed ? 'Following' : 'Follow'] }), _jsxs("button", { className: "rounded-full p-1.5 sm:p-2 text-softText transition hover:text-white", children: [_jsx(RiMoreLine, { size: 20, className: "sm:hidden" }), _jsx(RiMoreLine, { size: 24, className: "hidden sm:block" })] })] }), _jsxs("div", { className: "grid gap-8 lg:grid-cols-[1fr_300px]", children: [_jsxs("section", { children: [_jsx("h2", { className: "mb-4 text-2xl font-bold px-4 md:px-0", children: "Popular Tracks" }), _jsx("div", { className: "space-y-0.5", children: artistTracks.slice(0, 10).map((track, i) => (_jsx(TrackRow, { track: track, index: i, context: artistTracks }, track.id))) })] }), _jsx("div", { className: "space-y-8 px-4 md:px-0", children: _jsxs("section", { children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Albums" }), _jsxs("div", { className: "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8", children: [artistAlbums.map(album => (_jsx(ContentCard, { id: album.id, title: album.title, subtitle: album.year.toString(), gradient: album.coverGradient, coverUrl: album.coverUrl, type: "album" }, album.id))), artistAlbums.length === 0 && (_jsx("div", { className: "text-sm text-dimText", children: "No local albums found." }))] })] }) })] })] }));
}
