import { useState, useEffect, useCallback } from 'react';
import { 
  isSpotifyAuthenticated, 
  loginWithSpotify, 
  logoutSpotify,
  getStoredAccessToken 
} from '../services/spotifyAuth';
import { getCurrentUser } from '../services/spotifyApi';

interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
  product: string;
}

interface UseSpotifyReturn {
  isAuthenticated: boolean;
  user: SpotifyUser | null;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

/**
 * React hook for Spotify authentication and user management
 */
export function useSpotify(): UseSpotifyReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const token = await getStoredAccessToken();
      
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      const userData = await getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch Spotify user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      
      if (isSpotifyAuthenticated()) {
        await fetchUser();
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, [fetchUser]);

  const login = useCallback(async () => {
    try {
      setError(null);
      await loginWithSpotify();
    } catch (err) {
      console.error('Spotify login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to login');
    }
  }, []);

  const logout = useCallback(() => {
    logoutSpotify();
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return {
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
  };
}
