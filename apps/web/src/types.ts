export interface Track {
  _id?: string;
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  duration: number; // seconds
  coverGradient?: [string, string];
  coverUrl?: string;
  liked?: boolean;
  plays: number;
  explicit: boolean;
  dateAdded?: string;
  audioUrl?: string;
  genre?: string;
  releaseDate?: string;
  isLocal?: boolean;
  blob?: Blob;
  year?: number;
  lyrics?: string;
}

export interface Album {
  _id?: string;
  id: string;
  title: string;
  artist: string;
  artistId: string;
  year: number;
  genre: string;
  coverGradient?: [string, string];
  coverUrl?: string;
  trackIds: string[];
  totalDuration?: number;
  label?: string;
  type: 'album' | 'single' | 'ep' | 'compilation';
}

export interface Artist {
  _id?: string;
  id: string;
  name: string;
  avatarGradient?: [string, string];
  avatarUrl?: string;
  monthlyListeners: number;
  followers: number;
  bio: string;
  genres: string[];
  verified: boolean;
  topTrackIds?: string[];
  albumIds?: string[];
  relatedArtistIds?: string[];
}

export interface Playlist {
  _id?: string;
  id: string;
  title: string;
  description: string;
  owner: string;
  ownerId?: string;
  ownerName?: string;
  coverGradient?: [string, string];
  coverUrl?: string;
  trackIds: string[];
  followers: number;
  isPublic: boolean;
  isCollaborative: boolean;
  type?: 'user' | 'editorial' | 'generated' | 'mix';
  createdAt?: string;
}

export interface PodcastShow {
  _id?: string;
  id: string;
  title: string;
  publisher: string;
  description: string;
  coverGradient?: [string, string];
  coverUrl?: string;
  episodes: PodcastEpisode[];
  category: string;
  subscribed?: boolean;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  duration: number;
  date: string;
  played: boolean;
  progress: number;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface User {
  id: string;
  _id?: string;
  email?: string;
  displayName: string;
  avatarGradient?: [string, string];
  avatarUrl?: string;
  followers?: number;
  following?: number;
  playlistIds?: string[];
  topArtistIds?: string[];
  topTrackIds?: string[];
  subscription?: string;
  role?: string;
}
