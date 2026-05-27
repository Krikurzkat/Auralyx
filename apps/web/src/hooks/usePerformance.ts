import { useState, useEffect } from 'react';
import { getPerformanceSettings, type PerformanceSettings } from '../utils/performanceOptimizations';

/**
 * Hook to get performance settings based on device capabilities
 * Automatically detects device type and adjusts settings for optimal performance
 */
export const usePerformance = (): PerformanceSettings => {
  const [settings, setSettings] = useState<PerformanceSettings>(() => getPerformanceSettings());

  useEffect(() => {
    // Update settings on window resize (device orientation change)
    const handleResize = () => {
      setSettings(getPerformanceSettings());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return settings;
};
