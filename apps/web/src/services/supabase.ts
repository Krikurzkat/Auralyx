import { createClient } from '@supabase/supabase-js';

export interface AppProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  updated_at: string;
}

export type AppProfileInsert = Omit<AppProfileRow, 'updated_at'> & { updated_at?: string };
export type AppProfileUpdate = Partial<Omit<AppProfileRow, 'id'>>;

export interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
}

export type FriendshipInsert = Omit<FriendshipRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type FriendshipUpdate = Partial<Omit<FriendshipRow, 'id'>>;

export interface ListeningStatusRow {
  user_id: string;
  track_id: string | null;
  title: string | null;
  artist: string | null;
  album: string | null;
  cover_url: string | null;
  is_playing: boolean;
  updated_at: string;
}

export type ListeningStatusInsert = Omit<ListeningStatusRow, 'updated_at'> & { updated_at?: string };
export type ListeningStatusUpdate = Partial<Omit<ListeningStatusRow, 'user_id'>>;

export type Database = {
  public: {
    Tables: {
      app_profiles: {
        Row: AppProfileRow;
        Insert: AppProfileInsert;
        Update: AppProfileUpdate;
        Relationships: [];
      };
      friendships: {
        Row: FriendshipRow;
        Insert: FriendshipInsert;
        Update: FriendshipUpdate;
        Relationships: [];
      };
      listening_status: {
        Row: ListeningStatusRow;
        Insert: ListeningStatusInsert;
        Update: ListeningStatusUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
