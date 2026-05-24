import { Router } from 'express';
import { Artist } from '../db.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const genre = req.query.genre as string;

    const filter: Record<string, unknown> = {};
    if (genre) filter.genres = genre;

    const artists = await Artist.find(filter).sort('-monthlyListeners').skip((page - 1) * limit).limit(limit);
    const total = await Artist.countDocuments(filter);
    res.json({ artists, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch artists' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json(artist);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch artist' });
  }
});

router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const artist = await Artist.create(req.body);
    res.status(201).json(artist);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create artist' });
  }
});

// POST /api/artists/find-or-create — Upsert with case-insensitive dedup
router.post('/find-or-create', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, genres, avatarUrl, bio } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Artist name is required' });
    }

    const trimmedName = name.trim();

    // Case-insensitive exact match using regex with anchors
    let artist = await Artist.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (artist) {
      // Optionally update genres if new ones provided and artist had none
      if (genres?.length && (!artist.genres || artist.genres.length === 0)) {
        artist.genres = genres;
        await artist.save();
      }
      return res.json({ artist, created: false });
    }

    // Create new artist
    artist = await Artist.create({
      name: trimmedName,
      genres: genres || [],
      avatarUrl: avatarUrl || '',
      bio: bio || '',
    });

    res.status(201).json({ artist, created: true });
  } catch (err) {
    console.error('[Artists] find-or-create error:', err);
    res.status(500).json({ error: 'Failed to find or create artist' });
  }
});

router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const artist = await Artist.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json(artist);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update artist' });
  }
});

router.post('/:id/follow', async (req, res) => {
  try {
    const artist = await Artist.findByIdAndUpdate(req.params.id, { $inc: { followers: 1 } }, { new: true });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json({ followers: artist.followers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to follow artist' });
  }
});

router.post('/:id/unfollow', async (req, res) => {
  try {
    const artist = await Artist.findByIdAndUpdate(req.params.id, { $inc: { followers: -1 } }, { new: true });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json({ followers: artist.followers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unfollow artist' });
  }
});

export default router;
