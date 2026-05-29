import { Router } from 'express';
import { User } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { verifyToken, isAdmin, AuthRequest, AppRole } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'go-music-dev-secret-key-change-in-production';
const STAFF_ROLES: AppRole[] = ['staff', 'admin'];

function serializeUser(user: any) {
  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    subscription: user.subscription,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    let { username, email, password, displayName } = req.body;
    if (username) username = username.trim().toLowerCase();
    if (email) email = email.trim().toLowerCase();
    if (displayName) displayName = displayName.trim();
    
    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: 'Username, email, password, and display name are required' });
    }

    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters and use only letters, numbers, dot, underscore, or hyphen' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(409).json({ error: 'Username already taken' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, passwordHash, displayName, role: 'user' });

    const token = jwt.sign({ userId: String(user._id), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    let { username, email, password } = req.body;
    if (username) username = username.trim().toLowerCase();
    if (email) email = email.trim().toLowerCase();
    
    const login = username || email;
    if (!login || !password) return res.status(400).json({ error: 'Username/email and password are required' });

    const user = await User.findOne({
      $or: [
        { username: login },
        { email: login },
      ],
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: String(user._id), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/users/staff - Admin-only staff roster
router.get('/staff', verifyToken, isAdmin, async (_req, res) => {
  try {
    const staff = await User.find({ role: { $in: STAFF_ROLES } })
      .select('-passwordHash -settings')
      .sort({ role: 1, displayName: 1 });
    res.json({ staff: staff.map(serializeUser) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff accounts' });
  }
});

// POST /api/users/staff - Admin-only staff account creation
router.post('/staff', verifyToken, isAdmin, async (req, res) => {
  try {
    let { username, email, password, displayName, role } = req.body;
    if (username) username = username.trim().toLowerCase();
    if (email) email = email.trim().toLowerCase();
    if (displayName) displayName = displayName.trim();
    role = role === 'admin' ? 'admin' : 'staff';

    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: 'Username, email, password, and display name are required' });
    }

    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters and use only letters, numbers, dot, underscore, or hyphen' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Staff password must be at least 8 characters long' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(409).json({ error: 'Username already taken' });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, passwordHash, displayName, role });

    res.status(201).json({ staff: serializeUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create staff account' });
  }
});

// PUT /api/users/:id/role - Admin-only role management
router.put('/:id/role', verifyToken, isAdmin, async (req: AuthRequest, res) => {
  try {
    const role = String(req.body.role || '').trim() as AppRole;
    if (!['user', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be user, staff, or admin' });
    }

    if (req.user?.userId === req.params.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot remove your own admin access' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-passwordHash -settings');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user: serializeUser(user) });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update role' });
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
router.put('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.userId !== req.params.id && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own profile' });
    }

    const { displayName, avatarUrl, settings } = req.body;
    const update: Record<string, unknown> = {};
    if (typeof displayName === 'string') {
      const trimmedDisplayName = displayName.trim();
      if (!trimmedDisplayName) {
        return res.status(400).json({ error: 'Display name is required' });
      }
      update.displayName = trimmedDisplayName;
    }
    if (typeof avatarUrl === 'string') update.avatarUrl = avatarUrl.trim();
    if (settings) update.settings = settings;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'Your saved session no longer exists on the server. Please log in again.' });
    }
    res.json({
      user: serializeUser(user),
    });
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
