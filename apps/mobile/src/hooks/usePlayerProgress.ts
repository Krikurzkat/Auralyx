import { useProgress } from 'react-native-track-player';

export function usePlayerProgress(updateInterval?: number) {
  return useProgress(updateInterval);
}
