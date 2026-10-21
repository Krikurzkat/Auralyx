export type ThemeGradient = [string, string];

const RANDOM_THEME_KEY = 'selectedThemeColors';

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = hue / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const [r, g, b] = section < 1 ? [chroma, x, 0]
    : section < 2 ? [x, chroma, 0]
      : section < 3 ? [0, chroma, x]
        : section < 4 ? [0, x, chroma]
          : section < 5 ? [x, 0, chroma]
            : [chroma, 0, x];
  const offset = l - chroma / 2;
  return `#${[r, g, b].map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function createRandomThemeGradient(): ThemeGradient {
  const hue = Math.floor(Math.random() * 360);
  const hueShift = 28 + Math.floor(Math.random() * 45);
  return [hslToHex(hue, 78, 58), hslToHex((hue + hueShift) % 360, 72, 40)];
}

export function getSavedRandomThemeGradient(): ThemeGradient | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RANDOM_THEME_KEY) || 'null');
    if (Array.isArray(parsed) && parsed.length === 2 && parsed.every((color) => typeof color === 'string' && /^#[\da-f]{6}$/i.test(color))) {
      return parsed as ThemeGradient;
    }
  } catch {
    // Ignore invalid local theme data and allow a fresh random pair to be made.
  }
  return null;
}

export function saveRandomThemeGradient(gradient: ThemeGradient) {
  localStorage.setItem(RANDOM_THEME_KEY, JSON.stringify(gradient));
}

export function applyThemeGradient(gradient: ThemeGradient) {
  document.documentElement.style.setProperty('--gradient-from', gradient[0]);
  document.documentElement.style.setProperty('--gradient-to', gradient[1]);
  document.documentElement.style.setProperty('--color-accent', gradient[0]);
}
