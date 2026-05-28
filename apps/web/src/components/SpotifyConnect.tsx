import { useState, useEffect } from 'react';
import { loginWithSpotify, logoutSpotify, isSpotifyAuthenticated } from '../services/spotifyAuth';
import { getCurrentUser } from '../services/spotifyApi';
import toast from 'react-hot-toast';

interface SpotifyUser {
  display_name: string;
  email: string;
  images: { url: string }[];
  product: string;
}

export default function SpotifyConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const connected = isSpotifyAuthenticated();
    setIsConnected(connected);

    if (connected) {
      try {
        const user = await getCurrentUser();
        setSpotifyUser(user);
      } catch (error) {
        console.error('Failed to fetch Spotify user:', error);
        // Token might be invalid
        setIsConnected(false);
      }
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await loginWithSpotify();
    } catch (error) {
      console.error('Spotify login error:', error);
      toast.error('Failed to connect to Spotify');
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    logoutSpotify();
    setIsConnected(false);
    setSpotifyUser(null);
    toast.success('Disconnected from Spotify');
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Spotify</h3>
            <p className="text-sm text-white/60">
              {isConnected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-500 font-medium">Active</span>
          </div>
        )}
      </div>

      {isConnected && spotifyUser && (
        <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-3">
            {spotifyUser.images?.[0]?.url && (
              <img
                src={spotifyUser.images[0].url}
                alt={spotifyUser.display_name}
                className="w-12 h-12 rounded-full"
              />
            )}
            <div className="flex-1">
              <p className="text-white font-medium">{spotifyUser.display_name}</p>
              <p className="text-sm text-white/60">{spotifyUser.email}</p>
              {spotifyUser.product && (
                <p className="text-xs text-white/40 capitalize mt-1">
                  {spotifyUser.product} Account
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Connecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Connect Spotify
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all duration-200 border border-white/10"
          >
            Disconnect Spotify
          </button>
        )}
      </div>

      {!isConnected && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-xs text-blue-300">
            Connect your Spotify account to access your playlists, saved songs, and use Spotify playback features.
          </p>
        </div>
      )}
    </div>
  );
}
