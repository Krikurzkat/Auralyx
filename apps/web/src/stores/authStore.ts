import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  subscription: string;
  role: string;
}

type StoredUser = Partial<User> & {
  _id?: string;
};

function normalizeUser(value: unknown): User | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as StoredUser;
  const id = raw.id || raw._id;
  if (!id || !raw.username || !raw.email || !raw.displayName) return null;

  return {
    id: String(id),
    username: String(raw.username),
    email: String(raw.email),
    displayName: String(raw.displayName),
    avatarUrl: raw.avatarUrl ? String(raw.avatarUrl) : undefined,
    subscription: raw.subscription ? String(raw.subscription) : 'free',
    role: raw.role ? String(raw.role) : 'user',
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Try to load initial state from localStorage
  const storedToken = localStorage.getItem('auth_token');
  const storedUser = localStorage.getItem('auth_user');
  let initialUser: User | null = null;
  
  if (storedUser) {
    try {
      initialUser = normalizeUser(JSON.parse(storedUser));
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
      const normalizedUser = normalizeUser(user);
      if (!normalizedUser) {
        throw new Error('Login response was incomplete');
      }

      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
      set({ user: normalizedUser, token, isAuthenticated: true });
    },
    updateUser: (updates) => set((state) => {
      if (!state.user) return state;

      const user = normalizeUser({ ...state.user, ...updates });
      if (!user) return state;

      localStorage.setItem('auth_user', JSON.stringify(user));
      return { user };
    }),
    logout: () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      set({ user: null, token: null, isAuthenticated: false });
    },
  };
});
