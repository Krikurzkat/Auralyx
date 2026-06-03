import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { RiArrowLeftLine, RiCheckLine, RiDownloadCloud2Line, RiEqualizerLine, RiDeleteBin6Line, RiPaletteLine, } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, } from '../stores/playerStore';
import { localDb } from '../services/localDb';
const colorPalettes = [
    { id: 'sunset-fire', name: 'Sunset Fire', gradient: ['#FF6B35', '#8B1538'] },
    { id: 'ocean-deep', name: 'Ocean Deep', gradient: ['#1E88E5', '#6A1B9A'] },
    { id: 'twilight-sky', name: 'Twilight Sky', gradient: ['#90CAF9', '#E1BEE7'] },
    { id: 'pink-sunrise', name: 'Pink Sunrise', gradient: ['#EC407A', '#FDD835'] },
    { id: 'azure-blue', name: 'Azure Blue', gradient: ['#1976D2', '#42A5F5'] },
    { id: 'coral-reef', name: 'Coral Reef', gradient: ['#26C6DA', '#FF8A65'] },
    { id: 'golden-hour', name: 'Golden Hour', gradient: ['#26C6DA', '#FFD54F'] },
    { id: 'tropical-sunset', name: 'Tropical Sunset', gradient: ['#66BB6A', '#FF7043'] },
    { id: 'purple-haze', name: 'Purple Haze', gradient: ['#7E57C2', '#FF8A65'] },
    { id: 'lavender-dream', name: 'Lavender Dream', gradient: ['#CE93D8', '#F48FB1'] },
    { id: 'royal-purple', name: 'Royal Purple', gradient: ['#5E35B1', '#512DA8'] },
    { id: 'violet-mist', name: 'Violet Mist', gradient: ['#9575CD', '#B39DDB'] },
    { id: 'magenta-pink', name: 'Magenta Pink', gradient: ['#EC407A', '#AB47BC'] },
    { id: 'electric-blue', name: 'Electric Blue', gradient: ['#42A5F5', '#5C6BC0'] },
    { id: 'lime-fresh', name: 'Lime Fresh', gradient: ['#9CCC65', '#26C6DA'] },
    { id: 'teal-ocean', name: 'Teal Ocean', gradient: ['#26A69A', '#00897B'] },
    { id: 'peach-cream', name: 'Peach Cream', gradient: ['#FFCCBC', '#FFAB91'] },
    { id: 'hot-pink', name: 'Hot Pink', gradient: ['#FF1744', '#F50057'] },
    { id: 'cotton-candy', name: 'Cotton Candy', gradient: ['#FF80AB', '#FF4081'] },
    { id: 'mint-lime', name: 'Mint Lime', gradient: ['#FFD54F', '#66BB6A'] },
    { id: 'deep-teal', name: 'Deep Teal', gradient: ['#00695C', '#004D40'] },
    { id: 'fire-orange', name: 'Fire Orange', gradient: ['#FF6F00', '#E65100'] },
    { id: 'sky-yellow', name: 'Sky Yellow', gradient: ['#E0F2F1', '#FFF9C4'] },
    { id: 'navy-blue', name: 'Navy Blue', gradient: ['#1565C0', '#0D47A1'] },
    { id: 'slate-purple', name: 'Slate Purple', gradient: ['#546E7A', '#D81B60'] },
    { id: 'coral-orange', name: 'Coral Orange', gradient: ['#FF7043', '#D84315'] },
    { id: 'rose-pink', name: 'Rose Pink', gradient: ['#FF8A80', '#FF80AB'] },
    { id: 'bubblegum', name: 'Bubblegum', gradient: ['#F48FB1', '#F06292'] },
    { id: 'sunset-purple', name: 'Sunset Purple', gradient: ['#BA68C8', '#FF6E40'] },
    { id: 'midnight-blue', name: 'Midnight Blue', gradient: ['#283593', '#1A237E'] },
    { id: 'storm-grey', name: 'Storm Grey', gradient: ['#546E7A', '#37474F'] },
    { id: 'desert-sand', name: 'Desert Sand', gradient: ['#BCAAA4', '#A1887F'] },
];
export default function SettingsPage() {
    const navigate = useNavigate();
    const { manualFadeDuration, autoFadeDuration, volume, rememberLastPlayback, importMetadataMode, duplicateImportBehavior, attachSidecarFiles, lyricsImportMode, setManualFadeDuration, setAutoFadeDuration, setVolume, setRememberLastPlayback, setImportMetadataMode, setDuplicateImportBehavior, setAttachSidecarFiles, setLyricsImportMode, } = usePlayerStore();
    const [selectedPalette, setSelectedPalette] = useState(() => localStorage.getItem('selectedTheme') || 'sunset-fire');
    const [showAllPalettes, setShowAllPalettes] = useState(false);
    const displayedPalettes = showAllPalettes ? colorPalettes : colorPalettes.slice(0, 8);
    useEffect(() => {
        const savedTheme = localStorage.getItem('selectedTheme') || 'sunset-fire';
        const palette = colorPalettes.find((item) => item.id === savedTheme);
        if (palette) {
            document.documentElement.style.setProperty('--gradient-from', palette.gradient[0]);
            document.documentElement.style.setProperty('--gradient-to', palette.gradient[1]);
            document.documentElement.style.setProperty('--color-accent', palette.gradient[0]);
        }
    }, []);
    const handlePaletteSelect = (paletteId) => {
        setSelectedPalette(paletteId);
        const palette = colorPalettes.find((item) => item.id === paletteId);
        if (!palette)
            return;
        document.documentElement.style.setProperty('--gradient-from', palette.gradient[0]);
        document.documentElement.style.setProperty('--gradient-to', palette.gradient[1]);
        document.documentElement.style.setProperty('--color-accent', palette.gradient[0]);
        localStorage.setItem('selectedTheme', paletteId);
        toast.success(`Theme changed to ${palette.name}`);
    };
    const handleClearDataCache = async () => {
        const confirmed = window.confirm('Clear all offline music, playlists, play history, and saved app preferences from this browser?');
        if (!confirmed)
            return;
        try {
            await localDb.deleteDatabase();
            Object.keys(localStorage).forEach((key) => {
                if (key.startsWith('go_music_') || key === 'selectedTheme' || key === 'manualFadeDuration' || key === 'autoFadeDuration') {
                    localStorage.removeItem(key);
                }
            });
            toast.success('Offline data cache cleared');
            window.setTimeout(() => window.location.reload(), 350);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to clear data cache');
        }
    };
    return (_jsxs("div", { className: "page-enter mx-auto max-w-4xl space-y-6 pb-8", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => navigate(-1), className: "rounded-full bg-glass-card backdrop-blur-xl p-2 text-softText transition hover:text-white", children: _jsx(RiArrowLeftLine, { size: 20 }) }), _jsx("h1", { className: "text-3xl font-bold", children: "Settings" })] }), _jsxs("div", { className: "rounded-2xl border border-white/5 bg-glass-card backdrop-blur-xl p-6", children: [_jsxs("div", { className: "mb-5 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-dimText", children: [_jsx(RiPaletteLine, { size: 16 }), "Theme Color Palettes"] }), !showAllPalettes && (_jsxs("button", { onClick: () => setShowAllPalettes(true), className: "flex items-center gap-1.5 text-xs font-semibold text-softText transition hover:text-white", children: ["Show all", _jsx("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "none", children: _jsx("path", { d: "M6 12L10 8L6 4", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })] }))] }), _jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4", children: displayedPalettes.map((palette) => (_jsxs("button", { onClick: () => handlePaletteSelect(palette.id), className: `group relative overflow-hidden rounded-xl border-2 transition-all ${selectedPalette === palette.id
                                ? 'scale-105 border-white shadow-lg'
                                : 'border-white/10 hover:border-white/30 hover:scale-102'}`, children: [_jsxs("div", { className: "flex h-24 flex-col", children: [_jsx("div", { className: "flex-1", style: { background: `linear-gradient(135deg, ${palette.gradient[0]}, ${palette.gradient[1]})` } }), _jsx("div", { className: "bg-black/80 px-2 py-1.5 text-center backdrop-blur", children: _jsx("div", { className: "text-[10px] font-semibold text-white", children: palette.name }) })] }), selectedPalette === palette.id && (_jsx("div", { className: "absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-lg", children: _jsx(RiCheckLine, { size: 14, className: "text-black" }) }))] }, palette.id))) }), showAllPalettes && (_jsx("button", { onClick: () => setShowAllPalettes(false), className: "mt-4 w-full rounded-lg bg-white/5 py-2 text-xs font-semibold text-softText transition hover:bg-white/10 hover:text-white", children: "Show less" }))] }), _jsxs("div", { className: "rounded-2xl border border-white/5 bg-glass-card backdrop-blur-xl p-6", children: [_jsxs("div", { className: "mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-dimText", children: [_jsx(RiEqualizerLine, { size: 16 }), "Audio Playback"] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-4 py-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium", children: "Default Volume" }), _jsx("div", { className: "text-xs text-dimText", children: "Saved locally for this device" })] }), _jsxs("div", { className: "flex min-w-[190px] items-center gap-3", children: [_jsx("input", { type: "range", min: "0", max: "100", value: volume, onChange: (event) => setVolume(parseInt(event.target.value, 10)), className: "w-full accent-accent" }), _jsxs("span", { className: "w-10 text-right text-sm font-semibold text-white", children: [volume, "%"] })] })] }), _jsxs("div", { className: "flex items-center justify-between gap-4 py-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium", children: "Manual Skip Fade" }), _jsx("div", { className: "text-xs text-dimText", children: "Crossfade when manually changing tracks" })] }), _jsxs("select", { className: "rounded-lg bg-glass px-3 py-1.5 text-sm text-white outline-none transition hover:bg-surface-light", value: manualFadeDuration.toString(), onChange: (event) => {
                                            const value = parseInt(event.target.value, 10);
                                            setManualFadeDuration(value);
                                            toast.success(value === 0 ? 'Manual fade disabled' : `Manual fade set to ${value}s`);
                                        }, children: [_jsx("option", { value: "0", children: "Off" }), _jsx("option", { value: "1", children: "1 second" }), _jsx("option", { value: "2", children: "2 seconds" }), _jsx("option", { value: "3", children: "3 seconds" })] })] }), _jsxs("div", { className: "flex items-center justify-between gap-4 py-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium", children: "Crossfade Song Transitions" }), _jsx("div", { className: "text-xs text-dimText", children: "Blend the next song in before the current one ends" })] }), _jsxs("select", { className: "rounded-lg bg-glass px-3 py-1.5 text-sm text-white outline-none transition hover:bg-surface-light", value: autoFadeDuration.toString(), onChange: (event) => {
                                            const value = parseInt(event.target.value, 10);
                                            setAutoFadeDuration(value);
                                            toast.success(value === 0 ? 'Song crossfade disabled' : `Song crossfade set to ${value}s`);
                                        }, children: [_jsx("option", { value: "0", children: "Off" }), _jsx("option", { value: "8", children: "8 seconds" }), _jsx("option", { value: "10", children: "10 seconds" }), _jsx("option", { value: "12", children: "12 seconds" }), _jsx("option", { value: "15", children: "15 seconds" }), _jsx("option", { value: "18", children: "18 seconds" }), _jsx("option", { value: "21", children: "21 seconds" })] })] }), _jsxs("div", { className: "flex items-center justify-between gap-4 py-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium", children: "Remember Last Playback" }), _jsx("div", { className: "text-xs text-dimText", children: "Restore the last local track after reopening Auralyx" })] }), _jsx(Toggle, { checked: rememberLastPlayback, onChange: () => {
                                            const nextValue = !rememberLastPlayback;
                                            setRememberLastPlayback(nextValue);
                                            toast.success(nextValue ? 'Last playback restore enabled' : 'Last playback restore disabled');
                                        } })] })] })] }), _jsxs("div", { className: "rounded-2xl border border-white/5 bg-glass-card backdrop-blur-xl p-6", children: [_jsxs("div", { className: "mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-dimText", children: [_jsx(RiDownloadCloud2Line, { size: 16 }), "Import Behavior"] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-4 py-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium", children: "Metadata Source" }), _jsx("div", { className: "text-xs text-dimText", children: "Controls title, artist, album, genre, and year for new imports" })] }), _jsxs("select", { className: "rounded-lg bg-glass px-3 py-1.5 text-sm text-white outline-none transition hover:bg-surface-light", value: importMetadataMode, onChange: (event) => {
                                            setImportMetadataMode(event.target.value);
                                            toast.success('Import metadata behavior updated');
                                        }, children: [_jsx("option", { value: "embedded-first", children: "Embedded tags first" }), _jsx("option", { value: "filename-first", children: "Filename pattern first" }), _jsx("option", { value: "filename-only", children: "Filename pattern only" })] })] }), _jsxs("div", { className: "flex items-center justify-between gap-4 py-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium", children: "Duplicate Files" }), _jsx("div", { className: "text-xs text-dimText", children: "Choose whether matching audio files are ignored or imported again" })] }), _jsxs("select", { className: "rounded-lg bg-glass px-3 py-1.5 text-sm text-white outline-none transition hover:bg-surface-light", value: duplicateImportBehavior, onChange: (event) => {
                                            const value = event.target.value;
                                            setDuplicateImportBehavior(value);
                                            toast.success(value === 'skip' ? 'Duplicate skipping enabled' : 'Duplicate imports allowed');
                                        }, children: [_jsx("option", { value: "skip", children: "Skip duplicates" }), _jsx("option", { value: "allow", children: "Allow duplicates" })] })] }), _jsxs("div", { className: "flex items-center justify-between gap-4 py-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium", children: "Attach Folder Covers and LRC" }), _jsx("div", { className: "text-xs text-dimText", children: "Use matching cover images and .lrc files during folder import" })] }), _jsx(Toggle, { checked: attachSidecarFiles, onChange: () => {
                                            const nextValue = !attachSidecarFiles;
                                            setAttachSidecarFiles(nextValue);
                                            toast.success(nextValue ? 'Sidecar files enabled' : 'Sidecar files disabled');
                                        } })] }), _jsxs("div", { className: "flex items-center justify-between gap-4 py-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium", children: "Lyrics Mode" }), _jsx("div", { className: "text-xs text-dimText", children: "Embedded lyrics are read from the audio file metadata automatically" })] }), _jsxs("select", { className: "rounded-lg bg-glass px-3 py-1.5 text-sm text-white outline-none transition hover:bg-surface-light", value: lyricsImportMode, onChange: (event) => {
                                            const value = event.target.value;
                                            setLyricsImportMode(value);
                                            toast.success(value === 'embedded' ? 'Embedded lyrics mode enabled' : 'Separate .lrc lyrics mode enabled');
                                        }, children: [_jsx("option", { value: "embedded", children: "Embedded in file" }), _jsx("option", { value: "sidecar", children: "Separate .lrc file" })] })] })] })] }), _jsxs("div", { className: "rounded-2xl border border-red-500/20 bg-red-500/10 p-6", children: [_jsxs("div", { className: "mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-200", children: [_jsx(RiDeleteBin6Line, { size: 16 }), "Data Cache"] }), _jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-white", children: "Clear Offline Data Cache" }), _jsx("div", { className: "text-xs text-red-100/70", children: "Removes local tracks, playlists, playback history, and saved app settings from this browser." })] }), _jsx("button", { type: "button", onClick: handleClearDataCache, className: "rounded-lg border border-red-300/30 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-50 transition hover:bg-red-500/30", children: "Clear Data" })] })] }), _jsx("div", { className: "pb-4 text-center text-xs text-dimText", children: "Auralyx v1.0.0 - Offline First" })] }));
}
function Toggle({ checked, onChange }) {
    return (_jsx("button", { type: "button", onClick: onChange, className: `relative h-7 w-12 rounded-full border transition ${checked ? 'border-accent bg-accent/40' : 'border-white/10 bg-white/10'}`, "aria-pressed": checked, children: _jsx("span", { className: `absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}` }) }));
}
