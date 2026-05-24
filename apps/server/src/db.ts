import mongoose from 'mongoose';

export async function connectDB(uri: string) {
  try {
    await mongoose.connect(uri);
    console.log('[DB] Connected to MongoDB');
  } catch (err) {
    console.error('[DB] MongoDB connection error:', err);
    process.exit(1);
  }
}

// ─── Schemas ───

const trackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  artistId: { type: String, required: true },
  album: { type: String, required: true },
  albumId: { type: String, required: true },
  duration: { type: Number, required: true },
  coverUrl: String,
  audioUrl: String,
  plays: { type: Number, default: 0 },
  explicit: { type: Boolean, default: false },
  genre: String,
  releaseDate: String,
  lyrics: [{ time: Number, text: String }],
}, { timestamps: true });

const albumSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  artistId: { type: String, required: true },
  year: Number,
  genre: String,
  coverUrl: String,
  trackIds: [String],
  type: { type: String, enum: ['album', 'single', 'ep', 'compilation'], default: 'album' },
  label: String,
}, { timestamps: true });

const artistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  avatarUrl: String,
  bio: String,
  genres: [String],
  monthlyListeners: { type: Number, default: 0 },
  followers: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  topTrackIds: [String],
  albumIds: [String],
  relatedArtistIds: [String],
}, { timestamps: true });

const playlistSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  ownerId: { type: String, required: true },
  ownerName: { type: String, default: 'User' },
  coverUrl: String,
  trackIds: [String],
  followers: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true },
  isCollaborative: { type: Boolean, default: false },
  collaboratorIds: [String],
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, required: true },
  avatarUrl: String,
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 },
  likedTrackIds: [String],
  savedAlbumIds: [String],
  followedArtistIds: [String],
  savedPlaylistIds: [String],
  subscribedPodcastIds: [String],
  recentlyPlayed: [String],
  subscription: { type: String, enum: ['free', 'premium', 'duo', 'family', 'student'], default: 'free' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  settings: {
    audioQuality: { type: String, default: 'high' },
    crossfade: { type: Number, default: 0 },
    normalization: { type: Boolean, default: true },
    privateSession: { type: Boolean, default: false },
    explicitFilter: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
  },
}, { timestamps: true });

// ─── Models ───

export const Track = mongoose.models.Track || mongoose.model('Track', trackSchema);
export const Album = mongoose.models.Album || mongoose.model('Album', albumSchema);
export const Artist = mongoose.models.Artist || mongoose.model('Artist', artistSchema);
export const Playlist = mongoose.models.Playlist || mongoose.model('Playlist', playlistSchema);
export const User = mongoose.models.User || mongoose.model('User', userSchema);
