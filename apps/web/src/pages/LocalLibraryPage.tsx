import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { Playlist } from '../types';
import type { LocalTrack } from '../services/localDb';
import gsap from 'gsap';
import { clickedTrackCoverRef } from '../components/player/FullscreenPlayer';
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

function TrackRow({
  track,
  index,
  isActive,
  isPlaying,
  playCounts,
  onPlay,
  onDelete,
  onAddToPlaylist,
  onEdit,
  onAddToQueue,
  onPlayNext,
}: {
  track: LocalTrack;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  playCounts: Record<string, number>;
  onPlay: (coverElement: HTMLElement | null) => void;
  onDelete: () => void;
  onAddToPlaylist: (track: LocalTrack) => void;
  onEdit: (track: LocalTrack) => void;
  onAddToQueue: (track: LocalTrack) => void;
  onPlayNext: (track: LocalTrack) => void;
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
    // Pass the cover element to the play handler
    onPlay(coverRef.current);
  };

  return (
    <div
      ref={rowRef}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 cursor-pointer hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.01] hover:shadow-md hover:scale-[1.005] ${
        isActive ? 'bg-gradient-to-r from-accent/10 to-accent/5 shadow-sm' : ''
      }`}
      onClick={handlePlayClick}
    >
      {/* Index / Play icon - moved to far left */}
      <div className="w-10 flex-shrink-0 text-left pl-1">
        {isActive && isPlaying ? (
          <span className="text-accent flex gap-[2px] items-end h-4">
            <span className="w-[3px] bg-accent rounded-full animate-[bounce_0.6s_0.0s_infinite]" style={{ height: '60%' }} />
            <span className="w-[3px] bg-accent rounded-full animate-[bounce_0.6s_0.2s_infinite]" style={{ height: '100%' }} />
            <span className="w-[3px] bg-accent rounded-full animate-[bounce_0.6s_0.4s_infinite]" style={{ height: '40%' }} />
          </span>
        ) : (
          <>
            <span className={`text-sm font-medium ${isActive ? 'text-accent' : 'text-white/30'} group-hover:hidden transition-opacity`}>
              {index + 1}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handlePlayClick(); }}
              className="hidden group-hover:flex items-center justify-center text-white w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent/80 hover:scale-110 transition-all duration-200 shadow-md hover:shadow-accent/50"
            >
              <RiPlayFill size={12} />
            </button>
          </>
        )}
      </div>

      {/* Cover art - smaller */}
      <div ref={coverRef} className="flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt={track.title} className="h-11 w-11 rounded-lg object-cover shadow-md ring-1 ring-white/10" />
        ) : (
          <div
            className="h-11 w-11 rounded-lg flex items-center justify-center shadow-md ring-1 ring-white/10"
            style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
          >
            <RiMusicLine size={16} className="text-white/60" />
          </div>
        )}
      </div>

      {/* Title + Artist */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold truncate transition-colors ${isActive ? 'text-accent' : 'text-white group-hover:text-white'}`}>
          {track.title}
        </div>
        <div className="text-xs text-white/50 truncate group-hover:text-white/60 transition-colors">{track.artist}</div>
      </div>

      {/* Album */}
      <div className="hidden md:block w-44 text-sm text-white/40 truncate group-hover:text-white/50 transition-colors">{track.album}</div>

      {/* Plays */}
      <div className="hidden lg:flex items-center gap-1.5 w-16 text-xs text-white/40 group-hover:text-white/50 transition-colors">
        <RiFireLine size={12} className="text-accent/60" />
        <span>{playCounts[track.id] || 0}</span>
      </div>

      {/* Duration */}
      <div className="w-12 text-xs text-white/40 text-right flex-shrink-0 font-medium group-hover:text-white/50 transition-colors">
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
          className={`rounded-full p-1.5 transition-all duration-200 ${
            showMenu ? 'bg-white/15 text-white opacity-100 scale-105' : 'text-white/30 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10 hover:scale-105'
          }`}
        >
          <RiMore2Fill size={16} />
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
                onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
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
}

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
            <RiPlayListLine className="mx-auto mb-4 text-5xl text-white/20" />
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

  const { playTrack, currentTrack, isPlaying, setFullscreenOpen } = usePlayerStore();

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

  const handlePlay = (track: LocalTrack, coverElement: HTMLElement | null) => {
    // Store the clicked cover element for animation
    if (coverElement) {
      clickedTrackCoverRef.current = coverElement;
    }

    // Check if this track is already playing
    const isAlreadyPlaying = currentTrack?.id === track.id;

    if (isAlreadyPlaying) {
      // Track is already playing, just open fullscreen
      setTimeout(() => {
        setFullscreenOpen(true);
      }, 100);
    } else {
      // New track, play it and open fullscreen
      playTrack(track, displayTracks);
      recordPlay(track.id);
      
      setTimeout(() => {
        setFullscreenOpen(true);
      }, 100);
    }
  };

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
    { key: 'all' as const, label: 'All Tracks', icon: RiMusicLine },
    { key: 'playlists' as const, label: 'Playlists', icon: RiPlayListLine },
    { key: 'mostPlayed' as const, label: 'Most Played', icon: RiFireLine },
    { key: 'recent' as const, label: 'Recently Played', icon: RiHistoryLine },
  ];

  return (
    <div
      className="relative page-enter min-h-full"
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
              <RiUploadCloud2Line className="mx-auto mb-6 text-7xl text-accent animate-bounce" />
              <p className="text-2xl font-bold text-white mb-3">Drop your music files here</p>
              <p className="text-base text-white/70">MP3, M4A, FLAC, WAV, OGG supported</p>
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
      <div className="mb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-6xl font-black text-white tracking-tight mb-4 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              My Music
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
              <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-glass-card backdrop-blur-xl border border-white/10">
                <RiMusicLine size={18} className="text-accent" />
                <span className="text-white">{localTracks.length}</span>
                <span className="text-white/50">tracks</span>
              </span>
              <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-glass-card backdrop-blur-xl border border-white/10">
                <RiTimeLine size={18} className="text-gradient-to" />
                <span className="text-white">{formatDuration(totalDuration)}</span>
                <span className="text-white/50">total</span>
              </span>
              {localTracks.length > 0 && (
                <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-glass-card backdrop-blur-xl border border-white/10">
                  <span className="text-white">{(localTracks.reduce((s, t) => s + (t.blob?.size || 0), 0) / (1024 * 1024)).toFixed(0)}</span>
                  <span className="text-white/50">MB</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group flex items-center gap-3 rounded-2xl bg-theme-gradient px-8 py-4 text-base font-bold text-white shadow-glow transition-all hover:scale-105 hover:shadow-glow-lg active:scale-95"
            >
              <RiUploadCloud2Line size={22} className="group-hover:scale-110 transition-transform" /> 
              Add Files
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.m4a,.wav,.ogg,.flac,.aac"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) { importFiles(e.target.files); e.target.value = ''; } }}
          />
        </div>

        {/* Import Progress Bar */}
        {importProgress.isRunning && (
          <div className="mt-8 rounded-2xl bg-glass-card backdrop-blur-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white flex items-center gap-3">
                <RiLoader4Line className="animate-spin text-accent" size={20} />
                Importing {importProgress.current}
              </span>
              <span className="text-sm font-bold text-white/70">{importProgress.done}/{importProgress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-theme-gradient transition-all duration-300 shadow-glow-sm"
                style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs + Controls ── */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hidden pb-1">
          {tabItems.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key !== 'playlists') setSelectedPlaylist(null); }}
              className={`group flex flex-shrink-0 items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 ${
                tab === t.key
                  ? 'bg-white text-black shadow-lg scale-105'
                  : 'bg-glass-card backdrop-blur-xl border border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105'
              }`}
            >
              <t.icon size={18} className={`transition-transform group-hover:scale-110 ${tab === t.key ? 'text-black' : 'text-accent'}`} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <RiSearchLine className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your library…"
              className="h-11 w-48 rounded-2xl bg-glass-card backdrop-blur-xl border border-white/10 pl-11 pr-10 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-300 focus:w-64 focus:border-accent/50 focus:shadow-lg"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                <RiCloseLine size={18} />
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <button
            onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            className="rounded-2xl bg-glass-card backdrop-blur-xl border border-white/10 p-3 text-white/70 transition-all duration-300 hover:text-white hover:bg-white/10 hover:border-white/20 hover:scale-105"
          >
            {viewMode === 'list' ? <RiGridLine size={18} /> : <RiListUnordered size={18} />}
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!isLoaded && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping opacity-20">
              <div className="h-16 w-16 rounded-full bg-accent"></div>
            </div>
            <RiLoader4Line className="relative mb-6 text-6xl text-accent animate-spin" />
          </div>
          <p className="text-base text-white/60 font-medium">Loading your local library…</p>
        </div>
      )}

      {isLoaded && localTracks.length === 0 && tab !== 'playlists' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 py-32 text-center cursor-pointer transition-all duration-300 hover:border-accent/50 hover:bg-accent/5 hover:scale-[1.01]"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 blur-2xl opacity-50 group-hover:opacity-70 transition-opacity">
              <div className="h-24 w-24 rounded-full bg-accent"></div>
            </div>
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-xl border border-accent/20 transition-all duration-300 group-hover:scale-110 group-hover:border-accent/40">
              <RiUploadCloud2Line className="text-5xl text-accent transition-transform group-hover:scale-110" />
            </div>
          </div>
          <h3 className="mb-3 text-2xl font-bold text-white">Add your first tracks</h3>
          <p className="text-base text-white/50 max-w-md mb-6 leading-relaxed">
            Drag & drop music files here, or click to browse. Your music stays entirely on your device — no uploads needed.
          </p>
          <div className="flex gap-2.5">
            <span className="rounded-full bg-glass-card backdrop-blur-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70">MP3</span>
            <span className="rounded-full bg-glass-card backdrop-blur-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70">FLAC</span>
            <span className="rounded-full bg-glass-card backdrop-blur-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70">M4A</span>
            <span className="rounded-full bg-glass-card backdrop-blur-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70">WAV</span>
            <span className="rounded-full bg-glass-card backdrop-blur-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70">OGG</span>
          </div>
        </div>
      )}

      {/* ── Playlists Tab ── */}
      {isLoaded && tab === 'playlists' && !selectedPlaylist && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Local Playlists</h2>
            <button
              onClick={() => setShowCreatePlaylist(true)}
              className="group flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 px-5 py-3 text-sm font-bold text-accent transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent/20"
            >
              <RiAddLine size={18} className="group-hover:rotate-90 transition-transform duration-300" /> 
              New Playlist
            </button>
          </div>

          {localPlaylists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center rounded-3xl border-2 border-dashed border-white/10">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent/5 backdrop-blur-xl border border-accent/20">
                <RiPlayListLine className="text-5xl text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">No playlists yet</h3>
              <p className="text-sm text-white/50 mb-6">Create one to organize your music!</p>
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className="flex items-center gap-2 rounded-2xl bg-theme-gradient px-6 py-3 text-sm font-bold text-white shadow-glow-sm transition-all hover:scale-105"
              >
                <RiAddLine size={18} /> Create Playlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {localPlaylists.map(pl => {
                const trackCount = pl.trackIds.length;
                return (
                  <button
                    key={pl.id}
                    onClick={() => { setSelectedPlaylist(pl); }}
                    className="group relative flex flex-col items-start rounded-2xl bg-glass-card backdrop-blur-xl border border-white/10 p-5 text-left transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105 hover:shadow-xl"
                  >
                    <div
                      className="mb-4 aspect-square w-full rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105"
                      style={{ background: `linear-gradient(135deg, ${pl.coverGradient?.[0] || '#333'}, ${pl.coverGradient?.[1] || '#222'})` }}
                    >
                      <div className="flex h-full w-full items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity">
                        <RiPlayListLine size={48} className="text-white" />
                      </div>
                    </div>
                    <div className="w-full">
                      <p className="text-base font-bold text-white truncate mb-1">{pl.title}</p>
                      <p className="text-xs text-white/50">{trackCount} {trackCount === 1 ? 'track' : 'tracks'}</p>
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
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 p-5 transition-all duration-300 hover:border-accent/50 hover:bg-accent/5 hover:scale-105 aspect-square"
              >
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 transition-all duration-300 group-hover:bg-accent/20 group-hover:scale-110">
                  <RiAddLine className="text-3xl text-accent transition-transform group-hover:rotate-90" />
                </div>
                <span className="text-sm font-semibold text-white/60 group-hover:text-accent transition-colors">New Playlist</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Playlist Detail ── */}
      {isLoaded && tab === 'playlists' && selectedPlaylist && (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedPlaylist(null)}
            className="group flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span> All Playlists
          </button>
          <div className="flex items-center gap-6 p-6 rounded-3xl bg-glass-card backdrop-blur-xl border border-white/10">
            <div
              className="h-32 w-32 flex-shrink-0 rounded-2xl shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${selectedPlaylist.coverGradient?.[0] || '#333'}, ${selectedPlaylist.coverGradient?.[1] || '#222'})` }}
            >
              <div className="flex h-full w-full items-center justify-center opacity-40">
                <RiPlayListLine size={56} className="text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Local Playlist</p>
              <h2 className="text-4xl font-black text-white mb-2">{selectedPlaylist.title}</h2>
              <p className="text-base text-white/60 font-medium">{selectedPlaylist.trackIds.length} {selectedPlaylist.trackIds.length === 1 ? 'track' : 'tracks'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Track List / Grid ── */}
      {isLoaded && localTracks.length > 0 && (tab !== 'playlists' || selectedPlaylist) && (
        <div className="mt-6">
          {/* Sort row (list mode only) */}
          {viewMode === 'list' && tab !== 'mostPlayed' && tab !== 'recent' && !(tab === 'playlists' && selectedPlaylist) && (
            <div className="mb-2 flex items-center gap-3 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/30 border-b border-white/5">
              <div className="w-10 flex-shrink-0 pl-1">#</div>
              <div className="w-11 flex-shrink-0" />
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
            <div className="space-y-1">
              {displayTracks.length === 0 ? (
                <div className="py-20 text-center">
                  <RiMusicLine className="mx-auto mb-4 text-5xl text-white/20" />
                  <p className="text-sm text-white/40">No tracks found.</p>
                </div>
              ) : displayTracks.map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  isActive={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                  playCounts={playCounts}
                  onPlay={(coverElement) => handlePlay(track, coverElement)}
                  onDelete={() => removeTrack(track.id)}
                  onAddToPlaylist={setAddToPlaylistTrack}
                  onEdit={setEditTrack}
                  onAddToQueue={(track) => {
                    const { addToQueue } = usePlayerStore.getState();
                    addToQueue(track);
                  }}
                  onPlayNext={(track) => {
                    const { playNext } = usePlayerStore.getState();
                    playNext(track);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {displayTracks.map(track => {
                const coverRef = useRef<HTMLDivElement>(null);
                
                return (
                  <button
                    key={track.id}
                    onClick={(e) => {
                      const coverEl = e.currentTarget.querySelector('.grid-track-cover') as HTMLElement;
                      handlePlay(track, coverEl);
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

      <div className="h-8" />
    </div>
  );
}
