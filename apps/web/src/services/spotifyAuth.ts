/**
 * Spotify Authentication using Authorization Code with PKCE
 * This is the recommended flow for client-side applications
 * No Client Secret needed - secure for frontend apps
 */

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

const scopes = [
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "user-library-modify",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "streaming",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-follow-read",
  "user-follow-modify",
  "user-top-read",
];

/**
 * Generate a random string for code verifier
 */
function generateRandomString(length: number): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

/**
 * Hash the code verifier using SHA-256
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest("SHA-256", data);
}

/**
 * Base64 URL encode the hashed code verifier
 */
function base64UrlEncode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Initiate Spotify login with PKCE
 * Redirects user to Spotify authorization page
 */
export async function loginWithSpotify(): Promise<void> {
  if (!clientId) {
    throw new Error("VITE_SPOTIFY_CLIENT_ID is not configured in .env file");
  }

  if (!redirectUri) {
    throw new Error("VITE_SPOTIFY_REDIRECT_URI is not configured in .env file");
  }

  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(hashed);
  
  localStorage.setItem("spotify_code_verifier", codeVerifier);
  
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  
  authUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes.join(" "),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  }).toString();
  
  window.location.href = authUrl.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function getAccessTokenFromCode(code: string): Promise<string> {
  const codeVerifier = localStorage.getItem("spotify_code_verifier");
  
  if (!codeVerifier) {
    throw new Error("Code verifier not found. Please restart the login process.");
  }
  
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Spotify token error:", errorData);
    throw new Error("Failed to get Spotify access token");
  }
  
  const data = await response.json();
  
  localStorage.setItem("spotify_access_token", data.access_token);
  
  if (data.refresh_token) {
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
  }
  
  // Store token expiry time
  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem("spotify_token_expires_at", expiresAt.toString());
  
  // Clean up code verifier
  localStorage.removeItem("spotify_code_verifier");
  
  return data.access_token;
}

/**
 * Refresh the access token using refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("spotify_refresh_token");
  
  if (!refreshToken) {
    return null;
  }
  
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    
    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }
    
    const data = await response.json();
    
    localStorage.setItem("spotify_access_token", data.access_token);
    
    if (data.refresh_token) {
      localStorage.setItem("spotify_refresh_token", data.refresh_token);
    }
    
    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem("spotify_token_expires_at", expiresAt.toString());
    
    return data.access_token;
  } catch (error) {
    console.error("Token refresh failed:", error);
    logoutSpotify();
    return null;
  }
}

/**
 * Get stored access token, refresh if expired
 */
export async function getStoredAccessToken(): Promise<string | null> {
  const token = localStorage.getItem("spotify_access_token");
  const expiresAt = localStorage.getItem("spotify_token_expires_at");
  
  if (!token) {
    return null;
  }
  
  // Check if token is expired or about to expire (within 5 minutes)
  if (expiresAt) {
    const expiryTime = parseInt(expiresAt, 10);
    const now = Date.now();
    
    if (now >= expiryTime - 5 * 60 * 1000) {
      // Token expired or about to expire, try to refresh
      return await refreshAccessToken();
    }
  }
  
  return token;
}

/**
 * Check if user is logged in to Spotify
 */
export function isSpotifyAuthenticated(): boolean {
  return !!localStorage.getItem("spotify_access_token");
}

/**
 * Logout from Spotify
 */
export function logoutSpotify(): void {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_code_verifier");
  localStorage.removeItem("spotify_token_expires_at");
}
