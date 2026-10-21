import { useEffect, useState } from 'react';
import {
  RiArrowLeftLine,
  RiCheckLine,
  RiDownloadCloud2Line,
  RiEqualizerLine,
  RiDeleteBin6Line,
  RiPaletteLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import {
  usePlayerStore,
  type DuplicateImportBehavior,
  type ImportMetadataMode,
  type LyricsDisplayMode,
  type LyricsImportMode,
} from '../stores/playerStore';
import { localDb } from '../services/localDb';
import { shallow } from 'zustand/shallow';
import { applyThemeGradient, createRandomThemeGradient, getSavedRandomThemeGradient, saveRandomThemeGradient } from '../utils/themePalettes';

interface ColorPalette {
  id: string;
  name: string;
  gradient: [string, string];
}

const colorPalettes: ColorPalette[] = [
  { id: 'random', name: 'Random', gradient: ['#A855F7', '#FB7185'] },
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
  const { reduceMotion, toggleReduceMotion } = useUIStore();
  const {
    manualFadeDuration,
    autoFadeDuration,
    volume,
    rememberLastPlayback,
    importMetadataMode,
    duplicateImportBehavior,
    attachSidecarFiles,
    lyricsImportMode,
    lyricsDisplayMode,
    setManualFadeDuration,
    setAutoFadeDuration,
    setVolume,
    setRememberLastPlayback,
    setImportMetadataMode,
    setDuplicateImportBehavior,
    setAttachSidecarFiles,
    setLyricsImportMode,
    setLyricsDisplayMode,
  } = usePlayerStore((state) => ({
    manualFadeDuration: state.manualFadeDuration,
    autoFadeDuration: state.autoFadeDuration,
    volume: state.volume,
    rememberLastPlayback: state.rememberLastPlayback,
    importMetadataMode: state.importMetadataMode,
    duplicateImportBehavior: state.duplicateImportBehavior,
    attachSidecarFiles: state.attachSidecarFiles,
    lyricsImportMode: state.lyricsImportMode,
    lyricsDisplayMode: state.lyricsDisplayMode,
    setManualFadeDuration: state.setManualFadeDuration,
    setAutoFadeDuration: state.setAutoFadeDuration,
    setVolume: state.setVolume,
    setRememberLastPlayback: state.setRememberLastPlayback,
    setImportMetadataMode: state.setImportMetadataMode,
    setDuplicateImportBehavior: state.setDuplicateImportBehavior,
    setAttachSidecarFiles: state.setAttachSidecarFiles,
    setLyricsImportMode: state.setLyricsImportMode,
    setLyricsDisplayMode: state.setLyricsDisplayMode,
  }), shallow);
  const [selectedPalette, setSelectedPalette] = useState(() => localStorage.getItem('selectedTheme') || 'sunset-fire');
  const [randomGradient, setRandomGradient] = useState(() => getSavedRandomThemeGradient() || colorPalettes[0].gradient);
  const [showAllPalettes, setShowAllPalettes] = useState(false);

  const displayedPalettes = showAllPalettes ? colorPalettes : colorPalettes.slice(0, 8);

  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedTheme') || 'sunset-fire';
    const palette = colorPalettes.find((item) => item.id === savedTheme);
    if (savedTheme === 'random') {
      const gradient = getSavedRandomThemeGradient() || createRandomThemeGradient();
      setRandomGradient(gradient);
      saveRandomThemeGradient(gradient);
      applyThemeGradient(gradient);
    } else if (palette) {
      applyThemeGradient(palette.gradient);
    }
  }, []);

  const handlePaletteSelect = (paletteId: string) => {
    setSelectedPalette(paletteId);
    const palette = colorPalettes.find((item) => item.id === paletteId);
    if (!palette) return;

    if (paletteId === 'random') {
      const gradient = createRandomThemeGradient();
      setRandomGradient(gradient);
      saveRandomThemeGradient(gradient);
      applyThemeGradient(gradient);
    } else {
      applyThemeGradient(palette.gradient);
    }
    localStorage.setItem('selectedTheme', paletteId);
    toast.success(`Theme changed to ${palette.name}`);
  };

  const handleClearDataCache = async () => {
    const confirmed = window.confirm('Clear all offline music, playlists, play history, and saved app preferences from this browser?');
    if (!confirmed) return;

    try {
      await localDb.deleteDatabase();
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('go_music_') || key === 'selectedTheme' || key === 'selectedThemeColors' || key === 'manualFadeDuration' || key === 'autoFadeDuration') {
          localStorage.removeItem(key);
        }
      });
      toast.success('Offline data cache cleared');
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear data cache');
    }
  };

  return (
    <div className="page-enter mx-auto max-w-4xl space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full bg-glass-card backdrop-blur-xl p-2 text-softText transition hover:text-white">
          <RiArrowLeftLine size={20} />
        </button>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="rounded-2xl border border-white/5 bg-glass-card backdrop-blur-xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-dimText">
            <RiPaletteLine size={16} />
            Theme Color Palettes
          </div>
          {!showAllPalettes && (
            <button
              onClick={() => setShowAllPalettes(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-softText transition hover:text-white"
            >
              Show all
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {displayedPalettes.map((item) => {
            const palette = item.id === 'random' ? { ...item, gradient: randomGradient } : item;
            return (
              <button
                key={palette.id}
                onClick={() => handlePaletteSelect(palette.id)}
                className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                  selectedPalette === palette.id
                    ? 'scale-105 border-white shadow-lg'
                    : 'border-white/10 hover:border-white/30 hover:scale-102'
                }`}
              >
                <div className="flex h-24 flex-col">
                  <div className="flex-1" style={{ background: `linear-gradient(135deg, ${palette.gradient[0]}, ${palette.gradient[1]})` }} />
                  <div className="bg-black/80 px-2 py-1.5 text-center backdrop-blur">
                    <div className="text-[10px] font-semibold text-white">{palette.name}</div>
                  </div>
                </div>
                {selectedPalette === palette.id && (
                  <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-lg">
                    <RiCheckLine size={14} className="text-black" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {showAllPalettes && (
          <button
            onClick={() => setShowAllPalettes(false)}
            className="mt-4 w-full rounded-lg bg-white/5 py-2 text-xs font-semibold text-softText transition hover:bg-white/10 hover:text-white"
          >
            Show less
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-white/5 bg-glass-card p-6 backdrop-blur-xl">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-dimText">
          <RiEqualizerLine size={16} />
          Lyrics Display
        </div>
        <p className="mb-5 text-xs text-dimText">
          Choose how synced lyrics look in the desktop Fullscreen Player and Drive Mode. Phones and tablets keep their current layout.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([
            ['vertical', 'Vertical Focus', 'Stacked lines, with the current lyric centered and the edges softly blurred.'],
            ['karaoke', 'Karaoke Lines', 'The active lyric gets a theme-colored glow as each timed line arrives.'],
            ['spotlight', 'Spotlight', 'Shows one synced lyric at a time in a large, uncluttered view.'],
            ['clean', 'Clean Scroll', 'Keeps more lines readable and marks the current line without blur.'],
          ] as const).map(([mode, title, description]) => {
            const selected = lyricsDisplayMode === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setLyricsDisplayMode(mode as LyricsDisplayMode);
                  toast.success(`${title} lyrics mode selected`);
                }}
                className={`rounded-xl border p-4 text-left transition ${selected
                  ? 'border-accent/60 bg-accent/10 shadow-[0_0_24px_rgba(232,71,10,0.12)]'
                  : 'border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]'
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-white">{title}</span>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-accent bg-accent text-white' : 'border-white/25 text-transparent'}`}>
                    {selected && <RiCheckLine size={13} />}
                  </span>
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-dimText">{description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-glass-card backdrop-blur-xl p-6">
        <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-dimText">
          <RiEqualizerLine size={16} />
          Audio Playback
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm font-medium">Default Volume</div>
              <div className="text-xs text-dimText">Saved locally for this device</div>
            </div>
            <div className="flex min-w-[190px] items-center gap-3">
              <input type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(parseInt(event.target.value, 10))} className="w-full accent-accent" />
              <span className="w-10 text-right text-sm font-semibold text-white">{volume}%</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm font-medium">Manual Skip Fade</div>
              <div className="text-xs text-dimText">Crossfade when manually changing tracks</div>
            </div>
            <select
              className="rounded-lg bg-glass px-3 py-1.5 text-sm text-white outline-none transition hover:bg-surface-light"
              value={manualFadeDuration.toString()}
              onChange={(event) => {
                const value = parseInt(event.target.value, 10);
                setManualFadeDuration(value);
                toast.success(value === 0 ? 'Manual fade disabled' : `Manual fade set to ${value}s`);
              }}
            >
              <option value="0">Off</option>
              <option value="1">1 second</option>
              <option value="2">2 seconds</option>
              <option value="3">3 seconds</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm font-medium">Crossfade Song Transitions</div>
              <div className="text-xs text-dimText">Blend the next song in before the current one ends</div>
            </div>
            <select
              className="rounded-lg bg-glass px-3 py-1.5 text-sm text-white outline-none transition hover:bg-surface-light"
              value={autoFadeDuration.toString()}
              onChange={(event) => {
                const value = parseInt(event.target.value, 10);
                setAutoFadeDuration(value);
                toast.success(value === 0 ? 'Song crossfade disabled' : `Song crossfade set to ${value}s`);
              }}
            >
              <option value="0">Off</option>
              <option value="8">8 seconds</option>
              <option value="10">10 seconds</option>
              <option value="12">12 seconds</option>
              <option value="15">15 seconds</option>
              <option value="18">18 seconds</option>
              <option value="21">21 seconds</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm font-medium">Remember Last Playback</div>
              <div className="text-xs text-dimText">Restore the last local track after reopening Auralyx</div>
            </div>
            <Toggle
              checked={rememberLastPlayback}
              label="Remember Last Playback"
              onChange={() => {
                const nextValue = !rememberLastPlayback;
                setRememberLastPlayback(nextValue);
                toast.success(nextValue ? 'Last playback restore enabled' : 'Last playback restore disabled');
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-glass-card backdrop-blur-xl p-6">
        <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-dimText">
          <RiDownloadCloud2Line size={16} />
          Import Behavior
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm font-medium">Metadata Source</div>
              <div className="text-xs text-dimText">Controls title, artist, album, genre, and year for new imports</div>
            </div>
            <select
              className="rounded-lg bg-glass px-3 py-1.5 text-sm text-white outline-none transition hover:bg-surface-light"
              value={importMetadataMode}
              onChange={(event) => {
                setImportMetadataMode(event.target.value as ImportMetadataMode);
                toast.success('Import metadata behavior updated');
              }}
            >
              <option value="embedded-first">Embedded tags first</option>
              <option value="filename-first">Filename pattern first</option>
              <option value="filename-only">Filename pattern only</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm font-medium">Duplicate Files</div>
              <div className="text-xs text-dimText">Choose whether matching audio files are ignored or imported again</div>
            </div>
            <select
              className="rounded-lg bg-glass px-3 py-1.5 text-sm text-white outline-none transition hover:bg-surface-light"
              value={duplicateImportBehavior}
              onChange={(event) => {
                const value = event.target.value as DuplicateImportBehavior;
                setDuplicateImportBehavior(value);
                toast.success(value === 'skip' ? 'Duplicate skipping enabled' : 'Duplicate imports allowed');
              }}
            >
              <option value="skip">Skip duplicates</option>
              <option value="allow">Allow duplicates</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm font-medium">Attach Folder Covers and LRC</div>
              <div className="text-xs text-dimText">Use matching cover images and .lrc files during folder import</div>
            </div>
            <Toggle
              checked={attachSidecarFiles}
              label="Attach Folder Covers and LRC"
              onChange={() => {
                const nextValue = !attachSidecarFiles;
                setAttachSidecarFiles(nextValue);
                toast.success(nextValue ? 'Sidecar files enabled' : 'Sidecar files disabled');
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <div className="text-sm font-medium">Lyrics Mode</div>
              <div className="text-xs text-dimText">Embedded lyrics are read from the audio file metadata automatically</div>
            </div>
            <select
              className="rounded-lg bg-glass px-3 py-1.5 text-sm text-white outline-none transition hover:bg-surface-light"
              value={lyricsImportMode}
              onChange={(event) => {
                const value = event.target.value as LyricsImportMode;
                setLyricsImportMode(value);
                toast.success(value === 'embedded' ? 'Embedded lyrics mode enabled' : 'Separate .lrc lyrics mode enabled');
              }}
            >
              <option value="embedded">Embedded in file</option>
              <option value="sidecar">Separate .lrc file</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-glass-card p-6 backdrop-blur-xl">
        <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-dimText">
          <RiEqualizerLine size={16} />
          Accessibility
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <div className="text-sm font-medium">Reduce Motion (3D)</div>
            <div className="text-xs text-dimText">Limits decorative motion and visual effects to save battery.</div>
          </div>
          <Toggle
            checked={reduceMotion}
            label="Reduce Motion (3D)"
            onChange={toggleReduceMotion}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-200">
          <RiDeleteBin6Line size={16} />
          Data Cache
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-white">Clear Offline Data Cache</div>
            <div className="text-xs text-red-100/70">Removes local tracks, playlists, playback history, and saved app settings from this browser.</div>
          </div>
          <button
            type="button"
            onClick={handleClearDataCache}
            className="rounded-lg border border-red-300/30 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-50 transition hover:bg-red-500/30"
          >
            Clear Data
          </button>
        </div>
      </div>

      <div className="pb-4 text-center text-xs text-dimText">Auralyx v1.0.0 - Offline First</div>
    </div>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-label={label}
      aria-checked={checked}
      className={`relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full border-2 p-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        checked
          ? 'border-accent bg-accent shadow-[inset_0_1px_3px_rgba(0,0,0,0.22)]'
          : 'border-white/35 bg-white/15 hover:bg-white/20'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.45)] ring-1 ring-black/10 transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
