import { create } from 'zustand';

interface LibraryState {
  likedTrackIds: Set<string>;
  savedAlbumIds: Set<string>;
  followedArtistIds: Set<string>;
  savedPlaylistIds: Set<string>;
  subscribedPodcastIds: Set<string>;
  pinnedIds: Set<string>;
  recentlyPlayed: string[]; // track IDs
  sortBy: 'recent' | 'alpha' | 'creator';
  viewMode: 'grid' | 'list';

  // Actions
  toggleLike: (trackId: string) => void;
  toggleSaveAlbum: (albumId: string) => void;
  toggleFollowArtist: (artistId: string) => void;
  toggleSavePlaylist: (playlistId: string) => void;
  toggleSubscribePodcast: (podcastId: string) => void;
  togglePin: (id: string) => void;
  addToRecentlyPlayed: (trackId: string) => void;
  setSortBy: (sort: 'recent' | 'alpha' | 'creator') => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  isLiked: (trackId: string) => boolean;
  isAlbumSaved: (albumId: string) => boolean;
  isArtistFollowed: (artistId: string) => boolean;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  likedTrackIds: new Set(),
  savedAlbumIds: new Set(),
  followedArtistIds: new Set(),
  savedPlaylistIds: new Set(),
  subscribedPodcastIds: new Set(),
  pinnedIds: new Set(),
  recentlyPlayed: [],
  sortBy: 'recent',
  viewMode: 'grid',

  toggleLike: (trackId) => set(s => {
    const newSet = new Set(s.likedTrackIds);
    if (newSet.has(trackId)) newSet.delete(trackId); else newSet.add(trackId);
    return { likedTrackIds: newSet };
  }),

  toggleSaveAlbum: (albumId) => set(s => {
    const newSet = new Set(s.savedAlbumIds);
    if (newSet.has(albumId)) newSet.delete(albumId); else newSet.add(albumId);
    return { savedAlbumIds: newSet };
  }),

  toggleFollowArtist: (artistId) => set(s => {
    const newSet = new Set(s.followedArtistIds);
    if (newSet.has(artistId)) newSet.delete(artistId); else newSet.add(artistId);
    return { followedArtistIds: newSet };
  }),

  toggleSavePlaylist: (playlistId) => set(s => {
    const newSet = new Set(s.savedPlaylistIds);
    if (newSet.has(playlistId)) newSet.delete(playlistId); else newSet.add(playlistId);
    return { savedPlaylistIds: newSet };
  }),

  toggleSubscribePodcast: (podcastId) => set(s => {
    const newSet = new Set(s.subscribedPodcastIds);
    if (newSet.has(podcastId)) newSet.delete(podcastId); else newSet.add(podcastId);
    return { subscribedPodcastIds: newSet };
  }),

  togglePin: (id) => set(s => {
    const newSet = new Set(s.pinnedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    return { pinnedIds: newSet };
  }),

  addToRecentlyPlayed: (trackId) => set(s => ({
    recentlyPlayed: [trackId, ...s.recentlyPlayed.filter(id => id !== trackId)].slice(0, 50),
  })),

  setSortBy: (sort) => set({ sortBy: sort }),
  setViewMode: (mode) => set({ viewMode: mode }),

  isLiked: (trackId) => get().likedTrackIds.has(trackId),
  isAlbumSaved: (albumId) => get().savedAlbumIds.has(albumId),
  isArtistFollowed: (artistId) => get().followedArtistIds.has(artistId),
}));
