import { useEffect, useState } from 'react';

export const GALAXY_S8_PLUS_LAYOUT_PROFILE = {
  cssViewportWidth: 360,
  cssViewportHeight: 740,
  nativeResolution: { width: 1440, height: 2960 },
  aspectRatio: 18.5 / 9,
  physicalSizeInches: 6.2,
  bodySizeMm: { width: 73.4, height: 159.5, depth: 8.1 },
  minTouchTargetDp: 48,
} as const;

function matchesGalaxyS8PlusViewport() {
  if (typeof window === 'undefined') {
    return false;
  }

  const width = Math.min(window.innerWidth, window.innerHeight);
  const height = Math.max(window.innerWidth, window.innerHeight);
  const expectedRatio =
    GALAXY_S8_PLUS_LAYOUT_PROFILE.cssViewportWidth /
    GALAXY_S8_PLUS_LAYOUT_PROFILE.cssViewportHeight;
  const currentRatio = width / height;

  const widthMatches = Math.abs(width - GALAXY_S8_PLUS_LAYOUT_PROFILE.cssViewportWidth) <= 8;
  const heightMatches = Math.abs(height - GALAXY_S8_PLUS_LAYOUT_PROFILE.cssViewportHeight) <= 24;
  const ratioMatches = Math.abs(currentRatio - expectedRatio) <= 0.02;

  return widthMatches && heightMatches && ratioMatches;
}

export function useGalaxyS8PlusLayout() {
  const [isGalaxyS8PlusLayout, setIsGalaxyS8PlusLayout] = useState(matchesGalaxyS8PlusViewport);

  useEffect(() => {
    const updateLayoutProfile = () => {
      setIsGalaxyS8PlusLayout(matchesGalaxyS8PlusViewport());
    };

    updateLayoutProfile();
    window.addEventListener('resize', updateLayoutProfile);

    return () => {
      window.removeEventListener('resize', updateLayoutProfile);
    };
  }, []);

  return isGalaxyS8PlusLayout;
}
