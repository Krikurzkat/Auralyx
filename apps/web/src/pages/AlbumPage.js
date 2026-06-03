import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import TrackRow from '../components/cards/TrackRow';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { RiPlayFill, RiPauseFill, RiHeartLine, RiHeartFill, RiShuffleLine, RiMoreLine, RiTimeLine } from 'react-icons/ri';
export default function AlbumPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
    const { savedAlbumIds, toggleSaveAlbum } = useLibraryStore();
    const { localTracks } = useLocalLibraryStore();
    const albumTitle = decodeURIComponent(id || '');
    // Extract the album info from local tracks
    const albumTracks = useMemo(() => {
        return localTracks.filter(t => (t.albumId === id || t.album === albumTitle)).sort((a, b) => (a.year || 0) - (b.year || 0));
    }, [localTracks, id, albumTitle]);
    const album = useMemo(() => {
        if (albumTracks.length === 0)
            return null;
        const t = albumTracks[0];
        return {
            id: t.albumId || t.album,
            title: t.album,
            artist: t.artist,
            year: t.year || new Date().getFullYear(),
            coverUrl: t.coverUrl,
            coverGradient: t.coverGradient || ['#333', '#222'],
        };
    }, [albumTracks]);
    if (!album) {
        return (_jsxs("div", { className: "flex h-64 flex-col items-center justify-center text-softText gap-4", children: [_jsx("div", { children: "Album not found locally" }), _jsx("button", { onClick: () => navigate('/local'), className: "rounded-full bg-white/10 px-4 py-2 hover:bg-white/20 transition", children: "Go to Local Library" })] }));
    }
    const totalDuration = albumTracks.reduce((acc, t) => acc + t.duration, 0);
    const isCurrentAlbum = albumTracks.some(t => currentTrack?.id === t.id);
    const isSaved = savedAlbumIds.has(album.id);
    const coverGradient = album.coverGradient;
    const handlePlayAll = () => {
        if (isCurrentAlbum && isPlaying) {
            togglePlay();
        }
        else if (albumTracks.length > 0) {
            playTrack(albumTracks[0], albumTracks);
        }
    };
    return (_jsxs("div", { className: "page-enter pb-8", children: [_jsxs("div", { className: "relative mb-6 overflow-hidden rounded-[28px] p-6 md:p-8", style: { background: `linear-gradient(135deg, ${coverGradient[0]}90, ${coverGradient[1]}60, #0D0D0D)` }, children: [_jsx("div", { className: "absolute inset-0 backdrop-blur-3xl" }), _jsxs("div", { className: "relative flex flex-col gap-6 md:flex-row md:items-end", children: [album.coverUrl ? (_jsx("img", { src: album.coverUrl, alt: album.title, className: "h-48 w-48 flex-shrink-0 rounded-2xl object-cover shadow-glow-lg md:h-56 md:w-56" })) : (_jsx("div", { className: "h-48 w-48 flex-shrink-0 rounded-2xl shadow-glow-lg md:h-56 md:w-56", style: { background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` } })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-wider text-white/60", children: "Local Album" }), _jsx("h1", { className: "mt-1 text-2xl font-bold md:text-3xl", children: album.title }), _jsxs("div", { className: "mt-3 flex items-center gap-2 text-sm text-white/60", children: [_jsx("span", { className: "font-bold text-white", children: album.artist }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: album.year }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: [albumTracks.length, " songs"] }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: [Math.floor(totalDuration / 60), " min"] })] })] })] })] }), _jsxs("div", { className: "mb-6 flex items-center gap-3", children: [_jsx("button", { onClick: handlePlayAll, className: "flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-glow-sm transition hover:scale-105 hover:bg-accent-hover", children: isCurrentAlbum && isPlaying ? _jsx(RiPauseFill, { size: 24 }) : _jsx(RiPlayFill, { size: 24, className: "ml-0.5" }) }), _jsx("button", { className: "rounded-full bg-glass-card backdrop-blur-xl p-3 text-softText transition hover:bg-card-hover hover:text-white", children: _jsx(RiShuffleLine, { size: 20 }) }), _jsx("button", { onClick: () => toggleSaveAlbum(album.id), className: `rounded-full p-3 transition hover:scale-110 ${isSaved ? 'text-accent' : 'text-softText hover:text-white'}`, children: isSaved ? _jsx(RiHeartFill, { size: 22 }) : _jsx(RiHeartLine, { size: 22 }) }), _jsx("button", { className: "rounded-full bg-glass-card backdrop-blur-xl p-3 text-softText transition hover:bg-card-hover hover:text-white", children: _jsx(RiMoreLine, { size: 20 }) })] }), _jsxs("div", { className: "mb-2 flex items-center gap-3 border-b border-white/5 px-3 py-2 text-xs font-medium uppercase tracking-wider text-dimText", children: [_jsx("div", { className: "w-8 text-center" }), _jsx("div", { className: "min-w-0 flex-1", children: "Title" }), _jsx("div", { className: "w-8" }), _jsx("div", { className: "w-12 text-right", children: _jsx(RiTimeLine, { size: 14, className: "inline" }) }), _jsx("div", { className: "w-6" })] }), _jsx("div", { className: "space-y-0.5", children: albumTracks.map((track, i) => (_jsx(TrackRow, { track: track, index: i, context: albumTracks }, track.id))) })] }));
}
