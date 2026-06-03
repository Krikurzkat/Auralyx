import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentCard from '../components/cards/ContentCard';
import { useLibraryStore } from '../stores/libraryStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { RiPlayListLine, RiAlbumLine, RiUserLine, RiGridLine, RiListUnordered, RiHeartFill, RiAddLine } from 'react-icons/ri';
export default function LibraryPage() {
    const [tab, setTab] = useState('playlists');
    const { likedTrackIds, sortBy, viewMode, setSortBy, setViewMode } = useLibraryStore();
    const { localTracks, localPlaylists, createPlaylist } = useLocalLibraryStore();
    const navigate = useNavigate();
    const libraryPlaylists = useMemo(() => {
        return localPlaylists.slice().sort((left, right) => left.title.localeCompare(right.title));
    }, [localPlaylists]);
    // Derive albums from local tracks
    const libraryAlbums = useMemo(() => {
        const albumMap = new Map();
        localTracks.forEach(t => {
            if (t.album && !albumMap.has(t.album)) {
                albumMap.set(t.album, {
                    id: t.albumId,
                    title: t.album,
                    artist: t.artist,
                    coverGradient: t.coverGradient || ['#333', '#222'],
                    coverUrl: t.coverUrl,
                });
            }
        });
        return Array.from(albumMap.values()).sort((a, b) => a.title.localeCompare(b.title));
    }, [localTracks]);
    // Derive artists from local tracks
    const libraryArtists = useMemo(() => {
        const artistMap = new Map();
        localTracks.forEach(t => {
            if (!artistMap.has(t.artist)) {
                artistMap.set(t.artist, {
                    id: t.artistId,
                    name: t.artist,
                    trackCount: 1,
                    avatarGradient: t.coverGradient || ['#333', '#222'],
                });
            }
            else {
                artistMap.get(t.artist).trackCount++;
            }
        });
        return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [localTracks]);
    const tabItems = [
        { key: 'playlists', label: 'Playlists', icon: RiPlayListLine, count: libraryPlaylists.length },
        { key: 'albums', label: 'Albums', icon: RiAlbumLine, count: libraryAlbums.length },
        { key: 'artists', label: 'Artists', icon: RiUserLine, count: libraryArtists.length },
    ];
    return (_jsxs("div", { className: "page-enter space-y-5 sm:space-y-8", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl sm:text-4xl font-black tracking-tight", children: "Your Library" }), _jsx("p", { className: "mt-1 sm:mt-2 text-xs sm:text-sm text-softText", children: "Manage your music collection" })] }), _jsxs("button", { onClick: () => {
                            const name = prompt('Enter playlist name:');
                            if (name)
                                createPlaylist(name);
                        }, className: "flex items-center gap-1.5 sm:gap-2 rounded-full bg-theme-gradient px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-glow-sm active:scale-95", children: [_jsx(RiAddLine, { size: 18 }), " Create playlist"] })] }), _jsxs("button", { onClick: () => navigate('/liked'), className: "group flex w-full items-center gap-3 sm:gap-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-gradient-from/20 via-accent/10 to-gradient-to/10 p-4 sm:p-6 text-left transition-all hover:from-accent/30 hover:via-accent/15 hover:to-gradient-to/15 hover:scale-[1.01] border border-accent/20 hover:border-accent/30 shadow-xl hover:shadow-2xl backdrop-blur-sm", children: [_jsxs("div", { className: "flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-xl sm:rounded-2xl bg-theme-gradient shadow-glow group-hover:scale-110 transition-transform", children: [_jsx(RiHeartFill, { size: 28, className: "sm:hidden" }), _jsx(RiHeartFill, { size: 36, className: "hidden sm:block" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-lg sm:text-2xl font-black", children: "Liked Songs" }), _jsxs("div", { className: "mt-0.5 sm:mt-1 text-sm sm:text-base text-white/80", children: [likedTrackIds.size, " songs"] })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "flex gap-2 overflow-x-auto scrollbar-hidden", children: tabItems.map(t => (_jsxs("button", { onClick: () => setTab(t.key), className: `group flex flex-shrink-0 items-center gap-1.5 sm:gap-2.5 rounded-full px-3.5 py-2 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold transition-all ${tab === t.key
                                ? 'bg-theme-gradient text-white shadow-glow-sm scale-105'
                                : 'bg-glass-card backdrop-blur-xl/80 text-softText hover:bg-glass-card backdrop-blur-xl hover:text-white border border-white/5 hover:border-white/10'}`, children: [_jsx(t.icon, { size: 18, className: tab === t.key ? '' : 'group-hover:scale-110 transition-transform' }), t.label, _jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-bold ${tab === t.key ? 'bg-white/20' : 'bg-white/10'}`, children: t.count })] }, t.key))) }), _jsxs("div", { className: "hidden items-center gap-2 md:flex", children: [_jsxs("select", { value: sortBy, onChange: e => setSortBy(e.target.value), className: "rounded-xl bg-glass-card backdrop-blur-xl/80 border border-white/10 px-4 py-2 text-sm text-softText hover:bg-glass-card backdrop-blur-xl transition-colors", children: [_jsx("option", { value: "recent", children: "Recently added" }), _jsx("option", { value: "alpha", children: "Alphabetical" })] }), _jsx("button", { onClick: () => setViewMode(viewMode === 'grid' ? 'list' : 'grid'), className: "rounded-xl bg-glass-card backdrop-blur-xl/80 border border-white/10 p-2.5 text-softText transition-all hover:bg-glass-card backdrop-blur-xl hover:text-white hover:scale-105", children: viewMode === 'grid' ? _jsx(RiListUnordered, { size: 20 }) : _jsx(RiGridLine, { size: 20 }) })] })] }), _jsxs("div", { className: viewMode === 'grid'
                    ? 'grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-2 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12'
                    : 'space-y-1', children: [tab === 'playlists' && libraryPlaylists.map(p => {
                        const coverGradient = p.coverGradient || ['#333', '#222'];
                        return viewMode === 'grid' ? (_jsx(ContentCard, { id: p.id, title: p.title, subtitle: `${p.trackIds.length} tracks`, gradient: p.coverGradient, coverUrl: p.coverUrl, type: "playlist", onClick: () => navigate('/local') }, p.id)) : (_jsxs("button", { onClick: () => navigate('/local'), className: "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5", children: [p.coverUrl ? (_jsx("img", { src: p.coverUrl, alt: p.title, className: "h-12 w-12 flex-shrink-0 rounded-lg object-cover" })) : (_jsx("div", { className: "h-12 w-12 flex-shrink-0 rounded-lg", style: { background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` } })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-sm font-medium", children: p.title }), _jsxs("div", { className: "text-xs text-softText", children: ["Playlist \u00B7 ", p.trackIds.length, " songs"] })] })] }, p.id));
                    }), tab === 'albums' && libraryAlbums.map(a => {
                        const coverGradient = a.coverGradient || ['#333', '#222'];
                        return viewMode === 'grid' ? (_jsx(ContentCard, { id: a.id, title: a.title, subtitle: a.artist, gradient: a.coverGradient, coverUrl: a.coverUrl, type: "album", onClick: () => navigate('/local') }, a.id)) : (_jsxs("button", { onClick: () => navigate('/local'), className: "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5", children: [a.coverUrl ? (_jsx("img", { src: a.coverUrl, alt: a.title, className: "h-12 w-12 flex-shrink-0 rounded-lg object-cover" })) : (_jsx("div", { className: "h-12 w-12 flex-shrink-0 rounded-lg", style: { background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` } })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-sm font-medium", children: a.title }), _jsxs("div", { className: "text-xs text-softText", children: ["Album \u00B7 ", a.artist] })] })] }, a.id));
                    }), tab === 'artists' && libraryArtists.map(a => {
                        const avatarGradient = a.avatarGradient || ['#333', '#222'];
                        return viewMode === 'grid' ? (_jsx(ContentCard, { id: a.id, title: a.name, subtitle: `${a.trackCount} tracks`, gradient: a.avatarGradient, type: "artist", round: true, onClick: () => navigate('/local') }, a.id)) : (_jsxs("button", { onClick: () => navigate('/local'), className: "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5", children: [_jsx("div", { className: "h-12 w-12 flex-shrink-0 rounded-full", style: { background: `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})` } }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-sm font-medium", children: a.name }), _jsxs("div", { className: "text-xs text-softText", children: ["Artist \u00B7 ", a.trackCount, " tracks"] })] })] }, a.id));
                    }), ((tab === 'playlists' && libraryPlaylists.length === 0) ||
                        (tab === 'albums' && libraryAlbums.length === 0) ||
                        (tab === 'artists' && libraryArtists.length === 0)) && (_jsxs("div", { className: "col-span-full py-20 rounded-3xl border-2 border-dashed border-white/10 bg-gradient-to-br from-white/5 to-transparent flex flex-col items-center justify-center text-center backdrop-blur-sm", children: [_jsxs("div", { className: "flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/15 mb-5", children: [tab === 'playlists' && _jsx(RiPlayListLine, { size: 40, className: "text-accent" }), tab === 'albums' && _jsx(RiAlbumLine, { size: 40, className: "text-accent" }), tab === 'artists' && _jsx(RiUserLine, { size: 40, className: "text-accent" })] }), _jsxs("p", { className: "text-lg font-bold text-white mb-2", children: ["No items in your ", tab, " library yet"] }), _jsx("p", { className: "text-sm text-dimText", children: "Add some music to get started!" })] }))] }), _jsx("div", { className: "h-8" })] }));
}
