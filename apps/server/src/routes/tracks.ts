import { Router } from 'express';
import { Track } from '../db.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

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

// GET /api/tracks — List all tracks (paginated)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || '-createdAt';
    const genre = req.query.genre as string;

    const filter: Record<string, unknown> = {};
    if (genre) filter.genre = genre;

    const tracks = await Track.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
    const total = await Track.countDocuments(filter);

    res.json({ tracks, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tracks' });
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
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const track = await Track.create(req.body);
    res.status(201).json(track);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create track' });
  }
});

// PUT /api/tracks/:id — Update a track
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
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
router.post('/upload', verifyToken, isAdmin, upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    const audioUrl = `/uploads/audio/${req.file.filename}`;
    res.json({
      audioUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    console.error('[Tracks] Upload error:', err);
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
