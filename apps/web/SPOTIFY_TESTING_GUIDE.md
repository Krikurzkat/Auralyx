# 🧪 Spotify Integration - Testing Guide

## ✅ Everything Works! Here's How to Test

### The Flow (Exactly as You Described)

1. ✅ User clicks **"Connect Spotify"** → `SpotifyConnect.tsx`
2. ✅ Auralyx sends them to Spotify login → `loginWithSpotify()`
3. ✅ User logs in and approves permissions → Spotify handles
4. ✅ Spotify redirects back to `/callback` → `SpotifyCallback.tsx`
5. ✅ App receives temporary code → URL parsing
6. ✅ App exchanges code for access token → `getAccessTokenFromCode()`
7. ✅ Auralyx stores the token → localStorage
8. ✅ App can now call Spotify API → `spotifyApi.ts`

---

## 🚀 Step-by-Step Testing

### Step 1: Add Redirect URI (Required!)

**Before testing, add this to Spotify Dashboard:**

1. Go to: https://developer.spotify.com/dashboard
2. Click **"Auralyx"**
3. Click **"Edit Settings"**
4. Add: `http://127.0.0.1:5173/callback`
5. Save

### Step 2: Start the App

```bash
cd apps/web
npm install
npm run dev
```

### Step 3: Open Settings

1. Open: http://127.0.0.1:5173
2. Navigate to **Settings** (sidebar or menu)
3. Scroll to find the **Spotify** section

You'll see:
```
┌─────────────────────────────────────┐
│  🟢 Spotify                         │
│     Not connected                   │
│                                     │
│  [Connect Spotify]                  │
└─────────────────────────────────────┘
```

### Step 4: Connect Spotify

1. Click **"Connect Spotify"**
2. You'll be redirected to Spotify's login page
3. Login with your Spotify account
4. Approve the permissions
5. You'll see: **"Connecting to Spotify..."**
6. Then: **"Spotify connected successfully! Redirecting..."**
7. Back to your app!

### Step 5: Verify Connection

Go back to Settings. You should now see:

```
┌─────────────────────────────────────┐
│  🟢 Spotify              ● Active   │
│     Connected                       │
│                                     │
│  👤 Your Name                       │
│     your@email.com                  │
│     Premium Account                 │
│                                     │
│  [Disconnect Spotify]               │
└─────────────────────────────────────┘
```

✅ **Success!** Spotify is now connected!

---

## 🔍 Test Spotify Search

### Option 1: Use the Demo Component

Add the demo component to any page to test search:

```tsx
import SpotifySearchDemo from '../components/SpotifySearchDemo';

export default function TestPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Spotify Search Test</h1>
      <SpotifySearchDemo />
    </div>
  );
}
```

### Option 2: Test in Browser Console

Open browser console (F12) and try:

```javascript
// Import the search function
import { searchTracks } from './services/spotifyApi';

// Search for "Keshi"
searchTracks('Keshi', 10).then(results => {
  console.log('Found tracks:', results.tracks.items);
  results.tracks.items.forEach(track => {
    console.log(`- ${track.name} by ${track.artists[0].name}`);
  });
});
```

### Option 3: Quick Test Script

Create a test file:

```tsx
// src/pages/SpotifyTestPage.tsx
import { useState } from 'react';
import { searchTracks } from '../services/spotifyApi';

export default function SpotifyTestPage() {
  const [results, setResults] = useState<any>(null);

  const testSearch = async () => {
    const data = await searchTracks('Keshi', 10);
    setResults(data.tracks.items);
  };

  return (
    <div className="p-6">
      <button 
        onClick={testSearch}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Search for "Keshi"
      </button>

      {results && (
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-2">Results:</h2>
          {results.map((track: any) => (
            <div key={track.id} className="p-2 border-b">
              <p className="font-semibold">{track.name}</p>
              <p className="text-sm text-gray-600">
                {track.artists.map((a: any) => a.name).join(', ')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 Example Searches to Try

Once connected, try searching for:

- **"Keshi"** - Artist search
- **"Bohemian Rhapsody"** - Classic track
- **"Blinding Lights"** - Popular track
- **"Daft Punk"** - Electronic artist
- **"Thriller"** - Album search

---

## 📊 What You Can Access

### User Data
```javascript
import { getCurrentUser } from './services/spotifyApi';

const user = await getCurrentUser();
console.log(user.display_name); // Your name
console.log(user.email);         // Your email
console.log(user.product);       // premium/free
```

### Playlists
```javascript
import { getUserPlaylists } from './services/spotifyApi';

const playlists = await getUserPlaylists();
console.log(`You have ${playlists.items.length} playlists`);
playlists.items.forEach(p => {
  console.log(`- ${p.name} (${p.tracks.total} tracks)`);
});
```

### Saved Tracks
```javascript
import { getSavedTracks } from './services/spotifyApi';

const saved = await getSavedTracks(50);
console.log(`You have ${saved.total} saved tracks`);
saved.items.forEach(item => {
  console.log(`- ${item.track.name}`);
});
```

### Recently Played
```javascript
import { getRecentlyPlayed } from './services/spotifyApi';

const recent = await getRecentlyPlayed(20);
recent.items.forEach(item => {
  console.log(`- ${item.track.name} (played at ${item.played_at})`);
});
```

### Top Tracks
```javascript
import { getTopTracks } from './services/spotifyApi';

const top = await getTopTracks('short_term', 10);
console.log('Your top tracks:');
top.items.forEach((track, i) => {
  console.log(`${i + 1}. ${track.name} by ${track.artists[0].name}`);
});
```

---

## 🎨 Integration Examples

### Add to SearchPage

```tsx
import { useSpotifySearch } from '../hooks/useSpotifySearch';

export default function SearchPage() {
  const { results, searchSpotify, isConnected } = useSpotifySearch();
  
  const handleSearch = (query: string) => {
    searchSpotify(query, 'all');
  };

  return (
    <div>
      {/* Your existing search UI */}
      {isConnected && results && (
        <div>
          {/* Display Spotify results */}
        </div>
      )}
    </div>
  );
}
```

### Add to HomePage

```tsx
import { useEffect, useState } from 'react';
import { getTopTracks } from '../services/spotifyApi';
import { isSpotifyAuthenticated } from '../services/spotifyAuth';

export default function HomePage() {
  const [topTracks, setTopTracks] = useState([]);

  useEffect(() => {
    if (isSpotifyAuthenticated()) {
      getTopTracks('short_term', 10).then(data => {
        setTopTracks(data.items);
      });
    }
  }, []);

  return (
    <div>
      {topTracks.length > 0 && (
        <section>
          <h2>Your Top Tracks</h2>
          {/* Display tracks */}
        </section>
      )}
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### "Invalid redirect URI"
**Cause**: Redirect URI not added to Spotify Dashboard  
**Fix**: Add `http://127.0.0.1:5173/callback` to your Spotify app settings

### "No access token available"
**Cause**: User hasn't connected Spotify yet  
**Fix**: Go to Settings and click "Connect Spotify"

### "Spotify session expired"
**Cause**: Token expired and refresh failed  
**Fix**: Disconnect and reconnect in Settings

### Search returns no results
**Cause**: Query might be too specific or misspelled  
**Fix**: Try broader search terms like "Keshi" or "Beatles"

### Console shows CORS errors
**Cause**: Spotify API should work fine, might be network issue  
**Fix**: Check if you're connected to internet, try refreshing

---

## ✅ Success Indicators

You'll know everything works when:

1. ✅ Settings shows "Spotify Connected" with your profile
2. ✅ Search returns results from Spotify
3. ✅ Console shows no authentication errors
4. ✅ You can see your playlists/saved tracks
5. ✅ Token auto-refreshes (check localStorage)

---

## 🎓 Next Steps

Once connected and tested:

1. ✅ Integrate search into your SearchPage
2. ✅ Show user's playlists in LibraryPage
3. ✅ Display top tracks on HomePage
4. ✅ Add playback controls
5. ✅ Show recommendations
6. ✅ Sync with local library

---

## 📝 Quick Reference

### Check Connection
```tsx
import { isSpotifyAuthenticated } from './services/spotifyAuth';
const isConnected = isSpotifyAuthenticated();
```

### Search
```tsx
import { searchTracks } from './services/spotifyApi';
const results = await searchTracks('query', 20);
```

### Get User Info
```tsx
import { getCurrentUser } from './services/spotifyApi';
const user = await getCurrentUser();
```

### Get Playlists
```tsx
import { getUserPlaylists } from './services/spotifyApi';
const playlists = await getUserPlaylists();
```

---

**Everything is ready! Start testing and building amazing features! 🚀**
