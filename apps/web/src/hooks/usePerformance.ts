import { useState, useEffect } from 'react';
import { getPerformanceSettings, type PerformanceSettings } from '../utils/performanceOptimizations';
import { useUIStore } from '../stores/uiStore';
import { usePlayerStore } from '../stores/playerStore';

const REDUCED_SETTINGS: PerformanceSettings = {
  enableBlur: false,
  enableHeavyAnimations: false,
  enableShadows: false,
  maxBlurRadius: 0,
  animationDuration: 0,
  enableWillChange: false,
};

/**
 * Hook to get performance settings based on device capabilities AND the user's
 * reduceMotion preference from the app settings.
 * When reduce motion is on, all heavy visual effects (animations, blurs)
 * are disabled immediately — regardless of device capabilities.
 */
export const usePerformance = (): PerformanceSettings => {
  const reduceMotion = useUIStore(s => s.reduceMotion);
  const isVisualizerOpen = useUIStore(s => s.isVisualizerOpen);
  const isDriveModeOpen = useUIStore(s => s.isDriveModeOpen);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const isFullscreenOpen = usePlayerStore(s => s.isFullscreenOpen);
  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document === 'undefined' || !document.hidden
  );
  const [deviceSettings, setDeviceSettings] = useState<PerformanceSettings>(() => getPerformanceSettings());

  useEffect(() => {
    const handleResize = () => setDeviceSettings(getPerformanceSettings());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Do not render decorative effects behind players or in background tabs.
  // This keeps visualizer playback responsive and avoids duplicate work when
  // the app is open in more than one browser tab.
  if (reduceMotion || !isPageVisible || isFullscreenOpen || isVisualizerOpen || isDriveModeOpen) {
    return REDUCED_SETTINGS;
  }
  // Pause heavy decorative motion and full-screen
  // blur filters while the player is active; audio-reactive meters stay live.
  if (isPlaying) {
    return {
      ...deviceSettings,
      enableBlur: false,
      enableHeavyAnimations: false,
      maxBlurRadius: 0,
      enableWillChange: false,
    };
  }
  return deviceSettings;
};
