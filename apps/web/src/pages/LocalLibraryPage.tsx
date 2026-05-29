import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { Playlist } from '../types';
import type { LocalTrack } from '../services/localDb';
import gsap from 'gsap';
import { clickedTrackCoverRef } from '../components/player/FullscreenPlayer';
import { useGalaxyS8PlusLayout } from '../hooks/useGalaxyS8PlusLayout';
import {
  RiUploadCloud2Line,
  RiSearchLine,
  RiPlayFill,
  RiDeleteBinLine,
  RiAddLine,
  RiPlayListLine,
  RiMusicLine,
  RiHeartLine,
  RiHeartFill,
  RiSortAsc,
  RiSortDesc,
  RiGridLine,
  RiListUnordered,
  RiTimeLine,
  RiCloseLine,
  RiLoader4Line,
  RiHistoryLine,
  RiFireLine,
  RiMore2Fill,
  RiEditLine,
  RiImageEditLine,
  RiCheckLine,
  RiRefreshLine,
  RiPlayListAddLine,
  RiSkipForwardLine,
} from 'react-icons/ri';

type SortKey = 'title' | 'artist' | 'album' | 'duration' | 'addedAt' | 'plays';
type SortDir = 'asc' | 'desc';
type ViewTab = 'all' | 'playlists' | 'mostPlayed' | 'recent';
type ViewMode = 'list' | 'grid';

const TRACK_MENU_WIDTH = 224;
const TRACK_MENU_APPROX_HEIGHT = 304;
const TRACK_MENU_GAP = 8;
const TRACK_MENU_VIEWPORT_MARGIN = 12;
const BOTTOM_PLAYER_SAFE_HEIGHT = 92;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Sub-components ───

const TrackRow = memo(function TrackRow({
  track,
  isActive,
  isPlaying,
  playCounts,
  onPlay,
  onDelete,
  onAddToPlaylist,
  onEdit,
  onAddToQueue,
  onPlayNext,
  compact,
}: {
  track: LocalTrack;
  isActive: boolean;
  isPlaying: boolean;
  playCounts: Record<string, number>;
  onPlay: (track: LocalTrack, coverElement: HTMLElement | null) => void;
  onDelete: (trackId: string) => void;
  onAddToPlaylist: (track: LocalTrack) => void;
  onEdit: (track: LocalTrack) => void;
  onAddToQueue: (track: LocalTrack) => void;
  onPlayNext: (track: LocalTrack) => void;
  compact?: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    maxHeight: number;
    placement: 'top' | 'bottom';
  } | null>(null);

  const updateMenuPosition = useCallback(() => {
    const button = menuButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const safeBottom = viewportHeight - BOTTOM_PLAYER_SAFE_HEIGHT - TRACK_MENU_VIEWPORT_MARGIN;
    const spaceAbove = rect.top - TRACK_MENU_VIEWPORT_MARGIN;
    const spaceBelow = safeBottom - rect.bottom;
    const shouldOpenUpward =
      spaceBelow < TRACK_MENU_APPROX_HEIGHT &&
      spaceAbove > spaceBelow;

    const placement: 'top' | 'bottom' = shouldOpenUpward ? 'top' : 'bottom';
    const unclampedTop = placement === 'top'
      ? rect.top - TRACK_MENU_GAP - Math.min(TRACK_MENU_APPROX_HEIGHT, Math.max(160, spaceAbove))
      : rect.bottom + TRACK_MENU_GAP;
    const maxHeight = Math.max(
      160,
      placement === 'top'
        ? spaceAbove - TRACK_MENU_GAP
        : spaceBelow - TRACK_MENU_GAP
    );
    const top = placement === 'top'
      ? Math.max(TRACK_MENU_VIEWPORT_MARGIN, rect.top - TRACK_MENU_GAP - maxHeight)
      : Math.min(unclampedTop, Math.max(TRACK_MENU_VIEWPORT_MARGIN, safeBottom - maxHeight));
    const left = Math.min(
      Math.max(TRACK_MENU_VIEWPORT_MARGIN, rect.right - TRACK_MENU_WIDTH),
      viewportWidth - TRACK_MENU_VIEWPORT_MARGIN - TRACK_MENU_WIDTH
    );

    setMenuPosition({ top, left, maxHeight, placement });
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const handleReposition = () => {
      updateMenuPosition();
    };
    if (showMenu) {
      updateMenuPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleReposition);
      window.addEventListener('scroll', handleReposition, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', handleReposition);
        window.removeEventListener('scroll', handleReposition, true);
      };
    }
  }, [showMenu, updateMenuPosition]);

  const handlePlayClick = () => {
    // Add a quick pulse animation before opening fullscreen
    if (rowRef.current) {
      gsap.fromTo(rowRef.current, 
        { scale: 1 },
        { 
          scale: 0.98,
          duration: 0.15,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        }
      );
    }
    onPlay(track, coverRef.current);
  };

  return (
    <div
      ref={rowRef}
      className={`group relative flex cursor-pointer items-center rounded-xl transition-all duration-300 hover:scale-[1.005] hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.01] hover:shadow-md ${
        compact ? 'gap-2.5 px-2.5 py-1.5' : 'gap-3 px-3 py-2.5'
      } ${
        isActive ? 'bg-gradient-to-r from-accent/10 to-accent/5 shadow-sm' : ''
      }`}
      onClick={handlePlayClick}
    >
      {/* Index / Play icon - moved to far left */}
      <div className={`flex-shrink-0 text-left ${compact ? 'w-7 pl-0 text-center' : 'w-10 pl-1'}`}>
        {isActive && isPlaying ? (
          <span className={`text-accent flex items-end gap-[2px] ${compact ? 'h-3.5 justify-center' : 'h-4'}`}>
            <span className="w-[3px] bg-accent rounded-full animate-[bounce_0.6s_0.0s_infinite]" style={{ height: '60%' }} />
            <span className="w-[3px] bg-accent rounded-full animate-[bounce_0.6s_0.2s_infinite]" style={{ height: '100%' }} />
            <span className="w-[3px] bg-accent rounded-full animate-[bounce_0.6s_0.4s_infinite]" style={{ height: '40%' }} />
          </span>
        ) : (
          <>
            <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${isActive ? 'text-accent' : 'text-white/30'} group-hover:hidden transition-opacity`}>
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handlePlayClick(); }}
              className={`hidden items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-white shadow-md transition-all duration-200 hover:scale-110 hover:shadow-accent/50 group-hover:flex ${
                compact ? 'h-6 w-6' : 'h-7 w-7'
              }`}
            >
              <RiPlayFill size={compact ? 10 : 12} />
            </button>
          </>
        )}
      </div>

      {/* Cover art - smaller */}
      <div ref={coverRef} className="flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            className={`${compact ? 'h-9 w-9 rounded-md' : 'h-11 w-11 rounded-lg'} object-cover shadow-md ring-1 ring-white/10`}
          />
        ) : (
          <div
            className={`${compact ? 'h-9 w-9 rounded-md' : 'h-11 w-11 rounded-lg'} flex items-center justify-center shadow-md ring-1 ring-white/10`}
            style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
          >
            <RiMusicLine size={compact ? 14 : 16} className="text-white/60" />
          </div>
        )}
      </div>

      {/* Title + Artist */}
      <div className="flex-1 min-w-0">
        <div className={`${compact ? 'text-[13px] leading-tight' : 'text-sm'} font-semibold truncate transition-colors ${isActive ? 'text-accent' : 'text-white group-hover:text-white'}`}>
          {track.title}
        </div>
        <div className={`${compact ? 'text-[11px] leading-tight' : 'text-xs'} truncate text-white/50 transition-colors group-hover:text-white/60`}>{track.artist}</div>
      </div>

      {/* Album */}
      <div className="hidden md:block w-44 text-sm text-white/40 truncate group-hover:text-white/50 transition-colors">{track.album}</div>

      {/* Plays */}
      <div className="hidden lg:flex items-center gap-1.5 w-16 text-xs text-white/40 group-hover:text-white/50 transition-colors">
        <RiFireLine size={12} className="text-accent/60" />
        <span>{playCounts[track.id] || 0}</span>
      </div>

      {/* Duration */}
      <div className={`w-12 flex-shrink-0 text-right font-medium text-white/40 transition-colors group-hover:text-white/50 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {formatDuration(track.duration)}
      </div>

      {/* 3-Dot Menu */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          ref={menuButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            if (!showMenu) {
              updateMenuPosition();
            }
            setShowMenu(!showMenu);
          }}
          className={`rounded-full transition-all duration-200 ${compact ? 'p-1' : 'p-1.5'} ${
            showMenu ? 'bg-white/15 text-white opacity-100 scale-105' : 'text-white/30 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10 hover:scale-105'
          }`}
        >
          <RiMore2Fill size={compact ? 14 : 16} />
        </button>

        {/* Dropdown Menu */}
        {showMenu && menuPosition && createPortal(
          <div
            className="fixed inset-0 z-[70]"
            onClick={() => setShowMenu(false)}
          >
            <div
              ref={menuRef}
              className="absolute w-60 overflow-y-auto rounded-2xl border border-white/20 bg-[#0E0E10]/98 py-2 shadow-2xl backdrop-blur-2xl animate-scale-in"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                maxHeight: menuPosition.maxHeight,
                transformOrigin: menuPosition.placement === 'top' ? 'bottom right' : 'top right',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setLiked(l => !l); setShowMenu(false); }}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 rounded-xl mx-1"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  {liked ? <RiHeartFill size={16} className="text-accent" /> : <RiHeartLine size={16} />}
                </div>
                <span className="truncate">{liked ? 'Unlike' : 'Like'}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(track); setShowMenu(false); }}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 rounded-xl mx-1"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <RiEditLine size={16} />
                </div>
                <span className="truncate">Edit Track Info</span>
              </button>
              <div className="mx-3 my-2 h-px bg-white/10" />
              <button
                onClick={(e) => { e.stopPropagation(); onAddToQueue(track); setShowMenu(false); }}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 rounded-xl mx-1"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <RiPlayListAddLine size={16} />
                </div>
                <span className="truncate">Add to Queue</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onPlayNext(track); setShowMenu(false); }}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 rounded-xl mx-1"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <RiSkipForwardLine size={16} />
                </div>
                <span className="truncate">Play Next</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); setShowMenu(false); }}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 rounded-xl mx-1"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <RiAddLine size={16} />
                </div>
                <span className="truncate">Add to Playlist</span>
              </button>
              <div className="mx-3 my-2 h-px bg-white/10" />
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(track.id); setShowMenu(false); }}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-400/10 rounded-xl mx-1"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10 group-hover:bg-red-400/20 transition-colors">
                  <RiDeleteBinLine size={16} />
                </div>
                <span className="truncate">Remove from Library</span>
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
});

// ─── Playlist Create/Rename Modal ───

function PlaylistModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-glass backdrop-blur-2xl border border-white/20 p-8 shadow-2xl animate-scale-in">
        <h3 className="mb-6 text-2xl font-bold text-white">Create New Playlist</h3>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
          placeholder="Enter playlist name…"
          className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg"
        />
        <div className="mt-6 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 rounded-2xl bg-white/5 border border-white/10 py-3.5 text-sm font-semibold text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white hover:border-white/20"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            className="flex-1 rounded-2xl bg-theme-gradient py-3.5 text-sm font-bold text-white shadow-glow-sm transition-all duration-300 hover:scale-105 hover:shadow-glow disabled:opacity-50 disabled:hover:scale-100"
            disabled={!name.trim()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add to Playlist Modal ───

function AddToPlaylistModal({
  track,
  playlists,
  onAdd,
  onClose,
}: {
  track: LocalTrack;
  playlists: Playlist[];
  onAdd: (playlistId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-glass backdrop-blur-2xl border border-white/20 p-8 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Add to Playlist</h3>
          <button 
            onClick={onClose} 
            className="text-white/50 hover:text-white transition-colors hover:rotate-90 duration-300"
          >
            <RiCloseLine size={24} />
          </button>
        </div>
        <p className="mb-6 text-sm text-white/60 truncate bg-white/5 rounded-xl px-4 py-3 border border-white/10">{track.title}</p>
        {playlists.length === 0 ? (
          <div className="text-center py-12">
            <RiPlayListLine className="mx-auto mb-4 text-3xl text-white/20" />
            <p className="text-sm text-white/50">No playlists yet. Create one first!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
            {playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => onAdd(pl.id)}
                className="flex w-full items-center gap-4 rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 text-left transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]"
              >
                <div
                  className="h-12 w-12 flex-shrink-0 rounded-xl shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${pl.coverGradient?.[0] || '#333'}, ${pl.coverGradient?.[1] || '#222'})` }}
                >
                  <div className="flex h-full w-full items-center justify-center opacity-40">
                    <RiPlayListLine size={20} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{pl.title}</span>
                  <span className="text-xs text-white/50">{pl.trackIds.length} tracks</span>
                </div>
                <RiAddLine size={20} className="text-accent flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit Track Modal ───

function EditTrackModal({
  track,
  onSave,
  onClose,
}: {
  track: LocalTrack;
  onSave: (updates: Partial<LocalTrack>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [album, setAlbum] = useState(track.album || '');
  const [year, setYear] = useState(track.year?.toString() || '');
  const [genre, setGenre] = useState(track.genre || '');
  const [coverUrl, setCoverUrl] = useState(track.coverUrl || '');
  const [lyrics, setLyrics] = useState(track.lyrics || '');
  const [lrcFileName, setLrcFileName] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lrcInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      // Convert image to base64 data URL
      const reader = new FileReader();
      reader.onload = () => {
        setCoverUrl(reader.result as string);
        setIsUploadingCover(false);
      };
      reader.onerror = () => {
        setIsUploadingCover(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading cover:', error);
      setIsUploadingCover(false);
    }
  };

  const handleLrcImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setLyrics(text);
      setLrcFileName(file.name);
    } catch (error) {
      console.error('Error reading LRC file:', error);
      alert('Failed to read LRC file. Please try again.');
    }
  };

  const handleSave = () => {
    const updates: Partial<LocalTrack> = {
      title: title.trim() || track.title,
      artist: artist.trim() || track.artist,
      album: album.trim() || undefined,
      year: year.trim() ? parseInt(year) : undefined,
      genre: genre.trim() || undefined,
      coverUrl: coverUrl || undefined,
      lyrics: lyrics || undefined,
    };
    onSave(updates);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-glass backdrop-blur-2xl border border-white/20 p-8 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-white">Edit Track Info</h3>
          <button 
            onClick={onClose} 
            className="text-white/50 hover:text-white transition-colors hover:rotate-90 duration-300"
          >
            <RiCloseLine size={28} />
          </button>
        </div>

        {/* Album Cover */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-white/80 uppercase tracking-wider mb-4">
            Album Cover
          </label>
          <div className="flex items-center gap-6">
            <div className="relative group">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Album cover"
                  className="h-40 w-40 rounded-2xl object-cover shadow-2xl ring-2 ring-white/10"
                />
              ) : (
                <div
                  className="h-40 w-40 rounded-2xl flex items-center justify-center shadow-2xl ring-2 ring-white/10"
                  style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
                >
                  <RiMusicLine size={56} className="text-white/40" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingCover}
                className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300"
              >
                {isUploadingCover ? (
                  <RiLoader4Line className="text-white text-3xl animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <RiImageEditLine className="text-white text-3xl" />
                    <span className="text-xs text-white font-medium">Change</span>
                  </div>
                )}
              </button>
            </div>
            <div className="flex-1 space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingCover}
                className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/20 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <RiImageEditLine size={18} />
                {isUploadingCover ? 'Uploading...' : 'Change Cover'}
              </button>
              {coverUrl && (
                <button
                  onClick={() => setCoverUrl('')}
                  className="text-sm text-white/50 hover:text-red-400 transition-colors font-medium"
                >
                  Remove cover
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverUpload}
          />
        </div>

        {/* Track Info Fields */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-white/80 uppercase tracking-wider mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Track title"
              className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-white/80 uppercase tracking-wider mb-2">
              Artist *
            </label>
            <input
              type="text"
              value={artist}
              onChange={e => setArtist(e.target.value)}
              placeholder="Artist name"
              className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-white/80 uppercase tracking-wider mb-2">
              Album
            </label>
            <input
              type="text"
              value={album}
              onChange={e => setAlbum(e.target.value)}
              placeholder="Album name"
              className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-white/80 uppercase tracking-wider mb-2">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                placeholder="2024"
                min="1900"
                max="2100"
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white/80 uppercase tracking-wider mb-2">
                Genre
              </label>
              <input
                type="text"
                value={genre}
                onChange={e => setGenre(e.target.value)}
                placeholder="Pop, Rock, etc."
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:bg-white/10 focus:shadow-lg"
              />
            </div>
          </div>

          {/* Import Lyrics */}
          <div>
            <label className="block text-xs font-semibold text-softText uppercase tracking-wider mb-2">
              Lyrics
            </label>
            {lyrics ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <RiCheckLine size={18} className="text-accent" />
                    <span className="text-sm font-medium text-white">
                      {lrcFileName || 'Lyrics imported'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setLyrics('');
                      setLrcFileName('');
                    }}
                    className="text-xs text-dimText hover:text-red-400 transition"
                  >
                    Remove
                  </button>
                </div>
                <label className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-white/20 hover:border-white/30 cursor-pointer">
                  <input
                    ref={lrcInputRef}
                    type="file"
                    accept=".lrc"
                    className="hidden"
                    onChange={handleLrcImport}
                  />
                  <RiRefreshLine size={16} />
                  Replace Lyrics
                </label>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-white/20 hover:border-white/30 cursor-pointer">
                <input
                  ref={lrcInputRef}
                  type="file"
                  accept=".lrc"
                  className="hidden"
                  onChange={handleLrcImport}
                />
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import Lyrics (.lrc)
              </label>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full bg-white/5 py-3 text-sm font-medium text-softText transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !artist.trim()}
            className="flex-1 rounded-full bg-theme-gradient py-3 text-sm font-bold text-white shadow-glow transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            <RiCheckLine size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function LocalLibraryPage() {
  const {
    localTracks, localPlaylists, playCounts, isLoaded, importProgress,
    loadLibrary, importFiles, removeTrack, updateTrack,
    createPlaylist, deletePlaylist, addTrackToPlaylist,
    searchTracks, getMostPlayed, getRecentlyPlayed, recordPlay,
  } = useLocalLibraryStore();

  const { currentTrack, isPlaying } = usePlayerStore();
  const isGalaxyS8PlusLayout = useGalaxyS8PlusLayout();

  const [tab, setTab] = useState<ViewTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortKey, setSortKey] = useState<SortKey>('addedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<LocalTrack | null>(null);
  const [editTrack, setEditTrack] = useState<LocalTrack | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoaded) loadLibrary();
  }, [isLoaded, loadLibrary]);

  // ─── Sorted + filtered tracks for current tab ───

  const displayTracks = useMemo(() => {
    let tracks: LocalTrack[];
    if (tab === 'mostPlayed') tracks = getMostPlayed(50);
    else if (tab === 'recent') tracks = getRecentlyPlayed(50);
    else if (tab === 'playlists' && selectedPlaylist) {
      const idSet = new Set(selectedPlaylist.trackIds);
      tracks = localTracks.filter(t => idSet.has(t.id));
      // Preserve playlist order
      tracks = selectedPlaylist.trackIds
        .map(id => tracks.find(t => t.id === id))
        .filter(Boolean) as LocalTrack[];
    }
    else tracks = search.trim() ? searchTracks(search) : localTracks;

    if (tab !== 'mostPlayed' && tab !== 'recent' && !(tab === 'playlists' && selectedPlaylist)) {
      tracks = [...tracks].sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;
        if (sortKey === 'plays') { aVal = playCounts[a.id] || 0; bVal = playCounts[b.id] || 0; }
        else if (sortKey === 'addedAt') { aVal = a.addedAt; bVal = b.addedAt; }
        else if (sortKey === 'duration') { aVal = a.duration; bVal = b.duration; }
        else { aVal = (a[sortKey] || '').toString().toLowerCase(); bVal = (b[sortKey] || '').toString().toLowerCase(); }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return tracks;
  }, [tab, localTracks, search, sortKey, sortDir, playCounts, selectedPlaylist, searchTracks, getMostPlayed, getRecentlyPlayed]);

  // ─── Drag & Drop ───

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); dragCounter.current++;
    if (e.dataTransfer.items?.length > 0) setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false); dragCounter.current = 0;
    if (e.dataTransfer.files?.length > 0) {
      await importFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [importFiles]);

  const displayTracksRef = useRef(displayTracks);
  useEffect(() => {
    displayTracksRef.current = displayTracks;
  }, [displayTracks]);

  const handlePlayRow = useCallback((track: LocalTrack, coverElement: HTMLElement | null) => {
    if (coverElement) {
      clickedTrackCoverRef.current = coverElement;
    }
    const state = usePlayerStore.getState();
    const isAlreadyPlaying = state.currentTrack?.id === track.id;

    if (isAlreadyPlaying) {
      setTimeout(() => { state.setFullscreenOpen(true); }, 100);
    } else {
      state.playTrack(track, displayTracksRef.current);
      recordPlay(track.id);
      setTimeout(() => { state.setFullscreenOpen(true); }, 100);
    }
  }, [recordPlay]);

  const handleDeleteRow = useCallback((id: string) => {
    removeTrack(id);
  }, [removeTrack]);

  const handleAddToQueue = useCallback((track: LocalTrack) => {
    usePlayerStore.getState().addToQueue(track);
  }, []);

  const handlePlayNext = useCallback((track: LocalTrack) => {
    usePlayerStore.getState().playNext(track);
  }, []);

  const handleCreatePlaylist = async (name: string) => {
    await createPlaylist(name);
    setShowCreatePlaylist(false);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const totalDuration = useMemo(() =>
    localTracks.reduce((sum, t) => sum + t.duration, 0), [localTracks]);

  const tabItems = [
    { key: 'all' as const, label: 'All Tracks', compactLabel: 'Tracks', icon: RiMusicLine },
    { key: 'playlists' as const, label: 'Playlists', compactLabel: 'Lists', icon: RiPlayListLine },
    { key: 'mostPlayed' as const, label: 'Most Played', compactLabel: 'Most', icon: RiFireLine },
    { key: 'recent' as const, label: 'Recently Played', compactLabel: 'Recent', icon: RiHistoryLine },
  ];

  return (
    <div
      className={`relative page-enter min-h-full ${isGalaxyS8PlusLayout ? 's8-plus-layout' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Global drag overlay */}
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="relative">
            <div className="absolute inset-0 blur-3xl opacity-50 animate-pulse">
              <div className="h-64 w-64 rounded-full bg-accent"></div>
            </div>
            <div className="relative rounded-3xl border-2 border-dashed border-accent bg-accent/10 backdrop-blur-xl px-20 py-16 text-center shadow-2xl">
              <RiUploadCloud2Line className="mx-auto mb-6 text-5xl text-accent animate-bounce" />
              <p className="text-2xl font-bold text-white mb-3">Drop your music files here</p>
              <p className="text-base text-white/70">MP3, M4A, FLAC, WAV, OGG plus cover.jpeg supported</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreatePlaylist && (
        <PlaylistModal onClose={() => setShowCreatePlaylist(false)} onSave={handleCreatePlaylist} />
      )}
      {addToPlaylistTrack && (
        <AddToPlaylistModal
          track={addToPlaylistTrack}
          playlists={localPlaylists}
          onAdd={async (playlistId) => {
            await addTrackToPlaylist(playlistId, addToPlaylistTrack.id);
            setAddToPlaylistTrack(null);
          }}
          onClose={() => setAddToPlaylistTrack(null)}
        />
      )}
      {editTrack && (
        <EditTrackModal
          track={editTrack}
          onSave={async (updates) => {
            await updateTrack(editTrack.id, updates);
            setEditTrack(null);
          }}
          onClose={() => setEditTrack(null)}
        />
      )}

      {/* ── Hero Header - Simplified ── */}
      <div className={isGalaxyS8PlusLayout ? 'mb-4' : 'mb-10'}>
        <div className={`flex flex-col ${isGalaxyS8PlusLayout ? 'gap-3' : 'gap-6'} sm:flex-row sm:items-end sm:justify-between`}>
          <div>
            <h1 className={`bg-gradient-to-r from-white to-white/70 bg-clip-text font-black tracking-tight text-transparent ${
              isGalaxyS8PlusLayout ? 'mb-2 text-3xl leading-none' : 'mb-4 text-4xl'
            }`}>
              My Music
            </h1>
            <div className={`flex flex-wrap items-center font-medium ${isGalaxyS8PlusLayout ? 'gap-1.5 text-[11px]' : 'gap-4 text-sm'}`}>
              <span className={`flex items-center rounded-full border border-white/10 bg-glass-card backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'gap-1 px-2.5 py-1' : 'gap-2 px-4 py-2'}`}>
                <RiMusicLine size={isGalaxyS8PlusLayout ? 13 : 18} className="text-accent" />
                <span className="text-white">{localTracks.length}</span>
                <span className="text-white/50">tracks</span>
              </span>
              <span className={`flex items-center rounded-full border border-white/10 bg-glass-card backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'gap-1 px-2.5 py-1' : 'gap-2 px-4 py-2'}`}>
                <RiTimeLine size={isGalaxyS8PlusLayout ? 13 : 18} className="text-gradient-to" />
                <span className="text-white">{formatDuration(totalDuration)}</span>
                <span className="text-white/50">total</span>
              </span>
              {localTracks.length > 0 && (
                <span className={`flex items-center rounded-full border border-white/10 bg-glass-card backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'gap-1 px-2.5 py-1' : 'gap-2 px-4 py-2'}`}>
                  <span className="text-white">{(localTracks.reduce((s, t) => s + (t.blob?.size || 0), 0) / (1024 * 1024)).toFixed(0)}</span>
                  <span className="text-white/50">MB</span>
                </span>
              )}
            </div>
          </div>

          <div className={`flex flex-wrap ${isGalaxyS8PlusLayout ? 'gap-1.5' : 'gap-3'}`}>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`group flex items-center rounded-2xl bg-theme-gradient font-bold text-white shadow-glow transition-all hover:scale-105 hover:shadow-glow-lg active:scale-95 ${
                isGalaxyS8PlusLayout ? 'gap-1.5 px-4 py-2.5 text-[13px]' : 'gap-3 px-8 py-4 text-base'
              }`}
            >
              <RiUploadCloud2Line size={isGalaxyS8PlusLayout ? 16 : 22} className="group-hover:scale-110 transition-transform" /> 
              {isGalaxyS8PlusLayout ? 'Add' : 'Add Files'}
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className={`group flex items-center rounded-2xl border border-white/10 bg-glass-card font-bold text-white/80 shadow-lg backdrop-blur-xl transition-all hover:scale-105 hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95 ${
                isGalaxyS8PlusLayout ? 'gap-1.5 px-4 py-2.5 text-[13px]' : 'gap-3 px-6 py-4 text-base'
              }`}
            >
              <RiPlayListAddLine size={isGalaxyS8PlusLayout ? 16 : 22} className="transition-transform group-hover:scale-110" />
              {isGalaxyS8PlusLayout ? 'Folder' : 'Add Folder'}
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.m4a,.wav,.ogg,.flac,.aac,.jpg,.jpeg,.png,.webp"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) { importFiles(e.target.files); e.target.value = ''; } }}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
            onChange={e => { if (e.target.files) { importFiles(e.target.files); e.target.value = ''; } }}
          />
        </div>

        {/* Import Progress Bar */}
        {importProgress.isRunning && (
          <div className={`rounded-2xl border border-white/10 bg-glass-card backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'mt-4 p-4' : 'mt-8 p-6'}`}>
            <div className={`flex items-center justify-between ${isGalaxyS8PlusLayout ? 'mb-2' : 'mb-3'}`}>
              <span className={`flex items-center font-semibold text-white ${isGalaxyS8PlusLayout ? 'gap-2 text-xs' : 'gap-3 text-sm'}`}>
                <RiLoader4Line className="animate-spin text-accent" size={isGalaxyS8PlusLayout ? 16 : 20} />
                Importing {importProgress.current}
              </span>
              <span className={`${isGalaxyS8PlusLayout ? 'text-xs' : 'text-sm'} font-bold text-white/70`}>{importProgress.done}/{importProgress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-theme-gradient transition-all duration-300 shadow-glow-sm"
                style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
        {!importProgress.isRunning && importProgress.rejected > 0 && (
          <div className={`rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-100 backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'mt-4 p-3 text-xs' : 'mt-6 p-4 text-sm'}`}>
            <div className="font-bold">Upload protection blocked {importProgress.rejected} item{importProgress.rejected === 1 ? '' : 's'}.</div>
            {importProgress.abuseFlags.length > 0 && (
              <div className="mt-1 text-amber-100/70">
                Reason: {importProgress.abuseFlags.join(', ').replace(/_/g, ' ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs + Controls ── */}
      <div className={`mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between ${isGalaxyS8PlusLayout ? 'gap-2.5' : 'mb-6 gap-5'}`}>
        <div className={`flex overflow-x-auto scrollbar-hidden pb-1 ${isGalaxyS8PlusLayout ? 'gap-1.5' : 'gap-2.5'}`}>
          {tabItems.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key !== 'playlists') setSelectedPlaylist(null); }}
              className={`group flex flex-shrink-0 items-center rounded-2xl font-semibold transition-all duration-300 ${
                isGalaxyS8PlusLayout ? 'gap-1.5 px-3 py-2 text-[12px]' : 'gap-2.5 px-5 py-3 text-sm'
              } ${
                tab === t.key
                  ? 'bg-white text-black shadow-lg scale-105'
                  : 'bg-glass-card backdrop-blur-xl border border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105'
              }`}
            >
              <t.icon size={isGalaxyS8PlusLayout ? 14 : 18} className={`transition-transform group-hover:scale-110 ${tab === t.key ? 'text-black' : 'text-accent'}`} />
              {isGalaxyS8PlusLayout ? t.compactLabel : t.label}
            </button>
          ))}
        </div>

        <div className={`flex items-center ${isGalaxyS8PlusLayout ? 'gap-2' : 'gap-3'}`}>
          {/* Search */}
          <div className="relative flex-1">
            <RiSearchLine className={`absolute top-1/2 -translate-y-1/2 text-white/40 ${isGalaxyS8PlusLayout ? 'left-3' : 'left-4'}`} size={isGalaxyS8PlusLayout ? 14 : 16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isGalaxyS8PlusLayout ? 'Search library...' : 'Search your library…'}
              className={`rounded-2xl border border-white/10 bg-glass-card text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:border-accent/50 focus:shadow-lg ${
                isGalaxyS8PlusLayout
                  ? 'h-9 w-full min-w-0 pl-8 pr-8 text-[12px] focus:w-full'
                  : 'h-11 w-48 pl-11 pr-10 text-sm focus:w-64'
              }`}
            />
            {search && (
              <button onClick={() => setSearch('')} className={`absolute top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white ${isGalaxyS8PlusLayout ? 'right-2.5' : 'right-3'}`}>
                <RiCloseLine size={isGalaxyS8PlusLayout ? 16 : 18} />
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <button
            onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            className={`rounded-2xl border border-white/10 bg-glass-card text-white/70 transition-all duration-300 hover:scale-105 hover:border-white/20 hover:bg-white/10 hover:text-white ${
              isGalaxyS8PlusLayout ? 'min-h-[36px] min-w-[36px] p-2' : 'p-3'
            }`}
          >
            {viewMode === 'list' ? <RiGridLine size={isGalaxyS8PlusLayout ? 14 : 18} /> : <RiListUnordered size={isGalaxyS8PlusLayout ? 14 : 18} />}
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!isLoaded && (
        <div className={`flex flex-col items-center justify-center text-center ${isGalaxyS8PlusLayout ? 'py-14' : 'py-32'}`}>
          <div className="relative">
            <div className="absolute inset-0 animate-ping opacity-20">
              <div className={`${isGalaxyS8PlusLayout ? 'h-12 w-12' : 'h-16 w-16'} rounded-full bg-accent`}></div>
            </div>
            <RiLoader4Line className={`relative text-accent animate-spin ${isGalaxyS8PlusLayout ? 'mb-4 text-3xl' : 'mb-6 text-4xl'}`} />
          </div>
          <p className={`${isGalaxyS8PlusLayout ? 'text-sm' : 'text-base'} font-medium text-white/60`}>Loading your local library…</p>
        </div>
      )}

      {isLoaded && localTracks.length === 0 && tab !== 'playlists' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 text-center transition-all duration-300 hover:scale-[1.01] hover:border-accent/50 hover:bg-accent/5 ${
            isGalaxyS8PlusLayout ? 'px-4 py-10' : 'py-32'
          }`}
        >
          <div className={`relative ${isGalaxyS8PlusLayout ? 'mb-5' : 'mb-8'}`}>
            <div className="absolute inset-0 blur-2xl opacity-50 group-hover:opacity-70 transition-opacity">
              <div className={`${isGalaxyS8PlusLayout ? 'h-16 w-16' : 'h-24 w-24'} rounded-full bg-accent`}></div>
            </div>
            <div className={`relative flex items-center justify-center rounded-full border border-accent/20 bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-xl transition-all duration-300 group-hover:scale-110 group-hover:border-accent/40 ${
              isGalaxyS8PlusLayout ? 'h-16 w-16' : 'h-24 w-24'
            }`}>
              <RiUploadCloud2Line className={`text-accent transition-transform group-hover:scale-110 ${isGalaxyS8PlusLayout ? 'text-2xl' : 'text-4xl'}`} />
            </div>
          </div>
          <h3 className={`font-bold text-white ${isGalaxyS8PlusLayout ? 'mb-2 text-xl leading-tight' : 'mb-3 text-2xl'}`}>Add your first tracks</h3>
          <p className={`text-white/50 ${isGalaxyS8PlusLayout ? 'mb-4 max-w-[240px] text-sm leading-snug' : 'mb-6 max-w-md text-base leading-relaxed'}`}>
            {isGalaxyS8PlusLayout
              ? 'Tap to add music from your device.'
              : 'Drag & drop music files here, or click to browse. Your music stays entirely on your device — no uploads needed.'}
          </p>
          <div className={`flex flex-wrap justify-center ${isGalaxyS8PlusLayout ? 'gap-1.5' : 'gap-2.5'}`}>
            {['MP3', 'FLAC', 'M4A'].map((format) => (
              <span
                key={format}
                className={`rounded-full border border-white/10 bg-glass-card backdrop-blur-xl font-semibold text-white/70 ${
                  isGalaxyS8PlusLayout ? 'px-3 py-1 text-[10px]' : 'px-4 py-2 text-xs'
                }`}
              >
                {format}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Playlists Tab ── */}
      {isLoaded && tab === 'playlists' && !selectedPlaylist && (
        <div className={isGalaxyS8PlusLayout ? 'space-y-4' : 'space-y-6'}>
          <div className="flex items-center justify-between">
            <h2 className={`${isGalaxyS8PlusLayout ? 'text-lg' : 'text-2xl'} font-bold text-white`}>Local Playlists</h2>
            <button
              onClick={() => setShowCreatePlaylist(true)}
              className={`group flex items-center rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/20 to-accent/10 font-bold text-accent transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/20 ${
                isGalaxyS8PlusLayout ? 'gap-1.5 px-3 py-2 text-[12px]' : 'gap-2.5 px-5 py-3 text-sm'
              }`}
            >
              <RiAddLine size={isGalaxyS8PlusLayout ? 14 : 18} className="group-hover:rotate-90 transition-transform duration-300" /> 
              {isGalaxyS8PlusLayout ? 'New' : 'New Playlist'}
            </button>
          </div>

          {localPlaylists.length === 0 ? (
            <div className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 text-center ${
              isGalaxyS8PlusLayout ? 'px-4 py-10' : 'py-32'
            }`}>
              <div className={`mb-5 flex items-center justify-center rounded-full border border-accent/20 bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-xl ${
                isGalaxyS8PlusLayout ? 'h-16 w-16' : 'h-24 w-24'
              }`}>
                <RiPlayListLine className={`${isGalaxyS8PlusLayout ? 'text-2xl' : 'text-4xl'} text-accent`} />
              </div>
              <h3 className={`${isGalaxyS8PlusLayout ? 'text-lg' : 'text-xl'} mb-2 font-bold text-white`}>No playlists yet</h3>
              <p className={`${isGalaxyS8PlusLayout ? 'mb-4 text-xs' : 'mb-6 text-sm'} text-white/50`}>Create one to organize your music.</p>
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className={`flex items-center gap-2 rounded-2xl bg-theme-gradient font-bold text-white shadow-glow-sm transition-all hover:scale-105 ${
                  isGalaxyS8PlusLayout ? 'px-4 py-2 text-[12px]' : 'px-6 py-3 text-sm'
                }`}
              >
                <RiAddLine size={isGalaxyS8PlusLayout ? 14 : 18} /> {isGalaxyS8PlusLayout ? 'Create' : 'Create Playlist'}
              </button>
            </div>
          ) : (
            <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${isGalaxyS8PlusLayout ? 'gap-3' : 'gap-5'}`}>
              {localPlaylists.map(pl => {
                const trackCount = pl.trackIds.length;
                return (
                  <button
                    key={pl.id}
                    onClick={() => { setSelectedPlaylist(pl); }}
                    className={`group relative flex flex-col items-start rounded-2xl border border-white/10 bg-glass-card text-left transition-all duration-300 hover:scale-105 hover:border-white/20 hover:bg-white/10 hover:shadow-xl ${
                      isGalaxyS8PlusLayout ? 'p-3' : 'p-5'
                    }`}
                  >
                    <div
                      className={`aspect-square w-full rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105 ${isGalaxyS8PlusLayout ? 'mb-2.5' : 'mb-4'}`}
                      style={{ background: `linear-gradient(135deg, ${pl.coverGradient?.[0] || '#333'}, ${pl.coverGradient?.[1] || '#222'})` }}
                    >
                      <div className="flex h-full w-full items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity">
                        <RiPlayListLine size={isGalaxyS8PlusLayout ? 30 : 48} className="text-white" />
                      </div>
                    </div>
                    <div className="w-full">
                      <p className={`${isGalaxyS8PlusLayout ? 'mb-0.5 text-sm' : 'mb-1 text-base'} truncate font-bold text-white`}>{pl.title}</p>
                      <p className={`${isGalaxyS8PlusLayout ? 'text-[10px]' : 'text-xs'} text-white/50`}>{trackCount} {trackCount === 1 ? 'track' : 'tracks'}</p>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                      className="absolute top-4 right-4 hidden group-hover:flex h-8 w-8 items-center justify-center rounded-full bg-black/70 backdrop-blur-xl text-white/60 hover:text-red-400 hover:bg-red-400/20 transition-all duration-200"
                    >
                      <RiDeleteBinLine size={14} />
                    </button>
                  </button>
                );
              })}
              {/* Create new card */}
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className={`group aspect-square flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 transition-all duration-300 hover:scale-105 hover:border-accent/50 hover:bg-accent/5 ${
                  isGalaxyS8PlusLayout ? 'p-3' : 'p-5'
                }`}
              >
                <div className={`flex items-center justify-center rounded-full bg-accent/10 transition-all duration-300 group-hover:bg-accent/20 group-hover:scale-110 ${isGalaxyS8PlusLayout ? 'mb-2 h-12 w-12' : 'mb-3 h-16 w-16'}`}>
                  <RiAddLine className={`${isGalaxyS8PlusLayout ? 'text-2xl' : 'text-3xl'} text-accent transition-transform group-hover:rotate-90`} />
                </div>
                <span className={`${isGalaxyS8PlusLayout ? 'text-[11px]' : 'text-sm'} font-semibold text-white/60 transition-colors group-hover:text-accent`}>New Playlist</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Playlist Detail ── */}
      {isLoaded && tab === 'playlists' && selectedPlaylist && (
        <div className={isGalaxyS8PlusLayout ? 'space-y-4' : 'space-y-6'}>
          <button
            onClick={() => setSelectedPlaylist(null)}
            className={`group flex items-center gap-2 font-medium text-white/60 transition-colors hover:text-white ${isGalaxyS8PlusLayout ? 'text-xs' : 'text-sm'}`}
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span> All Playlists
          </button>
          <div className={`flex items-center rounded-3xl border border-white/10 bg-glass-card backdrop-blur-xl ${isGalaxyS8PlusLayout ? 'gap-3 p-4' : 'gap-6 p-6'}`}>
            <div
              className={`${isGalaxyS8PlusLayout ? 'h-20 w-20' : 'h-32 w-32'} flex-shrink-0 rounded-2xl shadow-2xl`}
              style={{ background: `linear-gradient(135deg, ${selectedPlaylist.coverGradient?.[0] || '#333'}, ${selectedPlaylist.coverGradient?.[1] || '#222'})` }}
            >
              <div className="flex h-full w-full items-center justify-center opacity-40">
                <RiPlayListLine size={isGalaxyS8PlusLayout ? 34 : 56} className="text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className={`font-bold uppercase tracking-widest text-accent ${isGalaxyS8PlusLayout ? 'mb-1 text-[10px]' : 'mb-2 text-xs'}`}>Local Playlist</p>
              <h2 className={`${isGalaxyS8PlusLayout ? 'mb-1 text-2xl' : 'mb-2 text-4xl'} font-black text-white`}>{selectedPlaylist.title}</h2>
              <p className={`${isGalaxyS8PlusLayout ? 'text-sm' : 'text-base'} font-medium text-white/60`}>{selectedPlaylist.trackIds.length} {selectedPlaylist.trackIds.length === 1 ? 'track' : 'tracks'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Track List / Grid ── */}
      {isLoaded && localTracks.length > 0 && (tab !== 'playlists' || selectedPlaylist) && (
        <div className={isGalaxyS8PlusLayout ? 'mt-4' : 'mt-6'}>
          {/* Sort row (list mode only) */}
          {viewMode === 'list' && tab !== 'mostPlayed' && tab !== 'recent' && !(tab === 'playlists' && selectedPlaylist) && (
            <div className={`mb-1 flex items-center border-b border-white/5 font-bold uppercase tracking-widest text-white/30 ${isGalaxyS8PlusLayout ? 'gap-2 px-2.5 py-1.5 text-[10px]' : 'gap-3 px-3 py-2 text-xs'}`}>
              <div className={`${isGalaxyS8PlusLayout ? 'w-7' : 'w-10'} flex-shrink-0 ${isGalaxyS8PlusLayout ? 'text-center' : 'pl-1'}`}></div>
              <div className={`${isGalaxyS8PlusLayout ? 'w-9' : 'w-11'} flex-shrink-0`} />
              <button onClick={() => toggleSort('title')} className="flex flex-1 items-center gap-2 hover:text-white/50 transition-colors">
                Title {sortKey === 'title' && (sortDir === 'asc' ? <RiSortAsc size={12} /> : <RiSortDesc size={12} />)}
              </button>
              <button onClick={() => toggleSort('album')} className="hidden md:flex w-44 items-center gap-2 hover:text-white/50 transition-colors">
                Album {sortKey === 'album' && (sortDir === 'asc' ? <RiSortAsc size={12} /> : <RiSortDesc size={12} />)}
              </button>
              <button onClick={() => toggleSort('plays')} className="hidden lg:flex w-16 items-center gap-1.5 hover:text-white/50 transition-colors">
                <RiFireLine size={12} /> {sortKey === 'plays' && (sortDir === 'asc' ? <RiSortAsc size={12} /> : <RiSortDesc size={12} />)}
              </button>
              <button onClick={() => toggleSort('duration')} className="flex w-12 items-center gap-1.5 justify-end hover:text-white/50 transition-colors">
                <RiTimeLine size={12} /> {sortKey === 'duration' && (sortDir === 'asc' ? <RiSortAsc size={12} /> : <RiSortDesc size={12} />)}
              </button>
              <div className="w-8 flex-shrink-0" />
            </div>
          )}

          {viewMode === 'list' ? (
            <div className={isGalaxyS8PlusLayout ? 'space-y-0.5' : 'space-y-1'}>
              {displayTracks.length === 0 ? (
                <div className="py-20 text-center">
                  <RiMusicLine className="mx-auto mb-4 text-3xl text-white/20" />
                  <p className="text-sm text-white/40">No tracks found.</p>
                </div>
              ) : displayTracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isActive={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  playCounts={playCounts}
                  onPlay={handlePlayRow}
                  onDelete={handleDeleteRow}
                  onAddToPlaylist={setAddToPlaylistTrack}
                  onEdit={setEditTrack}
                  onAddToQueue={handleAddToQueue}
                  onPlayNext={handlePlayNext}
                  compact={isGalaxyS8PlusLayout}
                />
              ))}
            </div>
          ) : (
            <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${isGalaxyS8PlusLayout ? 'gap-3' : 'gap-4'}`}>
              {displayTracks.map(track => {
                return (
                  <button
                    key={track.id}
                    onClick={(e) => {
                      const coverEl = e.currentTarget.querySelector('.grid-track-cover') as HTMLElement;
                      handlePlayRow(track, coverEl);
                    }}
                    className={`group relative flex flex-col rounded-2xl bg-glass-card backdrop-blur-xl p-4 text-left transition hover:bg-card-hover ${
                      currentTrack?.id === track.id ? 'ring-2 ring-accent' : ''
                    }`}
                  >
                    <div className="grid-track-cover relative mb-3 aspect-square w-full">
                      {track.coverUrl ? (
                        <img src={track.coverUrl} alt={track.title} className="h-full w-full rounded-xl object-cover shadow-lg" />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center rounded-xl shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
                        >
                          <RiMusicLine size={32} className="text-white/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition group-hover:opacity-100">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-glow">
                          <RiPlayFill size={22} className="text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p className={`text-sm font-bold truncate ${currentTrack?.id === track.id ? 'text-accent' : 'text-white'}`}>
                      {track.title}
                    </p>
                    <p className="text-xs text-dimText truncate">{track.artist}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className={isGalaxyS8PlusLayout ? 'h-3' : 'h-8'} />
    </div>
  );
}
