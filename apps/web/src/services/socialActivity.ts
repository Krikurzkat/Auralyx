import type { User } from '../stores/authStore';
import type { Track } from '../types';
import {
  supabase,
  type AppProfileInsert,
  type AppProfileRow,
  type FriendshipRow,
  type ListeningStatusInsert,
  type ListeningStatusRow,
} from './supabase';

export interface FriendListeningActivity {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  trackTitle: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  isPlaying: boolean;
  updatedAt: string;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  return supabase;
}

export async function upsertAppProfile(user: User) {
  const client = requireSupabase();
  const payload: AppProfileInsert = {
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    avatar_url: user.avatarUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('app_profiles').upsert(payload as never);

  if (error) throw error;
}

export async function publishListeningStatus(user: User, track: Track | null, isPlaying: boolean) {
  const client = requireSupabase();
  const payload: ListeningStatusInsert = {
    user_id: user.id,
    track_id: track?.id ?? null,
    title: track?.title ?? null,
    artist: track?.artist ?? null,
    album: track?.album ?? null,
    cover_url: track?.coverUrl ?? null,
    is_playing: Boolean(track && isPlaying),
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('listening_status').upsert(payload as never);

  if (error) throw error;
}

export async function getFriendListeningActivity(userId: string): Promise<FriendListeningActivity[]> {
  const client = requireSupabase();

  const { data: friendships, error: friendshipsError } = await client
    .from('friendships')
    .select('friend_id')
    .eq('user_id', userId);

  if (friendshipsError) throw friendshipsError;

  const friendshipRows = (friendships ?? []) as Pick<FriendshipRow, 'friend_id'>[];
  const friendIds = friendshipRows.map((friendship) => friendship.friend_id);
  if (friendIds.length === 0) return [];

  const [{ data: profiles, error: profilesError }, { data: statuses, error: statusesError }] = await Promise.all([
    client
      .from('app_profiles')
      .select('id, username, display_name, avatar_url, updated_at')
      .in('id', friendIds),
    client
      .from('listening_status')
      .select('user_id, track_id, title, artist, album, cover_url, is_playing, updated_at')
      .in('user_id', friendIds)
      .order('updated_at', { ascending: false }),
  ]);

  if (profilesError) throw profilesError;
  if (statusesError) throw statusesError;

  const profileRows = (profiles ?? []) as AppProfileRow[];
  const statusRows = (statuses ?? []) as ListeningStatusRow[];
  const profileById = new Map(profileRows.map((profile) => [profile.id, profile]));

  return statusRows
    .filter((status): status is ListeningStatusRow => Boolean(status.title && status.artist))
    .map((status) => {
      const profile = profileById.get(status.user_id);
      return {
        userId: status.user_id,
        displayName: profile?.display_name || 'Auralyx User',
        username: profile?.username || 'user',
        avatarUrl: profile?.avatar_url || undefined,
        trackTitle: status.title || 'Unknown track',
        artist: status.artist || 'Unknown artist',
        album: status.album || undefined,
        coverUrl: status.cover_url || undefined,
        isPlaying: status.is_playing,
        updatedAt: status.updated_at,
      };
    });
}

export function subscribeToFriendActivity(userId: string, onChange: () => void) {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`friend-activity:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'listening_status' }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
