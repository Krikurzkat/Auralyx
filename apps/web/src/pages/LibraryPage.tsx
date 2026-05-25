import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentCard from '../components/cards/ContentCard';
import { useLibraryStore } from '../stores/libraryStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { RiPlayListLine, RiAlbumLine, RiUserLine, RiGridLine, RiListUnordered, RiHeartFill, RiAddLine } from 'react-icons/ri';

type LibraryTab = 'playlists' | 'albums' | 'artists';

export default function LibraryPage() {
  const [tab, setTab] = useState<LibraryTab>('playlists');
  const { likedTrackIds, sortBy, viewMode, setSortBy, setViewMode } = useLibraryStore();
  const { localTracks, localPlaylists, createPlaylist } = useLocalLibraryStore();
  const navigate = useNavigate();

  const libraryPlaylists = useMemo(() => {
    return localPlaylists.slice().sort((left, right) => left.title.localeCompare(right.title));
  }, [localPlaylists]);

  // Derive albums from local tracks
  const libraryAlbums = useMemo(() => {
    const albumMap = new Map<string, { id: string; title: string; artist: string; coverGradient: [string, string]; coverUrl?: string }>();
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
    const artistMap = new Map<string, { id: string; name: string; trackCount: number; avatarGradient: [string, string] }>();
    localTracks.forEach(t => {
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
    });
    return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [localTracks]);

  const tabItems = [
    { key: 'playlists' as const, label: 'Playlists', icon: RiPlayListLine, count: libraryPlaylists.length },
    { key: 'albums' as const, label: 'Albums', icon: RiAlbumLine, count: libraryAlbums.length },
    { key: 'artists' as const, label: 'Artists', icon: RiUserLine, count: libraryArtists.length },
  ];

  return (
    <div className="page-enter space-y-8">
      {/* Header - Enhanced */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Your Library</h1>
          <p className="mt-2 text-sm text-softText">Manage your music collection</p>
        </div>
        <button
          onClick={() => {
            const name = prompt('Enter playlist name:');
            if (name) createPlaylist(name);
          }}
          className="flex items-center gap-2 rounded-full bg-theme-gradient px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-glow-sm active:scale-95"
        >
          <RiAddLine size={18} /> Create playlist
        </button>
      </div>

      {/* Liked songs banner - Enhanced */}
      <button
        onClick={() => navigate('/liked')}
        className="group flex w-full items-center gap-5 rounded-3xl bg-gradient-to-br from-gradient-from/20 via-accent/10 to-gradient-to/10 p-6 text-left transition-all hover:from-accent/30 hover:via-accent/15 hover:to-gradient-to/15 hover:scale-[1.01] border border-accent/20 hover:border-accent/30 shadow-xl hover:shadow-2xl backdrop-blur-sm"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-theme-gradient shadow-glow group-hover:scale-110 transition-transform">
          <RiHeartFill size={36} />
        </div>
        <div>
          <div className="text-2xl font-black">Liked Songs</div>
          <div className="mt-1 text-base text-white/80">{likedTrackIds.size} songs</div>
        </div>
      </button>

      {/* Tabs - Enhanced */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto scrollbar-hidden">
          {tabItems.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`group flex flex-shrink-0 items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold transition-all ${
                tab === t.key 
                  ? 'bg-theme-gradient text-white shadow-glow-sm scale-105' 
                  : 'bg-glass-card backdrop-blur-xl/80 text-softText hover:bg-glass-card backdrop-blur-xl hover:text-white border border-white/5 hover:border-white/10'
              }`}
            >
              <t.icon size={18} className={tab === t.key ? '' : 'group-hover:scale-110 transition-transform'} />
              {t.label}
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tab === t.key ? 'bg-white/20' : 'bg-white/10'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-xl bg-glass-card backdrop-blur-xl/80 border border-white/10 px-4 py-2 text-sm text-softText hover:bg-glass-card backdrop-blur-xl transition-colors"
          >
            <option value="recent">Recently added</option>
            <option value="alpha">Alphabetical</option>
          </select>
          <button 
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} 
            className="rounded-xl bg-glass-card backdrop-blur-xl/80 border border-white/10 p-2.5 text-softText transition-all hover:bg-glass-card backdrop-blur-xl hover:text-white hover:scale-105"
          >
            {viewMode === 'grid' ? <RiListUnordered size={20} /> : <RiGridLine size={20} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={viewMode === 'grid'
        ? 'grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12'
        : 'space-y-1'
      }>
        {tab === 'playlists' && libraryPlaylists.map(p => {
          const coverGradient = p.coverGradient || ['#333', '#222'];
          return viewMode === 'grid' ? (
            <ContentCard key={p.id} id={p.id} title={p.title} subtitle={`${p.trackIds.length} tracks`} gradient={p.coverGradient} coverUrl={p.coverUrl} type="playlist" onClick={() => navigate('/local')} />
          ) : (
            <button key={p.id} onClick={() => navigate('/local')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5">
              {p.coverUrl ? (
                <img src={p.coverUrl} alt={p.title} className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 flex-shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` }} />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.title}</div>
                <div className="text-xs text-softText">Playlist · {p.trackIds.length} songs</div>
              </div>
            </button>
          );
        })}

        {tab === 'albums' && libraryAlbums.map(a => {
          const coverGradient = a.coverGradient || ['#333', '#222'];
          return viewMode === 'grid' ? (
            <ContentCard key={a.id} id={a.id} title={a.title} subtitle={a.artist} gradient={a.coverGradient} coverUrl={a.coverUrl} type="album" onClick={() => navigate('/local')} />
          ) : (
            <button key={a.id} onClick={() => navigate('/local')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5">
              {a.coverUrl ? (
                <img src={a.coverUrl} alt={a.title} className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 flex-shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` }} />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.title}</div>
                <div className="text-xs text-softText">Album · {a.artist}</div>
              </div>
            </button>
          );
        })}

        {tab === 'artists' && libraryArtists.map(a => {
          const avatarGradient = a.avatarGradient || ['#333', '#222'];
          return viewMode === 'grid' ? (
            <ContentCard key={a.id} id={a.id} title={a.name} subtitle={`${a.trackCount} tracks`} gradient={a.avatarGradient} type="artist" round onClick={() => navigate('/local')} />
          ) : (
            <button key={a.id} onClick={() => navigate('/local')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5">
              <div className="h-12 w-12 flex-shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})` }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="text-xs text-softText">Artist · {a.trackCount} tracks</div>
              </div>
            </button>
          );
        })}

        {((tab === 'playlists' && libraryPlaylists.length === 0) ||
          (tab === 'albums' && libraryAlbums.length === 0) ||
          (tab === 'artists' && libraryArtists.length === 0)) && (
          <div className="col-span-full py-20 rounded-3xl border-2 border-dashed border-white/10 bg-gradient-to-br from-white/5 to-transparent flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/15 mb-5">
              {tab === 'playlists' && <RiPlayListLine size={40} className="text-accent" />}
              {tab === 'albums' && <RiAlbumLine size={40} className="text-accent" />}
              {tab === 'artists' && <RiUserLine size={40} className="text-accent" />}
            </div>
            <p className="text-lg font-bold text-white mb-2">No items in your {tab} library yet</p>
            <p className="text-sm text-dimText">Add some music to get started!</p>
          </div>
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}
