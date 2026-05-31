import { useEffect, useState } from 'react';
import {
  RiArrowLeftLine,
  RiCheckLine,
  RiDownloadCloud2Line,
  RiEqualizerLine,
  RiDeleteBin6Line,
  RiFileMusicLine,
  RiPaletteLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  usePlayerStore,
  type DuplicateImportBehavior,
  type ImportMetadataMode,
  type LyricsImportMode,
  type LyricsTransitionMode,
} from '../stores/playerStore';
import { localDb } from '../services/localDb';

interface ColorPalette {
  id: string;
  name: string;
  gradient: [string, string];
}

const colorPalettes: ColorPalette[] = [
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

const lyricTransitions: Array<[LyricsTransitionMode, string, string]> = [
  ['smooth', 'Smooth Focus', 'Current floating lyric motion'],
  ['fade', 'Soft Fade', 'Gentle opacity shift between lines'],
  ['slide', 'Slide Lift', 'Clearer vertical movement'],
  ['instant', 'Instant', 'Minimal motion for direct reading'],
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    manualFadeDuration,
    autoFadeDuration,
    volume,
    rememberLastPlayback,
    importMetadataMode,
    duplicateImportBehavior,
    attachSidecarFiles,
    lyricsImportMode,
    lyricsTransition,
    setManualFadeDuration,
    setAutoFadeDuration,
    setVolume,
    setRememberLastPlayback,
    setImportMetadataMode,
    setDuplicateImportBehavior,
    setAttachSidecarFiles,
    setLyricsImportMode,
    setLyricsTransition,
  } = usePlayerStore();
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

  const handlePaletteSelect = (paletteId: string) => {
    setSelectedPalette(paletteId);
    const palette = colorPalettes.find((item) => item.id === paletteId);
    if (!palette) return;

    document.documentElement.style.setProperty('--gradient-from', palette.gradient[0]);
    document.documentElement.style.setProperty('--gradient-to', palette.gradient[1]);
    document.documentElement.style.setProperty('--color-accent', palette.gradient[0]);
    localStorage.setItem('selectedTheme', paletteId);
    toast.success(`Theme changed to ${palette.name}`);
  };

  const handleClearDataCache = async () => {
    const confirmed = window.confirm('Clear all offline music, playlists, play history, and saved app preferences from this browser?');
    if (!confirmed) return;

    try {
      await localDb.deleteDatabase();
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('go_music_') || key === 'selectedTheme' || key === 'manualFadeDuration' || key === 'autoFadeDuration') {
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
          {displayedPalettes.map((palette) => (
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
          ))}
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

      <div className="rounded-2xl border border-white/5 bg-glass-card backdrop-blur-xl p-6">
        <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-dimText">
          <RiFileMusicLine size={16} />
          Lyrics Transitions
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {lyricTransitions.map(([mode, label, description]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setLyricsTransition(mode);
                toast.success(`${label} lyrics transition selected`);
              }}
              className={`rounded-xl border p-4 text-left transition ${
                lyricsTransition === mode
                  ? 'border-accent bg-accent/15 text-white'
                  : 'border-white/10 bg-white/[0.03] text-softText hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{label}</span>
                {lyricsTransition === mode && <RiCheckLine size={18} className="text-accent" />}
              </div>
              <div className="text-xs text-dimText">{description}</div>
            </button>
          ))}
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-7 w-12 rounded-full border transition ${checked ? 'border-accent bg-accent/40' : 'border-white/10 bg-white/10'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}
