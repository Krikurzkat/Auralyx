import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  RiHome5Fill, RiHome5Line,
  RiSearchLine, RiSearchFill,
  RiMusic2Line, RiMusic2Fill,
  RiHeartLine, RiHeartFill,
  RiTimeLine,
  RiDownloadLine,
  RiListUnordered,
  RiPlayList2Line,
  RiMicLine,
  RiUserFollowLine,
  RiPlayListFill,
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiUserAddLine,
  RiCloseLine,
  RiHardDriveLine,
} from 'react-icons/ri';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUIStore } from '../../stores/uiStore';
import { useLocalLibraryStore } from '../../stores/localLibraryStore';

const navItems = [
  { path: '/', label: 'Home', icon: RiHome5Line, iconActive: RiHome5Fill },
  { path: '/search', label: 'Search', icon: RiSearchLine, iconActive: RiSearchFill },
  { path: '/library', label: 'Your Library', icon: RiMusic2Line, iconActive: RiMusic2Fill },
];

/* ─── Component ─── */

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { likedTrackIds } = useLibraryStore();
  const { mobileSidebarOpen, toggleMobileSidebar } = useUIStore();
  const { localTracks, localPlaylists, isLoaded, loadLibrary } = useLocalLibraryStore();

  useEffect(() => {
    if (!isLoaded) loadLibrary();
  }, [isLoaded, loadLibrary]);

  const [artistsExpanded, setArtistsExpanded] = useState(true);

  const userPlaylists = localPlaylists
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title));
  
  const followedArtistList = useMemo(() => {
    const artistSet = new Set<string>();
    const artists: { id: string; name: string; avatarGradient: [string, string] }[] = [];
    localTracks.forEach(t => {
      if (!artistSet.has(t.artist)) {
        artistSet.add(t.artist);
        artists.push({
          id: t.artist,
          name: t.artist,
          avatarGradient: t.coverGradient || ['#333', '#222']
        });
      }
    });
    return artists.slice(0, 10); // Just show top 10 local artists
  }, [localTracks]);
  const likedCount = likedTrackIds.size;

  /** Builds the full sidebar content for desktop (vertical genres, all artists). */
  const sidebarContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      {/* ─── TOP SECTION: Branding + Core Nav ─── */}
      <div className="mb-5 flex items-center gap-3 px-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-gradient text-lg font-bold shadow-glow-sm">
          G
        </div>
        <div>
          <div className="text-base font-bold tracking-tight">Go-Music</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-accent">Premium</div>
        </div>
        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={toggleMobileSidebar}
            className="ml-auto rounded-lg p-1.5 text-softText transition hover:bg-white/5 hover:text-white"
          >
            <RiCloseLine size={20} />
          </button>
        )}
      </div>

      <nav className="space-y-0.5 px-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = isActive ? item.iconActive : item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => mobileSidebarOpen && toggleMobileSidebar()}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'border-l-[3px] border-accent bg-[#2A2A2A] text-white'
                  : 'border-l-[3px] border-transparent text-softText hover:border-accent hover:bg-[#2A2A2A] hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* ─── Music Link ─── */}
      <div className="px-1 mb-1">
        <NavLink
          to="/local"
          onClick={() => mobileSidebarOpen && toggleMobileSidebar()}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all border-l-[3px] ${
              isActive
                ? 'border-accent bg-[#2A2A2A] text-white'
                : 'border-transparent text-softText hover:border-accent hover:bg-[#2A2A2A] hover:text-white'
            }`
          }
        >
          <RiHardDriveLine size={20} />
          <span className="flex-1">Music</span>
          {localTracks.length > 0 && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
              {localTracks.length}
            </span>
          )}
        </NavLink>
      </div>

      {/* ─── Divider ─── */}
      <div className="mx-3 my-4 h-px bg-[#2A2A2A]" />

      {/* ─── SECOND SECTION: User Collection ─── */}
      <nav className="space-y-0.5 px-1">
        <SidebarLink
          path="/liked"
          label="Liked Songs"
          icon={RiHeartLine}
          iconActive={RiHeartFill}
          badge={likedCount > 0 ? likedCount : undefined}
          currentPath={location.pathname}
          onNavigate={() => mobileSidebarOpen && toggleMobileSidebar()}
        />
        <SidebarLink
          path="/recently-played"
          label="Recently Played"
          icon={RiTimeLine}
          currentPath={location.pathname}
          onNavigate={() => mobileSidebarOpen && toggleMobileSidebar()}
        />
        <SidebarLink
          path="/listening-history"
          label="Listening History"
          icon={RiListUnordered}
          currentPath={location.pathname}
          onNavigate={() => mobileSidebarOpen && toggleMobileSidebar()}
        />
        <SidebarLink
          path="/queue"
          label="Queue"
          icon={RiPlayList2Line}
          currentPath={location.pathname}
          onNavigate={() => mobileSidebarOpen && toggleMobileSidebar()}
        />
      </nav>

      {/* ─── Divider ─── */}
      <div className="mx-3 my-4 h-px bg-[#2A2A2A]" />

      {/* ─── Scrollable remaining sections ─── */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-1">

        {/* ─── Followed Artists ─── */}
        <div className="mb-3">
          <button
            onClick={() => setArtistsExpanded(e => !e)}
            className="flex w-full items-center justify-between px-3 py-1.5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-softText">Artists</span>
            {artistsExpanded ? (
              <RiArrowUpSLine size={16} className="text-softText" />
            ) : (
              <RiArrowDownSLine size={16} className="text-softText" />
            )}
          </button>

          <div
            className={`collapse-section ${artistsExpanded ? 'expanded' : 'collapsed'}`}
            style={{ maxHeight: artistsExpanded ? '600px' : '0' }}
          >
            <div className="space-y-0.5">
              {(isMobile ? followedArtistList.slice(0, 4) : followedArtistList).map(artist => {
                const avatarGradient = artist.avatarGradient || ['#333', '#222'];
                return (
                  <button
                    key={artist.id}
                    onClick={() => {
                      navigate(`/artist/${artist.id}`);
                      if (mobileSidebarOpen) toggleMobileSidebar();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all border-l-[3px] border-transparent hover:border-accent hover:bg-[#2A2A2A]"
                  >
                    <div
                      className="h-8 w-8 flex-shrink-0 rounded-full"
                      style={{ background: `linear-gradient(135deg, ${avatarGradient[0]}, ${avatarGradient[1]})` }}
                    />
                    <span className="flex-1 truncate text-left text-white">{artist.name}</span>
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                  </button>
                );
              })}

              {/* Mobile: See All link */}
              {isMobile && followedArtistList.length > 4 && (
                <button
                  onClick={() => { navigate('/library?filter=artists'); toggleMobileSidebar(); }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-accent transition hover:text-gradient-to"
                >
                  See All ({followedArtistList.length})
                </button>
              )}

              {/* + Follow More button */}
              <button
                onClick={() => {
                  navigate('/search');
                  if (mobileSidebarOpen) toggleMobileSidebar();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-softText transition hover:bg-[#2A2A2A] hover:text-white"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[#444]">
                  <RiUserAddLine size={14} />
                </div>
                <span>Follow More</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Divider ─── */}
        <div className="mx-3 my-3 h-px bg-[#2A2A2A]" />

        {/* ─── Playlists ─── */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-3 py-1.5">
            <div className="flex items-center gap-2">
              <RiPlayListFill size={14} className="text-softText" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-softText">Playlists</span>
            </div>
            <button className="rounded-lg p-1 text-softText transition hover:bg-white/5 hover:text-white">
              <RiAddLine size={16} />
            </button>
          </div>

          {userPlaylists.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-dimText">
              No playlists yet
            </div>
          ) : (
            <div className="space-y-0.5">
              {userPlaylists.map(pl => {
                const coverGradient = pl.coverGradient || ['#333', '#222'];
                return (
                  <NavLink
                    key={pl.id}
                    to={`/playlist/${pl.id}`}
                    onClick={() => mobileSidebarOpen && toggleMobileSidebar()}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all border-l-[3px] ${
                        isActive
                          ? 'border-accent bg-[#2A2A2A] text-white'
                          : 'border-transparent text-softText hover:border-accent hover:bg-[#2A2A2A] hover:text-white'
                      }`
                    }
                  >
                    {pl.coverUrl ? (
                      <img
                        src={pl.coverUrl}
                        alt={pl.title}
                        className="h-8 w-8 flex-shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="h-8 w-8 flex-shrink-0 rounded-lg"
                        style={{ background: `linear-gradient(135deg, ${coverGradient[0]}, ${coverGradient[1]})` }}
                      />
                    )}
                    <span className="truncate">{pl.title}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[260px] flex-shrink-0 border-r border-[#2A2A2A] bg-[#1A1A1A] px-2 py-5 xl:flex xl:flex-col">
        {sidebarContent(false)}
      </aside>

      {/* Mobile sidebar overlay + drawer */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
            onClick={toggleMobileSidebar}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[280px] animate-slide-in-left bg-[#1A1A1A] px-2 py-5 xl:hidden">
            {sidebarContent(true)}
          </aside>
        </>
      )}
    </>
  );
}

/* ─── Reusable Nav Link Sub‑Component ─── */

interface SidebarLinkProps {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconActive?: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
  currentPath: string;
  onNavigate: () => void;
}

function SidebarLink({ path, label, icon: Icon, iconActive: IconActive, badge, currentPath, onNavigate }: SidebarLinkProps) {
  const isActive = currentPath === path;
  const ResolvedIcon = isActive && IconActive ? IconActive : Icon;

  return (
    <NavLink
      to={path}
      onClick={onNavigate}
      className={`group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all border-l-[3px] ${
        isActive
          ? 'border-accent bg-[#2A2A2A] text-white'
          : 'border-transparent text-softText hover:border-accent hover:bg-[#2A2A2A] hover:text-white'
      }`}
    >
      <span className="flex items-center gap-3">
        <ResolvedIcon size={20} />
        <span>{label}</span>
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
