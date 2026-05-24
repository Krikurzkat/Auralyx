# 🎛️ Manual Crossfade for Next/Previous Buttons - ADDED!

## What's New?

You can now have **smooth crossfades when clicking next/previous buttons**, just like the automatic crossfades between tracks!

---

## 🎯 How It Works

### Before (Default):
```
Click Next → Track stops instantly → New track starts
❌ Abrupt transition
```

### After (With Manual Crossfade):
```
Click Next → Current track fades out → New track fades in
✅ Smooth, professional transition
```

---

## ⚙️ Configuration

Set `manualFadeDuration` in your player settings:

```typescript
// In your player store or settings
manualFadeDuration: 1,  // 1 second crossfade for next/prev
autoFadeDuration: 4,    // 4 seconds for auto-advance
```

### Recommended Values:

| Duration | Use Case | Feel |
|----------|----------|------|
| `0` | Default | Instant switch (no fade) |
| `0.5s` | Quick | Snappy, responsive |
| `1s` | Balanced | Smooth but not slow |
| `1.5s` | Relaxed | Gentle transitions |
| `2s` | DJ-style | Professional mixing |

---

## 🎵 Features

✅ **Equal-power crossfading** - Same algorithm as auto-crossfade  
✅ **60fps smooth** - Uses requestAnimationFrame  
✅ **No volume dips** - Constant perceived loudness  
✅ **Works with next AND previous** - Both buttons supported  
✅ **Respects playback state** - Only crossfades when playing  
✅ **Graceful fallback** - Falls back to instant switch if needed  

---

## 🎮 User Experience

### Next Button:
- Click next → Smooth crossfade to next track
- Works with repeat modes (all, one, off)
- Works with shuffle mode

### Previous Button:
- **< 3 seconds:** Crossfade to previous track
- **> 3 seconds:** Restart current track (no fade)

---

## 🔧 Technical Details

### Implementation:
```typescript
// New helper function: performManualCrossfade()
// - Preloads next track
// - Uses equal-power curve (cos/sin)
// - 60fps animation with requestAnimationFrame
// - Handles both audio slots seamlessly
```

### Behavior:
1. User clicks next/previous
2. Check if `manualFadeDuration > 0`
3. If yes: Start equal-power crossfade
4. If no: Instant track switch (old behavior)

---

## 💡 Usage Tips

### For Different Music Styles:

**Electronic/Dance Music:**
```typescript
manualFadeDuration: 2,  // DJ-style mixing
```

**Pop/Rock:**
```typescript
manualFadeDuration: 1,  // Quick, smooth
```

**Classical/Jazz:**
```typescript
manualFadeDuration: 0,  // Respect track boundaries
```

**Podcasts/Audiobooks:**
```typescript
manualFadeDuration: 0,  // Instant switching
```

---

## 🧪 Testing

Try these scenarios:
1. Set `manualFadeDuration: 1`
2. Play a playlist
3. Click next button → Should smoothly crossfade
4. Click previous button → Should smoothly crossfade
5. Click rapidly → Should handle gracefully
6. Try different durations (0.5s, 1s, 2s)

---

## 🎉 Result

Your next/previous buttons now feel **professional and polished**, just like Apple Music or Spotify!

**Perfect for:**
- DJ-style manual mixing
- Smooth playlist navigation
- Professional music apps
- Enhanced user experience

---

## 📊 Comparison

| Feature | Before | After |
|---------|--------|-------|
| Next button | Instant cut | Smooth crossfade |
| Previous button | Instant cut | Smooth crossfade |
| User control | On/Off only | Adjustable duration |
| Quality | Abrupt | Professional |
| Flexibility | Fixed | Configurable |

---

**Enjoy your smooth manual transitions! 🎵**
