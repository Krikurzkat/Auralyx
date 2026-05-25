# Lyrics Spacing Fix - FullscreenPlayer

## Problem
Lyrics in FullscreenPlayer were overlapping when they wrapped to multiple lines (up to 3 lines). The vertical spacing between lyrics was too small (70px), causing text to collide.

## Solution
Increased vertical spacing and adjusted line height to accommodate multi-line lyrics properly.

## Changes Made

### 1. Vertical Spacing (drift)
**Before**: `70px`
**After**: `150px`

```javascript
// Before
const drift = direction * Math.pow(distance, 1.3) * 70;

// After
const drift = direction * Math.pow(distance, 1.3) * 150;
```

**Why**: 
- 70px was only enough for single-line lyrics
- Multi-line lyrics need ~50px per line
- 150px provides comfortable spacing for 3-line lyrics

### 2. Line Height
**Before**: `1.3`
**After**: `1.4`

```javascript
// Before
lineHeight: '1.3'

// After
lineHeight: '1.4'
```

**Why**:
- Better readability for multi-line text
- More breathing room between lines
- Prevents text from feeling cramped

### 3. Min/Max Height
**Before**: 
- `minHeight: '1.3em'`
- `maxHeight: '3.9em'`

**After**:
- `minHeight: '1.4em'`
- `maxHeight: '4.2em'`

```javascript
// Before
minHeight: '1.3em',
maxHeight: '3.9em', // 1.3em × 3 lines

// After
minHeight: '1.4em',
maxHeight: '4.2em', // 1.4em × 3 lines
```

**Why**:
- Matches the new line height
- Ensures 3 lines fit properly
- Prevents text overflow

## Visual Comparison

### Before (70px spacing):
```
Line 1 overlapping
Line 2 with Line 3
Line 3 cramped together
```

### After (150px spacing):
```
Line 1 with proper space

Line 2 clearly separated

Line 3 readable and distinct
```

## Spacing Calculation

For 3-line lyrics with proper spacing:

| Component | Size | Calculation |
|-----------|------|-------------|
| Font size | 1.25rem | ~20px |
| Line height | 1.4 | 20px × 1.4 = 28px per line |
| 3 lines | 4.2em | 28px × 3 = 84px total height |
| Gap needed | 150px | Enough space for 84px + buffer |

## Consistency with DrivePlayer

Both players now have similar spacing:

| Player | Spacing | Line Height | Max Lines |
|--------|---------|-------------|-----------|
| **FullscreenPlayer** | 150px | 1.4 | 3 lines (4.2em) |
| **DrivePlayer** | 130px | 1.3 | 3 lines (3.9em) |

**Note**: FullscreenPlayer has slightly more spacing (150px vs 130px) because it has more screen real estate.

## Benefits

1. **No Overlap**: Lyrics never collide, even with 3 lines
2. **Readable**: Clear separation between lyric lines
3. **Professional**: Matches commercial music apps
4. **Smooth**: Animations still flow naturally
5. **Flexible**: Handles 1-3 line lyrics gracefully

## Technical Details

### Spacing Formula
```javascript
verticalOffset = direction × distance^1.3 × 150
```

- `direction`: -1 (above) or 1 (below)
- `distance`: How far from center lyric
- `^1.3`: Exponential spacing (further = more space)
- `×150`: Base spacing multiplier

### Example Spacing
| Distance | Offset |
|----------|--------|
| 0 (center) | 0px |
| 1 | 150px |
| 2 | ~310px |
| 3 | ~495px |
| 4 | ~700px |

## Testing Scenarios

✅ **Single-line lyrics**: Plenty of space, looks great
✅ **Two-line lyrics**: Clear separation, readable
✅ **Three-line lyrics**: No overlap, proper spacing
✅ **Mixed lengths**: Transitions smoothly between different line counts

## User Experience

### Before Fix:
- Lyrics overlapped and were hard to read
- Multi-line text collided with adjacent lyrics
- Looked unprofessional and cluttered

### After Fix:
- Each lyric has its own clear space
- Multi-line text is fully readable
- Professional, polished appearance
- Smooth, flowing animations

## Files Modified

1. `components/player/FullscreenPlayer.tsx`
   - Increased `drift` multiplier: 70 → 150
   - Increased `lineHeight`: 1.3 → 1.4
   - Updated `minHeight`: 1.3em → 1.4em
   - Updated `maxHeight`: 3.9em → 4.2em

## Future Enhancements

Potential improvements:
- Dynamic spacing based on lyric length
- Adaptive font size for very long lyrics
- User preference for spacing density
- Different spacing for mobile vs desktop
