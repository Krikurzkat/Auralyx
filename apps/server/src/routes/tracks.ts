import { Router } from 'express';
import { Track } from '../db.js';

const router = Router();

// GET /api/tracks - legacy catalog read path. The web app now uses the local
// IndexedDB music library first, but keeping reads here avoids breaking old data.
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

// POST /api/tracks/:id/play - legacy play count path.
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
