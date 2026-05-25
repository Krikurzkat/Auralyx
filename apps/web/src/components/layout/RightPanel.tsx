import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import { formatDuration, getLyricsForTrack } from '../../utils/formatters';
import { RiDeleteBinLine, RiPlayFill } from 'react-icons/ri';
import { useMemo } from 'react';

export default function RightPanel() {
  const { currentTrack, queue, queueIndex, isPlaying, currentTime, showQueue, showLyrics, removeFromQueue, playTrack } = usePlayerStore();
  const { rightPanelView, setRightPanel, reduceMotion, toggleReduceMotion } = useUIStore();

  const lyrics = useMemo(() => {
    return currentTrack ? getLyricsForTrack(currentTrack.id, currentTrack.lyrics) : [];
  }, [currentTrack]);

  const currentLyricIndex = useMemo(() => {
    if (!lyrics.length) return -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) return i;
    }
    return 0;
  }, [lyrics, currentTime]);

  const upNext = queue.slice(queueIndex + 1);

  // Friend activity mock data
  const friendActivity = [
    { name: 'Ava', track: 'Sunset Replay', artist: 'Amber Sky', time: '2m ago', gradient: ['#EC4899', '#F43F5E'] },
    { name: 'Marcus', track: 'Midnight Chrome', artist: 'Scarlet Avenue', time: '5m ago', gradient: ['#8B5CF6', '#6366F1'] },
    { name: 'Lia', track: 'Focus Flow', artist: 'Circuit Dawn', time: '12m ago', gradient: ['#10B981', '#06B6D4'] },
    { name: 'James', track: 'Crystal Rain', artist: 'Velvet Haze', time: '18m ago', gradient: ['#F59E0B', '#EF4444'] },
  ];

  if (!showQueue && !showLyrics) return null;

  return (
    <aside className="hidden w-[320px] flex-shrink-0 border-l border-white/5 bg-glass-heavy backdrop-blur-2xl/60 xl:block">
      <div className="flex h-full flex-col overflow-y-auto p-4 pb-24 scrollbar-hidden">
        {/* Panel tabs */}
        <div className="mb-4 flex items-center gap-1 rounded-xl bg-glass backdrop-blur-2xl/60 p-1">
          {(['queue', 'lyrics', 'activity'] as const).map(view => (
            <button
              key={view}
              onClick={() => setRightPanel(view)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium capitalize transition ${
                rightPanelView === view ? 'bg-glass-card backdrop-blur-xl text-white' : 'text-dimText hover:text-softText'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Queue view */}
        {rightPanelView === 'queue' && (
          <div className="animate-fade-in">
            {currentTrack && (
              <div className="mb-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-dimText">Now playing</div>
                <div className="flex items-center gap-3 rounded-xl bg-theme-gradient-subtle p-3">
                  <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg">
                    {currentTrack.coverUrl ? (
                      <img
                        src={currentTrack.coverUrl.startsWith('/') ? `http://localhost:3001${currentTrack.coverUrl}` : currentTrack.coverUrl}
                        alt={currentTrack.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${currentTrack.coverGradient?.[0] || '#333'}, ${currentTrack.coverGradient?.[1] || '#222'})` }} />
                    )}
                    {isPlaying && (
                      <div className="absolute inset-0 flex items-end justify-center gap-0.5 bg-black/30 p-2">
                        <span className="eq-bar animate-equalizer-1" style={{ height: '4px' }} />
                        <span className="eq-bar animate-equalizer-2" style={{ height: '8px' }} />
                        <span className="eq-bar animate-equalizer-3" style={{ height: '6px' }} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{currentTrack.title}</div>
                    <div className="truncate text-xs text-softText">{currentTrack.artist}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-dimText">Up next · {upNext.length} songs</div>
            </div>
            <div className="space-y-1">
              {upNext.map((track, i) => (
                <div key={`${track.id}-${i}`}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-white/5"
                >
                  <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg">
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl.startsWith('/') ? `http://localhost:3001${track.coverUrl}` : track.coverUrl}
                        alt={track.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}33, ${track.coverGradient?.[1] || '#222'}33)` }} />
                    )}
                    <button onClick={() => playTrack(track, queue)}
                      className="absolute inset-0 flex items-center justify-center text-xs font-medium text-dimText group-hover:hidden bg-black/20"
                    >
                      {queueIndex + 1 + i + 1}
                    </button>
                    <button onClick={() => playTrack(track, queue)}
                      className="absolute inset-0 hidden items-center justify-center bg-black/60 text-white group-hover:flex"
                    >
                      <RiPlayFill size={14} />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{track.title}</div>
                    <div className="truncate text-xs text-dimText">{track.artist}</div>
                  </div>
                  <span className="text-xs text-dimText">{formatDuration(track.duration)}</span>
                  <button
                    onClick={() => removeFromQueue(queueIndex + 1 + i)}
                    className="hidden rounded p-1 text-dimText transition hover:text-white group-hover:block"
                  >
                    <RiDeleteBinLine size={14} />
                  </button>
                </div>
              ))}
              {upNext.length === 0 && (
                <div className="py-8 text-center text-sm text-dimText">Queue is empty</div>
              )}
            </div>
          </div>
        )}

        {/* Lyrics view */}
        {rightPanelView === 'lyrics' && (
          <div className="animate-fade-in">
            {currentTrack ? (
              <div className="rounded-2xl bg-theme-gradient p-5">
                <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">Synced Lyrics</div>
                <div className="space-y-3">
                  {lyrics.map((line, i) => (
                    <div
                      key={i}
                      className={`text-lg font-semibold transition-all duration-500 ${
                        i === currentLyricIndex
                          ? 'text-white scale-[1.02]'
                          : i < currentLyricIndex
                          ? 'text-white/40'
                          : 'text-white/60'
                      }`}
                    >
                      {line.text || '♪'}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-dimText">Play a song to see lyrics</div>
            )}
          </div>
        )}

        {/* Friend activity view */}
        {rightPanelView === 'activity' && (
          <div className="animate-fade-in space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-dimText">Friend Activity</div>
            {friendActivity.map((friend, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-white/5">
                <div className="h-9 w-9 flex-shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${friend.gradient[0]}, ${friend.gradient[1]})` }}>
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold">{friend.name[0]}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{friend.name}</div>
                  <div className="truncate text-xs text-softText">{friend.track} · {friend.artist}</div>
                  <div className="text-[11px] text-dimText">{friend.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings / Accessibility (Always at bottom) */}
        <div className="mt-auto pt-8">
          <div className="rounded-xl bg-glass backdrop-blur-2xl/40 p-3">
            <label className="flex cursor-pointer items-center justify-between text-sm">
              <span className="text-softText font-medium">Reduce Motion (3D)</span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={reduceMotion} onChange={toggleReduceMotion} />
                <div className={`block h-5 w-9 rounded-full transition-colors ${reduceMotion ? 'bg-accent' : 'bg-white/10'}`} />
                <div className={`dot absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-transform ${reduceMotion ? 'translate-x-4' : ''}`} />
              </div>
            </label>
            <p className="mt-1.5 text-[10px] text-dimText leading-tight">
              Disables 3D visualizers and particle effects to save battery and reduce motion.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
