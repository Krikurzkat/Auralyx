import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessTokenFromCode } from '../services/spotifyAuth';

export default function SpotifyCallback() {
  const [message, setMessage] = useState('Connecting to Spotify...');
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        setMessage('Spotify login was cancelled or failed.');
        setIsError(true);
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      if (!code) {
        setMessage('No authorization code received from Spotify.');
        setIsError(true);
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      try {
        await getAccessTokenFromCode(code);
        setMessage('Spotify connected successfully! Redirecting...');
        setTimeout(() => navigate('/'), 1500);
      } catch (err) {
        console.error('Spotify callback error:', err);
        setMessage('Failed to connect to Spotify. Please try again.');
        setIsError(true);
        setTimeout(() => navigate('/'), 3000);
      }
    }

    handleCallback();
  }, [navigate]);

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
