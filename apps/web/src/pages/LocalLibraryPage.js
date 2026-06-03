import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { usePlayerStore } from '../stores/playerStore';
import gsap from 'gsap';
import { clickedTrackCoverRef } from '../components/player/FullscreenPlayer';
import { useGalaxyS8PlusLayout } from '../hooks/useGalaxyS8PlusLayout';
import { RiUploadCloud2Line, RiSearchLine, RiPlayFill, RiDeleteBinLine, RiAddLine, RiPlayListLine, RiMusicLine, RiHeartLine, RiHeartFill, RiSortAsc, RiSortDesc, RiGridLine, RiListUnordered, RiTimeLine, RiCloseLine, RiLoader4Line, RiHistoryLine, RiFireLine, RiMore2Fill, RiEditLine, RiImageEditLine, RiCheckLine, RiRefreshLine, RiPlayListAddLine, RiSkipForwardLine, } from 'react-icons/ri';
const TRACK_MENU_WIDTH = 224;
const TRACK_MENU_APPROX_HEIGHT = 304;
const TRACK_MENU_GAP = 8;
const TRACK_MENU_VIEWPORT_MARGIN = 12;
const BOTTOM_PLAYER_SAFE_HEIGHT = 92;
function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
// ─── Sub-components ───
const TrackRow = memo(function TrackRow({ track, isActive, isPlaying, playCounts, onPlay, onDelete, onAddToPlaylist, onEdit, onAddToQueue, onPlayNext, compact, }) {
    const [liked, setLiked] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    const rowRef = useRef(null);
    const coverRef = useRef(null);
    const menuButtonRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState(null);
    const updateMenuPosition = useCallback(() => {
        const button = menuButtonRef.current;
        if (!button)
            return;
        const rect = button.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const safeBottom = viewportHeight - BOTTOM_PLAYER_SAFE_HEIGHT - TRACK_MENU_VIEWPORT_MARGIN;
        const spaceAbove = rect.top - TRACK_MENU_VIEWPORT_MARGIN;
        const spaceBelow = safeBottom - rect.bottom;
        const shouldOpenUpward = spaceBelow < TRACK_MENU_APPROX_HEIGHT &&
            spaceAbove > spaceBelow;
        const placement = shouldOpenUpward ? 'top' : 'bottom';
        const unclampedTop = placement === 'top'
            ? rect.top - TRACK_MENU_GAP - Math.min(TRACK_MENU_APPROX_HEIGHT, Math.max(160, spaceAbove))
            : rect.bottom + TRACK_MENU_GAP;
        const maxHeight = Math.max(160, placement === 'top'
            ? spaceAbove - TRACK_MENU_GAP
            : spaceBelow - TRACK_MENU_GAP);
        const top = placement === 'top'
            ? Math.max(TRACK_MENU_VIEWPORT_MARGIN, rect.top - TRACK_MENU_GAP - maxHeight)
            : Math.min(unclampedTop, Math.max(TRACK_MENU_VIEWPORT_MARGIN, safeBottom - maxHeight));
        const left = Math.min(Math.max(TRACK_MENU_VIEWPORT_MARGIN, rect.right - TRACK_MENU_WIDTH), viewportWidth - TRACK_MENU_VIEWPORT_MARGIN - TRACK_MENU_WIDTH);
        setMenuPosition({ top, left, maxHeight, placement });
    }, []);
    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        const handleReposition = () => {
            updateMenuPosition();
        };
        if (showMenu) {
            updateMenuPosition();
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', handleReposition);
            window.addEventListener('scroll', handleReposition, true);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                window.removeEventListener('resize', handleReposition);
                window.removeEventListener('scroll', handleReposition, true);
            };
        }
    }, [showMenu, updateMenuPosition]);
    const handlePlayClick = () => {
        // Add a quick pulse animation before opening fullscreen
        if (rowRef.current) {
            gsap.fromTo(rowRef.current, { scale: 1 }, {
                scale: 0.98,
                duration: 0.15,
                ease: 'power2.out',
                yoyo: true,
                repeat: 1,
            });
        }
        onPlay(track, coverRef.current);
    };
    return (_jsxs("div", { ref: rowRef, className: `group relative flex cursor-pointer items-center rounded-xl transition-all duration-300 hover:scale-[1.005] hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.01] hover:shadow-md ${compact ? 'gap-2.5 px-2.5 py-1.5' : 'gap-3 px-3 py-2.5'} ${isActive ? 'bg-gradient-to-r from-accent/10 to-accent/5 shadow-sm' : ''}`, onClick: handlePlayClick, children: [_jsx("div", { className: `flex-shrink-0 text-left ${compact ? 'w-7 pl-0 text-center' : 'w-10 pl-1'}`, children: isActive && isPlaying ? (_jsxs("span", { className: `text-accent flex items-end gap-[2px] ${compact ? 'h-3.5 justify-center' : 'h-4'}`, children: [_jsx("span", { className: "w-[3px] bg-accent rounded-full animate-[bounce_0.6s_0.0s_infinite]", style: { height: '60%' } }), _jsx("span", { className: "w-[3px] bg-accent rounded-full animate-[bounce_0.6s_0.2s_infinite]", style: { height: '100%' } }), _jsx("span", { className: "w-[3px] bg-accent rounded-full animate-[bounce_0.6s_0.4s_infinite]", style: { height: '40%' } })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: `${compact ? 'text-xs' : 'text-sm'} font-medium ${isActive ? 'text-accent' : 'text-white/30'} group-hover:hidden transition-opacity` }), _jsx("button", { onClick: (e) => { e.stopPropagation(); handlePlayClick(); }, className: `hidden items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-white shadow-md transition-all duration-200 hover:scale-110 hover:shadow-accent/50 group-hover:flex ${compact ? 'h-6 w-6' : 'h-7 w-7'}`, children: _jsx(RiPlayFill, { size: compact ? 10 : 12 }) })] })) }), _jsx("div", { ref: coverRef, className: "flex-shrink-0 group-hover:scale-105 transition-transform duration-300", children: track.coverUrl ? (_jsx("img", { src: track.coverUrl, alt: track.title, className: `${compact ? 'h-9 w-9 rounded-md' : 'h-11 w-11 rounded-lg'} object-cover shadow-md ring-1 ring-white/10` })) : (_jsx("div", { className: `${compact ? 'h-9 w-9 rounded-md' : 'h-11 w-11 rounded-lg'} flex items-center justify-center shadow-md ring-1 ring-white/10`, style: { background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }, children: _jsx(RiMusicLine, { size: compact ? 14 : 16, className: "text-white/60" }) })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: `${compact ? 'text-[13px] leading-tight' : 'text-sm'} font-semibold truncate transition-colors ${isActive ? 'text-accent' : 'text-white group-hover:text-white'}`, children: track.title }), _jsx("div", { className: `${compact ? 'text-[11px] leading-tight' : 'text-xs'} truncate text-white/50 transition-colors group-hover:text-white/60`, children: track.artist })] }), _jsx("div", { className: "hidden md:block w-44 text-sm text-white/40 truncate group-hover:text-white/50 transition-colors", children: track.album }), _jsxs("div", { className: "hidden lg:flex items-center gap-1.5 w-16 text-xs text-white/40 group-hover:text-white/50 transition-colors", children: [_jsx(RiFireLine, { size: 12, className: "text-accent/60" }), _jsx("span", { children: playCounts[track.id] || 0 })] }), _jsx("div", { className: `w-12 flex-shrink-0 text-right font-medium text-white/40 transition-colors group-hover:text-white/50 ${compact ? 'text-[11px]' : 'text-xs'}`, children: formatDuration(track.duration) }), _jsxs("div", { className: "relative flex-shrink-0", ref: menuRef, children: [_jsx("button", { ref: menuButtonRef, onClick: (e) => {
                            e.stopPropagation();
                            if (!showMenu) {
                                updateMenuPosition();
                            }
                            setShowMenu(!showMenu);
                        }, className: `rounded-full transition-all duration-200 ${compact ? 'p-1' : 'p-1.5'} ${showMenu ? 'bg-white/15 text-white opacity-100 scale-105' : 'text-white/30 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10 hover:scale-105'}`, children: _jsx(RiMore2Fill, { size: compact ? 14 : 16 }) }), showMenu && menuPosition && createPortal(_jsx("div", { className: "fixed inset-0 z-[70]", onClick: () => setShowMenu(false), children: _jsxs("div", { ref: menuRef, className: "absolute w-60 overflow-y-auto rounded-2xl border border-white/20 bg-[#0E0E10]/98 py-2 shadow-2xl backdrop-blur-2xl animate-scale-in", style: {
                                top: menuPosition.top,
                                left: menuPosition.left,
                                maxHeight: menuPosition.maxHeight,
                                transformOrigin: menuPosition.placement === 'top' ? 'bottom right' : 'top right',
                            }, onClick: (e) => e.stopPropagation(), children: [_jsxs("button", { onClick: (e) => { e.stopPropagation(); setLiked(l => !l); setShowMenu(false); }, className: "group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 rounded-xl mx-1", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors", children: liked ? _jsx(RiHeartFill, { size: 16, className: "text-accent" }) : _jsx(RiHeartLine, { size: 16 }) }), _jsx("span", { className: "truncate", children: liked ? 'Unlike' : 'Like' })] }), _jsxs("button", { onClick: (e) => { e.stopPropagation(); onEdit(track); setShowMenu(false); }, className: "group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 rounded-xl mx-1", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors", children: _jsx(RiEditLine, { size: 16 }) }), _jsx("span", { className: "truncate", children: "Edit Track Info" })] }), _jsx("div", { className: "mx-3 my-2 h-px bg-white/10" }), _jsxs("button", { onClick: (e) => { e.stopPropagation(); onAddToQueue(track); setShowMenu(false); }, className: "group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 rounded-xl mx-1", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors", children: _jsx(RiPlayListAddLine, { size: 16 }) }), _jsx("span", { className: "truncate", children: "Add to Queue" })] }), _jsxs("button", { onClick: (e) => { e.stopPropagation(); onPlayNext(track); setShowMenu(false); }, className: "group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 rounded-xl mx-1", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors", children: _jsx(RiSkipForwardLine, { size: 16 }) }), _jsx("span", { className: "truncate", children: "Play Next" })] }), _jsxs("button", { onClick: (e) => { e.stopPropagation(); onAddToPlaylist(track); setShowMenu(false); }, className: "group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 rounded-xl mx-1", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors", children: _jsx(RiAddLine, { size: 16 }) }), _jsx("span", { className: "truncate", children: "Add to Playlist" })] }), _jsx("div", { className: "mx-3 my-2 h-px bg-white/10" }), _jsxs("button", { onClick: (e) => { e.stopPropagation(); onDelete(track.id); setShowMenu(false); }, className: "group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-400/10 rounded-xl mx-1", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10 group-hover:bg-red-400/20 transition-colors", children: _jsx(RiDeleteBinLine, { size: 16 }) }), _jsx("span", { className: "truncate", children: "Remove from Library" })] })] }) }), document.body)] })] }));
});
// ─── Playlist Create/Rename Modal ───
function PlaylistModal({ onClose, onSave }) {
    const [name, setName] = useState('');
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in", children: _jsxs("div", { className: "w-full max-w-md rounded-3xl bg-glass backdrop-blur-2xl border border-white/20 p-8 shadow-2xl animate-scale-in", children: [_jsx("h3", { className: "mb-6 text-2xl font-bold text-white", children: "Create New Playlist" }), _jsx("input", { autoFocus: true, type: "text", value: name, onChange: e => setName(e.target.value), onKeyDown: e => { if (e.key === 'Enter' && name.trim())
                        onSave(name.trim()); }, placeholder: "Enter playlist name\u2026", className: "w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg" }), _jsxs("div", { className: "mt-6 flex gap-3", children: [_jsx("button", { onClick: onClose, className: "flex-1 rounded-2xl bg-white/5 border border-white/10 py-3.5 text-sm font-semibold text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white hover:border-white/20", children: "Cancel" }), _jsx("button", { onClick: () => name.trim() && onSave(name.trim()), className: "flex-1 rounded-2xl bg-theme-gradient py-3.5 text-sm font-bold text-white shadow-glow-sm transition-all duration-300 hover:scale-105 hover:shadow-glow disabled:opacity-50 disabled:hover:scale-100", disabled: !name.trim(), children: "Create" })] })] }) }));
}
// ─── Add to Playlist Modal ───
function AddToPlaylistModal({ track, playlists, onAdd, onClose, }) {
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in", children: _jsxs("div", { className: "w-full max-w-md rounded-3xl bg-glass backdrop-blur-2xl border border-white/20 p-8 shadow-2xl animate-scale-in", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h3", { className: "text-xl font-bold text-white", children: "Add to Playlist" }), _jsx("button", { onClick: onClose, className: "text-white/50 hover:text-white transition-colors hover:rotate-90 duration-300", children: _jsx(RiCloseLine, { size: 24 }) })] }), _jsx("p", { className: "mb-6 text-sm text-white/60 truncate bg-white/5 rounded-xl px-4 py-3 border border-white/10", children: track.title }), playlists.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(RiPlayListLine, { className: "mx-auto mb-4 text-3xl text-white/20" }), _jsx("p", { className: "text-sm text-white/50", children: "No playlists yet. Create one first!" })] })) : (_jsx("div", { className: "space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin", children: playlists.map(pl => (_jsxs("button", { onClick: () => onAdd(pl.id), className: "flex w-full items-center gap-4 rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-left transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]", children: [_jsx("div", { className: "h-12 w-12 flex-shrink-0 rounded-xl shadow-lg", style: { background: `linear-gradient(135deg, ${pl.coverGradient?.[0] || '#333'}, ${pl.coverGradient?.[1] || '#222'})` }, children: _jsx("div", { className: "flex h-full w-full items-center justify-center opacity-40", children: _jsx(RiPlayListLine, { size: 20, className: "text-white" }) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("span", { className: "block truncate text-sm font-semibold text-white", children: pl.title }), _jsxs("span", { className: "text-xs text-white/50", children: [pl.trackIds.length, " tracks"] })] }), _jsx(RiAddLine, { size: 20, className: "text-accent flex-shrink-0" })] }, pl.id))) }))] }) }));
}
// ─── Edit Track Modal ───
function EditTrackModal({ track, onSave, onClose, }) {
    const [title, setTitle] = useState(track.title);
    const [artist, setArtist] = useState(track.artist);
    const [album, setAlbum] = useState(track.album || '');
    const [year, setYear] = useState(track.year?.toString() || '');
    const [genre, setGenre] = useState(track.genre || '');
    const [coverUrl, setCoverUrl] = useState(track.coverUrl || '');
    const [lyrics, setLyrics] = useState(track.lyrics || '');
    const [lrcFileName, setLrcFileName] = useState('');
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const fileInputRef = useRef(null);
    const lrcInputRef = useRef(null);
    const handleCoverUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setIsUploadingCover(true);
        try {
            // Convert image to base64 data URL
            const reader = new FileReader();
            reader.onload = () => {
                setCoverUrl(reader.result);
                setIsUploadingCover(false);
            };
            reader.onerror = () => {
                setIsUploadingCover(false);
            };
            reader.readAsDataURL(file);
        }
        catch (error) {
            console.error('Error updating local cover:', error);
            setIsUploadingCover(false);
        }
    };
    const handleLrcImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        try {
            const text = await file.text();
            setLyrics(text);
            setLrcFileName(file.name);
        }
        catch (error) {
            console.error('Error reading LRC file:', error);
            alert('Failed to read LRC file. Please try again.');
        }
    };
    const handleSave = () => {
        const updates = {
            title: title.trim() || track.title,
            artist: artist.trim() || track.artist,
            album: album.trim() || undefined,
            year: year.trim() ? parseInt(year) : undefined,
            genre: genre.trim() || undefined,
            coverUrl: coverUrl || undefined,
            lyrics: lyrics || undefined,
        };
        onSave(updates);
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fade-in", children: _jsxs("div", { className: "w-full max-w-2xl rounded-3xl bg-glass backdrop-blur-2xl border border-white/20 p-8 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-thin", children: [_jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsx("h3", { className: "text-2xl font-bold text-white", children: "Edit Track Info" }), _jsx("button", { onClick: onClose, className: "text-white/50 hover:text-white transition-colors hover:rotate-90 duration-300", children: _jsx(RiCloseLine, { size: 28 }) })] }), _jsxs("div", { className: "mb-8", children: [_jsx("label", { className: "block text-sm font-bold text-white/80 uppercase tracking-wider mb-4", children: "Album Cover" }), _jsxs("div", { className: "flex items-center gap-6", children: [_jsxs("div", { className: "relative group", children: [coverUrl ? (_jsx("img", { src: coverUrl, alt: "Album cover", className: "h-40 w-40 rounded-2xl object-cover shadow-2xl ring-2 ring-white/10" })) : (_jsx("div", { className: "h-40 w-40 rounded-2xl flex items-center justify-center shadow-2xl ring-2 ring-white/10", style: { background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }, children: _jsx(RiMusicLine, { size: 56, className: "text-white/40" }) })), _jsx("button", { onClick: () => fileInputRef.current?.click(), disabled: isUploadingCover, className: "absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300", children: isUploadingCover ? (_jsx(RiLoader4Line, { className: "text-white text-3xl animate-spin" })) : (_jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsx(RiImageEditLine, { className: "text-white text-3xl" }), _jsx("span", { className: "text-xs text-white font-medium", children: "Change" })] })) })] }), _jsxs("div", { className: "flex-1 space-y-3", children: [_jsxs("button", { onClick: () => fileInputRef.current?.click(), disabled: isUploadingCover, className: "flex items-center gap-3 rounded-2xl bg-white/10 border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/20 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100", children: [_jsx(RiImageEditLine, { size: 18 }), isUploadingCover ? 'Updating...' : 'Change Cover'] }), coverUrl && (_jsx("button", { onClick: () => setCoverUrl(''), className: "text-sm text-white/50 hover:text-red-400 transition-colors font-medium", children: "Remove cover" }))] })] }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", className: "hidden", onChange: handleCoverUpload })] }), _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-white/80 uppercase tracking-wider mb-2", children: "Title *" }), _jsx("input", { type: "text", value: title, onChange: e => setTitle(e.target.value), placeholder: "Track title", className: "w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-white/80 uppercase tracking-wider mb-2", children: "Artist *" }), _jsx("input", { type: "text", value: artist, onChange: e => setArtist(e.target.value), placeholder: "Artist name", className: "w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-white/80 uppercase tracking-wider mb-2", children: "Album" }), _jsx("input", { type: "text", value: album, onChange: e => setAlbum(e.target.value), placeholder: "Album name", className: "w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-white/80 uppercase tracking-wider mb-2", children: "Year" }), _jsx("input", { type: "number", value: year, onChange: e => setYear(e.target.value), placeholder: "2024", min: "1900", max: "2100", className: "w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-bold text-white/80 uppercase tracking-wider mb-2", children: "Genre" }), _jsx("input", { type: "text", value: genre, onChange: e => setGenre(e.target.value), placeholder: "Pop, Rock, etc.", className: "w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold text-softText uppercase tracking-wider mb-2", children: "Lyrics" }), lyrics ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(RiCheckLine, { size: 18, className: "text-accent" }), _jsx("span", { className: "text-sm font-medium text-white", children: lrcFileName || 'Lyrics imported' })] }), _jsx("button", { onClick: () => {
                                                        setLyrics('');
                                                        setLrcFileName('');
                                                    }, className: "text-xs text-dimText hover:text-red-400 transition", children: "Remove" })] }), _jsxs("label", { className: "flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-white/20 hover:border-white/30 cursor-pointer", children: [_jsx("input", { ref: lrcInputRef, type: "file", accept: ".lrc", className: "hidden", onChange: handleLrcImport }), _jsx(RiRefreshLine, { size: 16 }), "Replace Lyrics"] })] })) : (_jsxs("label", { className: "flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-white/20 hover:border-white/30 cursor-pointer", children: [_jsx("input", { ref: lrcInputRef, type: "file", accept: ".lrc", className: "hidden", onChange: handleLrcImport }), _jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" }) }), "Import Lyrics (.lrc)"] }))] })] }), _jsxs("div", { className: "mt-8 flex gap-3", children: [_jsx("button", { onClick: onClose, className: "flex-1 rounded-full bg-white/5 py-3 text-sm font-medium text-softText transition hover:bg-white/10", children: "Cancel" }), _jsxs("button", { onClick: handleSave, disabled: !title.trim() || !artist.trim(), className: "flex-1 rounded-full bg-theme-gradient py-3 text-sm font-bold text-white shadow-glow transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2", children: [_jsx(RiCheckLine, { size: 18 }), "Save Changes"] })] })] }) }));
}
// ─── Main Page ───
export default function LocalLibraryPage() {
    const { localTracks, localPlaylists, playCounts, isLoaded, importProgress, loadLibrary, importFiles, removeTrack, updateTrack, createPlaylist, deletePlaylist, addTrackToPlaylist, searchTracks, getMostPlayed, getRecentlyPlayed, recordPlay, } = useLocalLibraryStore();
    const { currentTrack, isPlaying } = usePlayerStore();
    const isGalaxyS8PlusLayout = useGalaxyS8PlusLayout();
    const [tab, setTab] = useState('all');
    const [viewMode, setViewMode] = useState('list');
    const [sortKey, setSortKey] = useState('addedAt');
    const [sortDir, setSortDir] = useState('desc');
    const [search, setSearch] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [addToPlaylistTrack, setAddToPlaylistTrack] = useState(null);
    const [editTrack, setEditTrack] = useState(null);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const dragCounter = useRef(0);
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);
    useEffect(() => {
        if (!isLoaded)
            loadLibrary();
    }, [isLoaded, loadLibrary]);
    // ─── Sorted + filtered tracks for current tab ───
    const displayTracks = useMemo(() => {
        let tracks;
        if (tab === 'mostPlayed')
            tracks = getMostPlayed(50);
        else if (tab === 'recent')
            tracks = getRecentlyPlayed(50);
        else if (tab === 'playlists' && selectedPlaylist) {
            const idSet = new Set(selectedPlaylist.trackIds);
            tracks = localTracks.filter(t => idSet.has(t.id));
            // Preserve playlist order
            tracks = selectedPlaylist.trackIds
                .map(id => tracks.find(t => t.id === id))
                .filter(Boolean);
        }
        else
            tracks = search.trim() ? searchTracks(search) : localTracks;
        if (tab !== 'mostPlayed' && tab !== 'recent' && !(tab === 'playlists' && selectedPlaylist)) {
            tracks = [...tracks].sort((a, b) => {
                let aVal;
                let bVal;
                if (sortKey === 'plays') {
                    aVal = playCounts[a.id] || 0;
                    bVal = playCounts[b.id] || 0;
                }
                else if (sortKey === 'addedAt') {
                    aVal = a.addedAt;
                    bVal = b.addedAt;
                }
                else if (sortKey === 'duration') {
                    aVal = a.duration;
                    bVal = b.duration;
                }
                else {
                    aVal = (a[sortKey] || '').toString().toLowerCase();
                    bVal = (b[sortKey] || '').toString().toLowerCase();
                }
                if (aVal < bVal)
                    return sortDir === 'asc' ? -1 : 1;
                if (aVal > bVal)
                    return sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return tracks;
    }, [tab, localTracks, search, sortKey, sortDir, playCounts, selectedPlaylist, searchTracks, getMostPlayed, getRecentlyPlayed]);
    // ─── Drag & Drop ───
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        dragCounter.current++;
        if (e.dataTransfer.items?.length > 0)
            setIsDragging(true);
    }, []);
    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        dragCounter.current--;
        if (dragCounter.current === 0)
            setIsDragging(false);
    }, []);
    const handleDragOver = useCallback((e) => { e.preventDefault(); }, []);
    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        setIsDragging(false);
        dragCounter.current = 0;
        if (e.dataTransfer.files?.length > 0) {
            await importFiles(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    }, [importFiles]);
    const displayTracksRef = useRef(displayTracks);
    useEffect(() => {
        displayTracksRef.current = displayTracks;
    }, [displayTracks]);
    const handlePlayRow = useCallback((track, coverElement) => {
        if (coverElement) {
            clickedTrackCoverRef.current = coverElement;
        }
        const state = usePlayerStore.getState();
        const isAlreadyPlaying = state.currentTrack?.id === track.id;
        if (isAlreadyPlaying) {
            setTimeout(() => { state.setFullscreenOpen(true); }, 100);
        }
        else {
            state.playTrack(track, displayTracksRef.current);
            recordPlay(track.id);
            setTimeout(() => { state.setFullscreenOpen(true); }, 100);
        }
    }, [recordPlay]);
    const handleDeleteRow = useCallback((id) => {
        removeTrack(id);
    }, [removeTrack]);
    const handleAddToQueue = useCallback((track) => {
        usePlayerStore.getState().addToQueue(track);
    }, []);
    const handlePlayNext = useCallback((track) => {
        usePlayerStore.getState().playNext(track);
    }, []);
    const handleCreatePlaylist = async (name) => {
        await createPlaylist(name);
        setShowCreatePlaylist(false);
    };
    const toggleSort = (key) => {
        if (sortKey === key)
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else {
            setSortKey(key);
            setSortDir('asc');
        }
    };
    const totalDuration = useMemo(() => localTracks.reduce((sum, t) => sum + t.duration, 0), [localTracks]);
    const tabItems = [
        { key: 'all', label: 'All Tracks', compactLabel: 'Tracks', icon: RiMusicLine },
        { key: 'playlists', label: 'Playlists', compactLabel: 'Lists', icon: RiPlayListLine },
        { key: 'mostPlayed', label: 'Most Played', compactLabel: 'Most', icon: RiFireLine },
        { key: 'recent', label: 'Recently Played', compactLabel: 'Recent', icon: RiHistoryLine },
    ];
    return (_jsxs("div", { className: `relative page-enter min-h-full ${isGalaxyS8PlusLayout ? 's8-plus-layout' : ''}`, onDragEnter: handleDragEnter, onDragLeave: handleDragLeave, onDragOver: handleDragOver, onDrop: handleDrop, children: [isDragging && (_jsx("div", { className: "pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl", children: _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 blur-3xl opacity-50 animate-pulse", children: _jsx("div", { className: "h-64 w-64 rounded-full bg-accent" }) }), _jsxs("div", { className: "relative rounded-3xl border-2 border-dashed border-accent bg-accent/10 backdrop-blur-xl px-20 py-16 text-center shadow-2xl", children: [_jsx(RiUploadCloud2Line, { className: "mx-auto mb-6 text-5xl text-accent animate-bounce" }), _jsx("p", { className: "text-2xl font-bold text-white mb-3", children: "Drop your music files here" }), _jsx("p", { className: "text-base text-white/70", children: "Drop music files only. Non-audio files are ignored." })] })] }) })), showCreatePlaylist && (_jsx(PlaylistModal, { onClose: () => setShowCreatePlaylist(false), onSave: handleCreatePlaylist })), addToPlaylistTrack && (_jsx(AddToPlaylistModal, { track: addToPlaylistTrack, playlists: localPlaylists, onAdd: async (playlistId) => {
                    await addTrackToPlaylist(playlistId, addToPlaylistTrack.id);
                    setAddToPlaylistTrack(null);
                }, onClose: () => setAddToPlaylistTrack(null) })), editTrack && (_jsx(EditTrackModal, { track: editTrack, onSave: async (updates) => {
                    await updateTrack(editTrack.id, updates);
                    setEditTrack(null);
                }, onClose: () => setEditTrack(null) })), _jsxs("div", { className: isGalaxyS8PlusLayout ? 'mb-4' : 'mb-10', children: [_jsxs("div", { className: `flex flex-col ${isGalaxyS8PlusLayout ? 'gap-3' : 'gap-6'} sm:flex-row sm:items-end sm:justify-between`, children: [_jsxs("div", { children: [_jsx("h1", { className: `bg-gradient-to-r from-white to-white/70 bg-clip-text font-black tracking-tight text-transparent ${isGalaxyS8PlusLayout ? 'mb-2 text-3xl leading-none' : 'mb-4 text-4xl'}`, children: "My Music" }), _jsxs("div", { className: `flex flex-wrap items-center font-medium ${isGalaxyS8PlusLayout ? 'gap-1.5 text-[11px]' : 'gap-4 text-sm'}`, children: [_jsxs("span", { className: `flex items-center rounded-full border border-white/10 bg-glass-card backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'gap-1 px-2.5 py-1' : 'gap-2 px-4 py-2'}`, children: [_jsx(RiMusicLine, { size: isGalaxyS8PlusLayout ? 13 : 18, className: "text-accent" }), _jsx("span", { className: "text-white", children: localTracks.length }), _jsx("span", { className: "text-white/50", children: "tracks" })] }), _jsxs("span", { className: `flex items-center rounded-full border border-white/10 bg-glass-card backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'gap-1 px-2.5 py-1' : 'gap-2 px-4 py-2'}`, children: [_jsx(RiTimeLine, { size: isGalaxyS8PlusLayout ? 13 : 18, className: "text-gradient-to" }), _jsx("span", { className: "text-white", children: formatDuration(totalDuration) }), _jsx("span", { className: "text-white/50", children: "total" })] }), localTracks.length > 0 && (_jsxs("span", { className: `flex items-center rounded-full border border-white/10 bg-glass-card backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'gap-1 px-2.5 py-1' : 'gap-2 px-4 py-2'}`, children: [_jsx("span", { className: "text-white", children: (localTracks.reduce((s, t) => s + (t.blob?.size || 0), 0) / (1024 * 1024)).toFixed(0) }), _jsx("span", { className: "text-white/50", children: "MB" })] }))] })] }), _jsxs("div", { className: `flex flex-wrap ${isGalaxyS8PlusLayout ? 'gap-1.5' : 'gap-3'}`, children: [_jsxs("button", { onClick: () => fileInputRef.current?.click(), className: `group flex items-center rounded-2xl bg-theme-gradient font-bold text-white shadow-glow transition-all hover:scale-105 hover:shadow-glow-lg active:scale-95 ${isGalaxyS8PlusLayout ? 'gap-1.5 px-4 py-2.5 text-[13px]' : 'gap-3 px-8 py-4 text-base'}`, children: [_jsx(RiUploadCloud2Line, { size: isGalaxyS8PlusLayout ? 16 : 22, className: "group-hover:scale-110 transition-transform" }), isGalaxyS8PlusLayout ? 'Add' : 'Add Files'] }), _jsxs("button", { onClick: () => folderInputRef.current?.click(), className: `group flex items-center rounded-2xl border border-white/10 bg-glass-card font-bold text-white/80 shadow-lg backdrop-blur-xl transition-all hover:scale-105 hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95 ${isGalaxyS8PlusLayout ? 'gap-1.5 px-4 py-2.5 text-[13px]' : 'gap-3 px-6 py-4 text-base'}`, children: [_jsx(RiPlayListAddLine, { size: isGalaxyS8PlusLayout ? 16 : 22, className: "transition-transform group-hover:scale-110" }), isGalaxyS8PlusLayout ? 'Folder' : 'Add Folder'] })] }), _jsx("input", { ref: fileInputRef, type: "file", accept: "audio/*,.aac,.aiff,.alac,.flac,.m4a,.mp3,.mp4,.mpeg,.oga,.ogg,.opus,.wav,.wave,.webm,.wma,.zip,.rar,.7z,.tar,.gz,.bz2", multiple: true, className: "hidden", onChange: e => { if (e.target.files && e.target.files.length > 0) {
                                    importFiles(e.target.files);
                                    e.target.value = '';
                                } } }), _jsx("input", { ref: folderInputRef, type: "file", accept: "audio/*,.aac,.aiff,.alac,.flac,.m4a,.mp3,.mp4,.mpeg,.oga,.ogg,.opus,.wav,.wave,.webm,.wma,.zip,.rar,.7z,.tar,.gz,.bz2", multiple: true, className: "hidden", ...{ webkitdirectory: '', directory: '' }, onChange: e => { if (e.target.files && e.target.files.length > 0) {
                                    importFiles(e.target.files);
                                    e.target.value = '';
                                } } })] }), importProgress.isRunning && (_jsxs("div", { className: `rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'mt-4 p-4' : 'mt-8 p-6'}`, children: [_jsxs("div", { className: `flex items-center justify-between ${isGalaxyS8PlusLayout ? 'mb-2' : 'mb-3'}`, children: [_jsxs("span", { className: `flex items-center font-semibold text-white ${isGalaxyS8PlusLayout ? 'gap-2 text-xs' : 'gap-3 text-sm'}`, children: [_jsx(RiLoader4Line, { className: "animate-spin text-accent", size: isGalaxyS8PlusLayout ? 16 : 20 }), "Importing ", importProgress.current] }), _jsxs("span", { className: `${isGalaxyS8PlusLayout ? 'text-xs' : 'text-sm'} font-bold text-white/70`, children: [importProgress.done, "/", importProgress.total] })] }), _jsx("div", { className: "h-2 rounded-full bg-white/10 overflow-hidden", children: _jsx("div", { className: "h-full rounded-full bg-theme-gradient transition-all duration-300 shadow-glow-sm", style: { width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` } }) })] })), !importProgress.isRunning && importProgress.skippedDuplicates > 0 && (_jsxs("div", { className: `rounded-2xl border border-white/10 bg-white/5 text-white/80 backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'mt-4 p-3 text-xs' : 'mt-6 p-4 text-sm'}`, children: [_jsxs("div", { className: "font-bold", children: ["Skipped ", importProgress.skippedDuplicates, " duplicate item", importProgress.skippedDuplicates === 1 ? '' : 's', "."] }), _jsx("div", { className: "mt-1 text-white/50", children: "Already in your library or repeated inside this folder." })] }))] }), _jsxs("div", { className: `mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between ${isGalaxyS8PlusLayout ? 'gap-2.5' : 'mb-6 gap-5'}`, children: [_jsx("div", { className: `flex overflow-x-auto scrollbar-hidden pb-1 ${isGalaxyS8PlusLayout ? 'gap-1.5' : 'gap-2.5'}`, children: tabItems.map(t => (_jsxs("button", { onClick: () => { setTab(t.key); if (t.key !== 'playlists')
                                setSelectedPlaylist(null); }, className: `group flex flex-shrink-0 items-center rounded-2xl font-semibold transition-all duration-300 ${isGalaxyS8PlusLayout ? 'gap-1.5 px-3 py-2 text-[12px]' : 'gap-2.5 px-5 py-3 text-sm'} ${tab === t.key
                                ? 'bg-white text-black shadow-lg scale-105'
                                : 'bg-glass-card backdrop-blur-xl border border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105'}`, children: [_jsx(t.icon, { size: isGalaxyS8PlusLayout ? 14 : 18, className: `transition-transform group-hover:scale-110 ${tab === t.key ? 'text-black' : 'text-accent'}` }), isGalaxyS8PlusLayout ? t.compactLabel : t.label] }, t.key))) }), _jsxs("div", { className: `flex items-center ${isGalaxyS8PlusLayout ? 'gap-2' : 'gap-3'}`, children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(RiSearchLine, { className: `absolute top-1/2 -translate-y-1/2 text-white/40 ${isGalaxyS8PlusLayout ? 'left-3' : 'left-4'}`, size: isGalaxyS8PlusLayout ? 14 : 16 }), _jsx("input", { type: "text", value: search, onChange: e => setSearch(e.target.value), placeholder: isGalaxyS8PlusLayout ? 'Search library...' : 'Search your library…', className: `rounded-2xl border border-white/10 bg-glass-card text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:shadow-lg ${isGalaxyS8PlusLayout
                                            ? 'h-9 w-full min-w-0 pl-8 pr-8 text-[12px] focus:w-full'
                                            : 'h-11 w-48 pl-11 pr-10 text-sm focus:w-64'}` }), search && (_jsx("button", { onClick: () => setSearch(''), className: `absolute top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white ${isGalaxyS8PlusLayout ? 'right-2.5' : 'right-3'}`, children: _jsx(RiCloseLine, { size: isGalaxyS8PlusLayout ? 16 : 18 }) }))] }), _jsx("button", { onClick: () => setViewMode(v => v === 'list' ? 'grid' : 'list'), className: `rounded-2xl border border-white/10 bg-glass-card text-white/70 transition-all duration-300 hover:scale-105 hover:border-white/20 hover:bg-white/10 hover:text-white ${isGalaxyS8PlusLayout ? 'min-h-[36px] min-w-[36px] p-2' : 'p-3'}`, children: viewMode === 'list' ? _jsx(RiGridLine, { size: isGalaxyS8PlusLayout ? 14 : 18 }) : _jsx(RiListUnordered, { size: isGalaxyS8PlusLayout ? 14 : 18 }) })] })] }), !isLoaded && (_jsxs("div", { className: `flex flex-col items-center justify-center text-center ${isGalaxyS8PlusLayout ? 'py-14' : 'py-32'}`, children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 animate-ping opacity-20", children: _jsx("div", { className: `${isGalaxyS8PlusLayout ? 'h-12 w-12' : 'h-16 w-16'} rounded-full bg-accent` }) }), _jsx(RiLoader4Line, { className: `relative text-accent animate-spin ${isGalaxyS8PlusLayout ? 'mb-4 text-3xl' : 'mb-6 text-4xl'}` })] }), _jsx("p", { className: `${isGalaxyS8PlusLayout ? 'text-sm' : 'text-base'} font-medium text-white/60`, children: "Loading your local library\u2026" })] })), isLoaded && localTracks.length === 0 && tab !== 'playlists' && (_jsxs("div", { onClick: () => fileInputRef.current?.click(), className: `group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 text-center transition-all duration-300 hover:scale-[1.01] hover:border-accent/50 hover:bg-accent/5 ${isGalaxyS8PlusLayout ? 'px-4 py-10' : 'py-32'}`, children: [_jsxs("div", { className: `relative ${isGalaxyS8PlusLayout ? 'mb-5' : 'mb-8'}`, children: [_jsx("div", { className: "absolute inset-0 blur-2xl opacity-50 group-hover:opacity-70 transition-opacity", children: _jsx("div", { className: `${isGalaxyS8PlusLayout ? 'h-16 w-16' : 'h-24 w-24'} rounded-full bg-accent` }) }), _jsx("div", { className: `relative flex items-center justify-center rounded-full border border-accent/20 bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-xl transition-all duration-300 group-hover:scale-110 group-hover:border-accent/40 ${isGalaxyS8PlusLayout ? 'h-16 w-16' : 'h-24 w-24'}`, children: _jsx(RiUploadCloud2Line, { className: `text-accent transition-transform group-hover:scale-110 ${isGalaxyS8PlusLayout ? 'text-2xl' : 'text-4xl'}` }) })] }), _jsx("h3", { className: `font-bold text-white ${isGalaxyS8PlusLayout ? 'mb-2 text-xl leading-tight' : 'mb-3 text-2xl'}`, children: "Add your first tracks" }), _jsx("p", { className: `text-white/50 ${isGalaxyS8PlusLayout ? 'mb-4 max-w-[240px] text-sm leading-snug' : 'mb-6 max-w-md text-base leading-relaxed'}`, children: isGalaxyS8PlusLayout
                            ? 'Tap to add music from your device.'
                            : 'Drag & drop music files here, or click to browse. Your music stays entirely on your device.' }), _jsx("div", { className: `flex flex-wrap justify-center ${isGalaxyS8PlusLayout ? 'gap-1.5' : 'gap-2.5'}`, children: ['MP3', 'FLAC', 'M4A', 'WAV', 'OGG'].map((format) => (_jsx("span", { className: `rounded-full border border-white/10 bg-glass-card backdrop-blur-xl font-semibold text-white/70 ${isGalaxyS8PlusLayout ? 'px-3 py-1 text-[10px]' : 'px-4 py-2 text-xs'}`, children: format }, format))) })] })), isLoaded && tab === 'playlists' && !selectedPlaylist && (_jsxs("div", { className: isGalaxyS8PlusLayout ? 'space-y-4' : 'space-y-6', children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: `${isGalaxyS8PlusLayout ? 'text-lg' : 'text-2xl'} font-bold text-white`, children: "Local Playlists" }), _jsxs("button", { onClick: () => setShowCreatePlaylist(true), className: `group flex items-center rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/20 to-accent/10 font-bold text-accent transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/20 ${isGalaxyS8PlusLayout ? 'gap-1.5 px-3 py-2 text-[12px]' : 'gap-2.5 px-5 py-3 text-sm'}`, children: [_jsx(RiAddLine, { size: isGalaxyS8PlusLayout ? 14 : 18, className: "group-hover:rotate-90 transition-transform duration-300" }), isGalaxyS8PlusLayout ? 'New' : 'New Playlist'] })] }), localPlaylists.length === 0 ? (_jsxs("div", { className: `flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 text-center ${isGalaxyS8PlusLayout ? 'px-4 py-10' : 'py-32'}`, children: [_jsx("div", { className: `mb-5 flex items-center justify-center rounded-full border border-accent/20 bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'h-16 w-16' : 'h-24 w-24'}`, children: _jsx(RiPlayListLine, { className: `${isGalaxyS8PlusLayout ? 'text-2xl' : 'text-4xl'} text-accent` }) }), _jsx("h3", { className: `${isGalaxyS8PlusLayout ? 'text-lg' : 'text-xl'} mb-2 font-bold text-white`, children: "No playlists yet" }), _jsx("p", { className: `${isGalaxyS8PlusLayout ? 'mb-4 text-xs' : 'mb-6 text-sm'} text-white/50`, children: "Create one to organize your music." }), _jsxs("button", { onClick: () => setShowCreatePlaylist(true), className: `flex items-center gap-2 rounded-2xl bg-theme-gradient font-bold text-white shadow-glow-sm transition-all hover:scale-105 ${isGalaxyS8PlusLayout ? 'px-4 py-2 text-[12px]' : 'px-6 py-3 text-sm'}`, children: [_jsx(RiAddLine, { size: isGalaxyS8PlusLayout ? 14 : 18 }), " ", isGalaxyS8PlusLayout ? 'Create' : 'Create Playlist'] })] })) : (_jsxs("div", { className: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${isGalaxyS8PlusLayout ? 'gap-3' : 'gap-5'}`, children: [localPlaylists.map(pl => {
                                const trackCount = pl.trackIds.length;
                                return (_jsxs("button", { onClick: () => { setSelectedPlaylist(pl); }, className: `group relative flex flex-col items-start rounded-2xl border border-white/10 bg-glass-card text-left transition-all duration-300 hover:scale-105 hover:border-white/20 hover:bg-white/10 hover:shadow-xl ${isGalaxyS8PlusLayout ? 'p-3' : 'p-5'}`, children: [_jsx("div", { className: `aspect-square w-full rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105 ${isGalaxyS8PlusLayout ? 'mb-2.5' : 'mb-4'}`, style: { background: `linear-gradient(135deg, ${pl.coverGradient?.[0] || '#333'}, ${pl.coverGradient?.[1] || '#222'})` }, children: _jsx("div", { className: "flex h-full w-full items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity", children: _jsx(RiPlayListLine, { size: isGalaxyS8PlusLayout ? 30 : 48, className: "text-white" }) }) }), _jsxs("div", { className: "w-full", children: [_jsx("p", { className: `${isGalaxyS8PlusLayout ? 'mb-0.5 text-sm' : 'mb-1 text-base'} truncate font-bold text-white`, children: pl.title }), _jsxs("p", { className: `${isGalaxyS8PlusLayout ? 'text-[10px]' : 'text-xs'} text-white/50`, children: [trackCount, " ", trackCount === 1 ? 'track' : 'tracks'] })] }), _jsx("button", { onClick: e => { e.stopPropagation(); deletePlaylist(pl.id); }, className: "absolute top-4 right-4 hidden group-hover:flex h-8 w-8 items-center justify-center rounded-full bg-black/70 backdrop-blur-xl text-white/60 hover:text-red-400 hover:bg-red-400/20 transition-all duration-200", children: _jsx(RiDeleteBinLine, { size: 14 }) })] }, pl.id));
                            }), _jsxs("button", { onClick: () => setShowCreatePlaylist(true), className: `group aspect-square flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 transition-all duration-300 hover:scale-105 hover:border-accent/50 hover:bg-accent/5 ${isGalaxyS8PlusLayout ? 'p-3' : 'p-5'}`, children: [_jsx("div", { className: `flex items-center justify-center rounded-full bg-accent/10 transition-all duration-300 group-hover:bg-accent/20 group-hover:scale-110 ${isGalaxyS8PlusLayout ? 'mb-2 h-12 w-12' : 'mb-3 h-16 w-16'}`, children: _jsx(RiAddLine, { className: `${isGalaxyS8PlusLayout ? 'text-2xl' : 'text-3xl'} text-accent transition-transform group-hover:rotate-90` }) }), _jsx("span", { className: `${isGalaxyS8PlusLayout ? 'text-[11px]' : 'text-sm'} font-semibold text-white/60 transition-colors group-hover:text-accent`, children: "New Playlist" })] })] }))] })), isLoaded && tab === 'playlists' && selectedPlaylist && (_jsxs("div", { className: isGalaxyS8PlusLayout ? 'space-y-4' : 'space-y-6', children: [_jsxs("button", { onClick: () => setSelectedPlaylist(null), className: `group flex items-center gap-2 font-medium text-white/60 transition-colors hover:text-white ${isGalaxyS8PlusLayout ? 'text-xs' : 'text-sm'}`, children: [_jsx("span", { className: "group-hover:-translate-x-1 transition-transform", children: "\u2190" }), " All Playlists"] }), _jsxs("div", { className: `flex items-center rounded-3xl border border-white/10 bg-glass-card backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'gap-3 p-4' : 'gap-6 p-6'}`, children: [_jsx("div", { className: `${isGalaxyS8PlusLayout ? 'h-20 w-20' : 'h-32 w-32'} flex-shrink-0 rounded-2xl shadow-2xl`, style: { background: `linear-gradient(135deg, ${selectedPlaylist.coverGradient?.[0] || '#333'}, ${selectedPlaylist.coverGradient?.[1] || '#222'})` }, children: _jsx("div", { className: "flex h-full w-full items-center justify-center opacity-40", children: _jsx(RiPlayListLine, { size: isGalaxyS8PlusLayout ? 34 : 56, className: "text-white" }) }) }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: `font-bold uppercase tracking-widest text-accent ${isGalaxyS8PlusLayout ? 'mb-1 text-[10px]' : 'mb-2 text-xs'}`, children: "Local Playlist" }), _jsx("h2", { className: `${isGalaxyS8PlusLayout ? 'mb-1 text-2xl' : 'mb-2 text-4xl'} font-black text-white`, children: selectedPlaylist.title }), _jsxs("p", { className: `${isGalaxyS8PlusLayout ? 'text-sm' : 'text-base'} font-medium text-white/60`, children: [selectedPlaylist.trackIds.length, " ", selectedPlaylist.trackIds.length === 1 ? 'track' : 'tracks'] })] })] })] })), isLoaded && localTracks.length > 0 && (tab !== 'playlists' || selectedPlaylist) && (_jsxs("div", { className: isGalaxyS8PlusLayout ? 'mt-4' : 'mt-6', children: [viewMode === 'list' && tab !== 'mostPlayed' && tab !== 'recent' && !(tab === 'playlists' && selectedPlaylist) && (_jsxs("div", { className: `mb-1 flex items-center border-b border-white/5 font-bold uppercase tracking-widest text-white/30 ${isGalaxyS8PlusLayout ? 'gap-2 px-2.5 py-1.5 text-[10px]' : 'gap-3 px-3 py-2 text-xs'}`, children: [_jsx("div", { className: `${isGalaxyS8PlusLayout ? 'w-7' : 'w-10'} flex-shrink-0 ${isGalaxyS8PlusLayout ? 'text-center' : 'pl-1'}` }), _jsx("div", { className: `${isGalaxyS8PlusLayout ? 'w-9' : 'w-11'} flex-shrink-0` }), _jsxs("button", { onClick: () => toggleSort('title'), className: "flex flex-1 items-center gap-2 hover:text-white/50 transition-colors", children: ["Title ", sortKey === 'title' && (sortDir === 'asc' ? _jsx(RiSortAsc, { size: 12 }) : _jsx(RiSortDesc, { size: 12 }))] }), _jsxs("button", { onClick: () => toggleSort('album'), className: "hidden md:flex w-44 items-center gap-2 hover:text-white/50 transition-colors", children: ["Album ", sortKey === 'album' && (sortDir === 'asc' ? _jsx(RiSortAsc, { size: 12 }) : _jsx(RiSortDesc, { size: 12 }))] }), _jsxs("button", { onClick: () => toggleSort('plays'), className: "hidden lg:flex w-16 items-center gap-1.5 hover:text-white/50 transition-colors", children: [_jsx(RiFireLine, { size: 12 }), " ", sortKey === 'plays' && (sortDir === 'asc' ? _jsx(RiSortAsc, { size: 12 }) : _jsx(RiSortDesc, { size: 12 }))] }), _jsxs("button", { onClick: () => toggleSort('duration'), className: "flex w-12 items-center gap-1.5 justify-end hover:text-white/50 transition-colors", children: [_jsx(RiTimeLine, { size: 12 }), " ", sortKey === 'duration' && (sortDir === 'asc' ? _jsx(RiSortAsc, { size: 12 }) : _jsx(RiSortDesc, { size: 12 }))] }), _jsx("div", { className: "w-8 flex-shrink-0" })] })), viewMode === 'list' ? (_jsx("div", { className: isGalaxyS8PlusLayout ? 'space-y-0.5' : 'space-y-1', children: displayTracks.length === 0 ? (_jsxs("div", { className: "py-20 text-center", children: [_jsx(RiMusicLine, { className: "mx-auto mb-4 text-3xl text-white/20" }), _jsx("p", { className: "text-sm text-white/40", children: "No tracks found." })] })) : displayTracks.map((track) => (_jsx(TrackRow, { track: track, isActive: currentTrack?.id === track.id, isPlaying: isPlaying, playCounts: playCounts, onPlay: handlePlayRow, onDelete: handleDeleteRow, onAddToPlaylist: setAddToPlaylistTrack, onEdit: setEditTrack, onAddToQueue: handleAddToQueue, onPlayNext: handlePlayNext, compact: isGalaxyS8PlusLayout }, track.id))) })) : (_jsx("div", { className: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${isGalaxyS8PlusLayout ? 'gap-3' : 'gap-4'}`, children: displayTracks.map(track => {
                            return (_jsxs("button", { onClick: (e) => {
                                    const coverEl = e.currentTarget.querySelector('.grid-track-cover');
                                    handlePlayRow(track, coverEl);
                                }, className: `group relative flex flex-col rounded-2xl bg-glass-card backdrop-blur-xl p-4 text-left transition hover:bg-card-hover ${currentTrack?.id === track.id ? 'ring-2 ring-accent' : ''}`, children: [_jsxs("div", { className: "grid-track-cover relative mb-3 aspect-square w-full", children: [track.coverUrl ? (_jsx("img", { src: track.coverUrl, alt: track.title, className: "h-full w-full rounded-xl object-cover shadow-lg" })) : (_jsx("div", { className: "flex h-full w-full items-center justify-center rounded-xl shadow-lg", style: { background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }, children: _jsx(RiMusicLine, { size: 32, className: "text-white/40" }) })), _jsx("div", { className: "absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition group-hover:opacity-100", children: _jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-glow", children: _jsx(RiPlayFill, { size: 22, className: "text-white ml-0.5" }) }) })] }), _jsx("p", { className: `text-sm font-bold truncate ${currentTrack?.id === track.id ? 'text-accent' : 'text-white'}`, children: track.title }), _jsx("p", { className: "text-xs text-dimText truncate", children: track.artist })] }, track.id));
                        }) }))] })), _jsx("div", { className: isGalaxyS8PlusLayout ? 'h-3' : 'h-8' })] }));
}
