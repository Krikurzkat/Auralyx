# Spotify Authentication Backend Endpoints

## Overview

These endpoints need to be implemented in the backend to support Spotify OAuth login/signup.

---

## Endpoints Required

### 1. POST `/api/users/spotify-login`

**Purpose**: Login existing user with Spotify OAuth

**Request Body**:
```json
{
  "spotifyId": "string",           // Spotify user ID
  "spotifyAccessToken": "string",  // Spotify access token
  "email": "string",               // User's email from Spotify
  "displayName": "string",         // Display name from Spotify
  "avatarUrl": "string",           // Profile image URL (optional)
  "spotifyProduct": "string"       // "premium" or "free"
}
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "displayName": "string",
    "avatarUrl": "string",
    "subscription": "string",
    "role": "string"
  },
  "token": "string"  // JWT token for Auralyx
}
```

**Response** (404 Not Found):
```json
{
  "error": "No account found with this Spotify account. Please sign up first."
}
```

**Logic**:
1. Find user by `spotifyId` in database
2. If not found, return 404
3. If found, update `spotifyAccessToken` and `lastLogin`
4. Generate JWT token
5. Return user data and token

---

### 2. POST `/api/users/spotify-signup`

**Purpose**: Create new user account with Spotify OAuth

**Request Body**:
```json
{
  "spotifyId": "string",           // Spotify user ID
  "spotifyAccessToken": "string",  // Spotify access token
  "email": "string",               // User's email from Spotify
  "displayName": "string",         // Display name from Spotify
  "avatarUrl": "string",           // Profile image URL (optional)
  "spotifyProduct": "string"       // "premium" or "free"
}
```

**Response** (201 Created):
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "displayName": "string",
    "avatarUrl": "string",
    "subscription": "string",
    "role": "string"
  },
  "token": "string"  // JWT token for Auralyx
}
```

**Response** (409 Conflict):
```json
{
  "error": "An account with this email already exists. Please login instead."
}
```

**Logic**:
1. Check if user with `spotifyId` or `email` already exists
2. If exists, return 409 (or auto-login)
3. Generate unique username from Spotify display name or email
4. Create new user with:
   - `spotifyId`
   - `spotifyAccessToken`
   - `email`
   - `displayName`
   - `avatarUrl`
   - `username` (generated)
   - `subscription` (based on spotifyProduct)
   - `role: "user"`
5. Generate JWT token
6. Return user data and token

---

## Database Schema Updates

### User Model

Add these fields to your User model:

```typescript
{
  // Existing fields...
  username: string,
  email: string,
  displayName: string,
  password: string,  // Optional now (null for Spotify users)
  
  // New Spotify fields
  spotifyId?: string,           // Spotify user ID (unique)
  spotifyAccessToken?: string,  // Store for API calls
  spotifyRefreshToken?: string, // For token refresh
  spotifyProduct?: string,      // "premium" or "free"
  
  // Existing fields...
  avatarUrl?: string,
  subscription: string,
  role: string,
  createdAt: Date,
  lastLogin: Date
}
```

### Indexes

Add unique index on `spotifyId`:
```javascript
db.users.createIndex({ spotifyId: 1 }, { unique: true, sparse: true })
```

---

## Implementation Example (Node.js/Express)

### Spotify Login Endpoint

```javascript
router.post('/spotify-login', async (req, res) => {
  try {
    const { spotifyId, spotifyAccessToken, email, displayName, avatarUrl, spotifyProduct } = req.body;

    // Find user by Spotify ID
    let user = await User.findOne({ spotifyId });

    if (!user) {
      return res.status(404).json({ 
        error: 'No account found with this Spotify account. Please sign up first.' 
      });
    }

    // Update Spotify token and last login
    user.spotifyAccessToken = spotifyAccessToken;
    user.lastLogin = new Date();
    
    // Update profile info if changed
    if (displayName) user.displayName = displayName;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    if (spotifyProduct) user.spotifyProduct = spotifyProduct;
    
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        subscription: user.subscription,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Spotify login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});
```

### Spotify Signup Endpoint

```javascript
router.post('/spotify-signup', async (req, res) => {
  try {
    const { spotifyId, spotifyAccessToken, email, displayName, avatarUrl, spotifyProduct } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ spotifyId }, { email }] });

    if (user) {
      // User exists - auto-login instead
      user.spotifyAccessToken = spotifyAccessToken;
      user.lastLogin = new Date();
      await user.save();

      const token = jwt.sign(
        { userId: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          subscription: user.subscription,
          role: user.role
        },
        token
      });
    }

    // Generate unique username from display name or email
    let username = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    // Ensure username is unique
    let usernameExists = await User.findOne({ username });
    let counter = 1;
    while (usernameExists) {
      username = `${username}${counter}`;
      usernameExists = await User.findOne({ username });
      counter++;
    }

    // Create new user
    user = new User({
      spotifyId,
      spotifyAccessToken,
      email,
      displayName,
      username,
      avatarUrl,
      spotifyProduct,
      subscription: spotifyProduct === 'premium' ? 'premium' : 'free',
      role: 'user',
      password: null, // No password for Spotify users
      createdAt: new Date(),
      lastLogin: new Date()
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        subscription: user.subscription,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Spotify signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});
```

---

## Security Considerations

1. **Validate Spotify Token**: Optionally verify the `spotifyAccessToken` by making a request to Spotify API
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Email Verification**: Consider email verification for Spotify signups
4. **Token Expiry**: Store token expiry and implement refresh logic
5. **HTTPS Only**: Ensure all endpoints use HTTPS in production

---

## Testing

### Test Spotify Login
```bash
curl -X POST http://localhost:3000/api/users/spotify-login \
  -H "Content-Type: application/json" \
  -d '{
    "spotifyId": "test_spotify_id",
    "spotifyAccessToken": "test_token",
    "email": "test@example.com",
    "displayName": "Test User",
    "spotifyProduct": "premium"
  }'
```

### Test Spotify Signup
```bash
curl -X POST http://localhost:3000/api/users/spotify-signup \
  -H "Content-Type: application/json" \
  -d '{
    "spotifyId": "new_spotify_id",
    "spotifyAccessToken": "test_token",
    "email": "newuser@example.com",
    "displayName": "New User",
    "avatarUrl": "https://example.com/avatar.jpg",
    "spotifyProduct": "free"
  }'
```

---

## Frontend Integration

The frontend will:
1. User clicks "Continue with Spotify"
2. Redirects to Spotify OAuth
3. Spotify redirects back to `/callback`
4. Frontend exchanges code for access token
5. Frontend gets Spotify user profile
6. Frontend calls `/api/users/spotify-login` or `/api/users/spotify-signup`
7. Backend returns Auralyx user and JWT token
8. Frontend stores token and logs user in

---

## Migration Guide

If you have existing users who want to link Spotify:

1. Add a "Link Spotify Account" option in Settings
2. Create endpoint: `POST /api/users/link-spotify`
3. Require user to be authenticated
4. Update user's `spotifyId` and `spotifyAccessToken`

```javascript
router.post('/link-spotify', authenticateToken, async (req, res) => {
  try {
    const { spotifyId, spotifyAccessToken } = req.body;
    
    const user = await User.findById(req.user.userId);
    user.spotifyId = spotifyId;
    user.spotifyAccessToken = spotifyAccessToken;
    await user.save();
    
    res.json({ message: 'Spotify account linked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to link Spotify account' });
  }
});
```

---

## Questions?

Contact the frontend team for integration details or check the frontend implementation in:
- `src/services/spotifyAuthLogin.ts`
- `src/pages/SpotifyCallback.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/SignUpPage.tsx`
