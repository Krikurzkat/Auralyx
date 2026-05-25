import { useState } from 'react';
import { RiArrowLeftLine, RiPaletteLine, RiEqualizerLine, RiCheckLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import toast from 'react-hot-toast';

interface ColorPalette {
  id: string;
  name: string;
  gradient: [string, string]; // [from, to] for gradient
}

const colorPalettes: ColorPalette[] = [
  { id: 'cyan-blue', name: 'Cyan Blue', gradient: ['#06B6D4', '#3B82F6'] },
  { id: 'blue-purple', name: 'Blue Purple', gradient: ['#3B82F6', '#8B5CF6'] },
  { id: 'cyan-teal', name: 'Cyan Teal', gradient: ['#22D3EE', '#14B8A6'] },
  { id: 'lime-green', name: 'Lime Green', gradient: ['#BEF264', '#4ADE80'] },
  { id: 'yellow-orange', name: 'Yellow Orange', gradient: ['#FDE047', '#FB923C'] },
  { id: 'orange-red', name: 'Orange Red', gradient: ['#FB923C', '#F87171'] },
  { id: 'red-rose', name: 'Red Rose', gradient: ['#F87171', '#FB7185'] },
  { id: 'pink-rose', name: 'Pink Rose', gradient: ['#F472B6', '#FB7185'] },
  { id: 'purple-pink', name: 'Purple Pink', gradient: ['#A855F7', '#EC4899'] },
  { id: 'red-purple', name: 'Red Purple', gradient: ['#EF4444', '#8B5CF6'] },
  { id: 'purple-blue', name: 'Purple Blue', gradient: ['#8B5CF6', '#3B82F6'] },
  { id: 'blue-cyan', name: 'Blue Cyan', gradient: ['#0EA5E9', '#06B6D4'] },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { manualFadeDuration, autoFadeDuration, setManualFadeDuration, setAutoFadeDuration } = usePlayerStore();
  
  // Load saved theme or default to cyan-blue
  const [selectedPalette, setSelectedPalette] = useState(() => {
    return localStorage.getItem('selectedTheme') || 'cyan-blue';
  });
  
  const [showAllPalettes, setShowAllPalettes] = useState(false);

  const displayedPalettes = showAllPalettes ? colorPalettes : colorPalettes.slice(0, 6);

  // Apply saved theme on mount
  useState(() => {
    const savedTheme = localStorage.getItem('selectedTheme') || 'cyan-blue';
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
