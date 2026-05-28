# Spotify Integration Setup Guide

This guide walks you through setting up Spotify OAuth with PKCE (Proof Key for Code Exchange) for Auralyx.

## ✅ What's Already Done

1. **Spotify Auth Service** (`src/services/spotifyAuth.ts`)
   - PKCE flow implementation
   - Token management with auto-refresh
   - Secure client-side authentication

2. **Spotify API Wrapper** (`src/services/spotifyApi.ts`)
   - Complete API methods for search, playlists, playback, etc.
   - Automatic token refresh
   - Error handling

3. **Callback Page** (`src/pages/SpotifyCallback.tsx`)
   - Handles OAuth redirect
   - Token exchange
   - User feedback

4. **Spotify Connect Component** (`src/components/SpotifyConnect.tsx`)
   - Ready-to-use UI component
   - Shows connection status
   - Displays user info

5. **Environment Configuration**
   - `.env` file with your Client ID
   - `.env.example` for reference

## 🔧 Configuration

### Your Spotify App Details
- **Client ID**: `76d4ddcc6f404e138cb0f127e1dc53a6`
- **App Name**: Auralyx
- **Current Redirect URI**: `http://192.168.254.106:5173/callback`

### ⚠️ Important: Add Localhost Redirect URI

You need to add this redirect URI to your Spotify Dashboard:

1. Go to: https://developer.spotify.com/dashboard
2. Click on your "Auralyx" app
3. Click "Edit Settings"
4. Under "Redirect URIs", add:
   ```
   http://127.0.0.1:5173/callback
   ```
5. Keep your existing one: `http://192.168.254.106:5173/callback`
6. Click "Save"

### Why Both Redirect URIs?

- **127.0.0.1** - For local development on your computer
- **192.168.254.106** - For testing on other devices (phone/tablet) on your network

## 🚀 Getting Started

### Step 1: Environment Variables

The `.env` file is already configured with your Client ID:

```env
VITE_SPOTIFY_CLIENT_ID=76d4ddcc6f404e138cb0f127e1dc53a6
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback
```

**For LAN testing** (phone/tablet), change to:
```env
VITE_SPOTIFY_REDIRECT_URI=http://192.168.254.106:5173/callback
```

**Important**: After changing `.env`, restart Vite!

### Step 2: Install Dependencies

```bash
cd apps/web
npm install
```

### Step 3: Run the App

For local development:
```bash
npm run dev
```

For LAN testing (accessible from other devices):
```bash
npm run dev -- --host 0.0.0.0
```

### Step 4: Test the Connection

1. Open: http://127.0.0.1:5173
2. Navigate to Settings (or wherever you add the SpotifyConnect component)
3. Click "Connect Spotify"
4. Login with your Spotify account
5. Approve permissions
6. You'll be redirected back to the app

## 📱 Using the Components

### Add Spotify Connect to Settings Page

```tsx
import SpotifyConnect from '../components/SpotifyConnect';

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <SpotifyConnect />
    </div>
  );
}
```

### Check if User is Connected

```tsx
import { isSpotifyAuthenticated } from '../services/spotifyAuth';

function MyComponent() {
  const isConnected = isSpotifyAuthenticated();
  
  return (
    <div>
      {isConnected ? 'Connected to Spotify' : 'Not connected'}
    </div>
  );
}
```

### Use Spotify API

```tsx
import { searchTracks, getCurrentUser } from '../services/spotifyApi';

async function searchForSongs(query: string) {
  try {
    const results = await searchTracks(query, 20);
    console.log(results.tracks.items);
  } catch (error) {
    console.error('Search failed:', error);
  }
}

async function getMyProfile() {
  try {
    const user = await getCurrentUser();
    console.log(user.display_name);
  } catch (error) {
    console.error('Failed to get profile:', error);
  }
}
```

## 🎵 Available API Methods

### User & Profile
- `getCurrentUser()` - Get current user's profile
- `getUserProfile(userId)` - Get any user's profile

### Search
- `searchTracks(query, limit)` - Search for tracks
- `searchAll(query, limit)` - Search tracks, artists, albums, playlists
- `searchArtists(query, limit)` - Search for artists
- `searchAlbums(query, limit)` - Search for albums
- `searchPlaylists(query, limit)` - Search for playlists

### Playlists
- `getUserPlaylists(limit)` - Get user's playlists
- `getPlaylist(playlistId)` - Get playlist details
- `getPlaylistTracks(playlistId, limit)` - Get playlist tracks
- `createPlaylist(userId, name, description, isPublic)` - Create new playlist
- `addTracksToPlaylist(playlistId, trackUris)` - Add tracks to playlist

### Library
- `getSavedTracks(limit, offset)` - Get saved/liked tracks
- `getSavedAlbums(limit, offset)` - Get saved albums
- `saveTrack(trackId)` - Save/like a track
- `removeTrack(trackId)` - Remove/unlike a track
- `checkSavedTracks(trackIds)` - Check if tracks are saved

### Albums & Artists
- `getAlbum(albumId)` - Get album details
- `getArtist(artistId)` - Get artist details
- `getArtistTopTracks(artistId, market)` - Get artist's top tracks
- `getArtistAlbums(artistId, limit)` - Get artist's albums

### Playback
- `getCurrentPlayback()` - Get current playback state
- `getRecentlyPlayed(limit)` - Get recently played tracks
- `play(deviceId, contextUri, uris, offset)` - Start/resume playback
- `pause(deviceId)` - Pause playback
- `skipToNext(deviceId)` - Skip to next track
- `skipToPrevious(deviceId)` - Skip to previous track
- `setVolume(volumePercent, deviceId)` - Set volume
- `seekToPosition(positionMs, deviceId)` - Seek to position
- `setRepeatMode(state, deviceId)` - Set repeat mode
- `setShuffle(state, deviceId)` - Toggle shuffle

### Recommendations
- `getRecommendations(seedTracks, seedArtists, limit)` - Get recommendations
- `getTopTracks(timeRange, limit)` - Get user's top tracks
- `getTopArtists(timeRange, limit)` - Get user's top artists

## 🔐 Security Features

### PKCE Flow
- No Client Secret exposed in frontend
- Code verifier/challenge for secure auth
- Recommended by Spotify for client-side apps

### Token Management
- Automatic token refresh before expiry
- Secure storage in localStorage
- Expiry tracking

### Error Handling
- Graceful error messages
- Automatic logout on invalid tokens
- User-friendly feedback

## 🧪 Testing

### Test Search
```tsx
import { searchTracks } from '../services/spotifyApi';

async function testSearch() {
  const results = await searchTracks('Bohemian Rhapsody');
  console.log(results.tracks.items[0]);
}
```

### Test User Profile
```tsx
import { getCurrentUser } from '../services/spotifyApi';

async function testProfile() {
  const user = await getCurrentUser();
  console.log(`Hello, ${user.display_name}!`);
}
```

### Test Playlists
```tsx
import { getUserPlaylists } from '../services/spotifyApi';

async function testPlaylists() {
  const playlists = await getUserPlaylists();
  console.log(`You have ${playlists.items.length} playlists`);
}
```

## 🐛 Troubleshooting

### "Invalid redirect URI"
- Make sure you added `http://127.0.0.1:5173/callback` to Spotify Dashboard
- Check that the URI in `.env` matches exactly (no trailing slash)

### "No access token available"
- User needs to connect Spotify first
- Check if `isSpotifyAuthenticated()` returns true

### "Spotify session expired"
- Token refresh failed
- User needs to reconnect
- Check console for detailed errors

### "Failed to get Spotify access token"
- Check Client ID is correct in `.env`
- Verify redirect URI matches Spotify Dashboard
- Check browser console for detailed error

### Changes to .env not working
- Restart Vite dev server
- Clear browser cache
- Check for typos in environment variable names

## 📋 Scopes Included

The following Spotify permissions are requested:

- `user-read-private` - Read user profile
- `user-read-email` - Read user email
- `playlist-read-private` - Read private playlists
- `playlist-read-collaborative` - Read collaborative playlists
- `user-library-read` - Read saved tracks/albums
- `user-library-modify` - Save/remove tracks/albums
- `user-read-playback-state` - Read playback state
- `user-modify-playback-state` - Control playback
- `user-read-currently-playing` - Read currently playing
- `user-read-recently-played` - Read listening history
- `streaming` - Web Playback SDK
- `playlist-modify-public` - Modify public playlists
- `playlist-modify-private` - Modify private playlists
- `user-follow-read` - Read followed artists/users
- `user-follow-modify` - Follow/unfollow artists/users
- `user-top-read` - Read top tracks/artists

## 🎯 Next Steps

1. ✅ Add redirect URI to Spotify Dashboard
2. ✅ Restart Vite after .env changes
3. ✅ Add SpotifyConnect component to your Settings page
4. ✅ Test the connection
5. ✅ Start using Spotify API methods

## 📚 Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Spotify Authorization Guide](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- [PKCE Flow Explanation](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)

## 🆘 Need Help?

Check the implementation files:
- `src/services/spotifyAuth.ts` - Authentication logic
- `src/services/spotifyApi.ts` - API methods
- `src/components/SpotifyConnect.tsx` - UI component
- `src/pages/SpotifyCallback.tsx` - OAuth callback handler
