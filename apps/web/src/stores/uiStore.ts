import { create } from 'zustand';

type RightPanelView = 'queue' | 'lyrics' | 'hidden';

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  rightPanelView: RightPanelView;
  searchQuery: string;
  searchOpen: boolean;
  contextMenu: { x: number; y: number; items: ContextMenuItem[] } | null;
  modalContent: React.ReactNode | null;
  toastQueue: string[];
  reduceMotion: boolean;
  isVisualizerOpen: boolean;
  isDriveModeOpen: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleReduceMotion: () => void;
  setRightPanel: (view: RightPanelView) => void;
  setVisualizerOpen: (open: boolean) => void;
  setDriveModeOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setSearchOpen: (open: boolean) => void;
  openContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  closeContextMenu: () => void;
  openModal: (content: React.ReactNode) => void;
  closeModal: () => void;
}

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

const getSidebarCollapsed = () => {
  try {
    return localStorage.getItem('go_music_sidebar_collapsed') === 'true';
  } catch {
    return false;
  }
};

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: getSidebarCollapsed(),
  mobileSidebarOpen: false,
  rightPanelView: 'queue',
  searchQuery: '',
  searchOpen: false,
  contextMenu: null,
  modalContent: null,
  toastQueue: [],
  reduceMotion: localStorage.getItem('go_music_reduce_motion') === 'true',
  isVisualizerOpen: false,
  isDriveModeOpen: false,

  toggleSidebar: () => set(s => {
    const next = !s.sidebarCollapsed;
    try { localStorage.setItem('go_music_sidebar_collapsed', String(next)); } catch {}
    return { sidebarCollapsed: next };
  }),
  setSidebarCollapsed: (collapsed) => set(() => {
    try { localStorage.setItem('go_music_sidebar_collapsed', String(collapsed)); } catch {}
    return { sidebarCollapsed: collapsed };
  }),
  toggleMobileSidebar: () => set(s => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  toggleReduceMotion: () => set(s => {
    const next = !s.reduceMotion;
    localStorage.setItem('go_music_reduce_motion', String(next));
    return { reduceMotion: next };
  }),
  setRightPanel: (view) => set({ rightPanelView: view }),
  setVisualizerOpen: (open) => set({ isVisualizerOpen: open }),
  setDriveModeOpen: (open) => set({ isDriveModeOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
  closeContextMenu: () => set({ contextMenu: null }),
  openModal: (content) => set({ modalContent: content }),
  closeModal: () => set({ modalContent: null }),
}));
