import { Track } from '../../types';
import { formatDuration } from '../../utils/formatters';
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { RiPlayFill, RiPauseFill, RiHeartLine, RiHeartFill, RiMoreLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

interface TrackRowProps {
  track: Track;
  index?: number;
  showAlbum?: boolean;
  showDateAdded?: boolean;
  context?: Track[];
  compact?: boolean;
}

export default function TrackRow({ track, index, showAlbum = true, showDateAdded = false, context, compact = false }: TrackRowProps) {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { likedTrackIds, toggleLike } = useLibraryStore();

  const isCurrent = currentTrack?.id === track.id;
  const isLiked = likedTrackIds.has(track.id);

  const handlePlay = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, context);
    }
  };

  return (
    <div
      onClick={handlePlay}
      className={`group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/5 ${isCurrent ? 'bg-white/5' : ''}`}
    >
      {/* Track number / play button */}
      <div className="w-8 text-center">
        <span className={`text-sm group-hover:hidden ${isCurrent ? 'text-accent font-medium' : 'text-dimText'}`}>
          {isCurrent && isPlaying ? (
            <span className="inline-flex items-end gap-0.5">
              <span className="eq-bar animate-equalizer-1" style={{ height: '4px' }} />
              <span className="eq-bar animate-equalizer-2" style={{ height: '8px' }} />
              <span className="eq-bar animate-equalizer-3" style={{ height: '6px' }} />
            </span>
          ) : index !== undefined ? index + 1 : '·'}
        </span>
        <button onClick={(e) => { e.stopPropagation(); handlePlay(); }} className="hidden group-hover:block">
          {isCurrent && isPlaying ? <RiPauseFill size={16} /> : <RiPlayFill size={16} />}
        </button>
      </div>

      {/* Cover + title */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {!compact && (
          track.coverUrl ? (
            <img
              src={track.coverUrl.startsWith('/') ? `http://localhost:3001${track.coverUrl}` : track.coverUrl}
              alt={track.title}
              className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div
              className="h-10 w-10 flex-shrink-0 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})`,
              }}
            />
          )
        )}
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-medium ${isCurrent ? 'text-accent' : ''}`}>
            {track.title}
            {track.explicit && <span className="ml-1.5 rounded bg-white/10 px-1 py-0.5 text-[9px] font-bold text-dimText">E</span>}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/artist/${track.artistId}`); }}
            className="truncate text-xs text-softText hover:text-white hover:underline"
          >
            {track.artist}
          </button>
        </div>
      </div>

      {/* Album */}
      {showAlbum && (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/album/${track.albumId}`); }}
          className="hidden min-w-[140px] truncate text-sm text-softText hover:text-white hover:underline md:block"
        >
          {track.album}
        </button>
      )}

      {/* Date added */}
      {showDateAdded && (
        <div className="hidden min-w-[100px] text-sm text-dimText lg:block">{track.dateAdded}</div>
      )}

      {/* Like */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleLike(track.id); }}
        className={`rounded p-1 transition hover:scale-110 ${isLiked ? 'text-accent' : 'text-transparent group-hover:text-softText'}`}
      >
        {isLiked ? <RiHeartFill size={16} /> : <RiHeartLine size={16} />}
      </button>

      {/* Duration */}
      <div className="w-12 text-right text-sm text-dimText">
        {formatDuration(track.duration)}
      </div>

      {/* More */}
      <button onClick={(e) => e.stopPropagation()} className="hidden rounded p-1 text-dimText transition hover:text-white group-hover:block">
        <RiMoreLine size={18} />
      </button>
    </div>
  );
}
