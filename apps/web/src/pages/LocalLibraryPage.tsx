import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  RiPlayListAddLine,
  RiSkipForwardLine,
} from 'react-icons/ri';

type SortKey = 'title' | 'artist' | 'album' | 'duration' | 'addedAt' | 'plays';
type SortDir = 'asc' | 'desc';
type ViewTab = 'all' | 'playlists' | 'mostPlayed' | 'recent';
type ViewMode = 'list' | 'grid';

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

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
      className={`group flex items-center gap-3 rounded-xl px-3 py-2 transition-all cursor-pointer hover:bg-white/5 ${
        isActive ? 'bg-accent/10' : ''
      }`}
      onClick={handlePlayClick}
    >
      {/* Index / Play icon */}
      <div className="w-6 flex-shrink-0 text-center">
        {isActive && isPlaying ? (
          <span className="text-accent flex gap-[2px] items-end h-4">
            <span className="w-[3px] bg-accent animate-[bounce_0.6s_0.0s_infinite]" style={{ height: '60%' }} />
            <span className="w-[3px] bg-accent animate-[bounce_0.6s_0.2s_infinite]" style={{ height: '100%' }} />
            <span className="w-[3px] bg-accent animate-[bounce_0.6s_0.4s_infinite]" style={{ height: '40%' }} />
          </span>
        ) : (
          <>
            <span className={`text-xs ${isActive ? 'text-accent' : 'text-dimText'} group-hover:hidden`}>
              {index + 1}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handlePlayClick(); }}
              className="hidden group-hover:flex items-center justify-center text-white w-6 h-6 rounded-full bg-accent/20 hover:bg-accent hover:scale-110 transition-all"
            >
              <RiPlayFill size={12} />
            </button>
          </>
        )}
      </div>

      {/* Cover art */}
      <div ref={coverRef} className="flex-shrink-0">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt={track.title} className="h-10 w-10 rounded-lg object-cover shadow" />
        ) : (
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
          >
            <RiMusicLine size={16} className="text-white/60" />
          </div>
        )}
      </div>

      {/* Title + Artist */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${isActive ? 'text-accent' : 'text-white'}`}>
          {track.title}
        </div>
        <div className="text-xs text-dimText truncate">{track.artist}</div>
      </div>

      {/* Album */}
      <div className="hidden md:block w-40 text-xs text-softText truncate">{track.album}</div>

      {/* Plays */}
      <div className="hidden lg:block w-16 text-xs text-dimText text-right">
        {playCounts[track.id] || 0} plays
      </div>

      {/* Duration */}
      <div className="w-12 text-xs text-dimText text-right flex-shrink-0">
        {formatDuration(track.duration)}
      </div>

      {/* 3-Dot Menu */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className={`rounded-full p-1.5 transition hover:text-white hover:bg-white/10 ${
            showMenu ? 'bg-white/10 text-white opacity-100' : 'text-dimText opacity-0 group-hover:opacity-100'
          }`}
        >
          <RiMore2Fill size={16} />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 top-full z-[60] mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0E0E10]/95 py-1.5 shadow-2xl backdrop-blur-xl animate-scale-in">
            <button
              onClick={(e) => { e.stopPropagation(); setLiked(l => !l); setShowMenu(false); }}
              className="grid w-full grid-cols-[18px_1fr] items-center gap-3 px-4 py-3 text-left text-sm text-white transition hover:bg-white/5"
            >
              {liked ? <RiHeartFill size={16} className="text-accent" /> : <RiHeartLine size={16} />}
              <span className="truncate whitespace-nowrap">{liked ? 'Unlike' : 'Like'}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(track); setShowMenu(false); }}
              className="grid w-full grid-cols-[18px_1fr] items-center gap-3 px-4 py-3 text-left text-sm text-white transition hover:bg-white/5"
            >
              <RiEditLine size={16} />
              <span className="truncate whitespace-nowrap">Edit Track Info</span>
            </button>
            <div className="mx-3 my-1.5 h-px bg-white/10" />
            <button
              onClick={(e) => { e.stopPropagation(); onAddToQueue(track); setShowMenu(false); }}
              className="grid w-full grid-cols-[18px_1fr] items-center gap-3 px-4 py-3 text-left text-sm text-white transition hover:bg-white/5"
            >
              <RiPlayListAddLine size={16} />
              <span className="truncate whitespace-nowrap">Add to Queue</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onPlayNext(track); setShowMenu(false); }}
              className="grid w-full grid-cols-[18px_1fr] items-center gap-3 px-4 py-3 text-left text-sm text-white transition hover:bg-white/5"
            >
              <RiSkipForwardLine size={16} />
              <span className="truncate whitespace-nowrap">Play Next</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); setShowMenu(false); }}
              className="grid w-full grid-cols-[18px_1fr] items-center gap-3 px-4 py-3 text-left text-sm text-white transition hover:bg-white/5"
            >
              <RiAddLine size={16} />
              <span className="truncate whitespace-nowrap">Add to Playlist</span>
            </button>
            <div className="mx-3 my-1.5 h-px bg-white/10" />
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
              className="grid w-full grid-cols-[18px_1fr] items-center gap-3 px-4 py-3 text-left text-sm text-red-400 transition hover:bg-red-400/10"
            >
              <RiDeleteBinLine size={16} />
              <span className="truncate whitespace-nowrap">Remove from Library</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Playlist Create/Rename Modal ───

function PlaylistModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-surface border border-white/10 p-8 shadow-2xl animate-scale-in">
        <h3 className="mb-4 text-lg font-bold text-white">New Playlist</h3>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
          placeholder="Playlist name…"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50"
        />
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full bg-white/5 py-2.5 text-sm text-softText transition hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onSave(name.trim())}
            className="flex-1 rounded-full bg-go-gradient py-2.5 text-sm font-bold text-white shadow-glow transition hover:scale-105 disabled:opacity-50"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-3xl bg-surface border border-white/10 p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Add to Playlist</h3>
          <button onClick={onClose} className="text-dimText hover:text-white">
            <RiCloseLine size={20} />
          </button>
        </div>
        <p className="mb-4 text-xs text-softText truncate">{track.title}</p>
        {playlists.length === 0 ? (
          <p className="text-xs text-dimText text-center py-4">No playlists yet. Create one first!</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => onAdd(pl.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-white/5"
              >
                <div
                  className="h-8 w-8 flex-shrink-0 rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${pl.coverGradient?.[0] || '#333'}, ${pl.coverGradient?.[1] || '#222'})` }}
                />
                <span className="truncate text-white">{pl.title}</span>
                <span className="ml-auto text-xs text-dimText">{pl.trackIds.length} tracks</span>
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
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSave = () => {
    const updates: Partial<LocalTrack> = {
      title: title.trim() || track.title,
      artist: artist.trim() || track.artist,
      album: album.trim() || undefined,
      year: year.trim() ? parseInt(year) : undefined,
      genre: genre.trim() || undefined,
      coverUrl: coverUrl || undefined,
    };
    onSave(updates);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-surface border border-white/10 p-8 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Edit Track Info</h3>
          <button onClick={onClose} className="text-dimText hover:text-white transition">
            <RiCloseLine size={24} />
          </button>
        </div>

        {/* Album Cover */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-softText uppercase tracking-wider mb-3">
            Album Cover
          </label>
          <div className="flex items-center gap-4">
            <div className="relative group">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Album cover"
                  className="h-32 w-32 rounded-2xl object-cover shadow-xl"
                />
              ) : (
                <div
                  className="h-32 w-32 rounded-2xl flex items-center justify-center shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${track.coverGradient?.[0] || '#333'}, ${track.coverGradient?.[1] || '#222'})` }}
                >
                  <RiMusicLine size={40} className="text-white/40" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingCover}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {isUploadingCover ? (
                  <RiLoader4Line className="text-white text-2xl animate-spin" />
                ) : (
                  <RiImageEditLine className="text-white text-2xl" />
                )}
              </button>
            </div>
            <div className="flex-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingCover}
                className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
              >
                <RiImageEditLine size={16} />
                {isUploadingCover ? 'Uploading...' : 'Change Cover'}
              </button>
              {coverUrl && (
                <button
                  onClick={() => setCoverUrl('')}
                  className="mt-2 text-xs text-dimText hover:text-red-400 transition"
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
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-softText uppercase tracking-wider mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Track title"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-softText uppercase tracking-wider mb-2">
              Artist *
            </label>
            <input
              type="text"
              value={artist}
              onChange={e => setArtist(e.target.value)}
              placeholder="Artist name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-softText uppercase tracking-wider mb-2">
              Album
            </label>
            <input
              type="text"
              value={album}
              onChange={e => setAlbum(e.target.value)}
              placeholder="Album name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-softText uppercase tracking-wider mb-2">
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                placeholder="2024"
                min="1900"
                max="2100"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-softText uppercase tracking-wider mb-2">
                Genre
              </label>
              <input
                type="text"
                value={genre}
                onChange={e => setGenre(e.target.value)}
                placeholder="Pop, Rock, etc."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50"
              />
            </div>
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
            className="flex-1 rounded-full bg-go-gradient py-3 text-sm font-bold text-white shadow-glow transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
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
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-3xl border-2 border-dashed border-accent bg-accent/10 px-16 py-12 text-center">
            <RiUploadCloud2Line className="mx-auto mb-4 text-6xl text-accent animate-bounce" />
            <p className="text-xl font-bold text-white">Drop your music files here</p>
            <p className="mt-2 text-sm text-softText">MP3, M4A, FLAC, WAV, OGG supported</p>
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
      <div className="mb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-5xl font-black text-white tracking-tight mb-3">My Music</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/80 font-medium">
              <span className="flex items-center gap-1.5">
                <RiMusicLine size={16} className="text-accent" />
                {localTracks.length} tracks
              </span>
              <span className="text-white/40">·</span>
              <span className="flex items-center gap-1.5">
                <RiTimeLine size={16} className="text-accentAlt" />
                {formatDuration(totalDuration)} total
              </span>
              {localTracks.length > 0 && (
                <>
                  <span className="text-white/40">·</span>
                  <span>{(localTracks.reduce((s, t) => s + (t.blob?.size || 0), 0) / (1024 * 1024)).toFixed(0)} MB</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group flex items-center gap-2.5 rounded-full bg-go-gradient px-6 py-3 text-sm font-bold text-white shadow-glow-sm transition-all hover:scale-105 hover:shadow-glow active:scale-95"
            >
              <RiUploadCloud2Line size={18} className="group-hover:scale-110 transition-transform" /> 
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
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/70 flex items-center gap-2">
                <RiLoader4Line className="animate-spin" size={14} />
                Importing {importProgress.current}
              </span>
              <span className="text-xs text-white/50">{importProgress.done}/{importProgress.total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-go-gradient transition-all"
                style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs + Controls ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hidden">
          {tabItems.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key !== 'playlists') setSelectedPlaylist(null); }}
              className={`flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-white text-surface font-bold'
                  : 'bg-card text-softText hover:bg-card-hover hover:text-white'
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-dimText" size={14} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your library…"
              className="h-8 w-40 rounded-lg bg-card pl-8 pr-3 text-xs text-white outline-none transition focus:w-52 focus:border focus:border-accent/40"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-dimText hover:text-white">
                <RiCloseLine size={13} />
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <button
            onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            className="rounded-lg bg-card p-2 text-softText transition hover:text-white"
          >
            {viewMode === 'list' ? <RiGridLine size={16} /> : <RiListUnordered size={16} />}
          </button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!isLoaded && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <RiLoader4Line className="mb-4 text-4xl text-accent animate-spin" />
          <p className="text-sm text-dimText">Loading your local library…</p>
        </div>
      )}

      {isLoaded && localTracks.length === 0 && tab !== 'playlists' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 py-24 text-center cursor-pointer transition hover:border-accent/40 hover:bg-accent/5"
        >
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 transition group-hover:bg-accent/10">
            <RiUploadCloud2Line className="text-4xl text-dimText transition group-hover:text-accent" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-white">Add your first tracks</h3>
          <p className="text-sm text-dimText max-w-sm">
            Drag & drop MP3 files here, or click to browse. Your music stays entirely on your device — no uploads needed.
          </p>
          <div className="mt-6 flex gap-3">
            <span className="rounded-full bg-white/5 px-4 py-1.5 text-xs text-softText">MP3</span>
            <span className="rounded-full bg-white/5 px-4 py-1.5 text-xs text-softText">FLAC</span>
            <span className="rounded-full bg-white/5 px-4 py-1.5 text-xs text-softText">M4A</span>
            <span className="rounded-full bg-white/5 px-4 py-1.5 text-xs text-softText">WAV</span>
            <span className="rounded-full bg-white/5 px-4 py-1.5 text-xs text-softText">OGG</span>
          </div>
        </div>
      )}

      {/* ── Playlists Tab ── */}
      {isLoaded && tab === 'playlists' && !selectedPlaylist && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Local Playlists</h2>
            <button
              onClick={() => setShowCreatePlaylist(true)}
              className="flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/30"
            >
              <RiAddLine size={16} /> New Playlist
            </button>
          </div>

          {localPlaylists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RiPlayListLine className="mb-4 text-5xl text-dimText" />
              <p className="text-sm text-dimText">No playlists yet. Create one to organize your music!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {localPlaylists.map(pl => {
                const trackCount = pl.trackIds.length;
                return (
                  <button
                    key={pl.id}
                    onClick={() => { setSelectedPlaylist(pl); }}
                    className="group relative flex flex-col items-start rounded-2xl bg-card p-4 text-left transition hover:bg-card-hover"
                  >
                    <div
                      className="mb-3 aspect-square w-full rounded-xl shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${pl.coverGradient?.[0] || '#333'}, ${pl.coverGradient?.[1] || '#222'})` }}
                    >
                      <div className="flex h-full w-full items-center justify-center opacity-30">
                        <RiPlayListLine size={40} className="text-white" />
                      </div>
                    </div>
                    <div className="w-full">
                      <p className="text-sm font-bold text-white truncate">{pl.title}</p>
                      <p className="text-xs text-dimText mt-0.5">{trackCount} tracks</p>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); deletePlaylist(pl.id); }}
                      className="absolute top-3 right-3 hidden group-hover:flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-dimText hover:text-red-400"
                    >
                      <RiDeleteBinLine size={12} />
                    </button>
                  </button>
                );
              })}
              {/* Create new card */}
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 p-4 transition hover:border-accent/40 hover:bg-accent/5 aspect-square"
              >
                <RiAddLine className="text-3xl text-dimText transition group-hover:text-accent" />
                <span className="mt-2 text-xs text-dimText group-hover:text-accent">New Playlist</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Playlist Detail ── */}
      {isLoaded && tab === 'playlists' && selectedPlaylist && (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedPlaylist(null)}
            className="flex items-center gap-2 text-sm text-softText hover:text-white transition"
          >
            ← All Playlists
          </button>
          <div className="flex items-center gap-4">
            <div
              className="h-24 w-24 flex-shrink-0 rounded-2xl shadow-xl"
              style={{ background: `linear-gradient(135deg, ${selectedPlaylist.coverGradient?.[0] || '#333'}, ${selectedPlaylist.coverGradient?.[1] || '#222'})` }}
            />
            <div>
              <p className="text-xs text-dimText uppercase tracking-widest">Local Playlist</p>
              <h2 className="text-2xl font-black text-white">{selectedPlaylist.title}</h2>
              <p className="text-sm text-softText">{selectedPlaylist.trackIds.length} tracks</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Track List / Grid ── */}
      {isLoaded && localTracks.length > 0 && (tab !== 'playlists' || selectedPlaylist) && (
        <div className="mt-2">
          {/* Sort row (list mode only) */}
          {viewMode === 'list' && tab !== 'mostPlayed' && tab !== 'recent' && !(tab === 'playlists' && selectedPlaylist) && (
            <div className="mb-1 flex items-center gap-3 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-dimText">
              <div className="w-6 flex-shrink-0" />
              <div className="w-10 flex-shrink-0" />
              <button onClick={() => toggleSort('title')} className="flex flex-1 items-center gap-1 hover:text-white transition">
                Title {sortKey === 'title' && (sortDir === 'asc' ? <RiSortAsc size={12} /> : <RiSortDesc size={12} />)}
              </button>
              <button onClick={() => toggleSort('album')} className="hidden md:flex w-40 items-center gap-1 hover:text-white transition">
                Album {sortKey === 'album' && (sortDir === 'asc' ? <RiSortAsc size={12} /> : <RiSortDesc size={12} />)}
              </button>
              <button onClick={() => toggleSort('plays')} className="hidden lg:flex w-16 items-center gap-1 justify-end hover:text-white transition">
                Plays {sortKey === 'plays' && (sortDir === 'asc' ? <RiSortAsc size={12} /> : <RiSortDesc size={12} />)}
              </button>
              <button onClick={() => toggleSort('duration')} className="flex w-12 items-center gap-1 justify-end hover:text-white transition">
                <RiTimeLine size={12} /> {sortKey === 'duration' && (sortDir === 'asc' ? <RiSortAsc size={12} /> : <RiSortDesc size={12} />)}
              </button>
              <div className="w-20 flex-shrink-0" />
            </div>
          )}

          {viewMode === 'list' ? (
            <div className="space-y-0.5">
              {displayTracks.length === 0 ? (
                <div className="py-12 text-center text-sm text-dimText">No tracks found.</div>
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
                    className={`group relative flex flex-col rounded-2xl bg-card p-4 text-left transition hover:bg-card-hover ${
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
