import { parseLRC, type LyricLine } from './lrcParser';

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatPlays(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export function formatListeners(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export function getLyricsForTrack(_trackId: string, lrcContent?: string): LyricLine[] {
  // If LRC content is provided, parse it
  if (lrcContent) {
    try {
      return parseLRC(lrcContent);
    } catch (error) {
      console.error('Error parsing LRC content:', error);
    }
  }

  // Fallback for tracks without lyrics
  return [];
}

