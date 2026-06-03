import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import TrackRow from '../components/cards/TrackRow';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { RiPlayFill, RiPauseFill, RiHeartLine, RiHeartFill, RiShuffleLine, RiMoreLine, RiTimeLine, RiDownloadLine, RiShareLine } from 'react-icons/ri';
export default function PlaylistPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
    const { savedPlaylistIds, toggleSavePlaylist } = useLibraryStore();
    const { localPlaylists, localTracks } = useLocalLibraryStore();
    const playlist = useMemo(() => localPlaylists.find(p => p.id === id), [localPlaylists, id]);
    const playlistTracks = useMemo(() => {
        if (!playlist)
            return [];
        return playlist.trackIds
            .map(tId => localTracks.find(t => t.id === tId))
            .filter((t) => t !== undefined);
    }, [playlist, localTracks]);
    const recommendedTracks = useMemo(() => {
        if (!playlist)
            return [];
        return localTracks
            .filter(t => !playlist.trackIds.includes(t.id))
            .sort((a, b) => b.plays - a.plays)
            .slice(0, 5);
    }, [playlist, localTracks]);
    if (!playlist) {
        return (_jsxs("div", { className: "flex h-64 flex-col items-center justify-center text-softText gap-4", children: [_jsx("div", { children: "Playlist not found" }), _jsx("button", { onClick: () => navigate('/local'), className: "rounded-full bg-white/10 px-4 py-2 hover:bg-white/20 transition", children: "Go to Local Library" })] }));
    }
    const totalDuration = playlistTracks.reduce((acc, t) => acc + t.duration, 0);
    const isCurrentPlaylist = playlistTracks.some(t => currentTrack?.id === t.id);
    const isSaved = savedPlaylistIds.has(playlist.id);
    const coverGradient = playlist.coverGradient || ['#333', '#222'];
    const handlePlayAll = () => {
        if (isCurrentPlaylist && isPlaying) {
            togglePlay();
        }
        else if (playlistTracks.length > 0) {
            playTrack(playlistTracks[0], playlistTracks);
        }
    };
    return (_jsxs("div", { className: "page-enter pb-8", children: [_jsxs("div", { className: "relative mb-6 overflow-hidden rounded-[28px] p-6 md:p-8", style: { background: `linear-gradient(135deg, ${coverGradient[0]}90, ${coverGradient[1]}60, #0D0D0D)` }, children: [_jsx("div", { className: "absolute inset-0 backdrop-blur-3xl" }), _jsxs("div", { className: "relative flex flex-col gap-6 md:flex-row md:items-end", children: [playlist.coverUrl ? (_jsx("img", { src: playlist.coverUrl, alt: playlist.title, className: "h-48 w-48 flex-shrink-0 rounded-2xl object-cover shadow-glow-lg md:h-56 md:w-56" })) : (_jsx("div", { className: "h-48 w-48 flex-shrink-0 rounded-2xl shadow-glow-lg md:h-56 md:w-56", style: { background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` }, children: _jsx("div", { className: "flex h-full w-full items-center justify-center text-3xl font-bold text-white/20", children: "\u266A" }) })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-[10px] font-semibold uppercase tracking-widest text-white/70", children: "Playlist" }), _jsx("h1", { className: "mt-1 text-2xl font-bold md:text-3xl", children: playlist.title }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-1 text-sm text-white/60", children: [_jsx("span", { className: "font-medium text-white", children: playlist.owner || playlist.ownerName || 'You' }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: [playlistTracks.length, " songs"] }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: [Math.floor(totalDuration / 60), " min"] })] })] })] })] }), _jsxs("div", { className: "mb-4 flex items-center gap-3", children: [_jsx("button", { onClick: handlePlayAll, className: "flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-glow-sm transition hover:scale-105 hover:bg-accent-hover", children: isCurrentPlaylist && isPlaying ? _jsx(RiPauseFill, { size: 24 }) : _jsx(RiPlayFill, { size: 24, className: "ml-0.5" }) }), _jsx("button", { className: "rounded-full bg-glass-card backdrop-blur-xl p-3 text-softText transition hover:bg-card-hover hover:text-white", children: _jsx(RiShuffleLine, { size: 20 }) }), _jsx("button", { onClick: () => toggleSavePlaylist(playlist.id), className: `rounded-full p-3 transition hover:scale-110 ${isSaved ? 'text-accent' : 'text-softText hover:text-white'}`, children: isSaved ? _jsx(RiHeartFill, { size: 22 }) : _jsx(RiHeartLine, { size: 22 }) }), _jsx("button", { className: "rounded-full bg-glass-card backdrop-blur-xl p-3 text-softText transition hover:bg-card-hover hover:text-white", children: _jsx(RiDownloadLine, { size: 20 }) }), _jsx("button", { className: "rounded-full bg-glass-card backdrop-blur-xl p-3 text-softText transition hover:bg-card-hover hover:text-white", children: _jsx(RiShareLine, { size: 20 }) }), _jsx("button", { className: "rounded-full bg-glass-card backdrop-blur-xl p-3 text-softText transition hover:bg-card-hover hover:text-white", children: _jsx(RiMoreLine, { size: 20 }) })] }), _jsxs("div", { className: "mb-2 flex items-center gap-3 border-b border-white/5 px-3 py-2 text-xs font-medium uppercase tracking-wider text-dimText", children: [_jsx("div", { className: "w-8 text-center" }), _jsx("div", { className: "min-w-0 flex-1", children: "Title" }), _jsx("div", { className: "hidden min-w-[140px] md:block", children: "Album" }), _jsx("div", { className: "hidden min-w-[100px] lg:block", children: "Date added" }), _jsx("div", { className: "w-8" }), _jsx("div", { className: "w-12 text-right", children: _jsx(RiTimeLine, { size: 14, className: "inline" }) }), _jsx("div", { className: "w-6" })] }), _jsxs("div", { className: "space-y-0.5", children: [playlistTracks.map((track, i) => (_jsx(TrackRow, { track: track, index: i, showAlbum: true, showDateAdded: true, context: playlistTracks }, track.id))), playlistTracks.length === 0 && (_jsx("div", { className: "py-12 text-center text-sm text-dimText", children: "This playlist has no songs yet." }))] }), recommendedTracks.length > 0 && (_jsxs("div", { className: "mt-8", children: [_jsx("h3", { className: "mb-3 text-lg font-bold", children: "Recommended Tracks" }), _jsx("p", { className: "mb-3 text-sm text-softText", children: "Based on your local library" }), _jsx("div", { className: "space-y-0.5", children: recommendedTracks.map((track, i) => (_jsx(TrackRow, { track: track, index: i, context: recommendedTracks }, track.id))) })] }))] }));
}
