import { useNavigate, useLocation } from 'react-router-dom';
import { RiArrowLeftSLine, RiArrowRightSLine, RiMenuLine, RiSearchLine, RiSettings4Line } from 'react-icons/ri';
import { useUIStore } from '../../stores/uiStore';
import { useState, useRef, useEffect } from 'react';
import { Track, Artist, Album, Playlist } from '../../types';
import { useLocalLibraryStore } from '../../stores/localLibraryStore';
import { gsap } from 'gsap';
import { useGalaxyS8PlusLayout } from '../../hooks/useGalaxyS8PlusLayout';

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchQuery, setSearchQuery, toggleMobileSidebar } = useUIStore();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHovered, setSearchHovered] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchShellRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const [suggestions, setSuggestions] = useState<{
    tracks: Track[];
    artists: Artist[];
    albums: Album[];
    playlists: Playlist[];
  } | null>(null);
  const isGalaxyS8PlusLayout = useGalaxyS8PlusLayout();

  const isSearchPage = location.pathname === '/search';

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { searchTracks, localPlaylists } = useLocalLibraryStore();

  // Live autocomplete suggestions
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions(null);
      return;
    }

    const timer = setTimeout(() => {
      try {
        const q = searchQuery.toLowerCase();
        const matchedTracks = searchTracks(searchQuery);

        // Derive artists & albums
        const artistMap = new Map<string, Artist>();
        const albumMap = new Map<string, Album>();

        matchedTracks.forEach(t => {
          if (!artistMap.has(t.artist)) {
            artistMap.set(t.artist, { id: t.artistId || t.artist, name: t.artist, avatarGradient: t.coverGradient || ['#333', '#222'], monthlyListeners: 0 } as Artist);
          }
          if (t.album && !albumMap.has(t.album)) {
            albumMap.set(t.album, { id: t.albumId || t.album, title: t.album, artist: t.artist, coverGradient: t.coverGradient || ['#333', '#222'], coverUrl: t.coverUrl, year: t.year || new Date().getFullYear(), type: 'album' } as Album);
          }
        });

        const matchedPlaylists = localPlaylists.filter(p => p.title.toLowerCase().includes(q));

        setSuggestions({
          tracks: matchedTracks.slice(0, 4),
          artists: Array.from(artistMap.values()).slice(0, 3),
          albums: Array.from(albumMap.values()).slice(0, 3),
          playlists: matchedPlaylists.slice(0, 3),
        });
      } catch (err) {
        console.error('Failed to load search autocomplete suggestions:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, searchTracks, localPlaylists]);

  useEffect(() => {
    const searchShell = searchShellRef.current;
    if (!searchShell) return;

    const icon = searchShell.querySelector('.topbar-search-icon');
    const isActive = searchFocused || searchHovered;

    gsap.killTweensOf(searchShell);
    if (icon) gsap.killTweensOf(icon);

    gsap.to(searchShell, {
      scale: isActive ? 1.012 : 1,
      y: isActive ? -2 : 0,
      boxShadow: isActive ? '0 18px 36px rgba(0,0,0,0.24)' : '0 0px 0px rgba(0,0,0,0)',
      duration: 0.24,
      ease: 'power2.out',
      overwrite: 'auto',
      force3D: true,
    });

    if (icon) {
      gsap.to(icon, {
        x: isActive ? 2 : 0,
        scale: isActive ? 1.08 : 1,
        opacity: isActive ? 1 : 0.85,
        duration: 0.24,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  }, [searchFocused, searchHovered]);

  const animateSettingsButton = (hovered: boolean) => {
    const button = settingsButtonRef.current;
    if (!button) return;
    const icon = button.querySelector('svg');

    gsap.to(button, {
      scale: hovered ? 1.08 : 1,
      y: hovered ? -2 : 0,
      backgroundColor: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0)',
      boxShadow: hovered ? '0 12px 26px rgba(0,0,0,0.22)' : '0 0px 0px rgba(0,0,0,0)',
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
      force3D: true,
    });

    if (icon) {
      gsap.to(icon, {
        rotation: hovered ? 90 : 0,
        duration: 0.3,
        ease: hovered ? 'back.out(1.7)' : 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const pressSettingsButton = () => {
    const button = settingsButtonRef.current;
    if (!button) return;
    gsap.to(button, {
      scale: 0.94,
      duration: 0.1,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  };

  const hasSuggestions = suggestions && (suggestions.tracks.length > 0 || suggestions.artists.length > 0 || suggestions.albums.length > 0 || suggestions.playlists.length > 0);

  return (
    <header
      className={`glass-heavy sticky top-0 z-30 border-b border-white/5 md:px-6 ${
        isGalaxyS8PlusLayout ? 'px-3 py-2' : 'px-4 py-3'
      }`}
    >
      <div className={`flex items-center justify-between ${isGalaxyS8PlusLayout ? 'gap-2.5' : 'gap-4'}`}>
        {/* Left: hamburger + navigation */}
        <div className={`flex items-center ${isGalaxyS8PlusLayout ? 'gap-1.5' : 'gap-2'}`}>
          <button
            onClick={toggleMobileSidebar}
            className={`text-softText transition hover:bg-white/5 hover:text-white xl:hidden ${
              isGalaxyS8PlusLayout ? 'min-h-[48px] min-w-[48px] rounded-xl p-3' : 'rounded-lg p-2'
            }`}
          >
            <RiMenuLine size={isGalaxyS8PlusLayout ? 20 : 22} />
          </button>
          <button
            onClick={() => navigate(-1)}
            className="hidden rounded-full bg-black/40 p-1.5 text-softText transition hover:text-white md:block"
          >
            <RiArrowLeftSLine size={22} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="hidden rounded-full bg-black/40 p-1.5 text-softText transition hover:text-white md:block"
          >
            <RiArrowRightSLine size={22} />
          </button>
        </div>

        {/* Center: Search */}
        <div className={`relative flex-1 ${isGalaxyS8PlusLayout ? 'max-w-none min-w-0' : 'max-w-xl'}`} ref={searchRef}>
          <div
            ref={searchShellRef}
            onMouseEnter={() => setSearchHovered(true)}
            onMouseLeave={() => setSearchHovered(false)}
            className={`flex items-center rounded-full border transition-all ${
              searchFocused ? 'border-white/20 bg-white/10' : 'border-transparent bg-white/5'
            } ${isGalaxyS8PlusLayout ? 'gap-2 px-3 py-2.5' : 'gap-2 px-4 py-2'}`}
          >
            <RiSearchLine size={isGalaxyS8PlusLayout ? 16 : 18} className="topbar-search-icon text-softText" />
            <input
              type="text"
              placeholder={isGalaxyS8PlusLayout ? 'Search songs, artists...' : 'Search songs, artists, albums, podcasts...'}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                if (!isSearchPage && e.target.value) navigate('/search');
              }}
              onFocus={() => {
                setSearchFocused(true);
                setShowSuggestions(true);
              }}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchQuery) {
                  navigate('/search');
                  setShowSuggestions(false);
                }
              }}
              className={`w-full bg-transparent text-white placeholder-dimText outline-none ${
                isGalaxyS8PlusLayout ? 'text-[13px]' : 'text-sm'
              }`}
            />
          </div>

          {/* Autocomplete dropdown */}
          {showSuggestions && hasSuggestions && suggestions && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-[400px] overflow-y-auto rounded-2xl border border-white/10 bg-glass-heavy backdrop-blur-2xl p-2 shadow-float animate-fade-in-down">
              {suggestions.artists.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-dimText">Artists</div>
                  {suggestions.artists.map(a => {
                    const avatarGradient = a.avatarGradient || ['#333', '#222'];
                    return (
                      <button key={a.id} onClick={() => { navigate(`/artist/${a.id}`); setShowSuggestions(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/5">
                        {a.avatarUrl ? (
                          <img src={a.avatarUrl} alt={a.name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full" style={{ background: `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})` }} />
                        )}
                        <span>{a.name}</span>
                        <span className="ml-auto text-xs text-dimText">Artist</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {suggestions.tracks.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-dimText">Songs</div>
                  {suggestions.tracks.map(t => {
                    const coverGradient = t.coverGradient || ['#333', '#222'];
                    return (
                      <button key={t.id} onClick={() => { navigate(`/album/${t.albumId}`); setShowSuggestions(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/5">
                        {t.coverUrl ? (
                          <img src={t.coverUrl} alt={t.title} className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` }} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{t.title}</div>
                          <div className="text-xs text-dimText">{t.artist}</div>
                        </div>
                        <span className="text-xs text-dimText">Song</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {suggestions.albums.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-dimText">Albums</div>
                  {suggestions.albums.map(a => {
                    const coverGradient = a.coverGradient || ['#333', '#222'];
                    return (
                      <button key={a.id} onClick={() => { navigate(`/album/${a.id}`); setShowSuggestions(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/5">
                        {a.coverUrl ? (
                          <img src={a.coverUrl} alt={a.title} className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` }} />
                        )}
                        <span>{a.title}</span>
                        <span className="ml-auto text-xs text-dimText">Album</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {suggestions.playlists.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-dimText">Playlists</div>
                  {suggestions.playlists.map(p => {
                    const coverGradient = p.coverGradient || ['#333', '#222'];
                    return (
                      <button key={p.id} onClick={() => { navigate(`/playlist/${p.id}`); setShowSuggestions(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/5">
                        {p.coverUrl ? (
                          <img src={p.coverUrl} alt={p.title} className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` }} />
                        )}
                        <span>{p.title}</span>
                        <span className="ml-auto text-xs text-dimText">Playlist</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className={`flex items-center ${isGalaxyS8PlusLayout ? 'gap-1' : 'gap-2'}`}>
          <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200 sm:inline-flex">
            Offline
          </span>
          <button
            ref={settingsButtonRef}
            data-gsap-ignore
            onMouseEnter={() => animateSettingsButton(true)}
            onMouseLeave={() => animateSettingsButton(false)}
            onPointerDown={pressSettingsButton}
            onPointerUp={() => animateSettingsButton(true)}
            onClick={() => navigate('/settings')}
            className={`text-softText transition hover:bg-white/5 hover:text-white ${
              isGalaxyS8PlusLayout ? 'min-h-[48px] min-w-[48px] rounded-xl p-3' : 'rounded-full p-2'
            }`}
          >
            <RiSettings4Line size={isGalaxyS8PlusLayout ? 18 : 20} />
          </button>
        </div>
      </div>
    </header>
  );
}
