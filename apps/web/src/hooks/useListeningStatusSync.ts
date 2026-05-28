import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePlayerStore } from '../stores/playerStore';
import { isSupabaseConfigured } from '../services/supabase';
import { publishListeningStatus, upsertAppProfile } from '../services/socialActivity';

export function useListeningStatusSync() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const lastStatusKey = useRef('');

  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated || !user) return;

    upsertAppProfile(user).catch((error) => {
      console.warn('Failed to sync Supabase profile:', error);
    });
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isSupabaseConfigured || !isAuthenticated || !user) return;

    const statusKey = [
      user.id,
      currentTrack?.id || 'none',
      currentTrack?.title || 'none',
      currentTrack?.artist || 'none',
      isPlaying ? 'playing' : 'paused',
    ].join(':');

    if (statusKey === lastStatusKey.current) return;
    lastStatusKey.current = statusKey;

    const timeoutId = window.setTimeout(() => {
      publishListeningStatus(user, currentTrack, isPlaying).catch((error) => {
        console.warn('Failed to sync listening status:', error);
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [currentTrack, isAuthenticated, isPlaying, user]);
}
