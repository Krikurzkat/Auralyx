import { useState } from 'react';
import { RiArrowLeftLine, RiPaletteLine, RiEqualizerLine, RiCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import toast from 'react-hot-toast';
import SpotifyConnect from '../components/SpotifyConnect';

interface ColorPalette {
  id: string;
  name: string;
  gradient: [string, string]; // [from, to] for gradient
}

const colorPalettes: ColorPalette[] = [
  // Row 1
  { id: 'sunset-fire', name: 'Sunset Fire', gradient: ['#FF6B35', '#8B1538'] },
  { id: 'ocean-deep', name: 'Ocean Deep', gradient: ['#1E88E5', '#6A1B9A'] },
  { id: 'twilight-sky', name: 'Twilight Sky', gradient: ['#90CAF9', '#E1BEE7'] },
  { id: 'pink-sunrise', name: 'Pink Sunrise', gradient: ['#EC407A', '#FDD835'] },
  { id: 'azure-blue', name: 'Azure Blue', gradient: ['#1976D2', '#42A5F5'] },
  { id: 'coral-reef', name: 'Coral Reef', gradient: ['#26C6DA', '#FF8A65'] },
  { id: 'golden-hour', name: 'Golden Hour', gradient: ['#26C6DA', '#FFD54F'] },
  { id: 'tropical-sunset', name: 'Tropical Sunset', gradient: ['#66BB6A', '#FF7043'] },
  
  // Row 2
  { id: 'purple-haze', name: 'Purple Haze', gradient: ['#7E57C2', '#FF8A65'] },
  { id: 'lavender-dream', name: 'Lavender Dream', gradient: ['#CE93D8', '#F48FB1'] },
  { id: 'royal-purple', name: 'Royal Purple', gradient: ['#5E35B1', '#512DA8'] },
  { id: 'violet-mist', name: 'Violet Mist', gradient: ['#9575CD', '#B39DDB'] },
  { id: 'magenta-pink', name: 'Magenta Pink', gradient: ['#EC407A', '#AB47BC'] },
  { id: 'electric-blue', name: 'Electric Blue', gradient: ['#42A5F5', '#5C6BC0'] },
  { id: 'lime-fresh', name: 'Lime Fresh', gradient: ['#9CCC65', '#26C6DA'] },
  { id: 'teal-ocean', name: 'Teal Ocean', gradient: ['#26A69A', '#00897B'] },
  
  // Row 3
  { id: 'peach-cream', name: 'Peach Cream', gradient: ['#FFCCBC', '#FFAB91'] },
  { id: 'hot-pink', name: 'Hot Pink', gradient: ['#FF1744', '#F50057'] },
  { id: 'cotton-candy', name: 'Cotton Candy', gradient: ['#FF80AB', '#FF4081'] },
  { id: 'mint-lime', name: 'Mint Lime', gradient: ['#FFD54F', '#66BB6A'] },
  { id: 'deep-teal', name: 'Deep Teal', gradient: ['#00695C', '#004D40'] },
  { id: 'fire-orange', name: 'Fire Orange', gradient: ['#FF6F00', '#E65100'] },
  { id: 'sky-yellow', name: 'Sky Yellow', gradient: ['#E0F2F1', '#FFF9C4'] },
  { id: 'navy-blue', name: 'Navy Blue', gradient: ['#1565C0', '#0D47A1'] },
  
  // Row 4
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
  const { manualFadeDuration, autoFadeDuration, setManualFadeDuration, setAutoFadeDuration } = usePlayerStore();
  
  // Load saved theme or default to sunset-fire
  const [selectedPalette, setSelectedPalette] = useState(() => {
    return localStorage.getItem('selectedTheme') || 'sunset-fire';
  });
  
  const [showAllPalettes, setShowAllPalettes] = useState(false);

  const displayedPalettes = showAllPalettes ? colorPalettes : colorPalettes.slice(0, 8);

  // Apply saved theme on mount
  useState(() => {
    const savedTheme = localStorage.getItem('selectedTheme') || 'sunset-fire';
    const palette = colorPalettes.find(p => p.id === savedTheme);
    if (palette) {
      document.documentElement.style.setProperty('--gradient-from', palette.gradient[0]);
      document.documentElement.style.setProperty('--gradient-to', palette.gradient[1]);
      document.documentElement.style.setProperty('--color-accent', palette.gradient[0]);
    }
  });

  const handlePaletteSelect = (paletteId: string) => {
    setSelectedPalette(paletteId);
    const palette = colorPalettes.find(p => p.id === paletteId);
    if (palette) {
      // Update CSS variables for gradient theme colors
      document.documentElement.style.setProperty('--gradient-from', palette.gradient[0]);
      document.documentElement.style.setProperty('--gradient-to', palette.gradient[1]);
      
      // Update primary accent color (use gradient start as primary)
      document.documentElement.style.setProperty('--color-accent', palette.gradient[0]);
      
      // Store selection in localStorage
      localStorage.setItem('selectedTheme', paletteId);
      
      toast.success(`Theme changed to ${palette.name}`);
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

      {/* Theme Color Palettes */}
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
                <div 
                  className="flex-1"
                  style={{ 
                    background: `linear-gradient(135deg, ${palette.gradient[0]}, ${palette.gradient[1]})` 
                  }} 
                />
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

      {/* Spotify Integration */}
      <SpotifyConnect />

      {/* Playback Settings */}
      <div className="rounded-2xl border border-white/5 bg-glass-card backdrop-blur-xl p-6">
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
              className="rounded-lg bg-glass backdrop-blur-2xl px-3 py-1.5 text-sm text-white outline-none cursor-pointer hover:bg-surface-light transition"
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
              className="rounded-lg bg-glass backdrop-blur-2xl px-3 py-1.5 text-sm text-white outline-none cursor-pointer hover:bg-surface-light transition"
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
