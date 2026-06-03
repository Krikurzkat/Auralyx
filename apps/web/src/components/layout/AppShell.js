import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomPlayer from './BottomPlayer';
import RightPanel from './RightPanel';
import FullscreenPlayer from '../player/FullscreenPlayer';
import { useUIStore } from '../../stores/uiStore';
import { useGalaxyS8PlusLayout } from '../../hooks/useGalaxyS8PlusLayout';
import AlbumArtGlow from '../ui/AlbumArtGlow';
import BlinkingStars from '../ui/BlinkingStars';
export default function AppShell() {
    const { contextMenu, closeContextMenu, modalContent, closeModal } = useUIStore();
    const isGalaxyS8PlusLayout = useGalaxyS8PlusLayout();
    return (_jsxs("div", { className: "relative flex h-[100dvh] bg-glass backdrop-blur-2xl text-white overflow-hidden", children: [_jsx(AlbumArtGlow, {}), _jsx(BlinkingStars, {}), _jsx(Sidebar, {}), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col", children: [_jsx(TopBar, {}), _jsx("main", { className: `flex-1 overflow-y-auto px-4 md:px-6 ${isGalaxyS8PlusLayout ? 'py-3 pb-[112px]' : 'py-5 pb-[140px] md:pb-[100px]'}`, children: _jsx(Outlet, {}) })] }), _jsx(RightPanel, {}), _jsx(BottomPlayer, {}), _jsx(FullscreenPlayer, {}), contextMenu && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-50", onClick: closeContextMenu }), _jsx("div", { className: "fixed z-50 min-w-[180px] animate-scale-in rounded-xl border border-white/10 bg-glass-heavy backdrop-blur-2xl py-1 shadow-float", style: { left: contextMenu.x, top: contextMenu.y }, children: contextMenu.items.map((item, i) => (item.divider ? (_jsx("div", { className: "my-1 h-px bg-white/5" }, i)) : (_jsx("button", { onClick: () => { item.onClick(); closeContextMenu(); }, className: `flex w-full items-center gap-2 px-4 py-2 text-sm transition hover:bg-white/5 ${item.danger ? 'text-red-400' : 'text-softText hover:text-white'}`, children: item.label }, i)))) })] })), modalContent && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm", onClick: closeModal }), _jsx("div", { className: "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 animate-scale-in", children: modalContent })] }))] }));
}
