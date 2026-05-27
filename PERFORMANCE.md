# Performance Optimizations

This document outlines the performance optimizations implemented in the Go-Music app to ensure smooth performance across all devices (PC, Tablet, and Mobile).

## Overview

The app now automatically detects device capabilities and adjusts visual effects and animations accordingly to maintain 60fps performance.

## Key Optimizations

### 1. Device Detection & Adaptive Settings

**File**: `apps/web/src/utils/performanceOptimizations.ts`

- Automatically detects device type (mobile, tablet, desktop)
- Detects hardware capabilities (CPU cores, RAM)
- Respects user's "prefers-reduced-motion" setting
- Provides optimized settings based on device capabilities

**Hook**: `apps/web/src/hooks/usePerformance.ts`

- React hook that provides performance settings to components
- Automatically updates on window resize/orientation change

### 2. CSS Optimizations

**File**: `apps/web/src/index.css`

#### Backdrop Blur Reduction
- **Desktop**: Full blur effects (40px)
- **Tablet**: Reduced blur (16px)
- **Mobile**: No blur (solid backgrounds)

#### Shadow Optimization
- Reduced shadow blur radius on mobile/tablet
- Minimal shadows on phones for better performance

#### Animation Optimization
- Disabled expensive animations on mobile/tablet:
  - `animate-pulse-glow`
  - `animate-aurora-*`
  - `animate-meteor`
- Reduced animation durations on mobile
- Removed `will-change` property by default (only used during active animations)

#### Transform Optimization
- All animations use `translateZ(0)` for GPU acceleration
- Added `backface-visibility: hidden` to prevent flickering
- Removed unnecessary `will-change` properties

### 3. Component Optimizations

#### BottomPlayer
- Integrated performance hook
- Conditional rendering of expensive effects
- Optimized progress bar interactions
- Reduced re-renders with memoization

#### RightPanel
- Reduced stagger animation delays on mobile (40ms vs 60ms)
- Faster transition durations on mobile (0.2s vs 0.45s)
- Disabled particle effects on mobile/tablet
- Optimized lyric rendering

#### FullscreenPlayer & DrivePlayer
- Conditional `will-change` properties (only during transitions)
- Proper cleanup of animation properties
- GPU-accelerated transforms

### 4. Media Query Breakpoints

```css
/* Phone */
@media (max-width: 768px) {
  - No backdrop blur
  - Minimal shadows
  - No blur filters
  - Disabled expensive animations
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  - Reduced backdrop blur (8px)
  - Reduced shadows
  - Reduced blur filters (8px)
  - Disabled expensive animations
}

/* Desktop */
@media (min-width: 1025px) {
  - Full effects enabled
}
```

### 5. Animation Performance

#### Optimized Animations
- **Equalizer bars**: Lightweight height-only animations
- **Progress bars**: Transform-based animations (GPU accelerated)
- **Fade transitions**: Opacity-only changes
- **Queue items**: Reduced stagger delays on mobile

#### Disabled on Mobile/Tablet
- Pulse glow effects
- Aurora background animations
- Meteor animations
- Heavy particle effects

### 6. Rendering Optimizations

#### Lazy Loading
- Images use `loading="lazy"` attribute
- Async image decoding

#### Reduced Motion Support
- Respects `prefers-reduced-motion` media query
- Disables all animations when user prefers reduced motion

#### Hardware Acceleration
- All transforms use `translateZ(0)`
- Proper use of `backface-visibility: hidden`
- Minimal use of `will-change` (only during active animations)

## Performance Metrics

### Target Performance
- **Desktop**: 60fps with all effects
- **Tablet**: 60fps with reduced effects
- **Mobile**: 60fps with minimal effects

### Optimized Areas
1. **Backdrop blur**: 0-40px based on device
2. **Shadow blur**: 0-48px based on device
3. **Animation duration**: 0.2s-1s based on device
4. **Particle effects**: Disabled on mobile/tablet
5. **Stagger delays**: 40ms on mobile, 60ms on desktop

## Usage

### In Components

```typescript
import { usePerformance } from '../hooks/usePerformance';

function MyComponent() {
  const performance = usePerformance();
  
  return (
    <div>
      {performance.enableParticles && <ParticleEffect />}
      {performance.enableBlur && <BlurredBackground />}
    </div>
  );
}
```

### Performance Settings Object

```typescript
interface PerformanceSettings {
  enableBlur: boolean;           // Backdrop blur effects
  enableParticles: boolean;      // Particle animations
  enableHeavyAnimations: boolean; // Aurora, meteor, etc.
  enableShadows: boolean;        // Box shadows
  maxBlurRadius: number;         // 0-40px
  animationDuration: number;     // 0.5-1 (multiplier)
  enableWillChange: boolean;     // CSS will-change property
}
```

## Best Practices

1. **Always use the performance hook** when adding new visual effects
2. **Test on mobile devices** to ensure smooth performance
3. **Use GPU-accelerated properties**: `transform`, `opacity`
4. **Avoid**: `width`, `height`, `top`, `left` animations
5. **Use `will-change` sparingly**: Only during active animations
6. **Clean up animations**: Remove `will-change` after animation completes
7. **Prefer CSS animations** over JavaScript animations when possible

## Future Improvements

- [ ] Implement virtual scrolling for long lists
- [ ] Add image optimization/compression
- [ ] Implement code splitting for faster initial load
- [ ] Add service worker for offline support
- [ ] Optimize bundle size with tree shaking
- [ ] Add performance monitoring/analytics

## Testing

### Performance Testing Checklist
- [ ] Test on low-end mobile device (< 4GB RAM)
- [ ] Test on mid-range tablet
- [ ] Test on high-end desktop
- [ ] Test with "Reduce Motion" enabled
- [ ] Test with slow network connection
- [ ] Monitor FPS during animations
- [ ] Check memory usage over time

### Tools
- Chrome DevTools Performance tab
- React DevTools Profiler
- Lighthouse performance audit
- WebPageTest.org

## Conclusion

These optimizations ensure the Go-Music app runs smoothly on all devices while maintaining a beautiful, modern UI. The adaptive approach means users on high-end devices get the full visual experience, while users on lower-end devices still get excellent performance.
