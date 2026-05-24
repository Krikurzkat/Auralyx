import { Router } from 'express';
import { Track, Album, Artist, Playlist } from '../db.js';

const router = Router();

// GET /api/search?q=query&type=all|track|album|artist|playlist
router.get('/', async (req, res) => {
  try {
    const q = req.query.q as string;
    const type = (req.query.type as string) || 'all';
    const limit = parseInt(req.query.limit as string) || 10;

    if (!q) return res.status(400).json({ error: 'Search query is required' });

    const regex = new RegExp(q, 'i');
    const results: Record<string, unknown[]> = {};

    if (type === 'all' || type === 'track') {
      results.tracks = await Track.find({
        $or: [{ title: regex }, { artist: regex }, { album: regex }],
      }).limit(limit);
    }

    if (type === 'all' || type === 'album') {
      results.albums = await Album.find({
        $or: [{ title: regex }, { artist: regex }],
      }).limit(limit);
    }

    if (type === 'all' || type === 'artist') {
      results.artists = await Artist.find({
        $or: [{ name: regex }, { genres: regex }],
      }).limit(limit);
    }

    if (type === 'all' || type === 'playlist') {
      results.playlists = await Playlist.find({
        $or: [{ title: regex }, { description: regex }],
        isPublic: true,
      }).limit(limit);
    }

    res.json({ query: q, ...results });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
