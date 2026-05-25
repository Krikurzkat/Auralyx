import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  RiAddLine,
  RiDiscLine,
  RiMicLine,
  RiMusic2Line,
  RiUploadCloud2Line,
  RiDeleteBinLine,
  RiCheckLine,
  RiTimeLine,
  RiAlbumLine,
  RiUserVoiceLine,
  RiFileMusicLine,
  RiEditLine,
  RiCloseLine,
  RiLoader4Line,
  RiCheckDoubleLine,
  RiErrorWarningLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';

// ─── Types ───

interface ParsedTrackMeta {
  id: string;
  file: File;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number; // seconds
  year: number;
  coverDataUrl: string | null;
  status: 'pending' | 'uploading' | 'creating' | 'done' | 'error';
  errorMsg?: string;
  isEditing: boolean;
}

// ─── Helpers ───

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ─── Component ───

export default function AdminPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upload' | 'artist' | 'album' | 'track'>('upload');
  const [loading, setLoading] = useState(false);

  // Data for dropdowns
  const [artists, setArtists] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);

  // Batch upload state
  const [queue, setQueue] = useState<ParsedTrackMeta[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Fetch artists & albums for dropdowns
  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Unauthorized access');
      navigate('/');
      return;
    }
    const fetchData = async () => {
      try {
        const [artistRes, albumRes] = await Promise.all([
          fetch('http://localhost:3001/api/artists?limit=100'),
          fetch('http://localhost:3001/api/albums?limit=100'),
        ]);
        const artistData = await artistRes.json();
        const albumData = await albumRes.json();
        setArtists(artistData.artists || []);
        setAlbums(albumData.albums || []);
      } catch (err) {
        console.error('Failed to preload dropdown data', err);
      }
    };
    fetchData();
  }, [user, navigate]);

  // ─── ID3 Parsing ───

  const parseFiles = useCallback(async (files: FileList | File[]) => {
    // Dynamic import to avoid bundling issues
    const { parseBlob } = await import('music-metadata-browser');

    const newItems: ParsedTrackMeta[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !['mp3', 'm4a', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
        toast.error(`Skipped "${file.name}" — unsupported format`);
        continue;
      }

      try {
        const metadata = await parseBlob(file);
        const { common, format } = metadata;

        // Extract cover art as data URL
        let coverDataUrl: string | null = null;
        if (common.picture && common.picture.length > 0) {
          const pic = common.picture[0];
          const base64 = btoa(
            pic.data.reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          coverDataUrl = `data:${pic.format};base64,${base64}`;
        }

        newItems.push({
          id: generateId(),
          file,
          title: common.title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          artist: common.artist || 'Unknown Artist',
          album: common.album || 'Unknown Album',
          genre: common.genre?.[0] || '',
          duration: Math.round(format.duration || 0),
          year: common.year || new Date().getFullYear(),
          coverDataUrl,
          status: 'pending',
          isEditing: false,
        });
      } catch (err) {
        console.error(`Failed to parse ${file.name}:`, err);
        // Still add it, just with filename-derived metadata
        newItems.push({
          id: generateId(),
          file,
          title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          genre: '',
          duration: 0,
          year: new Date().getFullYear(),
          coverDataUrl: null,
          status: 'pending',
          isEditing: false,
        });
      }
    }

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
      toast.success(`Parsed ${newItems.length} track${newItems.length > 1 ? 's' : ''}`);
    }
  }, []);

  // ─── Drag & Drop Handlers ───

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        parseFiles(e.dataTransfer.files);
        e.dataTransfer.clearData();
      }
    },
    [parseFiles]
  );

  // ─── Queue Management ───

  const updateQueueItem = useCallback((id: string, updates: Partial<ParsedTrackMeta>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  // ─── Batch Submit ───

  const handleBatchSubmit = async () => {
    const pending = queue.filter((item) => item.status === 'pending');
    if (pending.length === 0) {
      toast.error('No pending tracks to submit');
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;

    for (const item of pending) {
      try {
        // Step 1: Find or create artist
        updateQueueItem(item.id, { status: 'creating' });
        const artistRes = await fetch('http://localhost:3001/api/artists/find-or-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: item.artist,
            genres: item.genre ? [item.genre] : [],
          }),
        });
        if (!artistRes.ok) throw new Error('Failed to resolve artist');
        const { artist } = await artistRes.json();

        // Step 2: Find or create album
        const albumRes = await fetch('http://localhost:3001/api/albums/find-or-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: item.album,
            artist: artist.name,
            artistId: artist._id,
            year: item.year,
            genre: item.genre,
            coverUrl: item.coverDataUrl || '',
          }),
        });
        if (!albumRes.ok) throw new Error('Failed to resolve album');
        const { album } = await albumRes.json();

        // Step 3: Upload audio file
        updateQueueItem(item.id, { status: 'uploading' });
        const formData = new FormData();
        formData.append('audio', item.file);
        const uploadRes = await fetch('http://localhost:3001/api/tracks/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!uploadRes.ok) throw new Error('Failed to upload audio');
        const { audioUrl } = await uploadRes.json();

        // Step 4: Create track record
        const trackRes = await fetch('http://localhost:3001/api/tracks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: item.title,
            artist: artist.name,
            artistId: artist._id,
            album: album.title,
            albumId: album._id,
            duration: item.duration,
            audioUrl: `http://localhost:3001${audioUrl}`,
            coverUrl: album.coverUrl || item.coverDataUrl || '',
            genre: item.genre,
            releaseDate: `${item.year}`,
          }),
        });
        if (!trackRes.ok) throw new Error('Failed to create track');

        updateQueueItem(item.id, { status: 'done' });
        successCount++;
      } catch (err: any) {
        console.error(`Error processing ${item.title}:`, err);
        updateQueueItem(item.id, { status: 'error', errorMsg: err.message });
      }
    }

    setIsSubmitting(false);

    // Re-fetch artists and albums for the dropdowns
    try {
      const [artistRes, albumRes] = await Promise.all([
        fetch('http://localhost:3001/api/artists?limit=100'),
        fetch('http://localhost:3001/api/albums?limit=100'),
      ]);
      const artistData = await artistRes.json();
      const albumData = await albumRes.json();
      setArtists(artistData.artists || []);
      setAlbums(albumData.albums || []);
    } catch {}

    if (successCount === pending.length) {
      toast.success(`All ${successCount} tracks uploaded successfully!`);
    } else {
      toast(`${successCount}/${pending.length} tracks uploaded`, { icon: '⚠️' });
    }
  };

  // ─── Manual Forms (existing) ───

  const [artistForm, setArtistForm] = useState({ name: '', genres: '', avatarUrl: '', bio: '' });
  const [albumForm, setAlbumForm] = useState({ title: '', artistId: '', year: new Date().getFullYear(), genre: '', coverUrl: '', type: 'album' });
  const [trackForm, setTrackForm] = useState({ title: '', artistId: '', albumId: '', duration: 180, audioUrl: '' });

  const handleArtistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistForm.name) return toast.error('Artist name required');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...artistForm,
          genres: artistForm.genres.split(',').map((g) => g.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error('Failed to create artist');
      const data = await res.json();
      setArtists([...artists, data]);
      toast.success('Artist created successfully!');
      setArtistForm({ name: '', genres: '', avatarUrl: '', bio: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumForm.title || !albumForm.artistId) return toast.error('Title and Artist required');
    setLoading(true);
    try {
      const selectedArtist = artists.find((a) => a._id === albumForm.artistId);
      const res = await fetch('http://localhost:3001/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...albumForm, artist: selectedArtist.name }),
      });
      if (!res.ok) throw new Error('Failed to create album');
      const data = await res.json();
      setAlbums([...albums, data]);
      toast.success('Album created successfully!');
      setAlbumForm({ title: '', artistId: '', year: new Date().getFullYear(), genre: '', coverUrl: '', type: 'album' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackForm.title || !trackForm.artistId || !trackForm.albumId) return toast.error('Title, Artist, and Album required');
    setLoading(true);
    try {
      const selectedArtist = artists.find((a) => a._id === trackForm.artistId);
      const selectedAlbum = albums.find((a) => a._id === trackForm.albumId);
      const res = await fetch('http://localhost:3001/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: trackForm.title,
          artist: selectedArtist.name,
          artistId: selectedArtist._id,
          album: selectedAlbum.title,
          albumId: selectedAlbum._id,
          duration: trackForm.duration,
          audioUrl: trackForm.audioUrl,
          coverUrl: selectedAlbum.coverUrl,
        }),
      });
      if (!res.ok) throw new Error('Failed to add track');
      toast.success('Track added successfully!');
      setTrackForm({ title: '', artistId: trackForm.artistId, albumId: trackForm.albumId, duration: 180, audioUrl: '' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') return null;

  const pendingCount = queue.filter((q) => q.status === 'pending').length;
  const doneCount = queue.filter((q) => q.status === 'done').length;

  // ─── Render ───

  return (
    <div className="page-enter mx-auto max-w-5xl p-6 pb-40">
      <h1 className="mb-2 text-4xl font-black text-white">Admin Dashboard</h1>
      <p className="mb-10 text-dimText">Add new music content directly into the database.</p>

      {/* Tabs */}
      <div className="mb-8 flex gap-4 border-b border-white/10 pb-1 overflow-x-auto scrollbar-hidden">
        {[
          { id: 'upload' as const, label: 'Upload MP3s', icon: <RiUploadCloud2Line /> },
          { id: 'artist' as const, label: 'Add Artist', icon: <RiMicLine /> },
          { id: 'album' as const, label: 'Add Album', icon: <RiDiscLine /> },
          { id: 'track' as const, label: 'Add Track', icon: <RiMusic2Line /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 border-b-2 px-3 pb-2 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'border-accent text-white' : 'border-transparent text-softText hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
            {tab.id === 'upload' && queue.length > 0 && (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                {queue.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════ UPLOAD TAB ═══════════ */}
      {activeTab === 'upload' && (
        <div className="animate-fade-in space-y-6">
          {/* Drop Zone */}
          <div
            className={`upload-zone group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300
              ${isDragging
                ? 'border-accent bg-accent/10 shadow-glow scale-[1.01]'
                : 'border-white/15 bg-glass-heavy backdrop-blur-2xl hover:border-accent/50 hover:bg-white/[0.03]'
              }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Animated background glow */}
            <div className={`absolute inset-0 rounded-3xl bg-theme-gradient opacity-0 blur-3xl transition-opacity duration-500 ${isDragging ? 'opacity-15' : 'group-hover:opacity-5'}`} />

            <div className="relative z-10">
              <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${isDragging ? 'bg-accent/20 scale-110' : 'bg-white/5'}`}>
                <RiUploadCloud2Line className={`text-4xl transition-all duration-300 ${isDragging ? 'text-accent scale-110' : 'text-softText'}`} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">
                {isDragging ? 'Drop your MP3 files here!' : 'Drag & Drop MP3 Files'}
              </h3>
              <p className="mb-5 text-sm text-dimText">
                Supports MP3, M4A, WAV, OGG, FLAC • Up to 50MB each • Batch upload supported
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/15 hover:scale-105 active:scale-95"
              >
                <RiFileMusicLine /> Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.m4a,.wav,.ogg,.flac,.aac"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) parseFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {/* Queue */}
          {queue.length > 0 && (
            <div className="space-y-4">
              {/* Queue header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">Upload Queue</h3>
                  <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-softText">
                    {pendingCount} pending • {doneCount} done
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {doneCount > 0 && doneCount === queue.length && (
                    <button
                      onClick={clearQueue}
                      className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-softText transition hover:bg-white/15 hover:text-white"
                    >
                      <RiCloseLine /> Clear All
                    </button>
                  )}
                  {pendingCount > 0 && (
                    <button
                      onClick={handleBatchSubmit}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 rounded-full bg-theme-gradient px-6 py-2 text-sm font-bold text-white shadow-glow transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <RiLoader4Line className="animate-spin" /> Processing...
                        </>
                      ) : (
                        <>
                          <RiUploadCloud2Line /> Upload {pendingCount} Track{pendingCount > 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Queue items */}
              <div className="space-y-3">
                {queue.map((item, index) => (
                  <div
                    key={item.id}
                    className={`group/card relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                      item.status === 'done'
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : item.status === 'error'
                        ? 'border-red-500/30 bg-red-500/5'
                        : item.status === 'uploading' || item.status === 'creating'
                        ? 'border-accent/30 bg-accent/5'
                        : 'border-white/10 bg-glass-heavy backdrop-blur-2xl'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Progress bar for uploading/creating state */}
                    {(item.status === 'uploading' || item.status === 'creating') && (
                      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-white/5">
                        <div className="upload-progress-bar h-full bg-theme-gradient" />
                      </div>
                    )}

                    <div className="flex gap-4 p-4">
                      {/* Cover Art */}
                      <div className="flex-shrink-0">
                        {item.coverDataUrl ? (
                          <img
                            src={item.coverDataUrl}
                            alt="Cover"
                            className="h-20 w-20 rounded-xl object-cover shadow-lg"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white/5">
                            <RiAlbumLine className="text-2xl text-dimText" />
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="min-w-0 flex-1">
                        {item.isEditing ? (
                          /* ── Edit Mode ── */
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={item.title}
                              onChange={(e) => updateQueueItem(item.id, { title: e.target.value })}
                              placeholder="Title"
                              className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-accent/50"
                            />
                            <input
                              value={item.artist}
                              onChange={(e) => updateQueueItem(item.id, { artist: e.target.value })}
                              placeholder="Artist"
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-accent/50"
                            />
                            <input
                              value={item.album}
                              onChange={(e) => updateQueueItem(item.id, { album: e.target.value })}
                              placeholder="Album"
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-accent/50"
                            />
                            <input
                              value={item.genre}
                              onChange={(e) => updateQueueItem(item.id, { genre: e.target.value })}
                              placeholder="Genre"
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-accent/50"
                            />
                            <input
                              type="number"
                              value={item.year}
                              onChange={(e) => updateQueueItem(item.id, { year: parseInt(e.target.value) || 0 })}
                              placeholder="Year"
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-accent/50"
                            />
                            <button
                              onClick={() => updateQueueItem(item.id, { isEditing: false })}
                              className="col-span-2 flex items-center justify-center gap-1 rounded-lg bg-accent/20 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/30"
                            >
                              <RiCheckLine /> Done Editing
                            </button>
                          </div>
                        ) : (
                          /* ── View Mode ── */
                          <>
                            <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                            <p className="mt-0.5 text-xs text-softText line-clamp-1">
                              <RiUserVoiceLine className="mr-1 inline" />
                              {item.artist}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {item.album && item.album !== 'Unknown Album' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-dimText">
                                  <RiAlbumLine /> {item.album}
                                </span>
                              )}
                              {item.genre && (
                                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-medium text-accent">
                                  {item.genre}
                                </span>
                              )}
                              {item.duration > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-dimText">
                                  <RiTimeLine /> {formatDuration(item.duration)}
                                </span>
                              )}
                              {item.year > 0 && (
                                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-dimText">
                                  {item.year}
                                </span>
                              )}
                              <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-dimText">
                                {formatFileSize(item.file.size)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Actions / Status */}
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {item.status === 'pending' && !item.isEditing && (
                          <>
                            <button
                              onClick={() => updateQueueItem(item.id, { isEditing: true })}
                              title="Edit metadata"
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-dimText transition hover:bg-white/10 hover:text-white"
                            >
                              <RiEditLine size={14} />
                            </button>
                            <button
                              onClick={() => removeFromQueue(item.id)}
                              title="Remove"
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-dimText transition hover:bg-red-500/20 hover:text-red-400"
                            >
                              <RiDeleteBinLine size={14} />
                            </button>
                          </>
                        )}
                        {(item.status === 'uploading' || item.status === 'creating') && (
                          <div className="flex items-center gap-2 text-xs text-accent">
                            <RiLoader4Line className="animate-spin" size={18} />
                            <span className="font-medium">
                              {item.status === 'uploading' ? 'Uploading...' : 'Creating...'}
                            </span>
                          </div>
                        )}
                        {item.status === 'done' && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                            <RiCheckDoubleLine size={18} />
                            <span className="font-medium">Done</span>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <div className="flex items-center gap-1.5 text-xs text-red-400" title={item.errorMsg}>
                            <RiErrorWarningLine size={18} />
                            <span className="font-medium">Failed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {queue.length === 0 && (
            <div className="rounded-2xl border border-white/5 bg-glass-heavy backdrop-blur-2xl/50 p-8 text-center">
              <RiFileMusicLine className="mx-auto mb-3 text-3xl text-dimText" />
              <p className="text-sm text-dimText">
                Drop MP3 files above to get started. Metadata like artist, album, genre, and duration
                will be extracted automatically from ID3 tags.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ ARTIST TAB ═══════════ */}
      {activeTab === 'artist' && (
        <div className="rounded-3xl border border-white/10 bg-glass-heavy backdrop-blur-2xl p-8 shadow-float glass-heavy animate-fade-in">
          <form onSubmit={handleArtistSubmit} className="flex flex-col gap-4">
            <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
              <RiMicLine className="text-accent" /> Create New Artist
            </h2>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Artist Name *</label>
              <input type="text" value={artistForm.name} onChange={(e) => setArtistForm({ ...artistForm, name: e.target.value })} required className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white outline-none transition focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Genres (comma separated)</label>
              <input type="text" value={artistForm.genres} onChange={(e) => setArtistForm({ ...artistForm, genres: e.target.value })} placeholder="Pop, Rock, Indie" className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white outline-none transition focus:border-accent/50" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Avatar Image URL</label>
              <input type="url" value={artistForm.avatarUrl} onChange={(e) => setArtistForm({ ...artistForm, avatarUrl: e.target.value })} placeholder="https://..." className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white outline-none transition focus:border-accent/50" />
            </div>
            <button type="submit" disabled={loading} className="mt-4 flex w-max items-center gap-2 rounded-full bg-theme-gradient px-8 py-3 text-sm font-bold text-white shadow-glow transition hover:scale-105 active:scale-95 disabled:opacity-50">
              <RiAddLine size={20} /> Submit Artist
            </button>
          </form>
        </div>
      )}

      {/* ═══════════ ALBUM TAB ═══════════ */}
      {activeTab === 'album' && (
        <div className="rounded-3xl border border-white/10 bg-glass-heavy backdrop-blur-2xl p-8 shadow-float glass-heavy animate-fade-in">
          <form onSubmit={handleAlbumSubmit} className="flex flex-col gap-4">
            <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
              <RiDiscLine className="text-accent" /> Create New Album
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Album Title *</label>
                <input type="text" value={albumForm.title} onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })} required className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white outline-none transition focus:border-accent/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Artist *</label>
                <select value={albumForm.artistId} onChange={(e) => setAlbumForm({ ...albumForm, artistId: e.target.value })} required className="w-full rounded-xl border border-white/10 bg-glass backdrop-blur-2xl py-3 px-4 text-white outline-none transition focus:border-accent/50">
                  <option value="" disabled>Select an artist</option>
                  {artists.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Release Year</label>
                <input type="number" value={albumForm.year} onChange={(e) => setAlbumForm({ ...albumForm, year: parseInt(e.target.value) })} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white outline-none transition focus:border-accent/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Genre</label>
                <input type="text" value={albumForm.genre} onChange={(e) => setAlbumForm({ ...albumForm, genre: e.target.value })} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white outline-none transition focus:border-accent/50" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Cover Image URL</label>
              <input type="url" value={albumForm.coverUrl} onChange={(e) => setAlbumForm({ ...albumForm, coverUrl: e.target.value })} placeholder="https://..." className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white outline-none transition focus:border-accent/50" />
            </div>
            <button type="submit" disabled={loading} className="mt-4 flex w-max items-center gap-2 rounded-full bg-theme-gradient px-8 py-3 text-sm font-bold text-white shadow-glow transition hover:scale-105 active:scale-95 disabled:opacity-50">
              <RiAddLine size={20} /> Submit Album
            </button>
          </form>
        </div>
      )}

      {/* ═══════════ TRACK TAB ═══════════ */}
      {activeTab === 'track' && (
        <div className="rounded-3xl border border-white/10 bg-glass-heavy backdrop-blur-2xl p-8 shadow-float glass-heavy animate-fade-in">
          <form onSubmit={handleTrackSubmit} className="flex flex-col gap-4">
            <h2 className="mb-4 text-xl font-bold flex items-center gap-2">
              <RiMusic2Line className="text-accent" /> Add New Track (Manual)
            </h2>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Track Title *</label>
              <input type="text" value={trackForm.title} onChange={(e) => setTrackForm({ ...trackForm, title: e.target.value })} required className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white outline-none transition focus:border-accent/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Artist *</label>
                <select value={trackForm.artistId} onChange={(e) => setTrackForm({ ...trackForm, artistId: e.target.value, albumId: '' })} required className="w-full rounded-xl border border-white/10 bg-glass backdrop-blur-2xl py-3 px-4 text-white outline-none transition focus:border-accent/50">
                  <option value="" disabled>Select an artist</option>
                  {artists.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Album *</label>
                <select value={trackForm.albumId} onChange={(e) => setTrackForm({ ...trackForm, albumId: e.target.value })} required disabled={!trackForm.artistId} className="w-full rounded-xl border border-white/10 bg-glass backdrop-blur-2xl py-3 px-4 text-white outline-none transition focus:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed">
                  <option value="" disabled>Select an album</option>
                  {albums.filter((a) => a.artistId === trackForm.artistId).map((a) => <option key={a._id} value={a._id}>{a.title}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Duration (seconds) *</label>
                <input type="number" value={trackForm.duration} onChange={(e) => setTrackForm({ ...trackForm, duration: parseInt(e.target.value) })} required min={1} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white outline-none transition focus:border-accent/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Audio File URL *</label>
                <input type="url" value={trackForm.audioUrl} onChange={(e) => setTrackForm({ ...trackForm, audioUrl: e.target.value })} required placeholder="https://...mp3" className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white outline-none transition focus:border-accent/50" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="mt-4 flex w-max items-center gap-2 rounded-full bg-theme-gradient px-8 py-3 text-sm font-bold text-white shadow-glow transition hover:scale-105 active:scale-95 disabled:opacity-50">
              <RiAddLine size={20} /> Submit Track
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
