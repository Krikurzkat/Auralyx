import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlayerStore } from '../../stores/playerStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { formatDuration } from '../../utils/formatters';
import {
  RiArrowLeftLine,
  RiSkipBackFill,
  RiPlayFill,
  RiPauseFill,
  RiSkipForwardFill,
  RiHeartLine,
  RiHeartFill,
  RiCarFill,
  RiHome5Line,
  RiHome5Fill,
  RiSearchLine,
  RiSearchFill,
  RiMusic2Line,
  RiMusic2Fill,
  RiShuffleLine,
  RiShuffleFill,
  RiRepeatLine,
  RiRepeatFill,
  RiRepeat2Line,
} from 'react-icons/ri';

interface DrivePlayerProps {
  onClose: () => void;
}

export default function DrivePlayer({ onClose }: DrivePlayerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setFullscreenOpen,
    shuffle,
    repeat,
    toggleShuffle,
    cycleRepeat,
  } = usePlayerStore();

  const { likedTrackIds, toggleLike } = useLibraryStore();

  // Gesture handling state for swiping album art
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekTo(percent * duration);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) {
      nextTrack();
    } else if (distance < -minSwipeDistance) {
      prevTrack();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart(e.clientX);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragStart === null) return;
    const distance = dragStart - e.clientX;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) {
      nextTrack();
    } else if (distance < -minSwipeDistance) {
      prevTrack();
    }
    setDragStart(null);
  };

  const handleNavigation = (path: string) => {
    onClose();
    setFullscreenOpen(false);
    navigate(path);
  };

  const handleBack = () => {
    onClose(); // This just exits drive mode, keeping fullscreen player open
  };

  if (!currentTrack) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#1C1C1E] via-[#0D0D0D] to-[#000000]">
        <p className="text-xl text-white/70">No track currently playing</p>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const coverUrl = currentTrack.coverUrl?.startsWith('/')
    ? `http://localhost:3001${currentTrack.coverUrl}`
    : currentTrack.coverUrl;
  const isLiked = likedTrackIds.has(currentTrack.id);

  // Determine current active section for bottom navigation highlighting
  const currentPath = location.pathname;

  // Get repeat icon based on mode
  const getRepeatIcon = () => {
    if (repeat === 'one') return <RiRepeat2Line size={20} />;
    if (repeat === 'all') return <RiRepeatFill size={20} />;
    return <RiRepeatLine size={20} />;
  };

  // Sample lyrics - in production, fetch from API or track metadata
  const sampleLyrics = currentTrack?.lyrics || 
    "♪ Lyrics not available for this track ♪\n\nEnjoy the music!";

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col justify-between overflow-hidden text-white" style={{
      background: `linear-gradient(180deg, ${currentTrack.coverGradient?.[0] || '#1E1E22'}33 0%, rgba(13, 13, 13, 0.85) 56%, rgba(13, 13, 13, 0.95) 100%)`
    }}>
      {/* Backdrop blur layer */}
      <div className="absolute inset-0 backdrop-blur-3xl -z-10" />
      
      {/* Top Header - Fixed positioning */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-white/20 hover:border-white/30 active:scale-95"
          aria-label="Back to fullscreen player"
        >
          <RiArrowLeftLine size={20} />
          <span>Back</span>
        </button>
        
        <span className="text-xs font-bold uppercase tracking-widest text-white/80">
          Drive Mode
        </span>

        <div className="w-[72px]" /> {/* Spacer for centering */}
      </div>

      {/* Main Container - Scrollable content area */}
      <div className="flex flex-1 flex-col items-center px-4 py-2 overflow-y-auto min-h-0">
        {/* Cover Art Wrapper with Swiping support */}
        <div 
          id="drive-mode-cover"
          className="relative group cursor-grab active:cursor-grabbing select-none touch-none shrink-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          <div className="h-[45vw] w-[45vw] max-h-[220px] max-w-[220px] overflow-hidden rounded-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-transform duration-300 group-hover:scale-[1.02]">
            {coverUrl ? (
              <img src={coverUrl} alt={currentTrack.title} className="h-full w-full object-cover pointer-events-none" />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `linear-gradient(135deg, ${currentTrack.coverGradient?.[0] || '#333'}, ${currentTrack.coverGradient?.[1] || '#222'})`,
                }}
              />
            )}
          </div>

          {/* Floating Heart Button */}
          <button
            onClick={() => toggleLike(currentTrack.id)}
            className="absolute -bottom-2 -right-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-lg transition hover:scale-110 hover:bg-white/20 active:scale-95"
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            {isLiked ? (
              <RiHeartFill size={24} className="text-accent" />
            ) : (
              <RiHeartLine size={24} className="text-white/80" />
            )}
          </button>
        </div>

        {/* Swipe to change helper */}
        <p className="mt-4 text-[10px] font-medium tracking-widest text-white/30 uppercase shrink-0">
          &lt;&lt;&lt;&lt;&nbsp; Swipe to change &nbsp;&gt;&gt;&gt;&gt;
        </p>

        {/* Track Title and Artist */}
        <div className="mt-4 text-center max-w-full px-4 shrink-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-white md:text-2xl">
            {currentTrack.title}
          </h1>
          <p className="mt-1 truncate text-base font-medium text-white/60">
            {currentTrack.artist}
          </p>
        </div>

        {/* Lyrics Section - Non-scrolling, fits available space */}
        <div className="mt-4 w-full max-w-md px-4 shrink-0">
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4 backdrop-blur-xl shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Lyrics</h3>
            <div className="text-sm text-white/80 leading-relaxed whitespace-pre-line line-clamp-6 text-center">
              {sampleLyrics}
            </div>
          </div>
        </div>

        {/* Progress Slider */}
        <div className="mt-4 w-full max-w-md px-2 shrink-0">
          <div
            onClick={handleSeek}
            className="group relative h-1.5 cursor-pointer rounded-full bg-white/20 backdrop-blur-sm transition-all hover:h-2"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-orange-500 transition-all duration-100 shadow-md"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-white/40">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Shuffle and Repeat Controls */}
        <div className="mt-4 flex items-center justify-center gap-8 shrink-0">
          <button
            onClick={toggleShuffle}
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl shadow-md transition ${
              shuffle 
                ? 'bg-accent/30 border-accent/50 text-accent' 
                : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20 hover:text-white'
            }`}
            aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
          >
            {shuffle ? <RiShuffleFill size={20} /> : <RiShuffleLine size={20} />}
          </button>

          <button
            onClick={cycleRepeat}
            className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl shadow-md transition ${
              repeat !== 'off'
                ? 'bg-accent/30 border-accent/50 text-accent' 
                : 'bg-white/10 border-white/20 text-white/60 hover:bg-white/20 hover:text-white'
            }`}
            aria-label={`Repeat ${repeat}`}
          >
            {getRepeatIcon()}
          </button>
        </div>

        {/* Controls Layout */}
        <div className="mt-4 mb-4 flex items-center justify-center gap-6 shrink-0">
          <button
            onClick={prevTrack}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white shadow-md transition hover:bg-white/20 active:scale-90"
            aria-label="Previous track"
          >
            <RiSkipBackFill size={24} />
          </button>

          <button
            onClick={togglePlay}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-xl shadow-accent/30 transition hover:scale-105 active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <RiPauseFill size={32} /> : <RiPlayFill size={32} className="ml-1" />}
          </button>

          <button
            onClick={nextTrack}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-xl text-white shadow-md transition hover:bg-white/20 active:scale-90"
            aria-label="Next track"
          >
            <RiSkipForwardFill size={24} />
          </button>
        </div>
      </div>

      {/* Bottom Navbar - Fixed positioning with safe area */}
      <div className="border-t border-white/20 bg-white/10 backdrop-blur-2xl shrink-0 safe-bottom shadow-2xl">
        <div className="flex h-14 items-center justify-around px-4">
          {/* Home Tab */}
          <button
            onClick={() => handleNavigation('/')}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentPath === '/' ? 'text-accent' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {currentPath === '/' ? <RiHome5Fill size={20} /> : <RiHome5Line size={20} />}
            <span className="text-[9px] font-semibold">Home</span>
          </button>

          {/* Search/Explore Tab */}
          <button
            onClick={() => handleNavigation('/search')}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentPath === '/search' ? 'text-accent' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {currentPath === '/search' ? <RiSearchFill size={20} /> : <RiSearchLine size={20} />}
            <span className="text-[9px] font-semibold">Explore</span>
          </button>

          {/* Library Tab */}
          <button
            onClick={() => handleNavigation('/library')}
            className={`flex flex-col items-center gap-0.5 transition ${
              currentPath === '/library' ? 'text-accent' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {currentPath === '/library' ? <RiMusic2Fill size={20} /> : <RiMusic2Line size={20} />}
            <span className="text-[9px] font-semibold">Library</span>
          </button>
        </div>
      </div>
    </div>
  );
}
