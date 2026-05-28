import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { connectDB, User } from './db.js';
import bcrypt from 'bcryptjs';
import trackRoutes from './routes/tracks.js';
import albumRoutes from './routes/albums.js';
import artistRoutes from './routes/artists.js';
import playlistRoutes from './routes/playlists.js';
import userRoutes from './routes/users.js';
import searchRoutes from './routes/search.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files (audio, images, etc.)
app.use('/uploads', express.static(path.resolve('uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/tracks', trackRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);

// Socket.io — Real-time events
io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  // Join a room (for friend activity)
  socket.on('join-activity', (userId: string) => {
    socket.join(`activity:${userId}`);
    console.log(`[Socket] ${socket.id} joined activity room for user ${userId}`);
  });

  // Now playing update
  socket.on('now-playing', (data: { userId: string; track: { title: string; artist: string; albumArt?: string } }) => {
    socket.broadcast.emit('friend-activity', {
      userId: data.userId,
      track: data.track,
      timestamp: new Date().toISOString(),
    });
  });

  // Jam session — synchronized playback
  socket.on('jam-create', (sessionId: string) => {
    socket.join(`jam:${sessionId}`);
    console.log(`[Socket] Jam session created: ${sessionId}`);
  });

  socket.on('jam-join', (sessionId: string) => {
    socket.join(`jam:${sessionId}`);
    io.to(`jam:${sessionId}`).emit('jam-user-joined', { socketId: socket.id });
  });

  socket.on('jam-sync', (data: { sessionId: string; trackId: string; time: number; isPlaying: boolean }) => {
    socket.to(`jam:${data.sessionId}`).emit('jam-update', data);
  });

  socket.on('jam-leave', (sessionId: string) => {
    socket.leave(`jam:${sessionId}`);
    io.to(`jam:${sessionId}`).emit('jam-user-left', { socketId: socket.id });
  });

  // Collaborative playlist updates
  socket.on('playlist-update', (data: { playlistId: string; action: string; trackId?: string }) => {
    socket.broadcast.emit(`playlist:${data.playlistId}`, data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
const ADMIN_EMAIL = 'admin@auralyx.com';
const ADMIN_PASSWORD = 'admin123';

async function ensureDefaultAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        email: ADMIN_EMAIL,
        displayName: 'Super Admin',
        passwordHash,
        role: 'admin',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[Auth] Admin account ready: ${ADMIN_EMAIL}`);
}

async function start() {
  let mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    await connectDB(mongoUri);
  } else {
    console.log('[DB] No MONGODB_URI found — starting in-memory MongoDB...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await connectDB(mongoUri);
  }

  await ensureDefaultAdmin();

  httpServer.listen(PORT, () => {
    console.log(`\n🎵 Auralyx API server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io ready for real-time connections`);
    console.log(`💾 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'In-Memory Mode'}\n`);
  });
}

start().catch(console.error);
