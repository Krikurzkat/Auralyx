import { useState } from 'react';
import { useSpotifySearch } from '../hooks/useSpotifySearch';
import { RiSearchLine, RiSpotifyFill, RiMusic2Line, RiAlbumLine, RiUserLine } from 'react-icons/ri';

/**
 * Demo component showing Spotify search integration
 * Use this as a reference for integrating into your SearchPage
 */
export default function SpotifySearchDemo() {
  const [query, setQuery] = useState('');
  const { results, isSearching, error, isConnected, searchSpotify } = useSpotifySearch();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchSpotify(query, 'all');
  };

  if (!isConnected) {
    return (
      <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
        <div className="text-center">
          <RiSpotifyFill className="mx-auto text-6xl text-white/20 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Spotify Not Connected
          </h3>
          <p className="text-sm text-white/60 mb-4">
            Connect your Spotify account in Settings to search millions of songs
          </p>
          <a
            href="/settings"
            className="inline-block px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold rounded-lg transition"
          >
            Go to Settings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <RiSearchLine className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-xl" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Spotify... (try 'Keshi')"
          className="w-full pl-12 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition"
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Tracks */}
          {results.tracks?.items?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <RiMusic2Line className="text-white/60" />
                <h3 className="text-lg font-semibold text-white">Tracks</h3>
              </div>
              <div className="space-y-2">
                {results.tracks.items.slice(0, 5).map((track: any) => (
                  <div
                    key={track.id}
                    className="p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {track.album?.images?.[0]?.url && (
                        <img
                          src={track.album.images[0].url}
                          alt={track.name}
                          className="w-12 h-12 rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{track.name}</p>
                        <p className="text-sm text-white/60 truncate">
                          {track.artists?.map((a: any) => a.name).join(', ')}
                        </p>
                      </div>
                      <RiSpotifyFill className="text-[#1DB954] text-xl flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artists */}
          {results.artists?.items?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <RiUserLine className="text-white/60" />
                <h3 className="text-lg font-semibold text-white">Artists</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.artists.items.slice(0, 4).map((artist: any) => (
                  <div
                    key={artist.id}
                    className="p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition cursor-pointer"
                  >
                    {artist.images?.[0]?.url && (
                      <img
                        src={artist.images[0].url}
                        alt={artist.name}
                        className="w-full aspect-square rounded-lg mb-2 object-cover"
                      />
                    )}
                    <p className="text-white font-medium truncate">{artist.name}</p>
                    <p className="text-xs text-white/60 capitalize">{artist.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Albums */}
          {results.albums?.items?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <RiAlbumLine className="text-white/60" />
                <h3 className="text-lg font-semibold text-white">Albums</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.albums.items.slice(0, 4).map((album: any) => (
                  <div
                    key={album.id}
                    className="p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition cursor-pointer"
                  >
                    {album.images?.[0]?.url && (
                      <img
                        src={album.images[0].url}
                        alt={album.name}
                        className="w-full aspect-square rounded-lg mb-2 object-cover"
                      />
                    )}
                    <p className="text-white font-medium truncate">{album.name}</p>
                    <p className="text-xs text-white/60 truncate">
                      {album.artists?.map((a: any) => a.name).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {results && !results.tracks?.items?.length && !results.artists?.items?.length && !results.albums?.items?.length && (
        <div className="text-center py-12">
          <RiSearchLine className="mx-auto text-6xl text-white/20 mb-4" />
          <p className="text-white/60">No results found</p>
        </div>
      )}
    </div>
  );
}
