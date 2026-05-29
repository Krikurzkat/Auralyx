import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { getSessionUser } from '../services/auth';
import { isSupabaseConfigured, supabase } from '../services/supabase';

export type UserRole = 'user' | 'staff' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  subscription: string;
  role: UserRole;
}

export function isAdminRole(role?: string | null) {
  return role === 'admin';
}

export function canManageContent(role?: string | null) {
  return role === 'admin' || role === 'staff';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setLocalSession: (user: User, token: string) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => Promise<void>;
}

let authSubscriptionInitialized = false;

function applySession(set: (partial: Partial<AuthState>) => void, session: Session | null) {
  const user = getSessionUser(session);
  set({
    user,
    token: session?.access_token ?? null,
    isAuthenticated: Boolean(user && session?.access_token),
    isLoading: false,
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: isSupabaseConfigured,
  initialize: async () => {
    const localToken = localStorage.getItem('auth_token');
    const localUser = localStorage.getItem('auth_user');
    if (localToken && localUser) {
      try {
        const parsedUser = JSON.parse(localUser) as User;
        set({ user: parsedUser, token: localToken, isAuthenticated: true, isLoading: false });
        return;
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    if (!authSubscriptionInitialized) {
      authSubscriptionInitialized = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        applySession(set, session);
      });
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Failed to restore Supabase session', error);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    applySession(set, session);
  },
  setSession: (session) => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    applySession(set, session);
  },
  setLocalSession: (user, token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },
  updateUser: (updates) =>
    set((state) => {
      if (!state.user) return state;
      return {
        user: {
          ...state.user,
          ...updates,
        },
      };
    }),
  logout: async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');

    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Failed to sign out of Supabase', error);
      }
    }

    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
}));
