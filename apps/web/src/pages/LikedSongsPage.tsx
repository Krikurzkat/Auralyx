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
    } else if (likedTracks.length > 0) {
      playTrack(likedTracks[0], likedTracks);
    }
  };

  return (
    <div className="page-enter pb-8">
      {/* Header */}
      <div className="relative mb-6 overflow-hidden rounded-[28px] bg-theme-gradient-subtle p-6 md:p-8">
        <div className="absolute inset-0 backdrop-blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end">
          <div className="flex h-48 w-48 flex-shrink-0 items-center justify-center rounded-2xl bg-theme-gradient shadow-glow-lg md:h-56 md:w-56">
            <RiHeartFill size={80} className="text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Playlist
            </div>
            <h1 className="mt-1 text-4xl font-bold md:text-6xl">Liked Songs</h1>
            <div className="mt-3 flex items-center gap-1 text-sm text-white/60">
              <span className="font-bold text-white">You</span>
              <span>·</span>
              <span>{likedTracks.length} songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {likedTracks.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={handlePlayAll}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-glow transition hover:scale-105 hover:bg-accent-hover"
          >
            {isCurrentPlaylist && isPlaying ? <RiPauseFill size={28} /> : <RiPlayFill size={28} className="ml-1" />}
          </button>
        </div>
      )}

      {/* Tracks */}
      {likedTracks.length > 0 ? (
        <>
          <div className="mb-2 flex items-center gap-3 border-b border-white/5 px-3 py-2 text-xs font-medium uppercase tracking-wider text-dimText">
            <div className="w-8 text-center">#</div>
            <div className="min-w-0 flex-1">Title</div>
            <div className="hidden min-w-[140px] md:block">Album</div>
            <div className="w-8" />
            <div className="w-12 text-right">
              <RiTimeLine size={14} className="inline" />
            </div>
            <div className="w-6" />
          </div>
          <div className="space-y-0.5">
            {likedTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} context={likedTracks} showAlbum />
            ))}
          </div>
        </>
      ) : (
        <div className="py-16 text-center">
          <RiHeartFill size={48} className="mx-auto mb-4 text-dimText" />
          <h3 className="text-xl font-bold text-white">Songs you like will appear here</h3>
          <p className="mt-2 text-sm text-softText">Save songs by tapping the heart icon.</p>
        </div>
      )}
    </div>
  );
}
