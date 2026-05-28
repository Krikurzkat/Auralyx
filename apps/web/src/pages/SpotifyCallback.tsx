import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessTokenFromCode } from '../services/spotifyAuth';
import { handleSpotifyAuthCallback, isAuthCallback } from '../services/spotifyAuthLogin';
import { useAuthStore } from '../stores/authStore';

export default function SpotifyCallback() {
  const [message, setMessage] = useState('Connecting to Spotify...');
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      // Debug logging
      console.log('Callback URL:', window.location.href);
      console.log('Code:', code);
      console.log('Error:', error);
      console.log('Error description:', errorDescription);
      console.log('All params:', Object.fromEntries(params.entries()));

      if (error) {
        setMessage(`Spotify error: ${errorDescription || error}`);
        setIsError(true);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        setMessage('No authorization code received from Spotify.');
        setIsError(true);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        console.log('Exchanging code for token...');
        // Exchange code for access token
        const accessToken = await getAccessTokenFromCode(code);
        console.log('Got access token:', accessToken ? 'Yes' : 'No');
        
        // Check if this is for login/signup or just Spotify connection
        if (isAuthCallback()) {
          setMessage('Authenticating with Auralyx...');
          
          // Handle login/signup with backend
          const { user, token } = await handleSpotifyAuthCallback(accessToken);
          
          // Login to Auralyx
          login(user, token);
          
          setMessage('Login successful! Redirecting...');
          setTimeout(() => navigate('/'), 1500);
        } else {
          // Regular Spotify connection (for Settings)
          setMessage('Spotify connected successfully! Redirecting...');
          setTimeout(() => navigate('/settings'), 1500);
        }
      } catch (err) {
        console.error('Spotify callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
        setMessage(`Error: ${errorMessage}`);
        setIsError(true);
        setTimeout(() => navigate('/login'), 3000);
      }
    }

    handleCallback();
  }, [navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--gradient-from)] to-[var(--gradient-to)]">
      <div className="bg-black/40 backdrop-blur-xl p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-white/10">
        <div className="text-center">
          {!isError ? (
            <div className="mb-6">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
          
          <h1 className="text-2xl font-bold text-white mb-2">
            {isError ? 'Connection Failed' : 'Connecting...'}
          </h1>
          
          <p className="text-white/70">{message}</p>
        </div>
      </div>
    </div>
  );
}
