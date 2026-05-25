import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomPlayer from './BottomPlayer';
import RightPanel from './RightPanel';
import FullscreenPlayer from '../player/FullscreenPlayer';
import { useUIStore } from '../../stores/uiStore';

export default function AppShell() {
  const { contextMenu, closeContextMenu, modalContent, closeModal } = useUIStore();

  return (
    <div className="relative flex h-[100dvh] bg-glass backdrop-blur-2xl text-white overflow-hidden">
      {/* Animated Background Blobs for Glassmorphism Effect */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-gradient-to-br from-gradient-from/20 to-gradient-to/10 blur-[120px] animate-pulse-glow" />
        <div className="absolute right-[-15%] top-[20%] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-gradient-to/15 to-gradient-from/10 blur-[140px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-20%] left-[30%] h-[550px] w-[550px] rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 blur-[130px] animate-pulse-glow" style={{ animationDelay: '4s' }} />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-[140px] md:pb-[100px] md:px-6">
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
