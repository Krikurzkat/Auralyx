/**
 * Spotify OAuth for Login/Signup
 * Integrates Spotify authentication with Auralyx backend
 */

import { loginWithSpotify as spotifyOAuth } from './spotifyAuth';
import { apiUrl } from './api';

/**
 * Initiate Spotify OAuth for login/signup
 * Stores the intent (login or signup) in localStorage
 */
export async function loginWithSpotifyAuth(intent: 'login' | 'signup' = 'login'): Promise<void> {
  // Store the intent so we know what to do after callback
  localStorage.setItem('spotify_auth_intent', intent);
  
  // Initiate Spotify OAuth flow
  await spotifyOAuth();
}

/**
 * Handle Spotify OAuth callback and authenticate with backend
 * Called from SpotifyCallback page after successful OAuth
 */
export async function handleSpotifyAuthCallback(spotifyAccessToken: string): Promise<{
  user: any;
  token: string;
}> {
  const intent = localStorage.getItem('spotify_auth_intent') || 'login';
  
  try {
    // Get Spotify user profile
    const spotifyUser = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${spotifyAccessToken}`,
      },
    }).then(res => res.json());

    // Authenticate with Auralyx backend
    const endpoint = intent === 'signup' 
      ? '/api/users/spotify-signup' 
      : '/api/users/spotify-login';

    const response = await fetch(apiUrl(endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spotifyId: spotifyUser.id,
        spotifyAccessToken,
        email: spotifyUser.email,
        displayName: spotifyUser.display_name,
        avatarUrl: spotifyUser.images?.[0]?.url,
        spotifyProduct: spotifyUser.product,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Authentication failed');
    }

    const data = await response.json();
    
    // Clean up intent
    localStorage.removeItem('spotify_auth_intent');
    
    return {
      user: data.user,
      token: data.token,
    };
  } catch (error) {
    localStorage.removeItem('spotify_auth_intent');
    throw error;
  }
}

/**
 * Check if current callback is for login/signup (not just Spotify connection)
 */
export function isAuthCallback(): boolean {
  return !!localStorage.getItem('spotify_auth_intent');
}
