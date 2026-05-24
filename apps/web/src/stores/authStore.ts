import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  displayName: string;
  subscription: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Try to load initial state from localStorage
  const storedToken = localStorage.getItem('auth_token');
  const storedUser = localStorage.getItem('auth_user');
  let initialUser: User | null = null;
  
  if (storedUser) {
    try {
      initialUser = JSON.parse(storedUser);
    } catch (e) {
      console.error('Failed to parse stored user data', e);
    }
  }

  const hasValidStoredSession = !!storedToken && !!initialUser;

  if (!hasValidStoredSession) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  return {
    user: hasValidStoredSession ? initialUser : null,
    token: hasValidStoredSession ? storedToken : null,
    isAuthenticated: hasValidStoredSession,
    login: (user, token) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
