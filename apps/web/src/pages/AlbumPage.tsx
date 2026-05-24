import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import TrackRow from '../components/cards/TrackRow';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { RiPlayFill, RiPauseFill, RiHeartLine, RiHeartFill, RiShuffleLine, RiMoreLine, RiTimeLine } from 'react-icons/ri';

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
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
    if (albumTracks.length === 0) return null;
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
    return (
      <div className="flex h-64 flex-col items-center justify-center text-softText gap-4">
        <div>Album not found locally</div>
        <button onClick={() => navigate('/local')} className="rounded-full bg-white/10 px-4 py-2 hover:bg-white/20 transition">Go to Local Library</button>
      </div>
    );
  }

  const totalDuration = albumTracks.reduce((acc, t) => acc + t.duration, 0);
  const isCurrentAlbum = albumTracks.some(t => currentTrack?.id === t.id);
  const isSaved = savedAlbumIds.has(album.id);
  const coverGradient = album.coverGradient;

  const handlePlayAll = () => {
    if (isCurrentAlbum && isPlaying) {
      togglePlay();
    } else if (albumTracks.length > 0) {
      playTrack(albumTracks[0], albumTracks);
    }
  };

  return (
    <div className="page-enter pb-8">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-[28px] p-6 md:p-8"
        style={{ background: `linear-gradient(135deg, ${coverGradient[0]}90, ${coverGradient[1]}60, #0D0D0D)` }}
      >
        <div className="absolute inset-0 backdrop-blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end">
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt={album.title}
              className="h-48 w-48 flex-shrink-0 rounded-2xl object-cover shadow-glow-lg md:h-56 md:w-56"
            />
          ) : (
            <div
              className="h-48 w-48 flex-shrink-0 rounded-2xl shadow-glow-lg md:h-56 md:w-56"
              style={{ background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` }}
            />
          )}

          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/60">Local Album</div>
            <h1 className="mt-1 text-3xl font-bold md:text-5xl">{album.title}</h1>
            <div className="mt-3 flex items-center gap-2 text-sm text-white/60">
              <span className="font-bold text-white">{album.artist}</span>
              <span>·</span>
              <span>{album.year}</span>
              <span>·</span>
              <span>{albumTracks.length} songs</span>
              <span>·</span>
              <span>{Math.floor(totalDuration / 60)} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={handlePlayAll}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-glow-sm transition hover:scale-105 hover:bg-accent-hover"
        >
          {isCurrentAlbum && isPlaying ? <RiPauseFill size={24} /> : <RiPlayFill size={24} className="ml-0.5" />}
        </button>
        <button className="rounded-full bg-card p-3 text-softText transition hover:bg-card-hover hover:text-white">
          <RiShuffleLine size={20} />
        </button>
        <button
          onClick={() => toggleSaveAlbum(album.id)}
          className={`rounded-full p-3 transition hover:scale-110 ${isSaved ? 'text-accent' : 'text-softText hover:text-white'}`}
        >
          {isSaved ? <RiHeartFill size={22} /> : <RiHeartLine size={22} />}
        </button>
        <button className="rounded-full bg-card p-3 text-softText transition hover:bg-card-hover hover:text-white">
          <RiMoreLine size={20} />
        </button>
      </div>

      {/* Tracks */}
      <div className="mb-2 flex items-center gap-3 border-b border-white/5 px-3 py-2 text-xs font-medium uppercase tracking-wider text-dimText">
        <div className="w-8 text-center">#</div>
        <div className="min-w-0 flex-1">Title</div>
        <div className="w-8" />
        <div className="w-12 text-right">
          <RiTimeLine size={14} className="inline" />
        </div>
        <div className="w-6" />
      </div>

      <div className="space-y-0.5">
        {albumTracks.map((track, i) => (
          <TrackRow key={track.id} track={track} index={i} context={albumTracks} />
        ))}
      </div>
    </div>
  );
}
