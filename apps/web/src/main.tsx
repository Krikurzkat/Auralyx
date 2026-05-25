import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import PlaylistPage from './pages/PlaylistPage';
import AlbumPage from './pages/AlbumPage';
import ArtistPage from './pages/ArtistPage';
import PodcastPage from './pages/PodcastPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import LikedSongsPage from './pages/LikedSongsPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import AdminPage from './pages/AdminPage';
import LocalLibraryPage from './pages/LocalLibraryPage';
import RecentlyPlayedPage from './pages/RecentlyPlayedPage';
import ListeningHistoryPage from './pages/ListeningHistoryPage';
import QueuePage from './pages/QueuePage';
import { useAuthStore } from './stores/authStore';
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
  const savedTheme = localStorage.getItem('selectedTheme') || 'cyan-blue';
  
  const colorPalettes = [
    { id: 'cyan-blue', gradient: ['#06B6D4', '#3B82F6'] },
    { id: 'blue-purple', gradient: ['#3B82F6', '#8B5CF6'] },
    { id: 'cyan-teal', gradient: ['#22D3EE', '#14B8A6'] },
    { id: 'lime-green', gradient: ['#BEF264', '#4ADE80'] },
    { id: 'yellow-orange', gradient: ['#FDE047', '#FB923C'] },
    { id: 'orange-red', gradient: ['#FB923C', '#F87171'] },
    { id: 'red-rose', gradient: ['#F87171', '#FB7185'] },
    { id: 'pink-rose', gradient: ['#F472B6', '#FB7185'] },
    { id: 'purple-pink', gradient: ['#A855F7', '#EC4899'] },
    { id: 'red-purple', gradient: ['#EF4444', '#8B5CF6'] },
    { id: 'purple-blue', gradient: ['#8B5CF6', '#3B82F6'] },
    { id: 'blue-cyan', gradient: ['#0EA5E9', '#06B6D4'] },
  ];
  
  const palette = colorPalettes.find(p => p.id === savedTheme);
  if (palette) {
    document.documentElement.style.setProperty('--gradient-from', palette.gradient[0]);
    document.documentElement.style.setProperty('--gradient-to', palette.gradient[1]);
    document.documentElement.style.setProperty('--color-accent', palette.gradient[0]);
  }
};

initializeTheme();

function AdminRoute() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <AdminPage />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <GlobalInteractionEffects>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
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
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/liked" element={<LikedSongsPage />} />
            <Route path="/local" element={<LocalLibraryPage />} />
            <Route path="/recently-played" element={<RecentlyPlayedPage />} />
            <Route path="/listening-history" element={<ListeningHistoryPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/upgrade" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </GlobalInteractionEffects>
    </BrowserRouter>
  </React.StrictMode>
);
