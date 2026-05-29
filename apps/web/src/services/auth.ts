import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import type { User } from '../stores/authStore';
import { apiUrl } from './api';
import { upsertAppProfile } from './socialActivity';
import { isSupabaseConfigured, supabase } from './supabase';

type AuthMetadata = {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  subscription?: string;
  role?: string;
};

type DatabaseErrorLike = {
  code?: string;
  message?: string;
};

function isSocialSchemaUnavailable(error: unknown) {
  const candidate = error as DatabaseErrorLike | null;
  return (
    candidate?.code === '42P01' ||
    candidate?.code === 'PGRST205' ||
    candidate?.message?.toLowerCase().includes('app_profiles') === true
  );
}

function readAuthMetadata(user: SupabaseAuthUser): AuthMetadata {
  const userMetadata =
    typeof user.user_metadata === 'object' && user.user_metadata
      ? (user.user_metadata as Record<string, unknown>)
      : {};
  const appMetadata =
    typeof user.app_metadata === 'object' && user.app_metadata
      ? (user.app_metadata as Record<string, unknown>)
      : {};

  return {
    ...userMetadata,
    ...appMetadata,
  };
}

export function mapSupabaseUser(user: SupabaseAuthUser | null): User | null {
  if (!user?.id || !user.email) return null;

  const metadata = readAuthMetadata(user);
  const username =
    typeof metadata.username === 'string' && metadata.username.trim()
      ? metadata.username.trim().toLowerCase()
      : user.email.split('@')[0].toLowerCase();
  const displayName =
    typeof metadata.display_name === 'string' && metadata.display_name.trim()
      ? metadata.display_name.trim()
      : username;
  const avatarUrl =
    typeof metadata.avatar_url === 'string' && metadata.avatar_url.trim()
      ? metadata.avatar_url.trim()
      : undefined;
  const subscription =
    typeof metadata.subscription === 'string' && metadata.subscription.trim()
      ? metadata.subscription.trim()
      : 'free';
  const rawRole =
    typeof metadata.role === 'string' && metadata.role.trim()
      ? metadata.role.trim()
      : 'user';
  const role = rawRole === 'admin' || rawRole === 'staff' ? rawRole : 'user';

  return {
    id: user.id,
    username,
    email: user.email,
    displayName,
    avatarUrl,
    subscription,
    role,
  };
}

export function getSessionUser(session: Session | null): User | null {
  return mapSupabaseUser(session?.user ?? null);
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured');
  }

  return supabase;
}

export async function ensureUsernameAvailable(username: string) {
  const client = requireSupabase();
  const normalizedUsername = username.trim().toLowerCase();

  const { data, error } = await client
    .from('app_profiles')
    .select('id')
    .eq('username', normalizedUsername)
    .limit(1);

  if (error) {
    if (isSocialSchemaUnavailable(error)) {
      console.warn('Skipping username availability check until social tables are ready.', error);
      return true;
    }

    throw error;
  }
  return (data?.length ?? 0) === 0;
}

export async function signInWithEmail(email: string, password: string) {
  const client = requireSupabase();
  return client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
}

export async function signInWithLocalApi(emailOrUsername: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch(apiUrl('/api/users/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailOrUsername.trim().toLowerCase(),
      username: emailOrUsername.trim().toLowerCase(),
      password,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Local server login failed');
  }
  if (!data.user || !data.token) {
    throw new Error('Local server login response was incomplete');
  }
  return { user: data.user, token: data.token };
}

export async function signUpWithEmail(params: {
  email: string;
  password: string;
  username: string;
  displayName: string;
}) {
  const client = requireSupabase();
  const email = params.email.trim().toLowerCase();
  const username = params.username.trim().toLowerCase();
  const displayName = params.displayName.trim();

  const result = await client.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        username,
        display_name: displayName,
        subscription: 'free',
        role: 'user',
      },
    },
  });

  if (!result.error) {
    const mappedUser = mapSupabaseUser(result.data.user);
    if (mappedUser) {
      try {
        await upsertAppProfile(mappedUser);
      } catch (error) {
        if (isSocialSchemaUnavailable(error)) {
          console.warn('Supabase Auth signup succeeded before social tables were ready.', error);
        } else {
          throw error;
        }
      }
    }
  }

  return result;
}

export async function updateSupabaseProfile(params: {
  displayName: string;
  avatarUrl: string;
}) {
  const client = requireSupabase();
  const {
    data: { user: authUser },
    error: sessionError,
  } = await client.auth.getUser();

  if (sessionError) throw sessionError;
  const currentUser = mapSupabaseUser(authUser);
  if (!currentUser) throw new Error('You must be logged in to update your profile.');

  const displayName = params.displayName.trim();
  const avatarUrl = params.avatarUrl.trim();
  const metadata = readAuthMetadata(authUser!);

  const { data, error } = await client.auth.updateUser({
    data: {
      ...metadata,
      username: currentUser.username,
      display_name: displayName,
      avatar_url: avatarUrl || null,
      subscription: currentUser.subscription,
      role: currentUser.role,
    },
  });

  if (error) throw error;

  const mappedUser = mapSupabaseUser(data.user);
  if (!mappedUser) throw new Error('Updated user profile was incomplete.');

  await upsertAppProfile(mappedUser);
  return mappedUser;
}
