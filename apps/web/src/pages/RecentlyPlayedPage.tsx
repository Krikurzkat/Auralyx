import { useMemo } from 'react';
import { RiTimeLine, RiPlayFill } from 'react-icons/ri';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { usePlayerStore } from '../stores/playerStore';

export default function RecentlyPlayedPage() {
  const { getRecentlyPlayed } = useLocalLibraryStore();
  const { playTrack } = usePlayerStore();
  const { localTracks } = useLocalLibraryStore();

  const recentTracks = useMemo(() => getRecentlyPlayed(50), [getRecentlyPlayed]);

  return (
    <div className="page-enter space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accentAlt to-accent">
          <RiTimeLine size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Recently Played</h1>
          <p className="text-sm text-softText">Your recently played tracks</p>
        </div>
      </div>

      {/* Tracks List */}
      {recentTracks.length > 0 ? (
        <div className="space-y-2">
          {recentTracks.map((track, index) => (
            <button
              key={`${track.id}-${index}`}
              onClick={() => playTrack(track, localTracks)}
              className="group flex w-full items-center gap-4 rounded-xl bg-card p-3 text-left transition hover:bg-card-hover"
            >
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
              <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-glow-sm group-hover:flex">
                <RiPlayFill size={18} className="ml-0.5" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/5 py-16">
          <RiTimeLine size={48} className="mb-4 text-dimText" />
          <p className="text-lg font-bold text-white">No recently played tracks</p>
          <p className="text-sm text-dimText">Start playing music to see your history here</p>
        </div>
      )}
    </div>
  );
}
