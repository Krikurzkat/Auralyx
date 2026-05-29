import { Router } from 'express';
import { Track, UploadAudit } from '../db.js';
import { verifyToken, isAdmin, isContentStaff, canManageContent, AuthRequest } from '../middleware/auth.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Ensure uploads directory exists
const uploadDir = path.resolve('uploads', 'audio');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config — UUID filenames to prevent collisions
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${ext}`));
  },
});

const router = Router();

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const DAILY_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_UPLOADS_PER_HOUR = 25;
const MAX_UPLOADS_PER_DAY = 80;
const MAX_USER_SUBMISSIONS_PER_DAY = 5;
const MAX_FAILED_UPLOADS_PER_HOUR = 12;

type UploadCounter = {
  hourStartedAt: number;
  dayStartedAt: number;
  uploadsThisHour: number;
  uploadsToday: number;
  failedThisHour: number;
};

const uploadCounters = new Map<string, UploadCounter>();

function getUploadCounter(userId: string): UploadCounter {
  const now = Date.now();
  const existing = uploadCounters.get(userId);
  if (!existing) {
    const counter = {
      hourStartedAt: now,
      dayStartedAt: now,
      uploadsThisHour: 0,
      uploadsToday: 0,
      failedThisHour: 0,
    };
    uploadCounters.set(userId, counter);
    return counter;
  }

  if (now - existing.hourStartedAt > RATE_LIMIT_WINDOW_MS) {
    existing.hourStartedAt = now;
    existing.uploadsThisHour = 0;
    existing.failedThisHour = 0;
  }
  if (now - existing.dayStartedAt > DAILY_LIMIT_WINDOW_MS) {
    existing.dayStartedAt = now;
    existing.uploadsToday = 0;
  }

  return existing;
}

function getRateLimitFlags(counter: UploadCounter, role?: string): string[] {
  const flags: string[] = [];
  if (role === 'admin') return flags;

  const maxDailyUploads = role === 'user' ? MAX_USER_SUBMISSIONS_PER_DAY : MAX_UPLOADS_PER_DAY;
  const maxHourlyUploads = role === 'user' ? MAX_USER_SUBMISSIONS_PER_DAY : MAX_UPLOADS_PER_HOUR;

  if (counter.uploadsThisHour >= maxHourlyUploads) flags.push('too_many_uploads_hourly');
  if (counter.uploadsToday >= maxDailyUploads) flags.push('too_many_uploads_daily');
  if (counter.failedThisHour >= MAX_FAILED_UPLOADS_PER_HOUR) flags.push('too_many_failed_uploads');
  return flags;
}

function recordFailedUpload(userId: string) {
  getUploadCounter(userId).failedThisHour += 1;
}

function recordAcceptedUpload(userId: string) {
  const counter = getUploadCounter(userId);
  counter.uploadsThisHour += 1;
  counter.uploadsToday += 1;
}

function getFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function deleteUploadedFile(filePath?: string) {
  if (!filePath) return;
  fs.unlink(filePath, (err) => {
    if (err) console.warn('[Tracks] Failed to remove rejected upload:', err);
  });
}

// GET /api/tracks — List all tracks (paginated)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || '-createdAt';
    const genre = req.query.genre as string;

    const filter: Record<string, unknown> = {
      $or: [{ uploadStatus: 'approved' }, { uploadStatus: { $exists: false } }],
    };
    if (genre) filter.genre = genre;

    const tracks = await Track.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
    const total = await Track.countDocuments(filter);

    res.json({ tracks, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// GET /api/tracks/review - Staff/admin review queue
router.get('/review', verifyToken, isContentStaff, async (req, res) => {
  try {
    const status = (req.query.status as string) || 'quarantined';
    const filter = status === 'all'
      ? { uploadStatus: { $in: ['quarantined', 'blocked'] } }
      : { uploadStatus: status };

    const tracks = await Track.find(filter).sort('-createdAt').limit(100);
    res.json({ tracks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch review queue' });
  }
});

// GET /api/tracks/:id
router.get('/:id', async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json(track);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch track' });
  }
});

// POST /api/tracks — Create a track
router.post('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const isStaff = canManageContent(req.user?.role);
    if (!isStaff) {
      if (!req.body.fileHash || !req.body.audioUrl || !req.body.coverUrl || !req.body.title || !req.body.artist || !req.body.album || !req.body.genre) {
        return res.status(400).json({ error: 'User submissions require audio, cover, title, artist, album, genre, and file hash' });
      }

      const dayStartedAt = new Date(Date.now() - DAILY_LIMIT_WINDOW_MS);
      const submissionsToday = await Track.countDocuments({
        submittedBy: req.user?.userId,
        createdAt: { $gte: dayStartedAt },
      });
      if (submissionsToday >= MAX_USER_SUBMISSIONS_PER_DAY) {
        return res.status(429).json({
          error: `User submissions are limited to ${MAX_USER_SUBMISSIONS_PER_DAY} tracks per day`,
          maxDailyUploads: MAX_USER_SUBMISSIONS_PER_DAY,
        });
      }
    }

    const moderationFlags = Array.isArray(req.body.moderationFlags)
      ? req.body.moderationFlags
      : isStaff
      ? ['awaiting_review']
      : ['user_submission', 'awaiting_staff_review'];

    const track = await Track.create({
      ...req.body,
      uploadStatus: isStaff ? req.body.uploadStatus || 'quarantined' : 'quarantined',
      visibility: isStaff ? req.body.visibility || 'private' : 'private',
      moderationFlags,
      submittedBy: req.body.submittedBy || req.user?.userId,
    });
    res.status(201).json(track);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create track' });
  }
});

// PUT /api/tracks/:id — Update a track
router.put('/:id', verifyToken, isContentStaff, async (req, res) => {
  try {
    const track = await Track.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json(track);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update track' });
  }
});

// DELETE /api/tracks/:id
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const track = await Track.findByIdAndDelete(req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json({ message: 'Track deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete track' });
  }
});

// POST /api/tracks/upload — Upload MP3 file and return audio URL
router.post('/upload', verifyToken, (req: AuthRequest, res, next) => {
  const userId = req.user?.userId || 'anonymous';
  const role = req.user?.role || 'user';
  const sourceKindValue = String(req.body?.sourceKind || req.headers['x-upload-source'] || 'file');
  if (req.user?.role !== 'admin' && sourceKindValue === 'folder') {
    return res.status(403).json({ error: 'Folder uploads are admin-only' });
  }

  const abuseFlags = getRateLimitFlags(getUploadCounter(userId), role);
  if (abuseFlags.length > 0) {
    recordFailedUpload(userId);
    void UploadAudit.create({
      userId,
      fileHash: `rate-limited-${Date.now()}`,
      originalName: 'rate-limited-upload',
      sourceKind: (req.headers['x-upload-source'] as string) || 'file',
      size: 0,
      status: 'rate_limited',
      abuseFlags,
    }).catch((err) => console.warn('[Tracks] Failed to audit rate limit:', err));
    return res.status(429).json({
      error: 'Upload rate limit reached',
      abuseFlags,
      maxDailyUploads: role === 'user' ? MAX_USER_SUBMISSIONS_PER_DAY : MAX_UPLOADS_PER_DAY,
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    });
  }
  next();
}, upload.single('audio'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    const userId = req.user?.userId || 'anonymous';
    const fileHash = await getFileHash(req.file.path);
    const sourceKindValue = String(req.body.sourceKind || req.headers['x-upload-source'] || 'file');
    const sourceKind = ['file', 'folder', 'batch'].includes(sourceKindValue) ? sourceKindValue : 'file';
    const existingUpload = await UploadAudit.findOne({
      userId,
      fileHash,
      status: 'accepted',
    }).sort('-createdAt');

    if (existingUpload) {
      deleteUploadedFile(req.file.path);
      recordFailedUpload(userId);
      await UploadAudit.create({
        userId,
        fileHash,
        originalName: req.file.originalname,
        sourceKind,
        size: req.file.size,
        mimetype: req.file.mimetype,
        status: 'duplicate',
        duplicateOf: String(existingUpload._id),
        abuseFlags: ['duplicate_file'],
      });
      return res.status(409).json({
        error: 'Duplicate audio file blocked',
        abuseFlags: ['duplicate_file'],
        duplicateOf: existingUpload.originalName,
      });
    }

    recordAcceptedUpload(userId);
    await UploadAudit.create({
      userId,
      fileHash,
      originalName: req.file.originalname,
      sourceKind,
      size: req.file.size,
      mimetype: req.file.mimetype,
      status: 'accepted',
      abuseFlags: ['quarantined_until_review'],
    });

    const audioUrl = `/uploads/audio/${req.file.filename}`;
    res.json({
      audioUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      fileHash,
      uploadStatus: 'quarantined',
      visibility: 'private',
      moderationFlags: ['quarantined_until_review'],
    });
  } catch (err) {
    console.error('[Tracks] Upload error:', err);
    if (req.user?.userId) recordFailedUpload(req.user.userId);
    deleteUploadedFile(req.file?.path);
    res.status(500).json({ error: 'Failed to upload audio file' });
  }
});

// POST /api/tracks/:id/play — Increment play count
router.post('/:id/play', async (req, res) => {
  try {
    const track = await Track.findByIdAndUpdate(req.params.id, { $inc: { plays: 1 } }, { new: true });
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json({ plays: track.plays });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update play count' });
  }
});

export default router;
