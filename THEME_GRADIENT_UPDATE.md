# Theme Gradient System Update

## Overview
Replaced the fixed orange-based primary color system with a dynamic gradient-based theme system where users can choose from 12 different gradient color schemes.

## Changes Made

### 1. Color Palettes (SettingsPage.tsx)
- **Before**: 20 solid color palettes with 3 colors each (primary, secondary, accent)
- **After**: 12 gradient palettes with 2 colors each (from, to)
- New gradients include:
  - Cyan Blue (default)
  - Blue Purple
  - Cyan Teal
  - Lime Green
  - Yellow Orange
  - Orange Red
  - Red Rose
  - Pink Rose
  - Purple Pink
  - Red Purple
  - Purple Blue
  - Blue Cyan

### 2. CSS Variables (index.css)
- Added `--gradient-from` and `--gradient-to` variables
- Updated `--color-accent` to use `--gradient-from`
- Removed old `--color-accent-alt` system
- Updated `.text-gradient` class to use new variables

### 3. Tailwind Config (tailwind.config.js)
- Added `gradient-from` and `gradient-to` color utilities
- Replaced `bg-go-gradient*` with `bg-theme-gradient*` classes
- Updated default accent color to Cyan Blue (#06B6D4)

### 4. Theme Initialization (main.tsx)
- Added `initializeTheme()` function that runs on app start
- Loads saved theme from localStorage
- Applies gradient colors to CSS variables

### 5. Player Components
- **DrivePlayer.tsx**: Progress bar now uses dynamic gradient
- **VisualizerPlayer.tsx**: Progress bar now uses dynamic gradient
- Changed from `bg-gradient-to-r from-accent to-orange-500` to inline style with CSS variables

### 6. Global Class Replacements
Updated across all components:
- `bg-go-gradient` → `bg-theme-gradient`
- `bg-go-gradient-subtle` → `bg-theme-gradient-subtle`
- `bg-go-gradient-vertical` → `bg-theme-gradient-vertical`
- `bg-go-gradient-hover` → `bg-theme-gradient-hover`
- `accentAlt` → `gradient-to` (for colors)
- `from-accentAlt` → `from-gradient-from`
- `to-accentAlt` → `to-gradient-to`
- `text-accentAlt` → `text-gradient-to`
- `border-accentAlt` → `border-gradient-to`

### 7. Theme Persistence
- Theme selection is saved to localStorage as `selectedTheme`
- Theme is automatically applied on app load
- Theme changes are reflected immediately across all components

## How It Works

1. User selects a gradient theme in Settings
2. CSS variables `--gradient-from` and `--gradient-to` are updated
3. All components using `bg-theme-gradient` or gradient color utilities automatically update
4. Progress bars in players use inline styles with CSS variables for dynamic gradients
5. Selection is persisted in localStorage

## Benefits

- **User Choice**: Users can now customize the app's primary colors
- **Visual Variety**: 12 distinct gradient themes instead of just orange
- **Consistent**: All UI elements update automatically when theme changes
- **Modern**: Gradient-based design is more contemporary than solid colors
- **Persistent**: Theme choice is remembered across sessions

## Files Modified

- `apps/web/src/pages/SettingsPage.tsx`
- `apps/web/src/index.css`
- `apps/web/tailwind.config.js`
- `apps/web/src/main.tsx`
- `apps/web/src/components/player/DrivePlayer.tsx`
- `apps/web/src/components/player/VisualizerPlayer.tsx`
- All page components (HomePage, LibraryPage, SearchPage, etc.)
- All layout components (Sidebar, TopBar, RightPanel)
