import { usePlayerStore } from '../../stores/playerStore';
import { useEffect, useRef, useState } from 'react';

/**
 * Dynamic Album Art Glow — a blurred ambient background that smoothly
 * transitions to match the currently playing track's cover gradient colors.
 * Falls back to a subtle neutral glow when nothing is playing.
 */
export default function AlbumArtGlow() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const [colors, setColors] = useState<[string, string]>(['#1a1a2e', '#16213e']);
  const prevColors = useRef(colors);

  useEffect(() => {
    const gradient = currentTrack?.coverGradient;
    if (gradient && gradient.length === 2) {
      prevColors.current = colors;
      setColors(gradient);
    }
  }, [currentTrack?.coverGradient?.[0], currentTrack?.coverGradient?.[1]]);

  return (
    <div className="album-art-glow pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-opacity duration-1000">
      {/* Primary blob — top-left */}
      <div
        className="album-art-glow__blob album-art-glow__blob--primary absolute rounded-full transition-[background] duration-[2500ms] ease-in-out"
        style={{ background: colors[0] }}
      />
      {/* Secondary blob — bottom-right */}
      <div
        className="album-art-glow__blob album-art-glow__blob--secondary absolute rounded-full transition-[background] duration-[2500ms] ease-in-out"
        style={{ background: colors[1] }}
      />
      {/* Accent center blob for depth */}
      <div
        className="album-art-glow__blob album-art-glow__blob--accent absolute rounded-full transition-[background] duration-[2500ms] ease-in-out mix-blend-screen"
        style={{ background: `color-mix(in srgb, ${colors[0]} 50%, ${colors[1]})` }}
      />
    </div>
  );
}
