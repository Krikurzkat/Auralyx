# 🎵 Total Music - AI Development Rules

## ⚠️ CRITICAL: These rules MUST be followed strictly and without exception

---

## 📋 Table of Contents
1. [Code Quality & Standards](#code-quality--standards)
2. [Design & UI Guidelines](#design--ui-guidelines)
3. [Animation & Transitions](#animation--transitions)
4. [Performance Requirements](#performance-requirements)
5. [File Structure & Organization](#file-structure--organization)
6. [Testing & Verification](#testing--verification)
7. [Git & Version Control](#git--version-control)
8. [Forbidden Actions](#forbidden-actions)

---

## 🎯 Code Quality & Standards

### TypeScript Rules
- ✅ **ALWAYS** use TypeScript with proper type definitions
- ✅ **NEVER** use `any` type - use proper types or `unknown`
- ✅ **ALWAYS** define interfaces for props and state
- ✅ **ALWAYS** use type inference where possible
- ❌ **NEVER** disable TypeScript errors with `@ts-ignore` without explanation

### React Best Practices
- ✅ **ALWAYS** use functional components with hooks
- ✅ **ALWAYS** use `useMemo` and `useCallback` for expensive operations
- ✅ **ALWAYS** clean up effects (return cleanup functions)
- ✅ **ALWAYS** use proper dependency arrays in hooks
- ❌ **NEVER** mutate state directly - use setState functions
- ❌ **NEVER** use inline functions in JSX for event handlers (use useCallback)

### Code Organization
- ✅ **ALWAYS** keep components under 300 lines
- ✅ **ALWAYS** extract reusable logic into custom hooks
- ✅ **ALWAYS** use meaningful variable and function names
- ✅ **ALWAYS** add comments for complex logic
- ❌ **NEVER** leave console.logs in production code
- ❌ **NEVER** commit commented-out code

---

## 🎨 Design & UI Guidelines

### Color System
- ✅ **ALWAYS** use CSS variables for theme colors:
  - `--color-accent` (primary accent)
  - `--color-accent-alt` (secondary accent)
  - `--color-accent-hover` (hover states)
- ✅ **ALWAYS** use Tailwind classes: `accent`, `accentAlt`, `card`, `surface`
- ❌ **NEVER** hardcode colors like `#E8470A` - use variables

### Spacing & Layout
- ✅ **ALWAYS** use Tailwind spacing utilities (p-4, m-6, gap-3)
- ✅ **ALWAYS** maintain consistent spacing (multiples of 4px)
- ✅ **ALWAYS** use responsive classes (sm:, md:, lg:, xl:)
- ❌ **NEVER** use arbitrary values unless absolutely necessary

### Typography
- ✅ **ALWAYS** use font-bold for headings (font-semibold for subheadings)
- ✅ **ALWAYS** use proper text hierarchy (text-4xl, text-2xl, text-xl, text-base)
- ✅ **ALWAYS** use `tracking-tight` for large headings
- ✅ **ALWAYS** use `text-white` for primary text, `text-softText` for secondary

### Component Styling
- ✅ **ALWAYS** use rounded corners: `rounded-2xl`, `rounded-xl`, `rounded-lg`
- ✅ **ALWAYS** add hover states with `hover:` prefix
- ✅ **ALWAYS** use backdrop-blur for glass effects
- ✅ **ALWAYS** add shadows for depth: `shadow-lg`, `shadow-xl`, `shadow-2xl`
- ❌ **NEVER** create flat, unstyled components

---

## ✨ Animation & Transitions

### GSAP Animations
- ✅ **ALWAYS** use GSAP for complex animations
- ✅ **ALWAYS** clean up GSAP timelines in useEffect cleanup
- ✅ **ALWAYS** use `power4.out` or `power3.out` for smooth easing
- ✅ **ALWAYS** use stagger for list animations (0.05s - 0.12s)
- ❌ **NEVER** use CSS animations for complex sequences

### GSAP Best Practices

#### Timeline Management
```typescript
// ✅ CORRECT: Proper cleanup
useEffect(() => {
  const tl = gsap.timeline();
  tl.to(element, { opacity: 1, duration: 0.5 });
  
  return () => {
    tl.kill(); // Always kill timelines on unmount
  };
}, []);

// ❌ WRONG: No cleanup
useEffect(() => {
  gsap.to(element, { opacity: 1 });
}, []);
```

#### Easing Functions
- ✅ **ALWAYS** use these easing functions:
  - `power4.out` - Ultra smooth, premium feel (use for important animations)
  - `power3.out` - Smooth, natural feel (use for most animations)
  - `power2.out` - Quick, snappy feel (use for small interactions)
  - `expo.out` - Dramatic, impactful (use for hero elements)
  - `back.out(2)` - Bouncy, playful (use sparingly)
- ❌ **NEVER** use linear easing (feels robotic)
- ❌ **NEVER** use `elastic` or `bounce` for professional UI

#### Animation Durations
```typescript
// ✅ CORRECT: Appropriate durations
gsap.to(button, { scale: 1.05, duration: 0.2 });        // Quick hover
gsap.to(modal, { opacity: 1, duration: 0.35 });         // Standard fade
gsap.to(cover, { y: 0, duration: 0.7, ease: 'power4.out' }); // Smooth move
gsap.to(hero, { opacity: 1, duration: 1.0 });           // Dramatic entrance

// ❌ WRONG: Too fast or too slow
gsap.to(element, { opacity: 1, duration: 0.05 });       // Too fast
gsap.to(element, { opacity: 1, duration: 3.0 });        // Too slow
```

#### Stagger Animations
```typescript
// ✅ CORRECT: Smooth wavy effect
gsap.fromTo('.queue-item',
  { opacity: 0, y: 15 },
  {
    opacity: 1,
    y: 0,
    duration: 0.9,
    stagger: {
      each: 0.12,
      from: 'start',
    },
    ease: 'power4.out',
  }
);

// ❌ WRONG: Too fast stagger
gsap.to('.item', {
  opacity: 1,
  stagger: 0.01, // Too fast, looks instant
});
```

#### Selector Best Practices
```typescript
// ✅ CORRECT: Use refs or specific selectors
const itemsRef = useRef<HTMLElement[]>([]);
gsap.to(itemsRef.current, { opacity: 1 });

// Or with scoped selectors
const selectWithinShell = (selector: string) => {
  return Array.from(shellRef.current?.querySelectorAll(selector) || []);
};
gsap.to(selectWithinShell('.queue-item'), { opacity: 1 });

// ❌ WRONG: Global selectors (affects entire page)
gsap.to('.item', { opacity: 1 }); // Might affect unintended elements
```

#### Animation Sequences
```typescript
// ✅ CORRECT: Proper timeline sequence
const tl = gsap.timeline({
  onComplete: () => {
    // Cleanup or next action
  }
});

// Step 1: Fade out old content
tl.to('.track-title', {
  opacity: 0,
  y: -10,
  duration: 0.25,
  ease: 'power2.out',
}, 0);

// Step 2: Move cover (starts after step 1)
tl.to('.cover-clone', {
  x: 0,
  y: 0,
  duration: 0.7,
  ease: 'power4.out',
}, 0.25);

// Step 3: Fade in new content (starts near end of step 2)
tl.to('.track-title', {
  opacity: 1,
  y: 0,
  duration: 0.4,
  ease: 'power3.out',
}, 0.95);

// ❌ WRONG: No timing control
gsap.to('.title', { opacity: 0 });
gsap.to('.cover', { x: 0 }); // Starts immediately, not sequenced
gsap.to('.title', { opacity: 1 }); // Starts immediately, not sequenced
```

#### Performance Optimization
```typescript
// ✅ CORRECT: Use will-change and transforms
gsap.set(element, { willChange: 'transform, opacity' });
gsap.to(element, {
  x: 100,        // Use x instead of left
  y: 50,         // Use y instead of top
  scale: 1.5,    // Use scale instead of width/height
  opacity: 1,
  duration: 0.5,
});
gsap.set(element, { clearProps: 'willChange' }); // Clear after animation

// ❌ WRONG: Animating layout properties
gsap.to(element, {
  left: '100px',   // Causes reflow
  top: '50px',     // Causes reflow
  width: '200px',  // Causes reflow
});
```

#### Common Animation Patterns

**Fade In/Out:**
```typescript
// Fade in
gsap.fromTo(element,
  { opacity: 0 },
  { opacity: 1, duration: 0.35, ease: 'power2.out' }
);

// Fade out
gsap.to(element, { opacity: 0, duration: 0.25, ease: 'power2.in' });
```

**Slide In/Out:**
```typescript
// Slide in from bottom
gsap.fromTo(element,
  { y: 20, opacity: 0 },
  { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }
);

// Slide out to top
gsap.to(element, { y: -20, opacity: 0, duration: 0.3, ease: 'power2.in' });
```

**Scale Effects:**
```typescript
// Scale in
gsap.fromTo(element,
  { scale: 0.9, opacity: 0 },
  { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.5)' }
);

// Hover scale
gsap.to(button, { scale: 1.05, duration: 0.2, ease: 'power2.out' });
```

**Wavy List Animation:**
```typescript
// Perfect for queue items, playlists, etc.
gsap.fromTo('.list-item',
  { opacity: 0, y: 15 },
  {
    opacity: 1,
    y: 0,
    duration: 0.9,
    stagger: {
      each: 0.12,
      from: 'start',
    },
    ease: 'power4.out',
    clearProps: 'all', // Clean up after animation
  }
);
```

**Cover Move Animation:**
```typescript
// Album cover moving to main position
const tl = gsap.timeline();

// Create clone for smooth transition
const clone = element.cloneNode(true);
document.body.appendChild(clone);

tl.to(clone, {
  x: targetX,
  y: targetY,
  width: targetWidth,
  height: targetHeight,
  duration: 0.7,
  ease: 'power4.out',
  onComplete: () => {
    document.body.removeChild(clone);
  }
});
```

#### GSAP Utilities
```typescript
// ✅ Use GSAP utilities for better control
gsap.set(element, { x: 0, y: 0 }); // Instant set (no animation)
gsap.killTweensOf(element);        // Kill all animations on element
gsap.getTweensOf(element);         // Get active animations

// Delay execution
gsap.delayedCall(1.0, () => {
  console.log('Executed after 1 second');
});
```

### Transition Guidelines
- ✅ **ALWAYS** add transitions to interactive elements
- ✅ **ALWAYS** use `transition-all` or specific properties
- ✅ **ALWAYS** keep transitions smooth (0.2s - 0.4s duration)
- ✅ **ALWAYS** use scale effects on hover: `hover:scale-105`
- ❌ **NEVER** create jarring or instant state changes

### CSS Transitions (For Simple Interactions)
```css
/* ✅ CORRECT: Smooth hover effects */
.button {
  transition: all 0.2s ease-out;
}
.button:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

/* ❌ WRONG: No transition */
.button:hover {
  transform: scale(1.05); /* Instant, jarring */
}
```

### Animation Timing
- ✅ **ALWAYS** use these durations:
  - Quick interactions: 0.2s - 0.3s
  - Standard transitions: 0.35s - 0.5s
  - Smooth animations: 0.7s - 1.0s
  - Dramatic effects: 1.0s - 1.5s
- ❌ **NEVER** use animations longer than 2 seconds
- ❌ **NEVER** use animations shorter than 0.15s (too fast to perceive)

### Animation Checklist
- [ ] Timeline is properly cleaned up
- [ ] Easing function is appropriate (power3.out or power4.out)
- [ ] Duration feels natural (not too fast or slow)
- [ ] Stagger timing creates smooth wave effect
- [ ] Using transforms (x, y, scale) instead of layout properties
- [ ] clearProps used after animation completes
- [ ] No memory leaks from uncleaned timelines
- [ ] Animation runs at 60 FPS
- [ ] Works smoothly on lower-end devices

### GSAP + React Patterns
```typescript
// ✅ CORRECT: Complete pattern
const MyComponent = () => {
  const elementRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    // Create timeline
    timelineRef.current = gsap.timeline();
    
    timelineRef.current
      .fromTo(elementRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );

    // Cleanup
    return () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
    };
  }, []);

  return <div ref={elementRef}>Content</div>;
};
```

### Common Mistakes to Avoid
1. ❌ Forgetting to kill timelines on unmount
2. ❌ Using linear easing (always use ease functions)
3. ❌ Animating layout properties (left, top, width, height)
4. ❌ Too fast stagger (< 0.05s)
5. ❌ Too slow stagger (> 0.2s)
6. ❌ Not using clearProps after animation
7. ❌ Global selectors affecting unintended elements
8. ❌ Animations that block user interaction
9. ❌ No loading states during animations
10. ❌ Animations that cause layout shifts

---

## 🎬 GSAP + React Three Fiber (R3F) - 3D Animations

### Overview
React Three Fiber (R3F) is a React renderer for Three.js that brings declarative 3D graphics to React. When combined with GSAP, you can create stunning 3D animations with smooth, professional timing.

### Installation
```bash
npm install @react-three/fiber @react-three/drei three
npm install --save-dev @types/three
```

### Core Concepts

#### R3F Canvas Setup
```typescript
// ✅ CORRECT: Basic R3F setup
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

const Scene3D = () => {
  return (
    <Canvas
      shadows
      dpr={[1, 2]} // Device pixel ratio for retina displays
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100vh' }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      
      {/* Your 3D content here */}
      <MyAnimated3DObject />
      
      <OrbitControls enableDamping dampingFactor={0.05} />
    </Canvas>
  );
};
```

### GSAP + R3F Integration Patterns

#### 1. Animating 3D Object Position
```typescript
// ✅ CORRECT: Smooth 3D position animation
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';

const AnimatedBox = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    
    tl.to(meshRef.current.position, {
      y: 2,
      duration: 1.5,
      ease: 'power2.inOut',
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <mesh ref={meshRef} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#E8470A" />
    </mesh>
  );
};
```

#### 2. Animating Rotation
```typescript
// ✅ CORRECT: Smooth rotation with GSAP
const RotatingObject = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    // Continuous rotation
    gsap.to(meshRef.current.rotation, {
      y: Math.PI * 2,
      duration: 3,
      ease: 'none', // Linear for continuous rotation
      repeat: -1,
    });

    return () => {
      gsap.killTweensOf(meshRef.current.rotation);
    };
  }, []);

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[1, 0.4, 16, 100]} />
      <meshStandardMaterial color="#00D9FF" metalness={0.8} roughness={0.2} />
    </mesh>
  );
};
```

#### 3. Animating Scale with Bounce
```typescript
// ✅ CORRECT: Scale animation with bounce effect
const BouncingObject = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  const handleClick = () => {
    if (!meshRef.current) return;

    gsap.timeline()
      .to(meshRef.current.scale, {
        x: 1.3,
        y: 1.3,
        z: 1.3,
        duration: 0.3,
        ease: 'back.out(2)',
      })
      .to(meshRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.4,
        ease: 'elastic.out(1, 0.5)',
      });
  };

  return (
    <mesh ref={meshRef} onClick={handleClick}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#FF6B9D" />
    </mesh>
  );
};
```

#### 4. Animating Material Properties
```typescript
// ✅ CORRECT: Animate material opacity and color
const FadingObject = () => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (!materialRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    
    tl.to(materialRef.current, {
      opacity: 0.3,
      duration: 1.5,
      ease: 'power2.inOut',
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#00FF88"
        transparent
        opacity={1}
      />
    </mesh>
  );
};
```

#### 5. Camera Animation
```typescript
// ✅ CORRECT: Smooth camera movement
import { useThree } from '@react-three/fiber';

const AnimatedCamera = () => {
  const { camera } = useThree();

  const moveCameraTo = (position: [number, number, number]) => {
    gsap.to(camera.position, {
      x: position[0],
      y: position[1],
      z: position[2],
      duration: 2,
      ease: 'power3.inOut',
      onUpdate: () => {
        camera.lookAt(0, 0, 0); // Keep looking at center
      },
    });
  };

  return (
    <group>
      <mesh onClick={() => moveCameraTo([5, 3, 5])}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#FF0000" />
      </mesh>
    </group>
  );
};
```

#### 6. Group Animation (Multiple Objects)
```typescript
// ✅ CORRECT: Animate multiple objects in a group
const AnimatedGroup = () => {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    const tl = gsap.timeline({ repeat: -1 });
    
    // Rotate entire group
    tl.to(groupRef.current.rotation, {
      y: Math.PI * 2,
      duration: 8,
      ease: 'none',
    });

    // Animate individual children with stagger
    groupRef.current.children.forEach((child, index) => {
      gsap.to(child.position, {
        y: Math.sin(index) * 2,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut',
        delay: index * 0.2,
      });
    });

    return () => {
      tl.kill();
      groupRef.current?.children.forEach(child => {
        gsap.killTweensOf(child.position);
      });
    };
  }, []);

  return (
    <group ref={groupRef}>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[i * 2 - 4, 0, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={`hsl(${i * 60}, 70%, 50%)`} />
        </mesh>
      ))}
    </group>
  );
};
```

#### 7. Scroll-Based 3D Animation
```typescript
// ✅ CORRECT: Sync 3D animation with scroll using GSAP ScrollTrigger
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const ScrollAnimated3D = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!meshRef.current || !containerRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1, // Smooth scrubbing
      },
    });

    tl.to(meshRef.current.rotation, {
      x: Math.PI * 2,
      y: Math.PI * 2,
      duration: 1,
    })
    .to(meshRef.current.position, {
      z: 5,
      duration: 1,
    }, 0);

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div ref={containerRef} style={{ height: '300vh' }}>
      <Canvas style={{ position: 'sticky', top: 0, height: '100vh' }}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <ambientLight intensity={0.5} />
        <mesh ref={meshRef}>
          <torusKnotGeometry args={[1, 0.3, 128, 16]} />
          <meshStandardMaterial color="#FF6B9D" />
        </mesh>
      </Canvas>
    </div>
  );
};
```

#### 8. Morphing Between Geometries
```typescript
// ✅ CORRECT: Smooth geometry morphing
const MorphingObject = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [geometry, setGeometry] = useState<'box' | 'sphere'>('box');

  const morph = () => {
    if (!meshRef.current) return;

    const tl = gsap.timeline();
    
    // Scale down
    tl.to(meshRef.current.scale, {
      x: 0.1,
      y: 0.1,
      z: 0.1,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        setGeometry(prev => prev === 'box' ? 'sphere' : 'box');
      },
    })
    // Scale back up
    .to(meshRef.current.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.4,
      ease: 'back.out(2)',
    });
  };

  return (
    <mesh ref={meshRef} onClick={morph}>
      {geometry === 'box' ? (
        <boxGeometry args={[1, 1, 1]} />
      ) : (
        <sphereGeometry args={[0.7, 32, 32]} />
      )}
      <meshStandardMaterial color="#00D9FF" />
    </mesh>
  );
};
```

#### 9. Particle System Animation
```typescript
// ✅ CORRECT: Animated particle system
import { Points, PointMaterial } from '@react-three/drei';
import { useMemo } from 'react';

const AnimatedParticles = () => {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particleCount = 1000;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, []);

  useEffect(() => {
    if (!particlesRef.current) return;

    gsap.to(particlesRef.current.rotation, {
      y: Math.PI * 2,
      duration: 20,
      ease: 'none',
      repeat: -1,
    });

    return () => {
      gsap.killTweensOf(particlesRef.current?.rotation);
    };
  }, []);

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#00D9FF" transparent opacity={0.8} />
    </points>
  );
};
```

#### 10. Text 3D Animation
```typescript
// ✅ CORRECT: Animated 3D text
import { Text3D, Center } from '@react-three/drei';

const Animated3DText = () => {
  const textRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!textRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    
    tl.to(textRef.current.position, {
      z: 2,
      duration: 2,
      ease: 'power2.inOut',
    })
    .to(textRef.current.rotation, {
      y: Math.PI * 0.5,
      duration: 1.5,
      ease: 'power2.inOut',
    }, 0);

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <Center>
      <Text3D
        ref={textRef}
        font="/fonts/helvetiker_regular.typeface.json"
        size={1}
        height={0.2}
        curveSegments={12}
      >
        GO MUSIC
        <meshStandardMaterial color="#E8470A" metalness={0.5} roughness={0.2} />
      </Text3D>
    </Center>
  );
};
```

### Best Practices for GSAP + R3F

#### Performance Optimization
```typescript
// ✅ CORRECT: Optimize with useFrame for continuous animations
import { useFrame } from '@react-three/fiber';

const OptimizedAnimation = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const rotationSpeed = useRef(0);

  // Use GSAP to animate the speed value
  useEffect(() => {
    gsap.to(rotationSpeed, {
      current: 0.02,
      duration: 2,
      ease: 'power2.out',
    });
  }, []);

  // Use useFrame for smooth 60fps rotation
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed.current;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#FF6B9D" />
    </mesh>
  );
};
```

#### Combining useFrame with GSAP
```typescript
// ✅ CORRECT: Best of both worlds
const HybridAnimation = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const animationState = useRef({ hover: 0 });

  const handlePointerEnter = () => {
    gsap.to(animationState.current, {
      hover: 1,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  const handlePointerLeave = () => {
    gsap.to(animationState.current, {
      hover: 0,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  useFrame(() => {
    if (meshRef.current) {
      // Smooth interpolation using GSAP-animated value
      meshRef.current.position.y = animationState.current.hover * 0.5;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh
      ref={meshRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#00FF88" />
    </mesh>
  );
};
```

### R3F + GSAP Animation Checklist
- [ ] All GSAP timelines are killed on unmount
- [ ] Using refs to access Three.js objects
- [ ] Easing functions are appropriate for 3D space
- [ ] Camera animations include lookAt updates
- [ ] Material animations set transparent: true when needed
- [ ] Group animations clean up all child tweens
- [ ] Performance optimized with useFrame for continuous animations
- [ ] ScrollTrigger instances are properly cleaned up
- [ ] 3D objects have proper lighting for visibility
- [ ] Canvas has proper dpr for retina displays

### Common R3F + GSAP Mistakes
1. ❌ Not killing tweens on unmount (memory leaks)
2. ❌ Animating too many objects without optimization
3. ❌ Forgetting to update camera.lookAt during camera animations
4. ❌ Not setting transparent: true for opacity animations
5. ❌ Using GSAP for every frame update (use useFrame instead)
6. ❌ Not cleaning up ScrollTrigger instances
7. ❌ Animating position without considering camera perspective
8. ❌ Missing proper lighting (objects appear black)
9. ❌ Not using refs (trying to animate JSX directly)
10. ❌ Forgetting to set makeDefault on camera

### When to Use GSAP vs useFrame
- **Use GSAP for:**
  - One-time animations (click, hover, mount)
  - Complex animation sequences
  - Scroll-based animations
  - Timed transitions
  - Easing-based movements

- **Use useFrame for:**
  - Continuous animations (rotation, floating)
  - Physics-based movements
  - Frame-by-frame updates
  - Performance-critical animations
  - Real-time interactions

### Example: Complete 3D Scene with GSAP
```typescript
// ✅ CORRECT: Full example combining all concepts
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';

const AnimatedScene = () => {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[5, 3, 5]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <Environment preset="sunset" />
        
        {/* Animated Objects */}
        <FloatingBox position={[-2, 0, 0]} />
        <RotatingSphere position={[2, 0, 0]} />
        <PulsingTorus position={[0, 2, 0]} />
        
        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        
        <OrbitControls enableDamping dampingFactor={0.05} />
      </Canvas>
    </div>
  );
};

const FloatingBox = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(meshRef.current.position, {
      y: position[1] + 1,
      duration: 2,
      ease: 'power2.inOut',
    });

    return () => tl.kill();
  }, [position]);

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#E8470A" metalness={0.5} roughness={0.2} />
    </mesh>
  );
};

const RotatingSphere = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    gsap.to(meshRef.current.rotation, {
      y: Math.PI * 2,
      duration: 4,
      ease: 'none',
      repeat: -1,
    });

    return () => gsap.killTweensOf(meshRef.current?.rotation);
  }, []);

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[0.7, 32, 32]} />
      <meshStandardMaterial color="#00D9FF" metalness={0.8} roughness={0.1} />
    </mesh>
  );
};

const PulsingTorus = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(meshRef.current.scale, {
      x: 1.3,
      y: 1.3,
      z: 1.3,
      duration: 1,
      ease: 'power2.inOut',
    });

    return () => tl.kill();
  }, []);

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <torusGeometry args={[0.5, 0.2, 16, 100]} />
      <meshStandardMaterial color="#FF6B9D" metalness={0.6} roughness={0.3} />
    </mesh>
  );
};

export default AnimatedScene;
```

---

## ⚡ Performance Requirements

### Optimization Rules
- ✅ **ALWAYS** use `useMemo` for expensive calculations
- ✅ **ALWAYS** use `useCallback` for functions passed as props
- ✅ **ALWAYS** lazy load images with proper loading states
- ✅ **ALWAYS** debounce search inputs (300ms minimum)
- ❌ **NEVER** render large lists without virtualization
- ❌ **NEVER** perform heavy operations in render

### Bundle Size
- ✅ **ALWAYS** use dynamic imports for large components
- ✅ **ALWAYS** tree-shake unused code
- ❌ **NEVER** import entire libraries (import specific functions)

### Memory Management
- ✅ **ALWAYS** clean up event listeners
- ✅ **ALWAYS** cancel pending requests on unmount
- ✅ **ALWAYS** revoke object URLs after use
- ❌ **NEVER** create memory leaks with uncleaned effects

---

## 📁 File Structure & Organization

### Component Structure
```
src/
├── components/
│   ├── cards/          # Card components
│   ├── layout/         # Layout components
│   └── ui/             # Reusable UI components
├── pages/              # Page components
├── stores/             # Zustand stores
├── hooks/              # Custom hooks
├── utils/              # Utility functions
└── types.ts            # Type definitions
```

### Naming Conventions
- ✅ **ALWAYS** use PascalCase for components: `HomePage.tsx`
- ✅ **ALWAYS** use camelCase for functions: `handleClick`
- ✅ **ALWAYS** use UPPER_CASE for constants: `MAX_FILE_SIZE`
- ✅ **ALWAYS** prefix custom hooks with `use`: `usePlayerStore`
- ❌ **NEVER** use generic names like `Component1`, `temp`, `test`

### Import Order
1. React imports
2. Third-party libraries
3. Internal components
4. Stores and hooks
5. Types
6. Styles

---

## 🧪 Testing & Verification

### Before Committing
- ✅ **ALWAYS** test all interactive elements
- ✅ **ALWAYS** verify responsive design (mobile, tablet, desktop)
- ✅ **ALWAYS** check for console errors
- ✅ **ALWAYS** verify animations work smoothly
- ✅ **ALWAYS** test with empty states
- ❌ **NEVER** commit broken code

### User Experience
- ✅ **ALWAYS** provide loading states
- ✅ **ALWAYS** show error messages clearly
- ✅ **ALWAYS** add empty state illustrations
- ✅ **ALWAYS** ensure buttons have hover/active states
- ❌ **NEVER** leave users without feedback

---

## 🔄 Git & Version Control

### Commit Messages
- ✅ **ALWAYS** use descriptive commit messages
- ✅ **ALWAYS** use prefixes: `feat:`, `fix:`, `style:`, `refactor:`
- ✅ **ALWAYS** keep commits focused (one feature per commit)
- ❌ **NEVER** use vague messages like "update" or "fix stuff"

### Branch Strategy
- ✅ **ALWAYS** create feature branches
- ✅ **ALWAYS** test before merging to main
- ❌ **NEVER** commit directly to main

---

## 🚫 Forbidden Actions

### NEVER DO THESE:
1. ❌ Remove features without explicit permission
2. ❌ Change color schemes without updating CSS variables
3. ❌ Delete files without checking dependencies
4. ❌ Disable TypeScript strict mode
5. ❌ Use `!important` in CSS (use proper specificity)
6. ❌ Hardcode API URLs (use environment variables)
7. ❌ Store sensitive data in localStorage
8. ❌ Use deprecated React patterns (class components, componentWillMount)
9. ❌ Create duplicate code (DRY principle)
10. ❌ Ignore accessibility (add aria-labels, alt text)

### ALWAYS ASK BEFORE:
1. ⚠️ Changing the project structure
2. ⚠️ Adding new dependencies
3. ⚠️ Modifying the build configuration
4. ⚠️ Changing database schemas
5. ⚠️ Removing existing functionality

---

## 🎯 Project-Specific Rules

### Music Player
- ✅ **ALWAYS** use GSAP for track switching animations
- ✅ **ALWAYS** clean up audio resources on unmount
- ✅ **ALWAYS** handle shuffle mode correctly (sequential vs jumping)
- ✅ **ALWAYS** show queue position accurately
- ❌ **NEVER** block the UI during audio operations

### Theme System
- ✅ **ALWAYS** update CSS variables when changing themes
- ✅ **ALWAYS** persist theme selection
- ✅ **ALWAYS** apply theme changes immediately
- ❌ **NEVER** hardcode theme colors

### File Uploads
- ✅ **ALWAYS** validate file types before processing
- ✅ **ALWAYS** show upload progress
- ✅ **ALWAYS** handle errors gracefully
- ✅ **ALWAYS** support drag-and-drop
- ❌ **NEVER** upload without user confirmation

### Search & Filtering
- ✅ **ALWAYS** debounce search inputs
- ✅ **ALWAYS** show "no results" states
- ✅ **ALWAYS** highlight search matches
- ❌ **NEVER** search on every keystroke

---

## 📊 Performance Benchmarks

### Target Metrics
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Animation Frame Rate: 60 FPS

### Bundle Size Limits
- Main bundle: < 500KB (gzipped)
- Vendor bundle: < 300KB (gzipped)
- CSS bundle: < 50KB (gzipped)

---

## 🎨 Design Tokens

### Spacing Scale
- xs: 0.25rem (4px)
- sm: 0.5rem (8px)
- md: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)
- 2xl: 3rem (48px)

### Border Radius
- sm: 0.375rem (6px)
- md: 0.5rem (8px)
- lg: 0.75rem (12px)
- xl: 1rem (16px)
- 2xl: 1.5rem (24px)
- 3xl: 2rem (32px)

### Shadow Scale
- sm: 0 2px 8px rgba(0,0,0,0.1)
- md: 0 4px 16px rgba(0,0,0,0.15)
- lg: 0 8px 24px rgba(0,0,0,0.2)
- xl: 0 12px 32px rgba(0,0,0,0.25)
- 2xl: 0 20px 48px rgba(0,0,0,0.3)

---

## ✅ Checklist Before Submitting Changes

- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] All animations are smooth (60 FPS)
- [ ] Responsive design works on all screen sizes
- [ ] Empty states are handled
- [ ] Loading states are shown
- [ ] Error states are handled
- [ ] Accessibility attributes added
- [ ] Code is properly formatted
- [ ] Comments added for complex logic
- [ ] No hardcoded values (use constants)
- [ ] Theme colors use CSS variables
- [ ] Proper cleanup in useEffect
- [ ] Performance optimizations applied

---

## 🚀 Final Notes

**Remember:** Quality over speed. It's better to take time and do it right than to rush and create technical debt.

**When in doubt:** Ask for clarification rather than making assumptions.

**Stay consistent:** Follow existing patterns in the codebase.

**Think user-first:** Every decision should improve the user experience.

---

## 📞 Questions?

If any rule is unclear or conflicts arise, **ALWAYS** ask for clarification before proceeding.

**Last Updated:** 2024
**Version:** 1.0.0
