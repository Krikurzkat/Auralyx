import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import TrackRow from '../components/cards/TrackRow';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { RiPlayFill, RiPauseFill, RiHeartFill, RiTimeLine } from 'react-icons/ri';
export default function LikedSongsPage() {
    const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
    const { likedTrackIds } = useLibraryStore();
    const { localTracks } = useLocalLibraryStore();
    const likedTracks = useMemo(() => {
        return localTracks.filter(t => likedTrackIds.has(t.id));
    }, [localTracks, likedTrackIds]);
    const isCurrentPlaylist = likedTracks.some(t => currentTrack?.id === t.id);
    const handlePlayAll = () => {
        if (isCurrentPlaylist && isPlaying) {
            togglePlay();
        }
        else if (likedTracks.length > 0) {
            playTrack(likedTracks[0], likedTracks);
        }
    };
    return (_jsxs("div", { className: "page-enter pb-8", children: [_jsxs("div", { className: "relative mb-4 sm:mb-6 overflow-hidden rounded-2xl sm:rounded-[28px] bg-theme-gradient-subtle p-4 sm:p-6 md:p-8", children: [_jsx("div", { className: "absolute inset-0 backdrop-blur-3xl" }), _jsxs("div", { className: "relative flex flex-col gap-6 md:flex-row md:items-end", children: [_jsxs("div", { className: "flex h-32 w-32 sm:h-48 sm:w-48 flex-shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-theme-gradient shadow-glow-lg md:h-56 md:w-56", children: [_jsx(RiHeartFill, { size: 56, className: "text-white sm:hidden" }), _jsx(RiHeartFill, { size: 80, className: "text-white hidden sm:block" })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-wider text-white/60", children: "Playlist" }), _jsx("h1", { className: "mt-1 text-xl sm:text-2xl font-bold md:text-4xl", children: "Liked Songs" }), _jsxs("div", { className: "mt-2 sm:mt-3 flex items-center gap-1 text-xs sm:text-sm text-white/60", children: [_jsx("span", { className: "font-bold text-white", children: "You" }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: [likedTracks.length, " songs"] })] })] })] })] }), likedTracks.length > 0 && (_jsx("div", { className: "mb-6 flex items-center gap-3", children: _jsx("button", { onClick: handlePlayAll, className: "flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-accent text-white shadow-glow transition hover:scale-105 hover:bg-accent-hover", children: isCurrentPlaylist && isPlaying ? _jsx(RiPauseFill, { size: 28 }) : _jsx(RiPlayFill, { size: 28, className: "ml-1" }) }) })), likedTracks.length > 0 ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-2 flex items-center gap-3 border-b border-white/5 px-3 py-2 text-xs font-medium uppercase tracking-wider text-dimText", children: [_jsx("div", { className: "w-8 text-center" }), _jsx("div", { className: "min-w-0 flex-1", children: "Title" }), _jsx("div", { className: "hidden min-w-[140px] md:block", children: "Album" }), _jsx("div", { className: "w-8" }), _jsx("div", { className: "w-12 text-right", children: _jsx(RiTimeLine, { size: 14, className: "inline" }) }), _jsx("div", { className: "w-6" })] }), _jsx("div", { className: "space-y-0.5", children: likedTracks.map((track, i) => (_jsx(TrackRow, { track: track, index: i, context: likedTracks, showAlbum: true }, track.id))) })] })) : (_jsxs("div", { className: "py-16 text-center", children: [_jsx(RiHeartFill, { size: 48, className: "mx-auto mb-4 text-dimText" }), _jsx("h3", { className: "text-xl font-bold text-white", children: "Songs you like will appear here" }), _jsx("p", { className: "mt-2 text-sm text-softText", children: "Save songs by tapping the heart icon." })] }))] }));
}
