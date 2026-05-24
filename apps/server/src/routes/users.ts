import { Router } from 'express';
import { User } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'go-music-dev-secret-key-change-in-production';

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    let { email, password, displayName } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (displayName) displayName = displayName.trim();
    
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Email, password, and display name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, displayName, role: 'user' });

    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, displayName: user.displayName, subscription: user.subscription, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    if (email) email = email.trim().toLowerCase();
    
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user._id, email: user.email, displayName: user.displayName, subscription: user.subscription, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/users/:id — Public profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash -email -settings');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:id — Update profile
router.put('/:id', async (req, res) => {
  try {
    const { displayName, avatarUrl, settings } = req.body;
    const update: Record<string, unknown> = {};
    if (displayName) update.displayName = displayName;
    if (avatarUrl) update.avatarUrl = avatarUrl;
    if (settings) update.settings = settings;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update user' });
  }
});

// POST /api/users/:id/like — Toggle like track
router.post('/:id/like', async (req, res) => {
  try {
    const { trackId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const idx = user.likedTrackIds.indexOf(trackId);
    if (idx === -1) {
      user.likedTrackIds.push(trackId);
    } else {
      user.likedTrackIds.splice(idx, 1);
    }
    await user.save();
    res.json({ liked: idx === -1, likedTrackIds: user.likedTrackIds });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/users/:id/recently-played
router.post('/:id/recently-played', async (req, res) => {
  try {
    const { trackId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.recentlyPlayed = [trackId, ...user.recentlyPlayed.filter((id: string) => id !== trackId)].slice(0, 50);
    await user.save();
    res.json({ recentlyPlayed: user.recentlyPlayed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update recently played' });
  }
});

export default router;
