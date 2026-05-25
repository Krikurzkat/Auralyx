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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { followedArtistIds, toggleFollowArtist } = useLibraryStore();
  const { localTracks } = useLocalLibraryStore();

  const artistName = decodeURIComponent(id || '');

  const artistTracks = useMemo(() => {
    return localTracks.filter(t => (t.artistId === id || t.artist === artistName)).sort((a, b) => b.plays - a.plays);
  }, [localTracks, id, artistName]);

  const artist = useMemo(() => {
    if (artistTracks.length === 0) return null;
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
    const albumMap = new Map<string, any>();
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
    return (
      <div className="flex h-64 flex-col items-center justify-center text-softText gap-4">
        <div>Artist not found locally</div>
        <button onClick={() => navigate('/local')} className="rounded-full bg-white/10 px-4 py-2 hover:bg-white/20 transition">Go to Local Library</button>
      </div>
    );
  }

  const isCurrentArtist = artistTracks.some(t => currentTrack?.id === t.id);
  const isFollowed = followedArtistIds.has(artist.id);

  const handlePlayAll = () => {
    if (isCurrentArtist && isPlaying) {
      togglePlay();
    } else if (artistTracks.length > 0) {
      playTrack(artistTracks[0], artistTracks);
    }
  };

  return (
    <div className="page-enter pb-8">
      {/* Header */}
      <div className="relative mb-8 h-[340px] overflow-hidden rounded-[28px] md:h-[400px]">
        {artist.avatarUrl ? (
          <img
            src={artist.avatarUrl}
            alt={artist.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${artist.avatarGradient[0]}, ${artist.avatarGradient[1]})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-6 md:p-8">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">✓</span>
            Local Artist
          </div>
          <h1 className="text-5xl font-black md:text-7xl">{artist.name}</h1>
          <div className="mt-4 text-sm text-white/70">
            {formatListeners(artist.monthlyListeners)} local plays
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-8 flex items-center gap-4 px-4 md:px-0">
        <button
          onClick={handlePlayAll}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-glow transition hover:scale-105 hover:bg-accent-hover"
        >
          {isCurrentArtist && isPlaying ? <RiPauseFill size={28} /> : <RiPlayFill size={28} className="ml-1" />}
        </button>
        <button className="rounded-full bg-glass-card backdrop-blur-xl p-3.5 text-softText transition hover:bg-card-hover hover:text-white">
          <RiShuffleLine size={22} />
        </button>
        <button
          onClick={() => toggleFollowArtist(artist.id)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            isFollowed
              ? 'border-white text-white hover:border-white/70 hover:text-white/70'
              : 'border-white/30 text-white hover:border-white'
          }`}
        >
          {isFollowed ? <RiUserFollowFill size={18} /> : <RiUserFollowLine size={18} />}
          {isFollowed ? 'Following' : 'Follow'}
        </button>
        <button className="rounded-full p-2 text-softText transition hover:text-white">
          <RiMoreLine size={24} />
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Popular Tracks */}
        <section>
          <h2 className="mb-4 text-2xl font-bold px-4 md:px-0">Popular Tracks</h2>
          <div className="space-y-0.5">
            {artistTracks.slice(0, 10).map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} context={artistTracks} />
            ))}
          </div>
        </section>

        {/* Artist Pick / Albums */}
        <div className="space-y-8 px-4 md:px-0">
          <section>
            <h2 className="mb-4 text-xl font-bold">Albums</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {artistAlbums.map(album => (
                <ContentCard
                  key={album.id}
                  id={album.id}
                  title={album.title}
                  subtitle={album.year.toString()}
                  gradient={album.coverGradient}
                  coverUrl={album.coverUrl}
                  type="album"
                />
              ))}
              {artistAlbums.length === 0 && (
                <div className="text-sm text-dimText">No local albums found.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
