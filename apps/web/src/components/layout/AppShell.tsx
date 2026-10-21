import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomPlayer from './BottomPlayer';
import RightPanel from './RightPanel';
import FullscreenPlayer from '../player/FullscreenPlayer';
import VisualizerPlayer from '../player/VisualizerPlayer';
import DrivePlayer from '../player/DrivePlayer';
import { useUIStore } from '../../stores/uiStore';
import { usePerformance } from '../../hooks/usePerformance';
import AlbumArtGlow from '../ui/AlbumArtGlow';

import { usePlayerStore } from '../../stores/playerStore';

function useWideViewport() {
  const [isWideViewport, setIsWideViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const update = () => setIsWideViewport(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isWideViewport;
}

export default function AppShell() {
  const {
    contextMenu,
    closeContextMenu,
    modalContent,
    closeModal,
    isVisualizerOpen,
    setVisualizerOpen,
    isDriveModeOpen,
    setDriveModeOpen,
    reduceMotion,
  } = useUIStore();
  const isFullscreenOpen = usePlayerStore((s) => s.isFullscreenOpen);
  const performanceSettings = usePerformance();
  const isWideViewport = useWideViewport();

  return (
    <div className="relative flex h-[100dvh] bg-glass text-white overflow-hidden">
      {/* Dynamic Background — hidden in reduce motion mode or when FullscreenPlayer is open */}
      {!reduceMotion && !isFullscreenOpen && performanceSettings.enableBlur && <AlbumArtGlow />}

      {/* Sidebar — always rendered, handles its own collapse/mobile logic */}
      <Sidebar />

      {/* Main area — fills remaining space, never shrinks below 0 */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 pb-[130px] md:pb-[96px]">
          <Outlet />
        </main>
      </div>

      {/* Right panel */}
      {isWideViewport && <RightPanel />}

      {/* Bottom player */}
      <BottomPlayer />

      {/* Fullscreen player overlay */}
      <FullscreenPlayer />

      {/* Visualizer player modal */}
      {isVisualizerOpen && (
        <VisualizerPlayer onClose={() => setVisualizerOpen(false)} />
      )}

      {/* Drive mode player modal (only when fullscreen player shell is not hosting it) */}
      {isDriveModeOpen && !isFullscreenOpen && (
        <DrivePlayer onClose={() => setDriveModeOpen(false)} />
      )}

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
