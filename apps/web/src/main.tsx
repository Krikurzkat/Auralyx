import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import PlaylistPage from './pages/PlaylistPage';
import AlbumPage from './pages/AlbumPage';
import ArtistPage from './pages/ArtistPage';
import PodcastPage from './pages/PodcastPage';
import SettingsPage from './pages/SettingsPage';
import LikedSongsPage from './pages/LikedSongsPage';
import LocalLibraryPage from './pages/LocalLibraryPage';
import RecentlyPlayedPage from './pages/RecentlyPlayedPage';
import ListeningHistoryPage from './pages/ListeningHistoryPage';
import QueuePage from './pages/QueuePage';
import GlobalInteractionEffects from './components/motion/GlobalInteractionEffects';
import './index.css';

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger, CustomEase);

// Initialize theme from localStorage on app start
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('selectedTheme') || 'sunset-fire';
  
  const colorPalettes = [
    // Row 1
    { id: 'sunset-fire', gradient: ['#FF6B35', '#8B1538'] },
    { id: 'ocean-deep', gradient: ['#1E88E5', '#6A1B9A'] },
    { id: 'twilight-sky', gradient: ['#90CAF9', '#E1BEE7'] },
    { id: 'pink-sunrise', gradient: ['#EC407A', '#FDD835'] },
    { id: 'azure-blue', gradient: ['#1976D2', '#42A5F5'] },
    { id: 'coral-reef', gradient: ['#26C6DA', '#FF8A65'] },
    { id: 'golden-hour', gradient: ['#26C6DA', '#FFD54F'] },
    { id: 'tropical-sunset', gradient: ['#66BB6A', '#FF7043'] },
    
    // Row 2
    { id: 'purple-haze', gradient: ['#7E57C2', '#FF8A65'] },
    { id: 'lavender-dream', gradient: ['#CE93D8', '#F48FB1'] },
    { id: 'royal-purple', gradient: ['#5E35B1', '#512DA8'] },
    { id: 'violet-mist', gradient: ['#9575CD', '#B39DDB'] },
    { id: 'magenta-pink', gradient: ['#EC407A', '#AB47BC'] },
    { id: 'electric-blue', gradient: ['#42A5F5', '#5C6BC0'] },
    { id: 'lime-fresh', gradient: ['#9CCC65', '#26C6DA'] },
    { id: 'teal-ocean', gradient: ['#26A69A', '#00897B'] },
    
    // Row 3
    { id: 'peach-cream', gradient: ['#FFCCBC', '#FFAB91'] },
    { id: 'hot-pink', gradient: ['#FF1744', '#F50057'] },
    { id: 'cotton-candy', gradient: ['#FF80AB', '#FF4081'] },
    { id: 'mint-lime', gradient: ['#FFD54F', '#66BB6A'] },
    { id: 'deep-teal', gradient: ['#00695C', '#004D40'] },
    { id: 'fire-orange', gradient: ['#FF6F00', '#E65100'] },
    { id: 'sky-yellow', gradient: ['#E0F2F1', '#FFF9C4'] },
    { id: 'navy-blue', gradient: ['#1565C0', '#0D47A1'] },
    
    // Row 4
    { id: 'slate-purple', gradient: ['#546E7A', '#D81B60'] },
    { id: 'coral-orange', gradient: ['#FF7043', '#D84315'] },
    { id: 'rose-pink', gradient: ['#FF8A80', '#FF80AB'] },
    { id: 'bubblegum', gradient: ['#F48FB1', '#F06292'] },
    { id: 'sunset-purple', gradient: ['#BA68C8', '#FF6E40'] },
    { id: 'midnight-blue', gradient: ['#283593', '#1A237E'] },
    { id: 'storm-grey', gradient: ['#546E7A', '#37474F'] },
    { id: 'desert-sand', gradient: ['#BCAAA4', '#A1887F'] },
  ];
  
  const palette = colorPalettes.find(p => p.id === savedTheme);
  if (palette) {
    document.documentElement.style.setProperty('--gradient-from', palette.gradient[0]);
    document.documentElement.style.setProperty('--gradient-to', palette.gradient[1]);
    document.documentElement.style.setProperty('--color-accent', palette.gradient[0]);
  }
};

initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#ffffff',
          },
        }}
      />
      <GlobalInteractionEffects>
        <Routes>
          <Route path="/login" element={<Navigate to="/local" replace />} />
          <Route path="/signup" element={<Navigate to="/local" replace />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/album/:id" element={<AlbumPage />} />
            <Route path="/artist/:id" element={<ArtistPage />} />
            <Route path="/podcast/:id" element={<PodcastPage />} />
            <Route path="/podcasts" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<Navigate to="/settings" replace />} />
            <Route path="/liked" element={<LikedSongsPage />} />
            <Route path="/local" element={<LocalLibraryPage />} />
            <Route path="/recently-played" element={<RecentlyPlayedPage />} />
            <Route path="/listening-history" element={<ListeningHistoryPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/upgrade" element={<Navigate to="/settings" replace />} />
            <Route path="/admin" element={<Navigate to="/local" replace />} />
            <Route path="*" element={<Navigate to="/local" replace />} />
          </Route>
        </Routes>
      </GlobalInteractionEffects>
    </BrowserRouter>
  </React.StrictMode>
);
