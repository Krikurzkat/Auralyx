import { useState } from 'react';
import { RiArrowLeftLine, RiPaletteLine, RiEqualizerLine, RiCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import toast from 'react-hot-toast';

interface ColorPalette {
  id: string;
  name: string;
  colors: [string, string, string]; // [primary, secondary, accent]
}

const colorPalettes: ColorPalette[] = [
  { id: 'sunset', name: 'Sunset Blaze', colors: ['#E8470A', '#FF6B35', '#F7931E'] },
  { id: 'ocean', name: 'Ocean Deep', colors: ['#0077BE', '#00A8E8', '#00C9FF'] },
  { id: 'forest', name: 'Forest Green', colors: ['#2D5016', '#4A7C2C', '#6BA547'] },
  { id: 'purple', name: 'Purple Haze', colors: ['#6B2D8F', '#8E44AD', '#A569BD'] },
  { id: 'rose', name: 'Rose Garden', colors: ['#C2185B', '#E91E63', '#F06292'] },
  { id: 'amber', name: 'Amber Glow', colors: ['#E65100', '#FF6F00', '#FF9800'] },
  { id: 'teal', name: 'Teal Wave', colors: ['#00695C', '#00897B', '#26A69A'] },
  { id: 'crimson', name: 'Crimson Fire', colors: ['#B71C1C', '#D32F2F', '#E57373'] },
  { id: 'indigo', name: 'Indigo Night', colors: ['#283593', '#3F51B5', '#5C6BC0'] },
  { id: 'lime', name: 'Lime Burst', colors: ['#827717', '#AFB42B', '#CDDC39'] },
  { id: 'cyan', name: 'Cyan Sky', colors: ['#00838F', '#00ACC1', '#26C6DA'] },
  { id: 'magenta', name: 'Magenta Dream', colors: ['#AD1457', '#C2185B', '#E91E63'] },
  { id: 'gold', name: 'Golden Hour', colors: ['#F57F17', '#FBC02D', '#FFEB3B'] },
  { id: 'emerald', name: 'Emerald City', colors: ['#1B5E20', '#388E3C', '#66BB6A'] },
  { id: 'sapphire', name: 'Sapphire Blue', colors: ['#0D47A1', '#1976D2', '#42A5F5'] },
  { id: 'ruby', name: 'Ruby Red', colors: ['#880E4F', '#C2185B', '#EC407A'] },
  { id: 'coral', name: 'Coral Reef', colors: ['#D84315', '#FF5722', '#FF8A65'] },
  { id: 'mint', name: 'Mint Fresh', colors: ['#00695C', '#009688', '#4DB6AC'] },
  { id: 'lavender', name: 'Lavender Fields', colors: ['#512DA8', '#673AB7', '#9575CD'] },
  { id: 'bronze', name: 'Bronze Age', colors: ['#5D4037', '#795548', '#A1887F'] },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { manualFadeDuration, autoFadeDuration, setManualFadeDuration, setAutoFadeDuration } = usePlayerStore();
  const [selectedPalette, setSelectedPalette] = useState('sunset');
  const [showAllPalettes, setShowAllPalettes] = useState(false);

  const displayedPalettes = showAllPalettes ? colorPalettes : colorPalettes.slice(0, 4);

  const handlePaletteSelect = (paletteId: string) => {
    setSelectedPalette(paletteId);
    const palette = colorPalettes.find(p => p.id === paletteId);
    if (palette) {
      // Update CSS variables for theme colors
      document.documentElement.style.setProperty('--color-accent', palette.colors[0]);
      document.documentElement.style.setProperty('--color-accent-alt', palette.colors[1]);
      document.documentElement.style.setProperty('--color-accent-tertiary', palette.colors[2]);
      
      // Update Tailwind CSS custom properties
      const root = document.documentElement;
      root.style.setProperty('--tw-gradient-from', palette.colors[0]);
      root.style.setProperty('--tw-gradient-to', palette.colors[1]);
      
      toast.success(`Theme changed to ${palette.name}`);
    }
  };

  return (
    <div className="page-enter mx-auto max-w-4xl space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full bg-card p-2 text-softText transition hover:text-white">
          <RiArrowLeftLine size={20} />
        </button>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Theme Color Palettes */}
      <div className="rounded-2xl border border-white/5 bg-card p-6">
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
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {displayedPalettes.map(palette => (
            <button
              key={palette.id}
              onClick={() => handlePaletteSelect(palette.id)}
              className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                selectedPalette === palette.id
                  ? 'border-white scale-105 shadow-lg'
                  : 'border-white/10 hover:border-white/30 hover:scale-102'
              }`}
            >
              <div className="flex h-24 flex-col">
                <div className="flex flex-1">
                  <div className="flex-1" style={{ backgroundColor: palette.colors[0] }} />
                  <div className="flex-1" style={{ backgroundColor: palette.colors[1] }} />
                  <div className="flex-1" style={{ backgroundColor: palette.colors[2] }} />
                </div>
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

      {/* Playback Settings */}
      <div className="rounded-2xl border border-white/5 bg-card p-6">
        <div className="mb-5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-dimText">
          <RiEqualizerLine size={16} />
          Playback Settings
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Manual Skip Fade</div>
              <div className="text-xs text-dimText">Crossfade when manually changing tracks</div>
            </div>
            <select 
              className="rounded-lg bg-surface px-3 py-1.5 text-sm text-white outline-none cursor-pointer hover:bg-surface-light transition"
              value={manualFadeDuration.toString()}
              onChange={(e) => {
                const value = parseInt(e.target.value);
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

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium">Crossfade Song Transitions</div>
              <div className="text-xs text-dimText">Blend the next song in before the current one ends</div>
            </div>
            <select 
              className="rounded-lg bg-surface px-3 py-1.5 text-sm text-white outline-none cursor-pointer hover:bg-surface-light transition"
              value={autoFadeDuration.toString()}
              onChange={(e) => {
                const value = parseInt(e.target.value);
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
        </div>
      </div>

      <div className="pb-4 text-center text-xs text-dimText">Total Music v1.0.0 · Offline First</div>
    </div>
  );
}
