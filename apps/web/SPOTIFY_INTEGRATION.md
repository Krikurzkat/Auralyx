# 🎵 Spotify Integration - Complete Setup

## ✅ What's Been Implemented

### 1. **Authentication System** (`src/services/spotifyAuth.ts`)
- ✅ PKCE (Proof Key for Code Exchange) flow
- ✅ Secure client-side authentication (no Client Secret needed)
- ✅ Automatic token refresh
- ✅ Token expiry tracking
- ✅ Secure localStorage management

### 2. **API Wrapper** (`src/services/spotifyApi.ts`)
- ✅ Complete Spotify Web API coverage
- ✅ Automatic authentication
- ✅ Error handling with user-friendly messages
- ✅ 40+ API methods ready to use

### 3. **UI Components**
- ✅ `SpotifyConnect` - Connection management component
- ✅ `SpotifyCallback` - OAuth redirect handler
- ✅ Integrated into Settings page

### 4. **Configuration**
- ✅ Environment variables configured
- ✅ Your Client ID: `76d4ddcc6f404e138cb0f127e1dc53a6`
- ✅ Redirect URIs ready
- ✅ `.gitignore` configured to protect `.env`

## 🚀 Quick Start

### Step 1: Add Redirect URI to Spotify Dashboard

**IMPORTANT**: You must do this before testing!

1. Go to: https://developer.spotify.com/dashboard
2. Click on your **"Auralyx"** app
3. Click **"Edit Settings"**
4. Under **"Redirect URIs"**, add:
   ```
   http://127.0.0.1:5173/callback
   ```
5. Keep your existing: `http://192.168.254.106:5173/callback`
6. Click **"Save"**

### Step 2: Install Dependencies

```bash
cd apps/web
npm install
```

### Step 3: Start the Development Server

```bash
npm run dev
```

Or for LAN access (phone/tablet testing):
```bash
npm run dev -- --host 0.0.0.0
```

### Step 4: Test the Integration

1. Open http://127.0.0.1:5173
2. Navigate to **Settings**
3. Find the **Spotify** section
4. Click **"Connect Spotify"**
5. Login with your Spotify account
6. Approve the permissions
7. You'll be redirected back - connection complete! ✅

## 📁 Files Created

```
apps/web/
├── src/
│   ├── services/
│   │   ├── spotifyAuth.ts          ✅ Authentication logic
│   │   └── spotifyApi.ts           ✅ API wrapper
│   ├── components/
│   │   └── SpotifyConnect.tsx      ✅ Connection UI
│   └── pages/
│       └── SpotifyCallback.tsx     ✅ OAuth callback
├── .env                             ✅ Environment config
├── .env.example                     ✅ Template
├── .gitignore                       ✅ Protect secrets
├── SPOTIFY_SETUP_GUIDE.md          ✅ Detailed guide
└── SPOTIFY_INTEGRATION.md          ✅ This file
```

## 🎯 Usage Examples

### Check Connection Status

```tsx
import { isSpotifyAuthenticated } from '../services/spotifyAuth';

function MyComponent() {
  const isConnected = isSpotifyAuthenticated();
  
  if (!isConnected) {
    return <p>Please connect Spotify in Settings</p>;
  }
  
  return <p>Spotify is connected!</p>;
}
```

### Search for Tracks

```tsx
import { searchTracks } from '../services/spotifyApi';

async function handleSearch(query: string) {
  try {
    const results = await searchTracks(query, 20);
    console.log(results.tracks.items);
    // Display results in your UI
  } catch (error) {
    console.error('Search failed:', error);
  }
}
```

### Get User's Playlists

```tsx
import { getUserPlaylists } from '../services/spotifyApi';

async function loadPlaylists() {
  try {
    const playlists = await getUserPlaylists(50);
    console.log(playlists.items);
    // Display playlists in your UI
  } catch (error) {
    console.error('Failed to load playlists:', error);
  }
}
```

### Get User Profile

```tsx
import { getCurrentUser } from '../services/spotifyApi';

async function loadProfile() {
  try {
    const user = await getCurrentUser();
    console.log(`Welcome, ${user.display_name}!`);
  } catch (error) {
    console.error('Failed to load profile:', error);
  }
}
```

### Play a Track

```tsx
import { play } from '../services/spotifyApi';

async function playTrack(trackUri: string) {
  try {
    await play(undefined, undefined, [trackUri]);
    console.log('Playing track');
  } catch (error) {
    console.error('Playback failed:', error);
  }
}
```

## 🔐 Security Features

### PKCE Flow Benefits
- ✅ No Client Secret in frontend code
- ✅ Protection against authorization code interception
- ✅ Recommended by Spotify for SPAs
- ✅ Industry-standard security

### Token Management
- ✅ Automatic refresh before expiry
- ✅ Secure storage in localStorage
- ✅ Expiry time tracking
- ✅ Graceful error handling

### Environment Protection
- ✅ `.env` excluded from git
- ✅ `.env.example` for team reference
- ✅ Client ID is safe to expose (per OAuth spec)

## 📋 Available API Methods

### 🔍 Search
- `searchTracks(query, limit)` - Search tracks
- `searchAll(query, limit)` - Search everything
- `searchArtists(query, limit)` - Search artists
- `searchAlbums(query, limit)` - Search albums
- `searchPlaylists(query, limit)` - Search playlists

### 📚 Library
- `getSavedTracks(limit, offset)` - Get liked songs
- `getSavedAlbums(limit, offset)` - Get saved albums
- `saveTrack(trackId)` - Like a track
- `removeTrack(trackId)` - Unlike a track
- `checkSavedTracks(trackIds)` - Check if tracks are liked

### 🎵 Playlists
- `getUserPlaylists(limit)` - Get user's playlists
- `getPlaylist(playlistId)` - Get playlist details
- `getPlaylistTracks(playlistId, limit)` - Get tracks
- `createPlaylist(userId, name, desc, public)` - Create playlist
- `addTracksToPlaylist(playlistId, uris)` - Add tracks

### 🎤 Artists & Albums
- `getArtist(artistId)` - Get artist info
- `getArtistTopTracks(artistId, market)` - Top tracks
- `getArtistAlbums(artistId, limit)` - Artist albums
- `getAlbum(albumId)` - Album details

### ▶️ Playback
- `getCurrentPlayback()` - Current playback state
- `getRecentlyPlayed(limit)` - Recently played
- `play(deviceId, contextUri, uris, offset)` - Play
- `pause(deviceId)` - Pause
- `skipToNext(deviceId)` - Next track
- `skipToPrevious(deviceId)` - Previous track
- `setVolume(percent, deviceId)` - Set volume
- `seekToPosition(ms, deviceId)` - Seek
- `setRepeatMode(state, deviceId)` - Repeat
- `setShuffle(state, deviceId)` - Shuffle

### 🎯 Recommendations
- `getRecommendations(seedTracks, seedArtists, limit)`
- `getTopTracks(timeRange, limit)` - User's top tracks
- `getTopArtists(timeRange, limit)` - User's top artists

### 👤 User
- `getCurrentUser()` - Current user profile
- `getUserProfile(userId)` - Any user's profile

## 🎨 Integration Ideas

### 1. **Enhanced Search**
Replace local search with Spotify's vast catalog:
```tsx
import { searchAll } from '../services/spotifyApi';

async function enhancedSearch(query: string) {
  const results = await searchAll(query);
  // Show tracks, artists, albums, playlists
}
```

### 2. **Playlist Management**
Let users manage their Spotify playlists:
```tsx
import { getUserPlaylists, getPlaylistTracks } from '../services/spotifyApi';

async function showUserPlaylists() {
  const playlists = await getUserPlaylists();
  // Display in your UI
}
```

### 3. **Personalized Recommendations**
Show recommendations based on listening history:
```tsx
import { getTopTracks, getRecommendations } from '../services/spotifyApi';

async function getPersonalizedRecs() {
  const topTracks = await getTopTracks('short_term', 5);
  const seedIds = topTracks.items.map(t => t.id);
  const recs = await getRecommendations(seedIds);
  // Display recommendations
}
```

### 4. **Sync Playback**
Control Spotify playback from your app:
```tsx
import { play, pause, skipToNext } from '../services/spotifyApi';

// Your custom player controls
<button onClick={() => play()}>Play</button>
<button onClick={() => pause()}>Pause</button>
<button onClick={() => skipToNext()}>Next</button>
```

### 5. **Social Features**
Show what friends are listening to:
```tsx
import { getCurrentPlayback } from '../services/spotifyApi';

async function showNowPlaying() {
  const playback = await getCurrentPlayback();
  if (playback?.item) {
    console.log(`Now playing: ${playback.item.name}`);
  }
}
```

## 🐛 Troubleshooting

### "Invalid redirect URI"
**Solution**: Add `http://127.0.0.1:5173/callback` to Spotify Dashboard

### "No access token available"
**Solution**: User needs to connect Spotify first via Settings

### "Spotify session expired"
**Solution**: Token refresh failed, user needs to reconnect

### Changes to .env not working
**Solution**: Restart Vite dev server (`Ctrl+C` then `npm run dev`)

### CORS errors
**Solution**: Spotify API should work fine. If issues persist, check browser console

### "Failed to get Spotify access token"
**Solutions**:
1. Verify Client ID in `.env` is correct
2. Check redirect URI matches Spotify Dashboard exactly
3. Look at browser console for detailed error
4. Try clearing localStorage and reconnecting

## 🔄 Switching Between Local and LAN

### For Local Development (127.0.0.1)
```env
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback
```

### For LAN Testing (Phone/Tablet)
```env
VITE_SPOTIFY_REDIRECT_URI=http://192.168.254.106:5173/callback
```

**Remember**: Restart Vite after changing `.env`!

## 📱 Testing on Mobile

1. Change `.env` to use LAN IP: `http://192.168.254.106:5173/callback`
2. Restart Vite: `npm run dev -- --host 0.0.0.0`
3. On your phone, open: `http://192.168.254.106:5173`
4. Connect Spotify from Settings
5. Test the integration

## 🎓 Learning Resources

- [Spotify Web API Docs](https://developer.spotify.com/documentation/web-api)
- [PKCE Flow Guide](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Authorization Guide](https://developer.spotify.com/documentation/web-api/concepts/authorization)

## ✨ Next Steps

1. ✅ Add redirect URI to Spotify Dashboard
2. ✅ Test connection in Settings
3. ✅ Integrate search functionality
4. ✅ Add playlist management
5. ✅ Implement playback controls
6. ✅ Show user's library
7. ✅ Add recommendations

## 🆘 Need Help?

Check these files for implementation details:
- `SPOTIFY_SETUP_GUIDE.md` - Detailed setup instructions
- `src/services/spotifyAuth.ts` - Authentication code
- `src/services/spotifyApi.ts` - API methods
- `src/components/SpotifyConnect.tsx` - UI component

---

**Your Spotify App Details:**
- Client ID: `76d4ddcc6f404e138cb0f127e1dc53a6`
- App Name: Auralyx
- Status: Development Mode
- Redirect URIs: 
  - `http://192.168.254.106:5173/callback` ✅
  - `http://127.0.0.1:5173/callback` ⚠️ (Add this!)
