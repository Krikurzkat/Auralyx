import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { canManageContent, isAdminRole, useAuthStore } from '../stores/authStore';
import { apiUrl } from '../services/api';
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
  RiTeamLine,
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
  lyricsText: string;
  lyricsFileName?: string;
  missingFields: string[];
  sourceKind: 'file' | 'folder' | 'batch';
  fileHash?: string;
  uploadStatus?: 'quarantined' | 'approved' | 'blocked';
  visibility?: 'private' | 'friends' | 'public';
  moderationFlags?: string[];
  status: 'pending' | 'uploading' | 'creating' | 'done' | 'error';
  errorMsg?: string;
  isEditing: boolean;
}

interface StaffAccount {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'staff' | 'admin';
  createdAt?: string;
}

interface ReviewTrack {
  _id: string;
  title: string;
  artist: string;
  album: string;
  artistId?: string;
  albumId?: string;
  genre?: string;
  releaseDate?: string;
  coverUrl?: string;
  audioUrl?: string;
  duration: number;
  fileHash?: string;
  submittedBy?: string;
  submittedByName?: string;
  uploadStatus?: 'quarantined' | 'approved' | 'blocked';
  visibility?: 'private' | 'friends' | 'public';
  moderationFlags?: string[];
  createdAt?: string;
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

type ImportableFile = File & { webkitRelativePath?: string };

const AUDIO_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'ogg', 'flac', 'aac']);
const COVER_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const COVER_NAMES = ['cover', 'folder', 'front', 'album'];
const USER_SUBMISSION_LIMIT = 5;

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function getFileBase(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').trim();
}

function getImportPath(file: ImportableFile): string {
  return (file.webkitRelativePath || file.name).replace(/\\/g, '/');
}

function getImportDirectory(file: ImportableFile): string {
  const importPath = getImportPath(file);
  const slashIndex = importPath.lastIndexOf('/');
  return slashIndex >= 0 ? importPath.slice(0, slashIndex).toLowerCase() : '';
}

function cleanFilenamePart(value: string): string {
  return value
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ') ')
    .trim();
}

function isMissingMetadata(value?: string | null): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 || normalized === 'unknown' || normalized.startsWith('unknown ');
}

function parseSmartFilename(fileName: string) {
  const base = getFileBase(fileName).replace(/^\s*\d{1,3}\s*[-._]\s*/, '');
  const parts = base.split(/\s+-\s+/).map(cleanFilenamePart).filter(Boolean);
  const result: { title?: string; artist?: string; album?: string; year?: number } = {
    title: cleanFilenamePart(base.replace(/[._]+/g, ' ')),
  };

  if (parts.length >= 4) {
    const yearCandidate = Number.parseInt(parts[parts.length - 1], 10);
    result.title = parts[0];
    result.artist = parts[1];
    result.album = parts.slice(2, Number.isFinite(yearCandidate) ? -1 : undefined).join(' - ');
    if (Number.isFinite(yearCandidate) && yearCandidate >= 1900) result.year = yearCandidate;
    return result;
  }

  if (parts.length === 3) {
    result.title = parts[0];
    result.artist = parts[1];
    result.album = parts[2];
  } else if (parts.length === 2) {
    result.title = parts[0];
    result.artist = parts[1];
  }

  return result;
}

function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });
}

function buildCompanionIndexes(files: ImportableFile[]) {
  const coversByDirectory = new Map<string, File>();
  const coversByPathBase = new Map<string, File>();
  const lyricsByPathBase = new Map<string, File>();
  const lyricsByDirectory = new Map<string, File[]>();

  for (const file of files) {
    const extension = getFileExtension(file.name);
    const directory = getImportDirectory(file);
    const baseKey = `${directory}/${getFileBase(file.name).toLowerCase()}`;

    if (COVER_EXTENSIONS.has(extension)) {
      const baseName = getFileBase(file.name).toLowerCase();
      coversByPathBase.set(baseKey, file);
      if (COVER_NAMES.includes(baseName) && !coversByDirectory.has(directory)) {
        coversByDirectory.set(directory, file);
      }
    }

    if (extension === 'lrc') {
      lyricsByPathBase.set(baseKey, file);
      const directoryLyrics = lyricsByDirectory.get(directory) || [];
      directoryLyrics.push(file);
      lyricsByDirectory.set(directory, directoryLyrics);
    }
  }

  return { coversByDirectory, coversByPathBase, lyricsByPathBase, lyricsByDirectory };
}

function findCompanionCover(file: ImportableFile, indexes: ReturnType<typeof buildCompanionIndexes>) {
  const directory = getImportDirectory(file);
  const baseKey = `${directory}/${getFileBase(file.name).toLowerCase()}`;
  return indexes.coversByPathBase.get(baseKey) || indexes.coversByDirectory.get(directory);
}

function findCompanionLyrics(file: ImportableFile, indexes: ReturnType<typeof buildCompanionIndexes>) {
  const directory = getImportDirectory(file);
  const baseKey = `${directory}/${getFileBase(file.name).toLowerCase()}`;
  const exact = indexes.lyricsByPathBase.get(baseKey);
  if (exact) return exact;
  const directoryLyrics = indexes.lyricsByDirectory.get(directory) || [];
  return directoryLyrics.length === 1 ? directoryLyrics[0] : undefined;
}

function getMissingFields(item: Pick<ParsedTrackMeta, 'title' | 'artist' | 'album' | 'genre' | 'year' | 'coverDataUrl'>): string[] {
  const missing: string[] = [];
  if (isMissingMetadata(item.title)) missing.push('title');
  if (isMissingMetadata(item.artist)) missing.push('artist');
  if (isMissingMetadata(item.album)) missing.push('album');
  if (isMissingMetadata(item.genre)) missing.push('genre');
  if (!item.year || item.year < 1900) missing.push('year');
  if (!item.coverDataUrl) missing.push('cover photo');
  return missing;
}

// ─── Component ───

export default function AdminPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = isAdminRole(user?.role);
  const isContentManager = canManageContent(user?.role);
  const isRegularUser = user?.role === 'user';
  const canUploadFolders = isAdmin;
  const [activeTab, setActiveTab] = useState<'upload' | 'review' | 'artist' | 'album' | 'track' | 'staff'>('upload');
  const [loading, setLoading] = useState(false);

  // Data for dropdowns
  const [artists, setArtists] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [reviewTracks, setReviewTracks] = useState<ReviewTrack[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [staffForm, setStaffForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    role: 'staff' as 'staff' | 'admin',
  });

  // Batch upload state
  const [queue, setQueue] = useState<ParsedTrackMeta[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Fetch artists & albums for dropdowns
  useEffect(() => {
    if (!user) {
      toast.error('Unauthorized access');
      navigate('/');
      return;
    }
    if (!isContentManager) return;

    const fetchData = async () => {
      try {
        const [artistRes, albumRes] = await Promise.all([
          fetch(apiUrl('/api/artists?limit=100')),
          fetch(apiUrl('/api/albums?limit=100')),
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
  }, [isContentManager, user, navigate]);

  useEffect(() => {
    if (!isAdmin && activeTab === 'staff') {
      setActiveTab('upload');
    }
    if (!isContentManager && activeTab !== 'upload') {
      setActiveTab('upload');
    }
  }, [activeTab, isAdmin, isContentManager]);

  const fetchStaffAccounts = useCallback(async () => {
    if (!isAdmin || !token) return;
    try {
      const res = await fetch(apiUrl('/api/users/staff'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load staff');
      setStaffAccounts(data.staff || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load staff');
    }
  }, [isAdmin, token]);

  useEffect(() => {
    void fetchStaffAccounts();
  }, [fetchStaffAccounts]);

  const fetchReviewQueue = useCallback(async () => {
    if (!isContentManager || !token) return;
    setReviewLoading(true);
    try {
      const res = await fetch(apiUrl('/api/tracks/review'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load review queue');
      setReviewTracks(data.tracks || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load review queue');
    } finally {
      setReviewLoading(false);
    }
  }, [isContentManager, token]);

  useEffect(() => {
    if (activeTab === 'review') {
      void fetchReviewQueue();
    }
  }, [activeTab, fetchReviewQueue]);

  // ─── ID3 Parsing ───

  const parseFiles = useCallback(async (files: FileList | File[]) => {
    // Dynamic import to avoid bundling issues
    const { parseBlob } = await import('music-metadata-browser');

    const allFiles = Array.from(files) as ImportableFile[];
    const companionIndexes = buildCompanionIndexes(allFiles);
    const newItems: ParsedTrackMeta[] = [];
    const availableSubmissionSlots = isRegularUser ? Math.max(0, USER_SUBMISSION_LIMIT - queue.length) : Number.POSITIVE_INFINITY;

    for (const file of allFiles) {
      const ext = getFileExtension(file.name);
      if (!canUploadFolders && file.webkitRelativePath) {
        toast.error('Folder uploads are admin-only');
        continue;
      }

      if (!AUDIO_EXTENSIONS.has(ext)) {
        if (!COVER_EXTENSIONS.has(ext) && ext !== 'lrc') {
          toast.error(`Skipped "${file.name}" - unsupported format`);
        }
        continue;
      }

      if (newItems.length >= availableSubmissionSlots) {
        toast.error(`User submissions are limited to ${USER_SUBMISSION_LIMIT} tracks per batch`);
        break;
      }

      try {
        const metadata = await parseBlob(file);
        const { common, format } = metadata;
        const filenameMeta = parseSmartFilename(file.name);
        const companionCover = findCompanionCover(file, companionIndexes);
        const companionLyrics = findCompanionLyrics(file, companionIndexes);
        const companionCoverDataUrl = companionCover ? await readFileAsDataUrl(companionCover) : null;
        const lyricsText = companionLyrics ? await readFileAsText(companionLyrics) : '';

        // Extract cover art as data URL
        let coverDataUrl: string | null = null;
        if (common.picture && common.picture.length > 0) {
          const pic = common.picture[0];
          const base64 = btoa(
            pic.data.reduce((data: string, byte: number) => data + String.fromCharCode(byte), '')
          );
          coverDataUrl = `data:${pic.format};base64,${base64}`;
        }

        const item: ParsedTrackMeta = {
          id: generateId(),
          file,
          title: isMissingMetadata(common.title) ? filenameMeta.title || getFileBase(file.name) : common.title || filenameMeta.title || getFileBase(file.name),
          artist: isMissingMetadata(common.artist) ? filenameMeta.artist || common.albumartist || 'Unknown Artist' : common.artist || common.albumartist || filenameMeta.artist || 'Unknown Artist',
          album: isMissingMetadata(common.album) ? filenameMeta.album || 'Unknown Album' : common.album || filenameMeta.album || 'Unknown Album',
          genre: common.genre?.[0] || '',
          duration: Math.round(format.duration || 0),
          year: common.year || filenameMeta.year || new Date().getFullYear(),
          coverDataUrl: coverDataUrl || companionCoverDataUrl,
          lyricsText,
          lyricsFileName: companionLyrics?.name,
          sourceKind: file.webkitRelativePath ? 'folder' : 'file',
          status: 'pending',
          missingFields: [],
          isEditing: false,
        };
        item.missingFields = getMissingFields(item);
        item.isEditing = item.missingFields.length > 0;
        newItems.push(item);
      } catch (err) {
        console.error(`Failed to parse ${file.name}:`, err);
        // Still add it, just with filename-derived metadata
        const filenameMeta = parseSmartFilename(file.name);
        const companionCover = findCompanionCover(file, companionIndexes);
        const companionLyrics = findCompanionLyrics(file, companionIndexes);
        const coverDataUrl = companionCover ? await readFileAsDataUrl(companionCover) : null;
        const lyricsText = companionLyrics ? await readFileAsText(companionLyrics) : '';
        const item: ParsedTrackMeta = {
          id: generateId(),
          file,
          title: filenameMeta.title || getFileBase(file.name),
          artist: filenameMeta.artist || 'Unknown Artist',
          album: filenameMeta.album || 'Unknown Album',
          genre: '',
          duration: 0,
          year: filenameMeta.year || new Date().getFullYear(),
          coverDataUrl,
          lyricsText,
          lyricsFileName: companionLyrics?.name,
          sourceKind: file.webkitRelativePath ? 'folder' : 'file',
          status: 'pending',
          missingFields: [],
          isEditing: true,
        };
        item.missingFields = getMissingFields(item);
        newItems.push(item);
      }
    }

    if (newItems.length > 0) {
      const needsReview = newItems.filter((item) => item.missingFields.length > 0).length;
      setQueue((prev) => [...prev, ...newItems]);
      toast.success(`Parsed ${newItems.length} track${newItems.length > 1 ? 's' : ''}${needsReview ? `, ${needsReview} need review` : ''}`);
    }
  }, [canUploadFolders, isRegularUser, queue.length]);

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
    setQueue((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, ...updates };
      return { ...next, missingFields: getMissingFields(next) };
    }));
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
    if (isRegularUser && pending.length > USER_SUBMISSION_LIMIT) {
      toast.error(`You can submit up to ${USER_SUBMISSION_LIMIT} tracks at a time`);
      return;
    }

    const blockedForReview = pending
      .map((item) => ({ ...item, missingFields: getMissingFields(item) }))
      .filter((item) => item.missingFields.length > 0);
    if (blockedForReview.length > 0) {
      setQueue((prev) => prev.map((item) => {
        const blocked = blockedForReview.find((candidate) => candidate.id === item.id);
        return blocked
          ? { ...item, missingFields: blocked.missingFields, isEditing: true }
          : item;
      }));
      toast.error(`${blockedForReview.length} track${blockedForReview.length === 1 ? '' : 's'} need cover, genre, or metadata before upload`);
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;

    if (!isContentManager) {
      for (const item of pending) {
        try {
          updateQueueItem(item.id, { status: 'uploading' });
          const formData = new FormData();
          formData.append('audio', item.file);
          formData.append('sourceKind', 'file');
          const uploadRes = await fetch(apiUrl('/api/tracks/upload'), {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'X-Upload-Source': 'file',
            },
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload audio');

          updateQueueItem(item.id, { status: 'creating' });
          const trackRes = await fetch(apiUrl('/api/tracks'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              title: item.title,
              artist: item.artist,
              artistId: `pending:${user?.id || 'user'}:${item.artist}`,
              album: item.album,
              albumId: `pending:${user?.id || 'user'}:${item.album}`,
              duration: item.duration,
              audioUrl: uploadData.audioUrl?.startsWith('http') ? uploadData.audioUrl : apiUrl(uploadData.audioUrl),
              coverUrl: item.coverDataUrl || '',
              genre: item.genre,
              releaseDate: `${item.year}`,
              lyrics: item.lyricsText,
              fileHash: uploadData.fileHash,
              uploadStatus: 'quarantined',
              visibility: 'private',
              moderationFlags: ['user_submission', 'awaiting_staff_review'],
              submittedBy: user?.id,
              submittedByName: user?.displayName || user?.username,
            }),
          });
          const trackData = await trackRes.json();
          if (!trackRes.ok) throw new Error(trackData.error || 'Failed to submit track for review');

          updateQueueItem(item.id, {
            status: 'done',
            fileHash: uploadData.fileHash,
            uploadStatus: 'quarantined',
            visibility: 'private',
            moderationFlags: ['user_submission', 'awaiting_staff_review'],
          });
          successCount++;
        } catch (err: any) {
          console.error(`Error submitting ${item.title}:`, err);
          updateQueueItem(item.id, { status: 'error', errorMsg: err.message });
        }
      }

      setIsSubmitting(false);
      toast.success(`${successCount}/${pending.length} submitted for staff review`);
      return;
    }

    for (const item of pending) {
      try {
        // Step 1: Find or create artist
        updateQueueItem(item.id, { status: 'creating' });
        const artistRes = await fetch(apiUrl('/api/artists/find-or-create'), {
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
        const albumRes = await fetch(apiUrl('/api/albums/find-or-create'), {
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
        formData.append('sourceKind', item.sourceKind);
        const uploadRes = await fetch(apiUrl('/api/tracks/upload'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Upload-Source': item.sourceKind,
          },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload audio');
        const {
          audioUrl,
          fileHash,
          uploadStatus = 'quarantined',
          visibility = 'private',
          moderationFlags = ['quarantined_until_review'],
        } = uploadData;

        // Step 4: Create track record
        const trackRes = await fetch(apiUrl('/api/tracks'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: item.title,
            artist: artist.name,
            artistId: artist._id,
            album: album.title,
            albumId: album._id,
            duration: item.duration,
            audioUrl: audioUrl.startsWith('http') ? audioUrl : apiUrl(audioUrl),
            coverUrl: album.coverUrl || item.coverDataUrl || '',
            genre: item.genre,
            releaseDate: `${item.year}`,
            lyrics: item.lyricsText,
            fileHash,
            uploadStatus,
            visibility,
            moderationFlags,
          }),
        });
        if (!trackRes.ok) throw new Error('Failed to create track');

        updateQueueItem(item.id, { status: 'done', fileHash, uploadStatus, visibility, moderationFlags });
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
        fetch(apiUrl('/api/artists?limit=100')),
        fetch(apiUrl('/api/albums?limit=100')),
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
      const res = await fetch(apiUrl('/api/artists'), {
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
      const res = await fetch(apiUrl('/api/albums'), {
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
      const res = await fetch(apiUrl('/api/tracks'), {
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

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return toast.error('Admin access required');
    if (!staffForm.username || !staffForm.email || !staffForm.displayName || !staffForm.password) {
      return toast.error('Fill every staff account field');
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/users/staff'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(staffForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create staff account');
      setStaffAccounts((prev) => [...prev, data.staff]);
      setStaffForm({ username: '', email: '', displayName: '', password: '', role: 'staff' });
      toast.success('Staff account created');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStaffRole = async (staffId: string, role: 'user' | 'staff' | 'admin') => {
    if (!isAdmin) return toast.error('Admin access required');

    try {
      const res = await fetch(apiUrl(`/api/users/${staffId}/role`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      setStaffAccounts((prev) =>
        role === 'user'
          ? prev.filter((staff) => staff.id !== staffId)
          : prev.map((staff) => (staff.id === staffId ? data.user : staff))
      );
      toast.success(role === 'user' ? 'Staff access removed' : 'Role updated');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const approveReviewTrack = async (track: ReviewTrack) => {
    if (!isContentManager) return toast.error('Staff access required');

    try {
      const artistRes = await fetch(apiUrl('/api/artists/find-or-create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: track.artist,
          genres: track.genre ? [track.genre] : [],
        }),
      });
      const artistData = await artistRes.json();
      if (!artistRes.ok) throw new Error(artistData.error || 'Failed to resolve artist');

      const albumRes = await fetch(apiUrl('/api/albums/find-or-create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: track.album,
          artist: artistData.artist.name,
          artistId: artistData.artist._id,
          year: Number.parseInt(track.releaseDate || '', 10) || new Date().getFullYear(),
          genre: track.genre || '',
          coverUrl: track.coverUrl || '',
        }),
      });
      const albumData = await albumRes.json();
      if (!albumRes.ok) throw new Error(albumData.error || 'Failed to resolve album');

      const res = await fetch(apiUrl(`/api/tracks/${track._id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          artist: artistData.artist.name,
          artistId: artistData.artist._id,
          album: albumData.album.title,
          albumId: albumData.album._id,
          uploadStatus: 'approved',
          visibility: 'public',
          moderationFlags: [],
          reviewedBy: user?.id,
          reviewedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve track');

      setReviewTracks((prev) => prev.filter((item) => item._id !== track._id));
      toast.success('Track approved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve track');
    }
  };

  const blockReviewTrack = async (track: ReviewTrack) => {
    if (!isContentManager) return toast.error('Staff access required');

    try {
      const res = await fetch(apiUrl(`/api/tracks/${track._id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          uploadStatus: 'blocked',
          visibility: 'private',
          moderationFlags: ['blocked_by_staff'],
          reviewedBy: user?.id,
          reviewedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to block track');

      setReviewTracks((prev) => prev.filter((item) => item._id !== track._id));
      toast.success('Track blocked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to block track');
    }
  };

  if (!user) return null;

  const pendingCount = queue.filter((q) => q.status === 'pending').length;
  const doneCount = queue.filter((q) => q.status === 'done').length;

  // ─── Render ───

  return (
    <div className="page-enter mx-auto max-w-5xl p-6 pb-40">
      <h1 className="mb-2 text-4xl font-black text-white">
        {isAdmin ? 'Admin Studio' : isContentManager ? 'Staff Studio' : 'Submit Music'}
      </h1>
      <p className="mb-10 text-dimText">
        {isContentManager
          ? 'Focused tools for preparing music files, metadata, artwork, lyrics, and catalog records.'
          : `Submit up to ${USER_SUBMISSION_LIMIT} tracks for staff review before they appear in Auralyx.`}
      </p>

      {/* Tabs */}
      <div className="mb-8 flex gap-4 border-b border-white/10 pb-1 overflow-x-auto scrollbar-hidden">
        {[
          { id: 'upload' as const, label: 'Upload MP3s', icon: <RiUploadCloud2Line /> },
          ...(isContentManager ? [
            { id: 'review' as const, label: 'Review', icon: <RiCheckDoubleLine /> },
            { id: 'artist' as const, label: 'Add Artist', icon: <RiMicLine /> },
            { id: 'album' as const, label: 'Add Album', icon: <RiDiscLine /> },
            { id: 'track' as const, label: 'Add Track', icon: <RiMusic2Line /> },
          ] : []),
          ...(isAdmin ? [{ id: 'staff' as const, label: 'Staff', icon: <RiTeamLine /> }] : []),
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
                {isDragging ? 'Drop your music here!' : isContentManager ? 'Drag & Drop Music Files' : 'Submit Music for Review'}
              </h3>
              <p className="mb-5 text-sm text-dimText">
                Supports MP3, M4A, WAV, OGG, FLAC • Up to 50MB each • Batch upload supported
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/15 hover:scale-105 active:scale-95"
                >
                  <RiFileMusicLine /> Browse Files
                </button>
                {canUploadFolders && (
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-2.5 text-sm font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95"
                  >
                    <RiUploadCloud2Line /> Browse Folder
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.m4a,.wav,.ogg,.flac,.aac,.lrc,.jpg,.jpeg,.png,.webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) parseFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              {canUploadFolders && (
                <input
                  ref={folderInputRef}
                  type="file"
                  accept=".mp3,.m4a,.wav,.ogg,.flac,.aac,.lrc,.jpg,.jpeg,.png,.webp"
                  multiple
                  className="hidden"
                  {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
                  onChange={(e) => {
                    if (e.target.files) parseFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              )}
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
                          <RiUploadCloud2Line /> {isContentManager ? 'Upload' : 'Submit'} {pendingCount} Track{pendingCount > 1 ? 's' : ''}
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
                            <label className="col-span-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-accent/40 hover:bg-white/10">
                              <RiAlbumLine />
                              {item.coverDataUrl ? 'Replace cover photo' : 'Add cover photo'}
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,image/*"
                                className="hidden"
                                onChange={async (event) => {
                                  const coverFile = event.target.files?.[0];
                                  if (coverFile) {
                                    updateQueueItem(item.id, { coverDataUrl: await readFileAsDataUrl(coverFile) });
                                  }
                                  event.target.value = '';
                                }}
                              />
                            </label>
                            <label className="col-span-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-accent/40 hover:bg-white/10">
                              <RiFileMusicLine />
                              {item.lyricsText ? 'Replace .lrc lyrics' : 'Add .lrc lyrics'}
                              <input
                                type="file"
                                accept=".lrc"
                                className="hidden"
                                onChange={async (event) => {
                                  const lyricsFile = event.target.files?.[0];
                                  if (lyricsFile) {
                                    updateQueueItem(item.id, {
                                      lyricsText: await readFileAsText(lyricsFile),
                                      lyricsFileName: lyricsFile.name,
                                    });
                                  }
                                  event.target.value = '';
                                }}
                              />
                            </label>
                            {item.missingFields.length > 0 && (
                              <div className="col-span-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                                Required before upload: {item.missingFields.join(', ')}
                              </div>
                            )}
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
                              {item.lyricsText && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300" title={item.lyricsFileName || 'Lyrics detected'}>
                                  <RiFileMusicLine /> LRC
                                </span>
                              )}
                              {item.missingFields.length > 0 && (
                                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-300">
                                  needs {item.missingFields.join(', ')}
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
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                                item.sourceKind === 'folder'
                                  ? 'bg-blue-500/10 text-blue-300'
                                  : 'bg-white/5 text-dimText'
                              }`}>
                                {item.sourceKind}
                              </span>
                              {item.uploadStatus === 'quarantined' && (
                                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-300">
                                  quarantined
                                </span>
                              )}
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
                          <div className="flex items-center gap-1.5 text-xs text-amber-300" title="Uploaded privately and held for review">
                            <RiCheckDoubleLine size={18} />
                            <span className="font-medium">{isContentManager ? 'Quarantined' : 'Submitted'}</span>
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
      {activeTab === 'review' && isContentManager && (
        <div className="animate-fade-in space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Submission Review</h2>
              <p className="text-sm text-dimText">Approve clean user uploads before they become public.</p>
            </div>
            <button
              onClick={() => void fetchReviewQueue()}
              disabled={reviewLoading}
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
            >
              {reviewLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {reviewTracks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-glass-heavy p-8 text-center text-sm text-dimText">
              No tracks waiting for review.
            </div>
          ) : (
            <div className="space-y-3">
              {reviewTracks.map((track) => (
                <div key={track._id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-glass-heavy p-4">
                  {track.coverUrl ? (
                    <img src={track.coverUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/5">
                      <RiAlbumLine className="text-2xl text-dimText" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-white">{track.title}</h3>
                    <p className="truncate text-sm text-softText">{track.artist} - {track.album}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {track.genre && <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold text-accent">{track.genre}</span>}
                      {track.submittedByName && <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-dimText">by {track.submittedByName}</span>}
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                        {track.uploadStatus || 'quarantined'}
                      </span>
                    </div>
                  </div>
                  {track.audioUrl && (
                    <audio src={track.audioUrl} controls className="h-10 max-w-[260px]" />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void approveReviewTrack(track)}
                      className="rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/30"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => void blockReviewTrack(track)}
                      className="rounded-full bg-red-500/20 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/30"
                    >
                      Block
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {activeTab === 'staff' && isAdmin && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-white/10 bg-glass-heavy p-8 shadow-float backdrop-blur-2xl">
            <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-white">
              <RiTeamLine className="text-accent" /> Add Staff
            </h2>
            <p className="mb-6 text-sm text-dimText">
              Staff accounts can access content tools. Only admins can create staff or use folder uploads.
            </p>
            <form onSubmit={handleStaffSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Username *</label>
                <input value={staffForm.username} onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Email *</label>
                <input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Display Name *</label>
                <input value={staffForm.displayName} onChange={(e) => setStaffForm({ ...staffForm, displayName: e.target.value })} required className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Password *</label>
                  <input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} required minLength={8} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-accent/50" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-dimText">Role</label>
                  <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as 'staff' | 'admin' })} className="w-full rounded-xl border border-white/10 bg-glass px-4 py-3 text-white outline-none transition focus:border-accent/50">
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={loading} className="mt-2 flex w-max items-center gap-2 rounded-full bg-theme-gradient px-8 py-3 text-sm font-bold text-white shadow-glow transition hover:scale-105 active:scale-95 disabled:opacity-50">
                <RiAddLine size={20} /> Create Staff
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-glass-heavy p-8 shadow-float backdrop-blur-2xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Staff Roster</h2>
                <p className="text-sm text-dimText">Manage who can access catalog operations.</p>
              </div>
              <button onClick={() => void fetchStaffAccounts()} className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15">
                Refresh
              </button>
            </div>
            <div className="space-y-3">
              {staffAccounts.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-dimText">
                  No staff accounts yet.
                </div>
              ) : (
                staffAccounts.map((staff) => (
                  <div key={staff.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{staff.displayName}</h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${staff.role === 'admin' ? 'bg-accent/20 text-accent' : 'bg-white/10 text-softText'}`}>
                          {staff.role}
                        </span>
                      </div>
                      <p className="text-xs text-dimText">{staff.username} - {staff.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={staff.role}
                        onChange={(e) => void updateStaffRole(staff.id, e.target.value as 'user' | 'staff' | 'admin')}
                        className="rounded-full border border-white/10 bg-glass px-3 py-2 text-xs font-semibold text-white outline-none"
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                        <option value="user">Remove access</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
