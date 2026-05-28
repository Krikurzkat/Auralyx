/**
 * Spotify Web API wrapper
 * Handles all API calls to Spotify with automatic token refresh
 */

import { getStoredAccessToken } from './spotifyAuth';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Make an authenticated request to Spotify API
 */
async function spotifyFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getStoredAccessToken();
  
  if (!token) {
    throw new Error('No Spotify access token available. Please login.');
  }
  
  const url = endpoint.startsWith('http') ? endpoint : `${SPOTIFY_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Spotify session expired. Please login again.');
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Spotify API error: ${response.status}`);
  }
  
  // Some endpoints return 204 No Content
  if (response.status === 204) {
    return null;
  }
  
  return await response.json();
}

// ============================================================================
// User Profile
// ============================================================================

export async function getCurrentUser() {
  return await spotifyFetch('/me');
}

export async function getUserProfile(userId: string) {
  return await spotifyFetch(`/users/${userId}`);
}

// ============================================================================
// Search
// ============================================================================

export async function searchTracks(query: string, limit: number = 20) {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: limit.toString(),
  });
  
  return await spotifyFetch(`/search?${params}`);
}

export async function searchAll(query: string, limit: number = 10) {
  const params = new URLSearchParams({
    q: query,
    type: 'track,artist,album,playlist',
    limit: limit.toString(),
  });
  
  return await spotifyFetch(`/search?${params}`);
}

export async function searchArtists(query: string, limit: number = 20) {
  const params = new URLSearchParams({
    q: query,
    type: 'artist',
    limit: limit.toString(),
  });
  
  return await spotifyFetch(`/search?${params}`);
}

export async function searchAlbums(query: string, limit: number = 20) {
  const params = new URLSearchParams({
    q: query,
    type: 'album',
    limit: limit.toString(),
  });
  
  return await spotifyFetch(`/search?${params}`);
}

export async function searchPlaylists(query: string, limit: number = 20) {
  const params = new URLSearchParams({
    q: query,
    type: 'playlist',
    limit: limit.toString(),
  });
  
  return await spotifyFetch(`/search?${params}`);
}

// ============================================================================
// Playlists
// ============================================================================

export async function getUserPlaylists(limit: number = 50) {
  return await spotifyFetch(`/me/playlists?limit=${limit}`);
}

export async function getPlaylist(playlistId: string) {
  return await spotifyFetch(`/playlists/${playlistId}`);
}

export async function getPlaylistTracks(playlistId: string, limit: number = 100) {
  return await spotifyFetch(`/playlists/${playlistId}/tracks?limit=${limit}`);
}

export async function createPlaylist(userId: string, name: string, description?: string, isPublic: boolean = true) {
  return await spotifyFetch(`/users/${userId}/playlists`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      public: isPublic,
    }),
  });
}

export async function addTracksToPlaylist(playlistId: string, trackUris: string[]) {
  return await spotifyFetch(`/playlists/${playlistId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({
      uris: trackUris,
    }),
  });
}

// ============================================================================
// Library
// ============================================================================

export async function getSavedTracks(limit: number = 50, offset: number = 0) {
  return await spotifyFetch(`/me/tracks?limit=${limit}&offset=${offset}`);
}

export async function getSavedAlbums(limit: number = 50, offset: number = 0) {
  return await spotifyFetch(`/me/albums?limit=${limit}&offset=${offset}`);
}

export async function saveTrack(trackId: string) {
  return await spotifyFetch(`/me/tracks?ids=${trackId}`, {
    method: 'PUT',
  });
}

export async function removeTrack(trackId: string) {
  return await spotifyFetch(`/me/tracks?ids=${trackId}`, {
    method: 'DELETE',
  });
}

export async function checkSavedTracks(trackIds: string[]) {
  return await spotifyFetch(`/me/tracks/contains?ids=${trackIds.join(',')}`);
}

// ============================================================================
// Albums & Artists
// ============================================================================

export async function getAlbum(albumId: string) {
  return await spotifyFetch(`/albums/${albumId}`);
}

export async function getArtist(artistId: string) {
  return await spotifyFetch(`/artists/${artistId}`);
}

export async function getArtistTopTracks(artistId: string, market: string = 'US') {
  return await spotifyFetch(`/artists/${artistId}/top-tracks?market=${market}`);
}

export async function getArtistAlbums(artistId: string, limit: number = 50) {
  return await spotifyFetch(`/artists/${artistId}/albums?limit=${limit}`);
}

// ============================================================================
// Playback
// ============================================================================

export async function getCurrentPlayback() {
  return await spotifyFetch('/me/player');
}

export async function getRecentlyPlayed(limit: number = 50) {
  return await spotifyFetch(`/me/player/recently-played?limit=${limit}`);
}

export async function play(deviceId?: string, contextUri?: string, uris?: string[], offset?: number) {
  const body: any = {};
  
  if (contextUri) {
    body.context_uri = contextUri;
  }
  
  if (uris) {
    body.uris = uris;
  }
  
  if (offset !== undefined) {
    body.offset = { position: offset };
  }
  
  const endpoint = deviceId ? `/me/player/play?device_id=${deviceId}` : '/me/player/play';
  
  return await spotifyFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function pause(deviceId?: string) {
  const endpoint = deviceId ? `/me/player/pause?device_id=${deviceId}` : '/me/player/pause';
  
  return await spotifyFetch(endpoint, {
    method: 'PUT',
  });
}

export async function skipToNext(deviceId?: string) {
  const endpoint = deviceId ? `/me/player/next?device_id=${deviceId}` : '/me/player/next';
  
  return await spotifyFetch(endpoint, {
    method: 'POST',
  });
}

export async function skipToPrevious(deviceId?: string) {
  const endpoint = deviceId ? `/me/player/previous?device_id=${deviceId}` : '/me/player/previous';
  
  return await spotifyFetch(endpoint, {
    method: 'POST',
  });
}

export async function setVolume(volumePercent: number, deviceId?: string) {
  const endpoint = deviceId 
    ? `/me/player/volume?volume_percent=${volumePercent}&device_id=${deviceId}`
    : `/me/player/volume?volume_percent=${volumePercent}`;
  
  return await spotifyFetch(endpoint, {
    method: 'PUT',
  });
}

export async function seekToPosition(positionMs: number, deviceId?: string) {
  const endpoint = deviceId
    ? `/me/player/seek?position_ms=${positionMs}&device_id=${deviceId}`
    : `/me/player/seek?position_ms=${positionMs}`;
  
  return await spotifyFetch(endpoint, {
    method: 'PUT',
  });
}

export async function setRepeatMode(state: 'track' | 'context' | 'off', deviceId?: string) {
  const endpoint = deviceId
    ? `/me/player/repeat?state=${state}&device_id=${deviceId}`
    : `/me/player/repeat?state=${state}`;
  
  return await spotifyFetch(endpoint, {
    method: 'PUT',
  });
}

export async function setShuffle(state: boolean, deviceId?: string) {
  const endpoint = deviceId
    ? `/me/player/shuffle?state=${state}&device_id=${deviceId}`
    : `/me/player/shuffle?state=${state}`;
  
  return await spotifyFetch(endpoint, {
    method: 'PUT',
  });
}

// ============================================================================
// Recommendations
// ============================================================================

export async function getRecommendations(seedTracks?: string[], seedArtists?: string[], limit: number = 20) {
  const params = new URLSearchParams({ limit: limit.toString() });
  
  if (seedTracks?.length) {
    params.append('seed_tracks', seedTracks.join(','));
  }
  
  if (seedArtists?.length) {
    params.append('seed_artists', seedArtists.join(','));
  }
  
  return await spotifyFetch(`/recommendations?${params}`);
}

export async function getTopTracks(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 20) {
  return await spotifyFetch(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`);
}

export async function getTopArtists(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 20) {
  return await spotifyFetch(`/me/top/artists?time_range=${timeRange}&limit=${limit}`);
}
