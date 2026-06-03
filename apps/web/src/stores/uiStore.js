import { create } from 'zustand';
export const useUIStore = create((set) => ({
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
