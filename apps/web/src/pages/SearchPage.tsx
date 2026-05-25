import { useState, useMemo } from 'react';
import ContentCard from '../components/cards/ContentCard';
import TrackRow from '../components/cards/TrackRow';
import { useUIStore } from '../stores/uiStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { RiSearchLine } from 'react-icons/ri';

type SearchTab = 'all' | 'songs' | 'artists' | 'albums' | 'playlists';

export default function SearchPage() {
  const { searchQuery, setSearchQuery } = useUIStore();
  const { localPlaylists, searchTracks, getMostPlayed } = useLocalLibraryStore();
  const [activeTab, setActiveTab] = useState<SearchTab>('all');

  const q = searchQuery.toLowerCase();
  const hasQuery = q.length > 0;

  // Browse data (when no query)
  const browseTracks = useMemo(() => getMostPlayed(10), [getMostPlayed]);
  const browsePlaylists = useMemo(() => localPlaylists.slice(0, 10), [localPlaylists]);

  const trending = useMemo(() => browseTracks.slice(0, 6).map(t => t.title), [browseTracks]);

  // Derived Search results
  const results = useMemo(() => {
    if (!hasQuery) return null;

    const matchedTracks = searchTracks(searchQuery);

    // Derive artists
    const artistMap = new Map<string, { id: string; name: string; trackCount: number; avatarGradient: [string, string] }>();
    // Derive albums
    const albumMap = new Map<string, { id: string; title: string; artist: string; coverGradient: [string, string]; coverUrl?: string }>();

    matchedTracks.forEach(t => {
      if (!artistMap.has(t.artist)) {
        artistMap.set(t.artist, {
          id: t.artistId,
          name: t.artist,
          trackCount: 1,
          avatarGradient: t.coverGradient || ['#333', '#222'],
        });
      } else {
        artistMap.get(t.artist)!.trackCount++;
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
    if (!results) return [];
    return [
      { key: 'all' as SearchTab, label: 'All', count: 0 },
      { key: 'songs' as SearchTab, label: 'Songs', count: results.tracks.length },
      { key: 'artists' as SearchTab, label: 'Artists', count: results.artists.length },
      { key: 'albums' as SearchTab, label: 'Albums', count: results.albums.length },
      { key: 'playlists' as SearchTab, label: 'Playlists', count: results.playlists.length },
    ];
  }, [results]);

  return (
    <div className="page-enter space-y-8 pb-8">
      {/* No search yet — show browse */}
      {!hasQuery && (
        <>
          {/* Most listened songs - Enhanced */}
          <section>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                <RiSearchLine size={20} className="text-accent" />
              </div>
              <h2 className="text-2xl font-bold">Most listened songs</h2>
            </div>
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-card/80 to-surface/60 p-2 backdrop-blur-sm">
              <div className="space-y-1">
                {browseTracks.slice(0, 5).map((track, index) => (
                  <TrackRow key={track.id} track={track} index={index} context={browseTracks} />
                ))}
                {browseTracks.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4">
                      <RiSearchLine size={32} className="text-dimText" />
                    </div>
                    <p className="text-sm text-dimText">Import some music to see them here.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-5 text-2xl font-bold">Your folders</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {browsePlaylists.map((playlist) => (
                <ContentCard
                  key={playlist.id}
                  id={playlist.id}
                  title={playlist.title}
                  subtitle={`${playlist.trackIds.length} tracks`}
                  gradient={playlist.coverGradient}
                  coverUrl={playlist.coverUrl}
                  type="playlist"
                />
              ))}
              {browsePlaylists.length === 0 && (
                <div className="col-span-full py-16 rounded-3xl border-2 border-dashed border-white/10 bg-gradient-to-br from-white/5 to-transparent flex flex-col items-center justify-center text-center backdrop-blur-sm">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 mb-4">
                    <RiSearchLine size={32} className="text-accent" />
                  </div>
                  <p className="text-base font-bold text-white mb-2">No folders available yet.</p>
                  <p className="text-sm text-dimText">Create playlists to organize your music.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Search results - Enhanced */}
      {hasQuery && results && (
        <>
          {/* Tabs - Enhanced */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hidden pb-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-theme-gradient text-white shadow-glow-sm scale-105'
                    : 'bg-glass-card backdrop-blur-xl/80 text-softText hover:bg-glass-card backdrop-blur-xl hover:text-white border border-white/5 hover:border-white/10'
                }`}
              >
                {tab.label}
                {tab.count > 0 && <span className="ml-2 text-xs opacity-70">({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* Top result + songs - Enhanced */}
          {(activeTab === 'all' || activeTab === 'songs') && results.tracks.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
              {/* Top result - Enhanced */}
              {activeTab === 'all' && results.artists.length > 0 && (
                <div className="group rounded-3xl bg-gradient-to-br from-card via-surface to-card p-8 transition-all hover:scale-[1.02] border border-white/10 hover:border-white/20 shadow-xl hover:shadow-2xl backdrop-blur-sm">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-6">Top result</div>
                  <div
                    className="mx-auto h-32 w-32 rounded-full shadow-2xl mb-6 group-hover:shadow-glow transition-shadow"
                    style={{ background: `linear-gradient(135deg, ${results.artists[0].avatarGradient?.[0] || '#333'}, ${results.artists[0].avatarGradient?.[1] || '#222'})` }}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-full text-5xl font-black text-white/40">
                      {results.artists[0].name[0]}
                    </div>
                  </div>
                  <div className="text-3xl font-black mb-2 group-hover:text-accent transition-colors">{results.artists[0].name}</div>
                  <div className="text-sm text-softText">
                    Artist · {results.artists[0].trackCount} tracks
                  </div>
                </div>
              )}

              {/* Songs list - Enhanced */}
              <div>
                <h3 className="mb-4 text-xl font-bold">Songs</h3>
                <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-card/80 to-surface/60 p-2 backdrop-blur-sm">
                  <div className="space-y-1">
                    {results.tracks.slice(0, activeTab === 'songs' ? 50 : 5).map((track, i) => (
                      <TrackRow key={track.id} track={track} index={i} context={results.tracks} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Artists - Enhanced */}
          {(activeTab === 'all' || activeTab === 'artists') && results.artists.length > 0 && (
            <section>
              <h3 className="mb-5 text-xl font-bold">Artists</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {results.artists.slice(0, activeTab === 'artists' ? 20 : 5).map(a => (
                  <ContentCard key={a.id} id={a.id} title={a.name} subtitle={`${a.trackCount} tracks`} gradient={a.avatarGradient} type="artist" round />
                ))}
              </div>
            </section>
          )}

          {/* Albums - Enhanced */}
          {(activeTab === 'all' || activeTab === 'albums') && results.albums.length > 0 && (
            <section>
              <h3 className="mb-5 text-xl font-bold">Albums</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {results.albums.slice(0, activeTab === 'albums' ? 20 : 5).map(a => (
                  <ContentCard key={a.id} id={a.id} title={a.title} subtitle={`${a.artist}`} gradient={a.coverGradient} coverUrl={a.coverUrl} type="album" />
                ))}
              </div>
            </section>
          )}

          {/* Playlists - Enhanced */}
          {(activeTab === 'all' || activeTab === 'playlists') && results.playlists.length > 0 && (
            <section>
              <h3 className="mb-5 text-xl font-bold">Playlists</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {results.playlists.slice(0, activeTab === 'playlists' ? 20 : 5).map(p => (
                  <ContentCard key={p.id} id={p.id} title={p.title} subtitle={`${p.trackIds.length} tracks`} gradient={p.coverGradient} coverUrl={p.coverUrl} type="playlist" />
                ))}
              </div>
            </section>
          )}

          {/* No results - Enhanced */}
          {results.tracks.length === 0 && results.artists.length === 0 && results.albums.length === 0 && results.playlists.length === 0 && (
            <div className="py-20 text-center">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/20 to-gradient-to/20 mb-6 shadow-xl">
                <RiSearchLine size={48} className="text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-3">No results found for "{searchQuery}"</h3>
              <p className="text-softText text-base">Try different keywords or check your spelling</p>
            </div>
          )}
        </>
      )}

      <div className="h-8" />
    </div>
  );
}
