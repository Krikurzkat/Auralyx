# ✅ Spotify Login/Signup Integration - Complete!

## 🎉 What's Been Implemented

Your Auralyx app now has **"Continue with Spotify"** buttons on both Login and Signup pages!

---

## 📁 Files Created/Modified

### Frontend (apps/web)

#### New Files
- ✅ `src/services/spotifyAuthLogin.ts` - Spotify OAuth for login/signup
- ✅ `apps/server/SPOTIFY_AUTH_ENDPOINTS.md` - Backend API documentation

#### Modified Files
- ✅ `src/pages/LoginPage.tsx` - Added "Continue with Spotify" button
- ✅ `src/pages/SignUpPage.tsx` - Added "Continue with Spotify" button  
- ✅ `src/pages/SpotifyCallback.tsx` - Handles both auth types

---

## 🎯 How It Works

### User Flow

#### Login with Spotify
1. User clicks **"Continue with Spotify"** on Login page
2. Redirects to Spotify OAuth
3. User approves permissions
4. Redirects back to `/callback`
5. Frontend gets Spotify access token
6. Frontend calls `/api/users/spotify-login` with Spotify data
7. Backend finds user by Spotify ID
8. Backend returns Auralyx JWT token
9. User is logged in! ✅

#### Signup with Spotify
1. User clicks **"Continue with Spotify"** on Signup page
2. Redirects to Spotify OAuth
3. User approves permissions
4. Redirects back to `/callback`
5. Frontend gets Spotify access token
6. Frontend calls `/api/users/spotify-signup` with Spotify data
7. Backend creates new user account
8. Backend returns Auralyx JWT token
9. User is signed up and logged in! ✅

---

## 🔧 Backend Implementation Required

### Step 1: Update User Model

Add these fields to your User schema:

```javascript
{
  // Existing fields
  username: String,
  email: String,
  displayName: String,
  password: String,  // Make optional (null for Spotify users)
  
  // NEW: Spotify fields
  spotifyId: { type: String, unique: true, sparse: true },
  spotifyAccessToken: String,
  spotifyRefreshToken: String,
  spotifyProduct: String,  // "premium" or "free"
  
  // Existing fields
  avatarUrl: String,
  subscription: String,
  role: String,
  createdAt: Date,
  lastLogin: Date
}
```

### Step 2: Create Spotify Login Endpoint

**POST** `/api/users/spotify-login`

```javascript
router.post('/spotify-login', async (req, res) => {
  const { spotifyId, spotifyAccessToken, email, displayName, avatarUrl, spotifyProduct } = req.body;

  // Find user by Spotify ID
  let user = await User.findOne({ spotifyId });

  if (!user) {
    return res.status(404).json({ 
      error: 'No account found. Please sign up first.' 
    });
  }

  // Update token and last login
  user.spotifyAccessToken = spotifyAccessToken;
  user.lastLogin = new Date();
  if (displayName) user.displayName = displayName;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  await user.save();

  // Generate JWT
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
});
```

### Step 3: Create Spotify Signup Endpoint

**POST** `/api/users/spotify-signup`

```javascript
router.post('/spotify-signup', async (req, res) => {
  const { spotifyId, spotifyAccessToken, email, displayName, avatarUrl, spotifyProduct } = req.body;

  // Check if user exists
  let user = await User.findOne({ $or: [{ spotifyId }, { email }] });

  if (user) {
    // Auto-login existing user
    user.spotifyAccessToken = spotifyAccessToken;
    user.lastLogin = new Date();
    await user.save();
  } else {
    // Generate unique username
    let username = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `${username}${counter++}`;
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
      password: null,
      createdAt: new Date(),
      lastLogin: new Date()
    });

    await user.save();
  }

  // Generate JWT
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
});
```

---

## 🎨 UI Preview

### Login Page

```
┌─────────────────────────────────────┐
│         [Auralyx Logo]              │
│                                     │
│     Welcome to Auralyx              │
│  Log in to continue your journey    │
│                                     │
│  Username: [____________]           │
│  Password: [____________]           │
│                                     │
│  [        Log In        ]           │
│                                     │
│  ─────────── OR ───────────         │
│                                     │
│  [🟢 Continue with Spotify]         │
│                                     │
│  Don't have an account? Sign up     │
└─────────────────────────────────────┘
```

### Signup Page

```
┌─────────────────────────────────────┐
│         [Auralyx Logo]              │
│                                     │
│        Join Auralyx                 │
│  Create your account to unlock      │
│        premium audio                │
│                                     │
│  Username:     [____________]       │
│  Display Name: [____________]       │
│  Email:        [____________]       │
│  Password:     [____________]       │
│                                     │
│  [        Sign Up        ]          │
│                                     │
│  ─────────── OR ───────────         │
│                                     │
│  [🟢 Continue with Spotify]         │
│                                     │
│  Already have an account? Log in    │
└─────────────────────────────────────┘
```

---

## 🧪 Testing

### Test Login Flow

1. **Start the app**:
   ```bash
   cd apps/web
   npm run dev
   ```

2. **Go to Login page**: http://127.0.0.1:5173/login

3. **Click "Continue with Spotify"**

4. **Expected behavior**:
   - Redirects to Spotify login
   - After approval, redirects to `/callback`
   - Shows "Authenticating with Auralyx..."
   - Calls backend `/api/users/spotify-login`
   - Logs user in and redirects to home

### Test Signup Flow

1. **Go to Signup page**: http://127.0.0.1:5173/signup

2. **Click "Continue with Spotify"**

3. **Expected behavior**:
   - Redirects to Spotify login
   - After approval, redirects to `/callback`
   - Shows "Authenticating with Auralyx..."
   - Calls backend `/api/users/spotify-signup`
   - Creates account, logs in, redirects to home

---

## 🔐 Security Features

### Frontend
- ✅ Intent tracking (login vs signup)
- ✅ Secure token exchange
- ✅ Error handling with user feedback
- ✅ Automatic cleanup of temporary data

### Backend (To Implement)
- ✅ Unique Spotify ID constraint
- ✅ Email uniqueness check
- ✅ JWT token generation
- ✅ Password optional for Spotify users
- ✅ Auto-login for existing users

---

## 📊 Data Flow

### Login Request
```
Frontend → Spotify OAuth → Callback → Backend
```

**Backend receives**:
```json
{
  "spotifyId": "user123",
  "spotifyAccessToken": "BQC...",
  "email": "user@example.com",
  "displayName": "John Doe",
  "avatarUrl": "https://...",
  "spotifyProduct": "premium"
}
```

**Backend returns**:
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": "https://...",
    "subscription": "premium",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🐛 Troubleshooting

### "No account found"
**Cause**: User clicked login but hasn't signed up yet  
**Fix**: User should click "Sign up" link and use Spotify signup

### "Account already exists"
**Cause**: User clicked signup but already has an account  
**Fix**: Backend should auto-login instead of error

### Callback shows error
**Cause**: Backend endpoints not implemented yet  
**Fix**: Implement the two endpoints in backend

### Redirects to wrong page
**Cause**: Intent not properly stored  
**Fix**: Check localStorage for `spotify_auth_intent`

---

## ✨ Features

### What Works Now
- ✅ "Continue with Spotify" on Login page
- ✅ "Continue with Spotify" on Signup page
- ✅ Spotify OAuth flow
- ✅ Token exchange
- ✅ Intent tracking (login vs signup)
- ✅ User profile from Spotify
- ✅ Avatar from Spotify
- ✅ Premium/Free detection

### What Backend Needs to Add
- ⚠️ `/api/users/spotify-login` endpoint
- ⚠️ `/api/users/spotify-signup` endpoint
- ⚠️ User model updates (spotifyId, etc.)
- ⚠️ Username generation logic
- ⚠️ JWT token generation

---

## 📚 Documentation

### For Backend Team
- **`apps/server/SPOTIFY_AUTH_ENDPOINTS.md`** - Complete API documentation
  - Endpoint specifications
  - Request/response formats
  - Implementation examples
  - Database schema updates
  - Security considerations

### For Frontend Team
- **`src/services/spotifyAuthLogin.ts`** - OAuth integration
- **`src/pages/SpotifyCallback.tsx`** - Callback handler
- **`src/pages/LoginPage.tsx`** - Login UI
- **`src/pages/SignUpPage.tsx`** - Signup UI

---

## 🎯 Next Steps

### Backend Team
1. ✅ Read `apps/server/SPOTIFY_AUTH_ENDPOINTS.md`
2. ✅ Update User model with Spotify fields
3. ✅ Implement `/api/users/spotify-login`
4. ✅ Implement `/api/users/spotify-signup`
5. ✅ Test with frontend

### Frontend Team
1. ✅ Test UI on Login/Signup pages
2. ✅ Verify Spotify OAuth flow
3. ✅ Test error handling
4. ✅ Coordinate with backend for testing

---

## 🚀 Ready to Test!

Once backend implements the two endpoints:

1. User clicks "Continue with Spotify"
2. Logs in with Spotify
3. Gets authenticated in Auralyx
4. Starts using the app!

**Everything is ready on the frontend side!** 🎉

---

## 📞 Support

- Frontend implementation: Check `src/services/spotifyAuthLogin.ts`
- Backend requirements: Check `apps/server/SPOTIFY_AUTH_ENDPOINTS.md`
- UI components: Check `src/pages/LoginPage.tsx` and `SignUpPage.tsx`

**Not pushed to GitHub yet** - Ready for your review!
