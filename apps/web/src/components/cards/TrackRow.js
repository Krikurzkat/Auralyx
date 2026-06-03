import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDuration } from '../../utils/formatters';
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { RiPlayFill, RiPauseFill, RiHeartLine, RiHeartFill, RiMoreLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
export default function TrackRow({ track, showAlbum = true, showDateAdded = false, context, compact = false }) {
    const navigate = useNavigate();
    const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
    const { likedTrackIds, toggleLike } = useLibraryStore();
    const isCurrent = currentTrack?.id === track.id;
    const isLiked = likedTrackIds.has(track.id);
    const handlePlay = () => {
        if (isCurrent) {
            togglePlay();
        }
        else {
            playTrack(track, context);
        }
    };
    return (_jsxs("div", { onClick: handlePlay, className: `group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/5 ${isCurrent ? 'bg-white/5' : ''}`, children: [_jsxs("div", { className: "w-8 text-center", children: [_jsx("span", { className: `text-sm group-hover:hidden ${isCurrent ? 'text-accent font-medium' : 'text-dimText'}`, children: isCurrent && isPlaying ? (_jsxs("span", { className: "inline-flex items-end gap-0.5", children: [_jsx("span", { className: "eq-bar animate-equalizer-1", style: { height: '4px' } }), _jsx("span", { className: "eq-bar animate-equalizer-2", style: { height: '8px' } }), _jsx("span", { className: "eq-bar animate-equalizer-3", style: { height: '6px' } })] })) : '' }), _jsx("button", { onClick: (e) => { e.stopPropagation(); handlePlay(); }, className: "hidden group-hover:block", children: isCurrent && isPlaying ? _jsx(RiPauseFill, { size: 16 }) : _jsx(RiPlayFill, { size: 16 }) })] }), _jsxs("div", { className: "flex min-w-0 flex-1 items-center gap-3", children: [!compact && (track.coverUrl ? (_jsx("img", { src: track.coverUrl.startsWith('/') ? `http://localhost:3001${track.coverUrl}` : track.coverUrl, alt: track.title, className: "h-10 w-10 flex-shrink-0 rounded-lg object-cover" })) : (_jsx("div", { className: "h-10 w-10 flex-shrink-0 rounded-lg", style: {
                            background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})`,
                        } }))), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: `truncate text-sm font-medium ${isCurrent ? 'text-accent' : ''}`, children: [track.title, track.explicit && _jsx("span", { className: "ml-1.5 rounded bg-white/10 px-1 py-0.5 text-[9px] font-bold text-dimText", children: "E" })] }), _jsx("button", { onClick: (e) => { e.stopPropagation(); navigate(`/artist/${track.artistId}`); }, className: "truncate text-xs text-softText hover:text-white hover:underline", children: track.artist })] })] }), showAlbum && (_jsx("button", { onClick: (e) => { e.stopPropagation(); navigate(`/album/${track.albumId}`); }, className: "hidden min-w-[140px] truncate text-sm text-softText hover:text-white hover:underline md:block", children: track.album })), showDateAdded && (_jsx("div", { className: "hidden min-w-[100px] text-sm text-dimText lg:block", children: track.dateAdded })), _jsx("button", { onClick: (e) => { e.stopPropagation(); toggleLike(track.id); }, className: `rounded p-1 transition hover:scale-110 ${isLiked ? 'text-accent' : 'text-transparent group-hover:text-softText'}`, children: isLiked ? _jsx(RiHeartFill, { size: 16 }) : _jsx(RiHeartLine, { size: 16 }) }), _jsx("div", { className: "w-12 text-right text-sm text-dimText", children: formatDuration(track.duration) }), _jsx("button", { onClick: (e) => e.stopPropagation(), className: "hidden rounded p-1 text-dimText transition hover:text-white group-hover:block", children: _jsx(RiMoreLine, { size: 18 }) })] }));
}
