import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import TrackRow from '../components/cards/TrackRow';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { RiPlayFill, RiPauseFill, RiHeartLine, RiHeartFill, RiShuffleLine, RiMoreLine, RiTimeLine, RiDownloadLine, RiShareLine } from 'react-icons/ri';

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { savedPlaylistIds, toggleSavePlaylist } = useLibraryStore();
  const { localPlaylists, localTracks } = useLocalLibraryStore();

  const playlist = useMemo(() => localPlaylists.find(p => p.id === id), [localPlaylists, id]);

  const playlistTracks = useMemo(() => {
    if (!playlist) return [];
    return playlist.trackIds
      .map(tId => localTracks.find(t => t.id === tId))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
  }, [playlist, localTracks]);

  const recommendedTracks = useMemo(() => {
    if (!playlist) return [];
    return localTracks
      .filter(t => !playlist.trackIds.includes(t.id))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 5);
  }, [playlist, localTracks]);

  if (!playlist) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-softText gap-4">
        <div>Playlist not found</div>
        <button onClick={() => navigate('/local')} className="rounded-full bg-white/10 px-4 py-2 hover:bg-white/20 transition">Go to Local Library</button>
      </div>
    );
  }

  const totalDuration = playlistTracks.reduce((acc, t) => acc + t.duration, 0);
  const isCurrentPlaylist = playlistTracks.some(t => currentTrack?.id === t.id);
  const isSaved = savedPlaylistIds.has(playlist.id);

  const coverGradient = playlist.coverGradient || ['#333', '#222'];

  const handlePlayAll = () => {
    if (isCurrentPlaylist && isPlaying) {
      togglePlay();
    } else if (playlistTracks.length > 0) {
      playTrack(playlistTracks[0], playlistTracks);
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
          {/* Cover */}
          {playlist.coverUrl ? (
            <img
              src={playlist.coverUrl}
              alt={playlist.title}
              className="h-48 w-48 flex-shrink-0 rounded-2xl object-cover shadow-glow-lg md:h-56 md:w-56"
            />
          ) : (
            <div
              className="h-48 w-48 flex-shrink-0 rounded-2xl shadow-glow-lg md:h-56 md:w-56"
              style={{ background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` }}
            >
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white/20">♪</div>
            </div>
          )}

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Playlist</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">{playlist.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-1 text-sm text-white/60">
              <span className="font-medium text-white">{playlist.owner || playlist.ownerName || 'You'}</span>
              <span>·</span>
              <span>{playlistTracks.length} songs</span>
              <span>·</span>
              <span>{Math.floor(totalDuration / 60)} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={handlePlayAll}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-glow-sm transition hover:scale-105 hover:bg-accent-hover"
        >
          {isCurrentPlaylist && isPlaying ? <RiPauseFill size={24} /> : <RiPlayFill size={24} className="ml-0.5" />}
        </button>
        <button className="rounded-full bg-glass-card backdrop-blur-xl p-3 text-softText transition hover:bg-card-hover hover:text-white">
          <RiShuffleLine size={20} />
        </button>
        <button
          onClick={() => toggleSavePlaylist(playlist.id)}
          className={`rounded-full p-3 transition hover:scale-110 ${isSaved ? 'text-accent' : 'text-softText hover:text-white'}`}
        >
          {isSaved ? <RiHeartFill size={22} /> : <RiHeartLine size={22} />}
        </button>
        <button className="rounded-full bg-glass-card backdrop-blur-xl p-3 text-softText transition hover:bg-card-hover hover:text-white">
          <RiDownloadLine size={20} />
        </button>
        <button className="rounded-full bg-glass-card backdrop-blur-xl p-3 text-softText transition hover:bg-card-hover hover:text-white">
          <RiShareLine size={20} />
        </button>
        <button className="rounded-full bg-glass-card backdrop-blur-xl p-3 text-softText transition hover:bg-card-hover hover:text-white">
          <RiMoreLine size={20} />
        </button>
      </div>

      {/* Track list header */}
      <div className="mb-2 flex items-center gap-3 border-b border-white/5 px-3 py-2 text-xs font-medium uppercase tracking-wider text-dimText">
        <div className="w-8 text-center"></div>
        <div className="min-w-0 flex-1">Title</div>
        <div className="hidden min-w-[140px] md:block">Album</div>
        <div className="hidden min-w-[100px] lg:block">Date added</div>
        <div className="w-8" />
        <div className="w-12 text-right">
          <RiTimeLine size={14} className="inline" />
        </div>
        <div className="w-6" />
      </div>

      {/* Tracks */}
      <div className="space-y-0.5">
        {playlistTracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            showAlbum
            showDateAdded
            context={playlistTracks}
          />
        ))}
        {playlistTracks.length === 0 && (
          <div className="py-12 text-center text-sm text-dimText">
            This playlist has no songs yet.
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendedTracks.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-lg font-bold">Recommended Tracks</h3>
          <p className="mb-3 text-sm text-softText">Based on your local library</p>
          <div className="space-y-0.5">
            {recommendedTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} context={recommendedTracks} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
