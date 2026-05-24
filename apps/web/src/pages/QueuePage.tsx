import { RiPlayList2Line, RiPlayFill, RiDeleteBinLine } from 'react-icons/ri';
import { usePlayerStore } from '../stores/playerStore';

export default function QueuePage() {
  const { queue, queueIndex, currentTrack, playTrack, removeFromQueue, clearQueue } = usePlayerStore();

  return (
    <div className="page-enter space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
            <RiPlayList2Line size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Queue</h1>
            <p className="text-sm text-softText">{queue.length} tracks in queue</p>
          </div>
        </div>
        {queue.length > 0 && (
          <button
            onClick={clearQueue}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <RiDeleteBinLine size={16} />
            Clear Queue
          </button>
        )}
      </div>

      {/* Now Playing */}
      {currentTrack && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">Now Playing</div>
          <div className="flex items-center gap-4">
            {currentTrack.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div
                className="h-16 w-16 flex-shrink-0 rounded-lg"
                style={{ background: `linear-gradient(135deg, ${currentTrack.coverGradient?.[0] || '#333'}, ${currentTrack.coverGradient?.[1] || '#222'})` }}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-bold text-white">{currentTrack.title}</div>
              <div className="truncate text-sm text-softText">{currentTrack.artist}</div>
            </div>
          </div>
        </div>
      )}

      {/* Queue List */}
      {queue.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-softText">Up Next</h2>
          <div className="space-y-2">
            {queue.map((track, index) => {
              const isCurrentTrack = index === queueIndex;
              if (isCurrentTrack) return null; // Skip current track as it's shown above

              return (
                <div
                  key={`${track.id}-${index}`}
                  className="group flex w-full items-center gap-4 rounded-xl bg-card p-3 transition hover:bg-card-hover"
                >
                  <span className="w-8 text-center text-sm font-bold text-dimText">
                    {index + 1}
                  </span>
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      className="h-14 w-14 flex-shrink-0 rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-bold text-white">{track.title}</div>
                    <div className="truncate text-sm text-softText">{track.artist}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playTrack(track, queue)}
                      className="hidden h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-glow-sm transition hover:scale-110 group-hover:flex"
                    >
                      <RiPlayFill size={18} className="ml-0.5" />
                    </button>
                    <button
                      onClick={() => removeFromQueue(index)}
                      className="hidden h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-red-500/20 hover:text-red-400 group-hover:flex"
                    >
                      <RiDeleteBinLine size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/5 py-16">
          <RiPlayList2Line size={48} className="mb-4 text-dimText" />
          <p className="text-lg font-bold text-white">Queue is empty</p>
          <p className="text-sm text-dimText">Add tracks to your queue to see them here</p>
        </div>
      )}
    </div>
  );
}
