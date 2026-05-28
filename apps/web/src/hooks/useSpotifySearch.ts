import { useState, useCallback } from 'react';
import { searchAll, searchTracks, searchArtists, searchAlbums } from '../services/spotifyApi';
import { isSpotifyAuthenticated } from '../services/spotifyAuth';

interface SpotifySearchResult {
  tracks?: any;
  artists?: any;
  albums?: any;
  playlists?: any;
}

export function useSpotifySearch() {
  const [results, setResults] = useState<SpotifySearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConnected = isSpotifyAuthenticated();

  const searchSpotify = useCallback(async (query: string, type: 'all' | 'tracks' | 'artists' | 'albums' = 'all') => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    if (!isConnected) {
      setError('Please connect Spotify in Settings first');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      let data;
      
      switch (type) {
        case 'tracks':
          data = await searchTracks(query, 20);
          setResults({ tracks: data.tracks });
          break;
        case 'artists':
          data = await searchArtists(query, 20);
          setResults({ artists: data.artists });
          break;
        case 'albums':
          data = await searchAlbums(query, 20);
          setResults({ albums: data.albums });
          break;
        default:
          data = await searchAll(query, 10);
          setResults(data);
      }
    } catch (err) {
      console.error('Spotify search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [isConnected]);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return {
    results,
    isSearching,
    error,
    isConnected,
    searchSpotify,
    clearResults,
  };
}
