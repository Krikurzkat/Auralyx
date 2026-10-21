import { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  RiHome5Fill, RiHome5Line,
  RiSearchLine, RiSearchFill,
  RiMusic2Line, RiMusic2Fill,
  RiHeartLine, RiHeartFill,
  RiTimeLine,
  RiListUnordered,
  RiPlayList2Line,
  RiPlayListFill,
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiUserAddLine,
  RiCloseLine,
  RiHardDriveLine,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
} from 'react-icons/ri';
import { useLibraryStore } from '../../stores/libraryStore';
import { useUIStore } from '../../stores/uiStore';
import { useLocalLibraryStore } from '../../stores/localLibraryStore';

const navItems = [
  { path: '/', label: 'Home', icon: RiHome5Line, iconActive: RiHome5Fill },
  { path: '/local', label: 'Music', icon: RiHardDriveLine, iconActive: RiHardDriveLine },
  { path: '/search', label: 'Search', icon: RiSearchLine, iconActive: RiSearchFill },
  { path: '/library', label: 'Your Library', icon: RiMusic2Line, iconActive: RiMusic2Fill },
];

/* ─── Sidebar widths ─── */
export const SIDEBAR_EXPANDED_W = 220;
export const SIDEBAR_COLLAPSED_W = 60;
const MOBILE_DRAWER_TRANSITION = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
const MOBILE_BACKDROP_TRANSITION = 'opacity 220ms ease';

interface MobileDrawerSwipe {
  x: number;
  y: number;
  time: number;
  drawerWidth: number;
  wasOpen: boolean;
  touchId: number;
  progress: number;
}

/* ─── Component ─── */

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { likedTrackIds } = useLibraryStore();
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileSidebarOpen,
    toggleMobileSidebar,
    setMobileSidebarOpen,
  } = useUIStore();
  const { localTracks, localPlaylists, isLoaded, loadLibrary } = useLocalLibraryStore();

  const mobileDrawerRef = useRef<HTMLElement>(null);
  const mobileBackdropRef = useRef<HTMLDivElement>(null);
  const mobileDrawerSwipeRef = useRef<MobileDrawerSwipe | null>(null);

  useEffect(() => {
    if (!isLoaded) loadLibrary();
  }, [isLoaded, loadLibrary]);

  const [artistsExpanded, setArtistsExpanded] = useState(true);

  useEffect(() => {
    const drawer = mobileDrawerRef.current;
    const backdrop = mobileBackdropRef.current;
    if (!drawer || !backdrop) return;

    const supportsTouchscreen = () =>
      navigator.maxTouchPoints > 0
      || 'ontouchstart' in window
      || window.matchMedia('(pointer: coarse)').matches;
    const getEdgeSwipeRange = () => Math.min(104, Math.max(72, window.innerWidth * 0.2));
    const clampProgress = (progress: number) => Math.min(1, Math.max(0, progress));

    const applyDragProgress = (progress: number, animate: boolean) => {
      const safeProgress = clampProgress(progress);
      drawer.style.transition = animate ? `${MOBILE_DRAWER_TRANSITION}, visibility 0s linear ${safeProgress === 0 ? '260ms' : '0ms'}` : 'none';
      backdrop.style.transition = animate ? MOBILE_BACKDROP_TRANSITION : 'none';
      drawer.style.visibility = 'visible';
      drawer.style.transform = `translate3d(${(safeProgress - 1) * 100}%, 0, 0)`;
      drawer.style.pointerEvents = safeProgress > 0.02 ? 'auto' : 'none';
      backdrop.style.opacity = String(safeProgress * 0.6);
      backdrop.style.pointerEvents = safeProgress > 0.02 ? 'auto' : 'none';

      if (animate && safeProgress === 0) {
        window.setTimeout(() => {
          if (!useUIStore.getState().mobileSidebarOpen && !mobileDrawerSwipeRef.current) {
            drawer.style.visibility = 'hidden';
          }
        }, 280);
      }
    };

    const getTrackedTouch = (touches: TouchList, touchId: number) =>
      Array.from(touches).find((touch) => touch.identifier === touchId);

    const onTouchStart = (event: TouchEvent) => {
      if (!supportsTouchscreen() || window.innerWidth >= 640 || event.touches.length !== 1) {
        mobileDrawerSwipeRef.current = null;
        return;
      }

      const touch = event.touches[0];
      const wasOpen = useUIStore.getState().mobileSidebarOpen;
      const drawerWidth = drawer.getBoundingClientRect().width || 240;
      if (wasOpen ? touch.clientX > drawerWidth + 12 : touch.clientX > getEdgeSwipeRange()) {
        mobileDrawerSwipeRef.current = null;
        return;
      }

      mobileDrawerSwipeRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: performance.now(),
        drawerWidth,
        wasOpen,
        touchId: touch.identifier,
        progress: wasOpen ? 1 : 0,
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      const swipe = mobileDrawerSwipeRef.current;
      const touch = swipe ? getTrackedTouch(event.touches, swipe.touchId) : undefined;
      if (!swipe || !touch) return;

      const deltaX = touch.clientX - swipe.x;
      const deltaY = Math.abs(touch.clientY - swipe.y);
      const isHorizontal = Math.abs(deltaX) > Math.max(8, deltaY * 1.1);
      if (!isHorizontal || (!swipe.wasOpen && deltaX < 0) || (swipe.wasOpen && deltaX > 0)) return;

      swipe.progress = clampProgress(swipe.wasOpen
        ? 1 + deltaX / swipe.drawerWidth
        : deltaX / swipe.drawerWidth);
      applyDragProgress(swipe.progress, false);
      if (event.cancelable) event.preventDefault();
    };

    const finishSwipe = (shouldOpen: boolean) => {
      mobileDrawerSwipeRef.current = null;
      // Restore transitions before the store update so the drawer settles from
      // its finger position into the final open or closed position.
      applyDragProgress(shouldOpen ? 1 : 0, true);
      setMobileSidebarOpen(shouldOpen);
    };

    const onTouchEnd = (event: TouchEvent) => {
      const swipe = mobileDrawerSwipeRef.current;
      const touch = swipe ? getTrackedTouch(event.changedTouches, swipe.touchId) : undefined;
      if (!swipe || !touch) return;

      const deltaX = touch.clientX - swipe.x;
      const elapsed = Math.max(1, performance.now() - swipe.time);
      const velocity = deltaX / elapsed;
      const shouldOpen = swipe.wasOpen
        ? swipe.progress > 0.68 || (deltaX > -40 && velocity > -0.45)
        : swipe.progress >= 0.32 || (deltaX >= 32 && velocity >= 0.45);

      finishSwipe(shouldOpen);
    };

    const onTouchCancel = () => {
      const swipe = mobileDrawerSwipeRef.current;
      if (swipe) finishSwipe(swipe.wasOpen);
    };

    // Capture phase makes the drawer track the finger even over fullscreen
    // lyrics, whose own touch handlers stop bubbling to the app shell.
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    window.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { capture: true, passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart, true);
      window.removeEventListener('touchmove', onTouchMove, true);
      window.removeEventListener('touchend', onTouchEnd, true);
      window.removeEventListener('touchcancel', onTouchCancel, true);
    };
  }, [setMobileSidebarOpen]);

  const userPlaylists = localPlaylists
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title));

  const followedArtistList = useMemo(() => {
    const artistSet = new Set<string>();
    const artists: { id: string; name: string; avatarGradient: [string, string] }[] = [];
    localTracks.forEach(t => {
      if (!artistSet.has(t.artist)) {
        artistSet.add(t.artist);
        artists.push({
          id: t.artist,
          name: t.artist,
          avatarGradient: t.coverGradient || ['#333', '#222'],
        });
      }
    });
    return artists.slice(0, 10);
  }, [localTracks]);

  const likedCount = likedTrackIds.size;

  /* ─── Collapsed icon-only nav ─── */
  const collapsedContent = (
    <div className="flex h-full flex-col items-center py-5 gap-1">
      {/* Logo */}
      <div className="mb-4 flex items-center justify-center">
        <div className="relative h-9 w-9 flex-shrink-0">
          <div className="absolute inset-1 rounded-xl bg-accent/10 blur-md" />
          <img src="/auralyx-mark.svg" alt="Auralyx" className="relative z-10 h-9 w-9 object-contain drop-shadow-[0_0_8px_rgba(91,177,255,0.32)]" />
        </div>
      </div>

      {/* Toggle expand button */}
      <button
        onClick={toggleSidebar}
        title="Expand sidebar"
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl text-softText transition-all hover:bg-white/10 hover:text-white active:scale-90"
      >
        <RiMenuUnfoldLine size={18} />
      </button>

      {/* Divider */}
      <div className="my-1 h-px w-8 bg-white/10" />

      {/* Nav icons */}
      {navItems.map(item => {
        const isActive = location.pathname === item.path;
        const Icon = isActive ? item.iconActive : item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
              isActive
                ? 'bg-accent/20 text-accent'
                : 'text-softText hover:bg-white/10 hover:text-white'
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-accent" />
            )}
            <Icon size={18} />
          </NavLink>
        );
      })}

      {/* Divider */}
      <div className="my-1 h-px w-8 bg-white/10" />

      {/* Secondary nav icons */}
      {[
        { path: '/liked', label: 'Liked Songs', icon: RiHeartLine, iconActive: RiHeartFill },
        { path: '/recently-played', label: 'Recently Played', icon: RiTimeLine, iconActive: RiTimeLine },
        { path: '/listening-history', label: 'Listening History', icon: RiListUnordered, iconActive: RiListUnordered },
        { path: '/queue', label: 'Queue', icon: RiPlayList2Line, iconActive: RiPlayListFill },
      ].map(item => {
        const isActive = location.pathname === item.path;
        const Icon = isActive ? item.iconActive : item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
              isActive
                ? 'bg-accent/20 text-accent'
                : 'text-softText hover:bg-white/10 hover:text-white'
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-accent" />
            )}
            <Icon size={18} />
          </NavLink>
        );
      })}
    </div>
  );

  /* ─── Full expanded sidebar content ─── */
  const expandedContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col pt-5">
      {/* ─── TOP: Branding + collapse toggle ─── */}
      <div className="mb-5 flex items-center gap-2.5 px-[12px]">
        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-visible rounded-xl border border-white/[0.08] bg-white/[0.035]">
          <div className="absolute inset-1 rounded-xl bg-accent/20 blur-md" />
          <img
            src="/auralyx-mark.svg"
            alt="Auralyx"
            className="relative z-10 h-8 w-8 object-contain drop-shadow-[0_0_8px_rgba(91,177,255,0.32)]"
          />
        </div>
        <div className="min-w-0 flex-1 leading-none">
          <div
            className="truncate bg-clip-text text-[17px] font-black tracking-[-0.055em] text-transparent"
            style={{ backgroundImage: 'linear-gradient(100deg, #67F4FF 0%, #4D8DFF 54%, #D66BFF 100%)' }}
          >
            Auralyx
          </div>
          <div className="mt-1.5 truncate text-[8px] font-bold uppercase tracking-[0.19em] text-white/45">Sound in color</div>
        </div>
        {/* Collapse / Close button */}
        {isMobile ? (
          <button
            onClick={toggleMobileSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-softText transition hover:bg-white/5 hover:text-white"
          >
            <RiCloseLine size={18} />
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            title="Collapse sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-softText transition hover:bg-white/5 hover:text-white"
          >
            <RiMenuFoldLine size={18} />
          </button>
        )}
      </div>

      {/* ─── Primary Nav ─── */}
      <nav className="space-y-0.5 px-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = isActive ? item.iconActive : item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => mobileSidebarOpen && toggleMobileSidebar()}
              className={`group relative overflow-hidden flex items-center gap-3 rounded-xl px-3 py-1.5 text-xs font-medium transition-all border-l-[3px] ${
                isActive
                  ? 'border-accent bg-[#2A2A2A] text-white'
                  : 'border-transparent text-softText hover:border-accent hover:bg-[#2A2A2A] hover:text-white'
              }`}
            >
              {isActive && (
                <span className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-accent/20 to-transparent" />
              )}
              <Icon size={18} className="relative z-10 flex-shrink-0" />
              <span className="relative z-10 truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-3 h-px bg-[#2A2A2A]" />

      {/* ─── Secondary Nav ─── */}
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
          iconActive={RiPlayListFill}
          currentPath={location.pathname}
          onNavigate={() => mobileSidebarOpen && toggleMobileSidebar()}
        />
      </nav>

      {/* Divider */}
      <div className="mx-3 my-3 h-px bg-[#2A2A2A]" />

      {/* ─── Scrollable: Artists + Playlists ─── */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-1">

        {/* Artists */}
        <div className="mb-3">
          <button
            onClick={() => setArtistsExpanded(e => !e)}
            className="flex w-full items-center justify-between px-3 py-1.5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-softText">Artists</span>
            {artistsExpanded
              ? <RiArrowUpSLine size={16} className="text-softText" />
              : <RiArrowDownSLine size={16} className="text-softText" />}
          </button>

          <div
            className={`collapse-section ${artistsExpanded ? 'expanded' : 'collapsed'}`}
            style={{ maxHeight: artistsExpanded ? '600px' : '0' }}
          >
            <div className="space-y-0.5">
              {(isMobile ? followedArtistList.slice(0, 4) : followedArtistList).map(artist => {
                const ag = artist.avatarGradient || ['#333', '#222'];
                return (
                  <button
                    key={artist.id}
                    onClick={() => {
                      navigate(`/artist/${artist.id}`);
                      if (mobileSidebarOpen) toggleMobileSidebar();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-xs transition-all border-l-[3px] border-transparent hover:border-accent hover:bg-[#2A2A2A]"
                  >
                    <div
                      className="h-7 w-7 flex-shrink-0 rounded-full"
                      style={{ background: `linear-gradient(135deg, ${ag[0]}, ${ag[1]})` }}
                    />
                    <span className="flex-1 truncate text-left text-white">{artist.name}</span>
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                  </button>
                );
              })}
              {isMobile && followedArtistList.length > 4 && (
                <button
                  onClick={() => { navigate('/library?filter=artists'); toggleMobileSidebar(); }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-accent transition hover:text-gradient-to"
                >
                  See All ({followedArtistList.length})
                </button>
              )}
              <button
                onClick={() => { navigate('/search'); if (mobileSidebarOpen) toggleMobileSidebar(); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-xs text-softText transition hover:bg-[#2A2A2A] hover:text-white"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[#444]">
                  <RiUserAddLine size={14} />
                </div>
                <span>Follow More</span>
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 my-3 h-px bg-[#2A2A2A]" />

        {/* Playlists */}
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
            <div className="px-3 py-4 text-center text-xs text-dimText">No playlists yet</div>
          ) : (
            <div className="space-y-0.5">
              {userPlaylists.map(pl => {
                const cg = pl.coverGradient || ['#333', '#222'];
                return (
                  <NavLink
                    key={pl.id}
                    to={`/playlist/${pl.id}`}
                    onClick={() => mobileSidebarOpen && toggleMobileSidebar()}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-1.5 text-xs transition-all border-l-[3px] ${
                        isActive
                          ? 'border-accent bg-[#2A2A2A] text-white'
                          : 'border-transparent text-softText hover:border-accent hover:bg-[#2A2A2A] hover:text-white'
                      }`
                    }
                  >
                    {pl.coverUrl ? (
                      <img src={pl.coverUrl} alt={pl.title} className="h-7 w-7 flex-shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div
                        className="h-7 w-7 flex-shrink-0 rounded-lg"
                        style={{ background: `linear-gradient(135deg, ${cg[0]}, ${cg[1]})` }}
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
      {/* ─── Desktop/Tablet: always-visible sidebar (never hides, just shrinks) ─── */}
      <aside
        className="hidden sm:flex flex-col flex-shrink-0 border-r border-[#2A2A2A] bg-[#1A1A1A] transition-[width] duration-300 ease-in-out overflow-hidden"
        style={{
          width: sidebarCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W,
          minWidth: sidebarCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W,
        }}
      >
        <div
          className="h-full"
          style={{
            width: sidebarCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W,
            transition: 'width 300ms ease-in-out',
          }}
        >
          {sidebarCollapsed ? collapsedContent : expandedContent(false)}
        </div>
      </aside>

      {/* ─── Mobile: overlay drawer (<640px) ─── */}
      <div
        ref={mobileBackdropRef}
        className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm sm:hidden"
        aria-hidden="true"
        onClick={() => setMobileSidebarOpen(false)}
        style={{
          opacity: mobileSidebarOpen ? 0.6 : 0,
          pointerEvents: mobileSidebarOpen ? 'auto' : 'none',
          transition: MOBILE_BACKDROP_TRANSITION,
        }}
      />
      <aside
        ref={mobileDrawerRef}
        className="fixed inset-y-0 left-0 z-[60] w-[240px] bg-[#1A1A1A] px-2 py-3 sm:hidden overflow-y-auto"
        aria-hidden={!mobileSidebarOpen}
        style={{
          transform: mobileSidebarOpen ? 'translate3d(0, 0, 0)' : 'translate3d(-100%, 0, 0)',
          transition: mobileSidebarOpen
            ? `${MOBILE_DRAWER_TRANSITION}, visibility 0s`
            : `${MOBILE_DRAWER_TRANSITION}, visibility 0s linear 260ms`,
          visibility: mobileSidebarOpen ? 'visible' : 'hidden',
          pointerEvents: mobileSidebarOpen ? 'auto' : 'none',
          touchAction: 'pan-y',
        }}
      >
        {expandedContent(true)}
      </aside>
    </>
  );
}

/* ─── Reusable nav link ─── */

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
      className={`group relative overflow-hidden flex items-center justify-between rounded-xl px-3 py-1.5 text-xs transition-all border-l-[3px] ${
        isActive
          ? 'border-accent bg-[#2A2A2A] text-white'
          : 'border-transparent text-softText hover:border-accent hover:bg-[#2A2A2A] hover:text-white'
      }`}
    >
      {isActive && (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-accent/20 to-transparent" />
      )}
      <span className="relative z-10 flex items-center gap-3 min-w-0">
        <ResolvedIcon size={18} className="flex-shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="relative z-10 ml-1 flex-shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
