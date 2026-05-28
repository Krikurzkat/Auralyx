/**
 * Spotify Authentication using Authorization Code with PKCE
 * This is the recommended flow for client-side applications
 * No Client Secret needed - secure for frontend apps
 */

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const configuredRedirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

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

function getRedirectUri(): string {
  if (typeof window === "undefined") {
    return configuredRedirectUri || "";
  }

  if (!window.isSecureContext && window.location.hostname !== "127.0.0.1" && window.location.hostname !== "localhost") {
    return configuredRedirectUri || `${window.location.origin}/callback`;
  }

  return `${window.location.origin}/callback`;
}

function getAllowedRedirectUris(): string[] {
  const redirectUri = getRedirectUri();
  const configuredUris = configuredRedirectUri
    ? configuredRedirectUri.split(",").map((uri: string) => uri.trim()).filter(Boolean)
    : [];

  return Array.from(new Set([redirectUri, ...configuredUris].filter(Boolean)));
}

/**
 * Generate a random string for code verifier
 */
function generateRandomString(length: number): string {
  if (typeof window === 'undefined' || !window.crypto) {
    throw new Error('Web Crypto API is not available');
  }
  
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = window.crypto.getRandomValues(new Uint8Array(length));
  
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

/**
 * Hash the code verifier using SHA-256
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return await window.crypto.subtle.digest("SHA-256", data);
  }

  return sha256Fallback(data);
}

function sha256Fallback(data: Uint8Array): ArrayBuffer {
  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const constants = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const bitLength = data.length * 8;
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 4, bitLength, false);

  const words = new Uint32Array(64);
  const rotateRight = (value: number, shift: number) =>
    (value >>> shift) | (value << (32 - shift));

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, false);
    }

    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + constants[index] + words[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  const output = new ArrayBuffer(32);
  const outputView = new DataView(output);
  hash.forEach((value, index) => outputView.setUint32(index * 4, value, false));
  return output;
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

  const redirectUri = getRedirectUri();

  if (!redirectUri) {
    throw new Error("Spotify redirect URI could not be determined");
  }

  console.log('=== Spotify OAuth Debug ===');
  console.log('Client ID:', clientId);
  console.log('Redirect URI:', redirectUri);
  console.log('Allowed redirect URIs:', getAllowedRedirectUris());
  console.log('Current URL:', window.location.href);

  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(hashed);
  
  localStorage.setItem("spotify_code_verifier", codeVerifier);
  localStorage.setItem("spotify_redirect_uri", redirectUri);
  
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  
  const params = {
    response_type: "code",
    client_id: clientId,
    scope: scopes.join(" "),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  };
  
  authUrl.search = new URLSearchParams(params).toString();
  
  console.log('Auth URL:', authUrl.toString());
  console.log('Redirect URI being sent:', params.redirect_uri);
  console.log('===========================');
  
  window.location.href = authUrl.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function getAccessTokenFromCode(code: string): Promise<string> {
  const codeVerifier = localStorage.getItem("spotify_code_verifier");
  const redirectUri = localStorage.getItem("spotify_redirect_uri") || getRedirectUri();
  
  if (!codeVerifier) {
    throw new Error("Code verifier not found. Please restart the login process.");
  }

  if (!redirectUri) {
    throw new Error("Spotify redirect URI could not be determined");
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
  localStorage.removeItem("spotify_redirect_uri");
  
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
  localStorage.removeItem("spotify_redirect_uri");
  localStorage.removeItem("spotify_token_expires_at");
}
