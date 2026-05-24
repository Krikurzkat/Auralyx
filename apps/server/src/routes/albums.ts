import { Router } from 'express';
import { Album } from '../db.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const artistId = req.query.artistId as string;

    const filter: Record<string, unknown> = {};
    if (artistId) filter.artistId = artistId;

    const albums = await Album.find(filter).sort('-year').skip((page - 1) * limit).limit(limit);
    const total = await Album.countDocuments(filter);
    res.json({ albums, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ error: 'Album not found' });
    res.json(album);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch album' });
  }
});

router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const album = await Album.create(req.body);
    res.status(201).json(album);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create album' });
  }
});

// POST /api/albums/find-or-create — Upsert with case-insensitive dedup by title + artist
router.post('/find-or-create', verifyToken, isAdmin, async (req, res) => {
  try {
    const { title, artist, artistId, year, genre, coverUrl, type } = req.body;
    if (!title || !title.trim() || !artistId) {
      return res.status(400).json({ error: 'Album title and artistId are required' });
    }

    const trimmedTitle = title.trim();

    // Case-insensitive title match scoped to the same artist
    let album = await Album.findOne({
      title: { $regex: new RegExp(`^${trimmedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      artistId,
    });

    if (album) {
      // Update cover/genre if the existing album was missing them
      let updated = false;
      if (coverUrl && !album.coverUrl) { album.coverUrl = coverUrl; updated = true; }
      if (genre && !album.genre) { album.genre = genre; updated = true; }
      if (year && !album.year) { album.year = year; updated = true; }
      if (updated) await album.save();
      return res.json({ album, created: false });
    }

    // Create new album
    album = await Album.create({
      title: trimmedTitle,
      artist: artist || 'Unknown Artist',
      artistId,
      year: year || new Date().getFullYear(),
      genre: genre || '',
      coverUrl: coverUrl || '',
      type: type || 'album',
    });

    res.status(201).json({ album, created: true });
  } catch (err) {
    console.error('[Albums] find-or-create error:', err);
    res.status(500).json({ error: 'Failed to find or create album' });
  }
});

router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const album = await Album.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!album) return res.status(404).json({ error: 'Album not found' });
    res.json(album);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update album' });
  }
});

router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    await Album.findByIdAndDelete(req.params.id);
    res.json({ message: 'Album deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete album' });
  }
});

export default router;
