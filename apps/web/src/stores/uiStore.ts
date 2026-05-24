import { create } from 'zustand';

type RightPanelView = 'queue' | 'lyrics' | 'activity' | 'hidden';

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

  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  toggleReduceMotion: () => void;
  setRightPanel: (view: RightPanelView) => void;
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

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  rightPanelView: 'queue',
  searchQuery: '',
  searchOpen: false,
  contextMenu: null,
  modalContent: null,
  toastQueue: [],
  reduceMotion: localStorage.getItem('go_music_reduce_motion') === 'true',

  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleMobileSidebar: () => set(s => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  toggleReduceMotion: () => set(s => {
    const next = !s.reduceMotion;
    localStorage.setItem('go_music_reduce_motion', String(next));
    return { reduceMotion: next };
  }),
  setRightPanel: (view) => set({ rightPanelView: view }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
  closeContextMenu: () => set({ contextMenu: null }),
  openModal: (content) => set({ modalContent: content }),
  closeModal: () => set({ modalContent: null }),
}));
