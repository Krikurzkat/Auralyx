import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomPlayer from './BottomPlayer';
import RightPanel from './RightPanel';
import FullscreenPlayer from '../player/FullscreenPlayer';
import { useUIStore } from '../../stores/uiStore';
import { useGalaxyS8PlusLayout } from '../../hooks/useGalaxyS8PlusLayout';
import { useListeningStatusSync } from '../../hooks/useListeningStatusSync';
import AlbumArtGlow from '../ui/AlbumArtGlow';
import BlinkingStars from '../ui/BlinkingStars';

export default function AppShell() {
  const { contextMenu, closeContextMenu, modalContent, closeModal } = useUIStore();
  const isGalaxyS8PlusLayout = useGalaxyS8PlusLayout();
  useListeningStatusSync();

  return (
    <div className="relative flex h-[100dvh] bg-glass backdrop-blur-2xl text-white overflow-hidden">
      {/* Dynamic Background Blobs for Glassmorphism Effect */}
      <AlbumArtGlow />
      <BlinkingStars />

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          className={`flex-1 overflow-y-auto px-4 md:px-6 ${
            isGalaxyS8PlusLayout ? 'py-3 pb-[112px]' : 'py-5 pb-[140px] md:pb-[100px]'
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Right panel */}
      <RightPanel />

      {/* Bottom player */}
      <BottomPlayer />

      {/* Fullscreen player overlay */}
      <FullscreenPlayer />


      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeContextMenu} />
          <div
            className="fixed z-50 min-w-[180px] animate-scale-in rounded-xl border border-white/10 bg-glass-heavy backdrop-blur-2xl py-1 shadow-float"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.items.map((item, i) => (
              item.divider ? (
                <div key={i} className="my-1 h-px bg-white/5" />
              ) : (
                <button
                  key={i}
                  onClick={() => { item.onClick(); closeContextMenu(); }}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition hover:bg-white/5 ${
                    item.danger ? 'text-red-400' : 'text-softText hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              )
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {modalContent && (
        <>
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 animate-scale-in">
            {modalContent}
          </div>
        </>
      )}
    </div>
  );
}
