import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useLocalLibraryStore } from '../../stores/localLibraryStore';
import { formatDuration } from '../../utils/formatters';
import { RiShuffleLine, RiSkipBackFill, RiPlayFill, RiPauseFill, RiSkipForwardFill, RiRepeatLine, RiRepeat2Line, RiRepeatOneLine, RiVolumeUpLine, RiVolumeMuteLine, RiHeartLine, RiHeartFill, RiPlayList2Line, RiMusic2Line, RiFullscreenLine, RiComputerLine } from 'react-icons/ri';
import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const bottomPlayerCoverRef: { current: HTMLElement | null } = { current: null };

// #region debug-point E:audio-event-reporter
const reportAudioEventDebug = (_hypothesisId: string, _msg: string, _data: Record<string, unknown> = {}) => {};
// #endregion

export default function BottomPlayer() {
  const navigate = useNavigate();
  const primaryAudioRef = useRef<HTMLAudioElement>(null);
  const secondaryAudioRef = useRef<HTMLAudioElement>(null);
  const {
    currentTrack, isPlaying, progress, currentTime, duration, volume, isMuted,
    shuffle, repeat, showLyrics, showQueue,
    setAudioRefs, togglePlay, nextTrack, prevTrack, seekTo, setVolume, toggleMute,
    toggleShuffle, cycleRepeat, toggleLyrics, toggleQueue, setFullscreenOpen,
    setProgress, setCurrentTime, setDuration, handleTrackEnded, maybeStartAutoCrossfade,
  } = usePlayerStore();
  const { likedTrackIds, toggleLike } = useLibraryStore();

  const titleContainerRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);

  useLayoutEffect(() => {
    const checkOverflow = () => {
      if (titleContainerRef.current && titleTextRef.current) {
        setIsTitleOverflowing(titleTextRef.current.scrollWidth > titleContainerRef.current.clientWidth);
      }
    };
    
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [currentTrack?.title]);

  // Set audio ref on mount
  useEffect(() => {
    if (primaryAudioRef.current && secondaryAudioRef.current) {
      setAudioRefs(primaryAudioRef.current, secondaryAudioRef.current);
      primaryAudioRef.current.volume = volume / 100;
      secondaryAudioRef.current.volume = 0;
    }
  }, [setAudioRefs, volume]);

  // Audio event handlers
  useEffect(() => {
    const audios = [primaryAudioRef.current, secondaryAudioRef.current].filter(Boolean) as HTMLAudioElement[];
    if (audios.length === 0) return;

    const cleanups = audios.map((audio) => {
      const getAudioPayload = (eventName: string) => {
        const state = usePlayerStore.getState();
        return {
          eventName,
          currentTrackId: state.currentTrack?.id ?? null,
          audioIsActiveRef: audio === state.audioRef,
          activeAudioSlot: state.activeAudioSlot,
          isPlaying: state.isPlaying,
          isCrossfading: state.isCrossfading,
          currentSrc: audio.currentSrc,
          paused: audio.paused,
          currentTime: audio.currentTime,
          duration: audio.duration,
          readyState: audio.readyState,
          networkState: audio.networkState,
          volume: audio.volume,
        };
      };

      const handleTimeUpdate = () => {
        const state = usePlayerStore.getState();
        if (audio !== state.audioRef) return;
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
          setCurrentTime(audio.currentTime);
          state.maybeStartAutoCrossfade();
        }
      };

      const handleLoadedMetadata = () => {
        const state = usePlayerStore.getState();
        if (audio !== state.audioRef) return;

        // #region debug-point E:audio-loadedmetadata
        reportAudioEventDebug('E', 'audio loadedmetadata', getAudioPayload('loadedmetadata'));
        // #endregion

        setDuration(audio.duration);

        // Auto-repair 0:00 track duration bug
        if (state.currentTrack?.isLocal && state.currentTrack.duration === 0 && audio.duration > 0) {
          useLocalLibraryStore.getState().updateTrackDuration(state.currentTrack.id, Math.round(audio.duration));
        }
      };

      const handleEnded = () => {
        const state = usePlayerStore.getState();
        if (audio !== state.audioRef) return;
        // #region debug-point E:audio-ended
        reportAudioEventDebug('E', 'audio ended', getAudioPayload('ended'));
        // #endregion
        handleTrackEnded();
      };

      const handlePlay = () => {
        // #region debug-point E:audio-play
        reportAudioEventDebug('E', 'audio play', getAudioPayload('play'));
        // #endregion
      };

      const handlePlaying = () => {
        // #region debug-point E:audio-playing
        reportAudioEventDebug('E', 'audio playing', getAudioPayload('playing'));
        // #endregion
      };

      const handlePause = () => {
        // #region debug-point E:audio-pause
        reportAudioEventDebug('E', 'audio pause', getAudioPayload('pause'));
        // #endregion
      };

      const handleStalled = () => {
        // #region debug-point E:audio-stalled
        reportAudioEventDebug('E', 'audio stalled', getAudioPayload('stalled'));
        // #endregion
      };

      const handleWaiting = () => {
        // #region debug-point E:audio-waiting
        reportAudioEventDebug('E', 'audio waiting', getAudioPayload('waiting'));
        // #endregion
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('playing', handlePlaying);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('stalled', handleStalled);
      audio.addEventListener('waiting', handleWaiting);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('stalled', handleStalled);
        audio.removeEventListener('waiting', handleWaiting);
      };
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [handleTrackEnded, maybeStartAutoCrossfade, setProgress, setCurrentTime, setDuration]);

  const isLiked = currentTrack ? likedTrackIds.has(currentTrack.id) : false;

  const repeatIcon = repeat === 'one' ? RiRepeatOneLine : repeat === 'all' ? RiRepeat2Line : RiRepeatLine;
  const RepeatIcon = repeatIcon;
  const openFullscreenPlayer = () => {
    if (!currentTrack) return;
    
    // Get the mini player cover element
    const miniCover = bottomPlayerCoverRef.current;
    if (!miniCover) {
      setFullscreenOpen(true);
      return;
    }

    // Get mini cover position
    const miniRect = miniCover.getBoundingClientRect();
    
    // Store the position for the fullscreen player to use
    (window as any).__miniPlayerCoverRect = {
      top: miniRect.top,
      left: miniRect.left,
      width: miniRect.width,
      height: miniRect.height,
    };
    
    setFullscreenOpen(true);
  };

  return (
    <>
      <audio ref={primaryAudioRef} preload="auto" />
      <audio ref={secondaryAudioRef} preload="auto" />
      <footer className="glass-heavy fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 px-3 py-2.5 md:px-5">
        <div className="flex items-center gap-3 lg:gap-6">
          {/* Left: Now playing */}
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:max-w-[280px]">
            {currentTrack ? (
              <>
                {currentTrack.coverUrl ? (
                  <img
                    ref={(node) => {
                      bottomPlayerCoverRef.current = node;
                    }}
                    src={currentTrack.coverUrl.startsWith('/') ? `http://localhost:3001${currentTrack.coverUrl}` : currentTrack.coverUrl}
                    alt={currentTrack.title}
                    className="bottom-player-cover h-12 w-12 flex-shrink-0 rounded-xl shadow-lg cursor-pointer object-cover transition hover:shadow-glow-sm"
                    onClick={openFullscreenPlayer}
                  />
                ) : (
                  <div
                    ref={(node) => {
                      bottomPlayerCoverRef.current = node;
                    }}
                    className="bottom-player-cover h-12 w-12 flex-shrink-0 rounded-xl shadow-lg cursor-pointer transition hover:shadow-glow-sm"
                    style={{ background: `linear-gradient(135deg, ${currentTrack.coverGradient?.[0] || '#333'}, ${currentTrack.coverGradient?.[1] || '#222'})` }}
                    onClick={openFullscreenPlayer}
                  />
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden" ref={titleContainerRef}>
                  <button
                    onClick={openFullscreenPlayer}
                    className="block text-left text-sm font-medium transition hover:text-white w-full overflow-hidden"
                  >
                    <div className={`whitespace-nowrap ${isTitleOverflowing ? 'animate-marquee inline-block' : 'truncate'}`}>
                      <span ref={titleTextRef} className={isTitleOverflowing ? 'pr-8' : ''}>{currentTrack.title}</span>
                      {isTitleOverflowing && (
                        <span className="pr-8" aria-hidden="true">{currentTrack.title}</span>
                      )}
                    </div>
                  </button>
                  <button onClick={() => navigate(`/artist/${currentTrack.artistId}`)} className="truncate text-xs text-softText hover:text-white hover:underline block w-full text-left">
                    {currentTrack.artist}
                  </button>
                </div>
                <button onClick={() => toggleLike(currentTrack.id)} className="flex-shrink-0 transition hover:scale-110">
                  {isLiked ? <RiHeartFill size={18} className="text-accent" /> : <RiHeartLine size={18} className="text-softText hover:text-white" />}
                </button>
              </>
            ) : (
              <>
                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-glass-card backdrop-blur-xl" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-softText">No track playing</div>
                  <div className="text-xs text-dimText">Select a song to start</div>
                </div>
              </>
            )}
          </div>

          {/* Center: Controls + progress */}
          <div className="hidden flex-1 flex-col items-center md:flex">
            <div className="mb-1.5 flex items-center gap-3">
              <button
                onClick={toggleShuffle}
                className={`rounded-full p-2 transition hover:bg-white/5 ${shuffle ? 'text-accent' : 'text-softText hover:text-white'}`}
              >
                <RiShuffleLine size={18} />
              </button>
              <button onClick={prevTrack} className="rounded-full p-2 text-softText transition hover:bg-white/5 hover:text-white">
                <RiSkipBackFill size={20} />
              </button>
              <button
                onClick={togglePlay}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-surface transition hover:scale-105 hover:shadow-lg"
              >
                {isPlaying ? <RiPauseFill size={20} /> : <RiPlayFill size={20} className="ml-0.5" />}
              </button>
              <button onClick={nextTrack} className="rounded-full p-2 text-softText transition hover:bg-white/5 hover:text-white">
                <RiSkipForwardFill size={20} />
              </button>
              <button
                onClick={cycleRepeat}
                className={`rounded-full p-2 transition hover:bg-white/5 ${repeat !== 'off' ? 'text-accent' : 'text-softText hover:text-white'}`}
              >
                <RepeatIcon size={18} />
              </button>
            </div>
            <div className="flex w-full max-w-lg items-center gap-2 text-[11px] text-dimText">
              <span className="w-10 text-right">{formatDuration(Math.floor(currentTime))}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={e => seekTo(Number(e.target.value))}
                className="accent-track h-1 flex-1"
                style={{ '--progress': `${progress}%` } as React.CSSProperties}
              />
              <span className="w-10">{formatDuration(Math.floor(duration))}</span>
            </div>
          </div>

          {/* Mobile: simple play/pause */}
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={prevTrack} className="p-2 text-softText">
              <RiSkipBackFill size={20} />
            </button>
            <button onClick={togglePlay} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-surface">
              {isPlaying ? <RiPauseFill size={18} /> : <RiPlayFill size={18} className="ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="p-2 text-softText">
              <RiSkipForwardFill size={20} />
            </button>
          </div>

          {/* Right: volume + extras */}
          <div className="hidden flex-1 items-center justify-end gap-2 lg:flex lg:max-w-[280px]">
            <button onClick={toggleQueue} className={`rounded-full p-2 transition hover:bg-white/5 ${showQueue ? 'text-accent' : 'text-softText hover:text-white'}`}>
              <RiPlayList2Line size={18} />
            </button>
            <button onClick={toggleLyrics} className={`rounded-full p-2 transition hover:bg-white/5 ${showLyrics ? 'text-accent' : 'text-softText hover:text-white'}`}>
              <RiMusic2Line size={18} />
            </button>
            <button className="rounded-full p-2 text-softText transition hover:bg-white/5 hover:text-white">
              <RiComputerLine size={18} />
            </button>
            <button onClick={toggleMute} className="rounded-full p-1.5 text-softText transition hover:text-white">
              {isMuted || volume === 0 ? <RiVolumeMuteLine size={18} /> : <RiVolumeUpLine size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={e => setVolume(Number(e.target.value))}
              className="accent-alt-track h-1 w-24"
              style={{ '--progress': `${isMuted ? 0 : volume}%` } as React.CSSProperties}
            />
            <button onClick={openFullscreenPlayer} className="rounded-full p-2 text-softText transition hover:bg-white/5 hover:text-white">
              <RiFullscreenLine size={18} />
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
