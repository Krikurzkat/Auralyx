import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { getNetworkErrorMessage } from '../services/api';
import { updateSupabaseProfile } from '../services/auth';
import {
  RiCheckLine,
  RiCloseLine,
  RiEditLine,
  RiHeartLine,
  RiHistoryLine,
  RiImageEditLine,
  RiUserLine,
} from 'react-icons/ri';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const { localTracks, localPlaylists } = useLocalLibraryStore();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditing) {
      setDisplayName(user?.displayName || '');
      setAvatarUrl(user?.avatarUrl || '');
      setError('');
    }
  }, [isEditing, user?.avatarUrl, user?.displayName]);

  const totalListens = useMemo(() => localTracks.reduce((acc, t) => acc + t.plays, 0), [localTracks]);
  const favoriteArtist = useMemo(() => {
    const counts: Record<string, number> = {};
    localTracks.forEach(t => { counts[t.artist] = (counts[t.artist] || 0) + t.plays; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'None yet';
  }, [localTracks]);

  const startEditing = () => {
    setDisplayName(user?.displayName || '');
    setAvatarUrl(user?.avatarUrl || '');
    setError('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError('');
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      const message = 'Log in before editing your profile.';
      setError(message);
      toast.error(message);
      return;
    }

    if (!user.id) {
      const message = 'Your saved session is missing a profile id. Please log in again.';
      setError(message);
      toast.error(message);
      void logout();
      navigate('/login');
      return;
    }

    const trimmedDisplayName = displayName.trim();
    const trimmedAvatarUrl = avatarUrl.trim();

    if (!trimmedDisplayName) {
      const message = 'Display name is required.';
      setError(message);
      toast.error(message);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const updatedUser = await updateSupabaseProfile({
        displayName: trimmedDisplayName,
        avatarUrl: trimmedAvatarUrl,
      });
      updateUser(updatedUser);
      setIsEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      const message = getNetworkErrorMessage(err);
      setError(message);
      toast.error(message);
      if (/logged in/i.test(message) || /jwt/i.test(message) || /session/i.test(message)) {
        void logout();
        navigate('/login');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-enter space-y-8 pb-8">
      <div className="flex flex-col items-center gap-6 rounded-[32px] bg-glass-card backdrop-blur-xl p-8 text-center md:flex-row md:text-left">
        <div className="flex h-24 w-24 md:h-28 md:w-28 items-center justify-center overflow-hidden rounded-full bg-theme-gradient text-3xl font-bold text-white shadow-glow-lg">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
          ) : (
            user?.displayName?.[0]?.toUpperCase() || 'U'
          )}
        </div>
        <div className="min-w-0 flex-1 text-center md:text-left">
          <h1 className="mt-2 truncate text-2xl font-bold md:text-3xl">{user?.displayName || 'Local User'}</h1>
          <p className="mt-1 truncate text-sm text-softText">{user?.email || 'Log in to sync and edit your profile'}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-softText md:justify-start">
            <span className="flex items-center gap-1.5"><RiHeartLine size={16} /> {localTracks.length} Tracks</span>
            <span>·</span>
            <span className="flex items-center gap-1.5"><RiHistoryLine size={16} /> {totalListens} Total Plays</span>
            <span>·</span>
            <span className="flex items-center gap-1.5"><RiUserLine size={16} /> Favorite: {favoriteArtist}</span>
          </div>
        </div>
        <div className="flex gap-3">
          {user ? (
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-3 text-sm font-semibold text-softText transition hover:bg-white/10 hover:text-white"
            >
              <RiEditLine size={20} />
              Edit Profile
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Log In
            </Link>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="rounded-[24px] border border-white/10 bg-glass-card p-6 backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <RiImageEditLine size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Edit Profile</h2>
              <p className="text-sm text-softText">Update your name and profile image.</p>
            </div>
          </div>

          {error ? (
            <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-softText">Display Name</span>
              <input
                value={displayName}
                onChange={event => { setDisplayName(event.target.value); if (error) setError(''); }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-dimText outline-none transition focus:border-white/20 focus:bg-white/10"
                placeholder="Your name"
                maxLength={60}
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-softText">Avatar URL</span>
              <input
                value={avatarUrl}
                onChange={event => { setAvatarUrl(event.target.value); if (error) setError(''); }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-dimText outline-none transition focus:border-white/20 focus:bg-white/10"
                placeholder="https://example.com/avatar.jpg"
                type="url"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-softText transition hover:bg-white/5 hover:text-white disabled:opacity-60"
            >
              <RiCloseLine size={18} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-theme-gradient px-4 py-3 text-sm font-bold text-white shadow-glow transition hover:shadow-glow-lg disabled:opacity-75"
            >
              <RiCheckLine size={18} />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[24px] bg-glass-card backdrop-blur-xl p-6">
          <h3 className="text-lg font-bold">Local Library Size</h3>
          <div className="mt-4 text-4xl font-black text-accent">{localTracks.length}</div>
          <div className="mt-1 text-sm text-softText">Audio files indexed</div>
        </div>
        <div className="rounded-[24px] bg-glass-card backdrop-blur-xl p-6">
          <h3 className="text-lg font-bold">Custom Folders</h3>
          <div className="mt-4 text-4xl font-black text-blue-400">{localPlaylists.length}</div>
          <div className="mt-1 text-sm text-softText">Playlists created</div>
        </div>
        <div className="rounded-[24px] bg-glass-card backdrop-blur-xl p-6">
          <h3 className="text-lg font-bold">Total Listening Time</h3>
          <div className="mt-4 text-4xl font-black text-purple-400">
            {Math.floor(totalListens * 3.5 / 60)} <span className="text-2xl font-bold text-softText">hours</span>
          </div>
          <div className="mt-1 text-sm text-softText">Estimated offline time</div>
        </div>
      </div>
    </div>
  );
}
