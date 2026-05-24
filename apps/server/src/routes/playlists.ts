import { Router } from 'express';
import { Playlist } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const ownerId = req.query.ownerId as string;

    const filter: Record<string, unknown> = {};
    if (ownerId) filter.ownerId = ownerId;
    else filter.isPublic = true;

    const playlists = await Playlist.find(filter).sort('-updatedAt').skip((page - 1) * limit).limit(limit);
    const total = await Playlist.countDocuments(filter);
    res.json({ playlists, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

router.post('/', async (req, res) => {
  try {
    const playlist = await Playlist.create(req.body);
    res.status(201).json(playlist);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create playlist' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update playlist' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Playlist.findByIdAndDelete(req.params.id);
    res.json({ message: 'Playlist deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Add track to playlist
router.post('/:id/tracks', async (req, res) => {
  try {
    const { trackId } = req.body;
    const playlist = await Playlist.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { trackIds: trackId } },
      { new: true }
    );
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    res.status(400).json({ error: 'Failed to add track' });
  }
});

// Remove track from playlist
router.delete('/:id/tracks/:trackId', async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndUpdate(
      req.params.id,
      { $pull: { trackIds: req.params.trackId } },
      { new: true }
    );
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    res.status(400).json({ error: 'Failed to remove track' });
  }
});

// Follow playlist
router.post('/:id/follow', async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndUpdate(req.params.id, { $inc: { followers: 1 } }, { new: true });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ followers: playlist.followers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to follow playlist' });
  }
});

export default router;
