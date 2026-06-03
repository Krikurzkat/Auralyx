import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import ContentCard from '../components/cards/ContentCard';
import TrackRow from '../components/cards/TrackRow';
import { useUIStore } from '../stores/uiStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { RiSearchLine } from 'react-icons/ri';
export default function SearchPage() {
    const { searchQuery } = useUIStore();
    const { localPlaylists, searchTracks, getMostPlayed } = useLocalLibraryStore();
    const [activeTab, setActiveTab] = useState('all');
    const q = searchQuery.toLowerCase();
    const hasQuery = q.length > 0;
    // Browse data (when no query)
    const browseTracks = useMemo(() => getMostPlayed(10), [getMostPlayed]);
    const browsePlaylists = useMemo(() => localPlaylists.slice(0, 10), [localPlaylists]);
    // Derived Search results
    const results = useMemo(() => {
        if (!hasQuery)
            return null;
        const matchedTracks = searchTracks(searchQuery);
        // Derive artists
        const artistMap = new Map();
        // Derive albums
        const albumMap = new Map();
        matchedTracks.forEach(t => {
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
        const matchedPlaylists = localPlaylists.filter(p => p.title.toLowerCase().includes(q));
        return {
            tracks: matchedTracks,
            artists: Array.from(artistMap.values()),
            albums: Array.from(albumMap.values()),
            playlists: matchedPlaylists,
        };
    }, [hasQuery, searchQuery, searchTracks, localPlaylists, q]);
    const tabs = useMemo(() => {
        if (!results)
            return [];
        return [
            { key: 'all', label: 'All', count: 0 },
            { key: 'songs', label: 'Songs', count: results.tracks.length },
            { key: 'artists', label: 'Artists', count: results.artists.length },
            { key: 'albums', label: 'Albums', count: results.albums.length },
            { key: 'playlists', label: 'Playlists', count: results.playlists.length },
        ];
    }, [results]);
    return (_jsxs("div", { className: "page-enter space-y-5 sm:space-y-8 pb-8", children: [!hasQuery && (_jsxs(_Fragment, { children: [_jsxs("section", { children: [_jsxs("div", { className: "mb-3 sm:mb-5 flex items-center gap-2 sm:gap-3", children: [_jsx("div", { className: "flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-accent/15", children: _jsx(RiSearchLine, { size: 18, className: "text-accent" }) }), _jsx("h2", { className: "text-lg sm:text-2xl font-bold", children: "Most listened songs" })] }), _jsx("div", { className: "rounded-2xl border border-white/5 bg-gradient-to-br from-card/80 to-surface/60 p-2 backdrop-blur-sm", children: _jsxs("div", { className: "space-y-1", children: [browseTracks.slice(0, 5).map((track, index) => (_jsx(TrackRow, { track: track, index: index, context: browseTracks }, track.id))), browseTracks.length === 0 && (_jsxs("div", { className: "py-12 text-center", children: [_jsx("div", { className: "inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4", children: _jsx(RiSearchLine, { size: 32, className: "text-dimText" }) }), _jsx("p", { className: "text-sm text-dimText", children: "Import some music to see them here." })] }))] }) })] }), _jsxs("section", { children: [_jsx("h2", { className: "mb-3 sm:mb-5 text-lg sm:text-2xl font-bold", children: "Your folders" }), _jsxs("div", { className: "grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5", children: [browsePlaylists.map((playlist) => (_jsx(ContentCard, { id: playlist.id, title: playlist.title, subtitle: `${playlist.trackIds.length} tracks`, gradient: playlist.coverGradient, coverUrl: playlist.coverUrl, type: "playlist" }, playlist.id))), browsePlaylists.length === 0 && (_jsxs("div", { className: "col-span-full py-16 rounded-3xl border-2 border-dashed border-white/10 bg-gradient-to-br from-white/5 to-transparent flex flex-col items-center justify-center text-center backdrop-blur-sm", children: [_jsx("div", { className: "flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 mb-4", children: _jsx(RiSearchLine, { size: 32, className: "text-accent" }) }), _jsx("p", { className: "text-base font-bold text-white mb-2", children: "No folders available yet." }), _jsx("p", { className: "text-sm text-dimText", children: "Create playlists to organize your music." })] }))] })] })] })), hasQuery && results && (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex gap-2 overflow-x-auto scrollbar-hidden pb-2", children: tabs.map(tab => (_jsxs("button", { onClick: () => setActiveTab(tab.key), className: `flex-shrink-0 rounded-full px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all ${activeTab === tab.key
                                ? 'bg-theme-gradient text-white shadow-glow-sm scale-105'
                                : 'bg-glass-card backdrop-blur-xl/80 text-softText hover:bg-glass-card backdrop-blur-xl hover:text-white border border-white/5 hover:border-white/10'}`, children: [tab.label, tab.count > 0 && _jsxs("span", { className: "ml-2 text-xs opacity-70", children: ["(", tab.count, ")"] })] }, tab.key))) }), (activeTab === 'all' || activeTab === 'songs') && results.tracks.length > 0 && (_jsxs("div", { className: "grid gap-6 lg:grid-cols-[400px_1fr]", children: [activeTab === 'all' && results.artists.length > 0 && (_jsxs("div", { className: "group rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card via-surface to-card p-5 sm:p-8 transition-all hover:scale-[1.02] border border-white/10 hover:border-white/20 shadow-xl hover:shadow-2xl backdrop-blur-sm", children: [_jsx("div", { className: "text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 sm:mb-6", children: "Top result" }), _jsx("div", { className: "mx-auto h-24 w-24 sm:h-32 sm:w-32 rounded-full shadow-2xl mb-4 sm:mb-6 group-hover:shadow-glow transition-shadow", style: { background: `linear-gradient(135deg, ${results.artists[0].avatarGradient?.[0] || '#333'}, ${results.artists[0].avatarGradient?.[1] || '#222'})` }, children: _jsx("div", { className: "flex h-full w-full items-center justify-center rounded-full text-3xl font-black text-white/40", children: results.artists[0].name[0] }) }), _jsx("div", { className: "text-xl sm:text-3xl font-black mb-2 group-hover:text-accent transition-colors", children: results.artists[0].name }), _jsxs("div", { className: "text-sm text-softText", children: ["Artist \u00B7 ", results.artists[0].trackCount, " tracks"] })] })), _jsxs("div", { children: [_jsx("h3", { className: "mb-3 sm:mb-4 text-base sm:text-xl font-bold", children: "Songs" }), _jsx("div", { className: "rounded-2xl border border-white/5 bg-gradient-to-br from-card/80 to-surface/60 p-2 backdrop-blur-sm", children: _jsx("div", { className: "space-y-1", children: results.tracks.slice(0, activeTab === 'songs' ? 50 : 5).map((track, i) => (_jsx(TrackRow, { track: track, index: i, context: results.tracks }, track.id))) }) })] })] })), (activeTab === 'all' || activeTab === 'artists') && results.artists.length > 0 && (_jsxs("section", { children: [_jsx("h3", { className: "mb-3 sm:mb-5 text-base sm:text-xl font-bold", children: "Artists" }), _jsx("div", { className: "grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5", children: results.artists.slice(0, activeTab === 'artists' ? 20 : 5).map(a => (_jsx(ContentCard, { id: a.id, title: a.name, subtitle: `${a.trackCount} tracks`, gradient: a.avatarGradient, type: "artist", round: true }, a.id))) })] })), (activeTab === 'all' || activeTab === 'albums') && results.albums.length > 0 && (_jsxs("section", { children: [_jsx("h3", { className: "mb-3 sm:mb-5 text-base sm:text-xl font-bold", children: "Albums" }), _jsx("div", { className: "grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5", children: results.albums.slice(0, activeTab === 'albums' ? 20 : 5).map(a => (_jsx(ContentCard, { id: a.id, title: a.title, subtitle: `${a.artist}`, gradient: a.coverGradient, coverUrl: a.coverUrl, type: "album" }, a.id))) })] })), (activeTab === 'all' || activeTab === 'playlists') && results.playlists.length > 0 && (_jsxs("section", { children: [_jsx("h3", { className: "mb-3 sm:mb-5 text-base sm:text-xl font-bold", children: "Playlists" }), _jsx("div", { className: "grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5", children: results.playlists.slice(0, activeTab === 'playlists' ? 20 : 5).map(p => (_jsx(ContentCard, { id: p.id, title: p.title, subtitle: `${p.trackIds.length} tracks`, gradient: p.coverGradient, coverUrl: p.coverUrl, type: "playlist" }, p.id))) })] })), results.tracks.length === 0 && results.artists.length === 0 && results.albums.length === 0 && results.playlists.length === 0 && (_jsxs("div", { className: "py-20 text-center", children: [_jsx("div", { className: "inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/20 to-gradient-to/20 mb-6 shadow-xl", children: _jsx(RiSearchLine, { size: 48, className: "text-accent" }) }), _jsxs("h3", { className: "text-lg sm:text-2xl font-bold mb-3", children: ["No results found for \"", searchQuery, "\""] }), _jsx("p", { className: "text-softText text-base", children: "Try different keywords or check your spelling" })] }))] })), _jsx("div", { className: "h-8" })] }));
}
