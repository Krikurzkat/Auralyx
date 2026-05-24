import { useAuthStore } from '../stores/authStore';
import { useLocalLibraryStore } from '../stores/localLibraryStore';
import { RiSettings4Line, RiHistoryLine, RiHeartLine, RiUserLine } from 'react-icons/ri';
import { useMemo } from 'react';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { localTracks, localPlaylists } = useLocalLibraryStore();

  const totalListens = useMemo(() => localTracks.reduce((acc, t) => acc + t.plays, 0), [localTracks]);
  const favoriteArtist = useMemo(() => {
    const counts: Record<string, number> = {};
    localTracks.forEach(t => { counts[t.artist] = (counts[t.artist] || 0) + t.plays; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'None yet';
  }, [localTracks]);

  return (
    <div className="page-enter space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-6 rounded-[32px] bg-card p-8 text-center md:flex-row md:text-left">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-go-gradient text-5xl font-bold text-white shadow-glow-lg">
          {user?.displayName?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold uppercase tracking-wider text-softText">Profile</div>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">{user?.displayName || 'Local User'}</h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-softText md:justify-start">
            <span className="flex items-center gap-1.5"><RiHeartLine size={16} /> {localTracks.length} Tracks</span>
            <span>·</span>
            <span className="flex items-center gap-1.5"><RiHistoryLine size={16} /> {totalListens} Total Plays</span>
            <span>·</span>
            <span className="flex items-center gap-1.5"><RiUserLine size={16} /> Favorite: {favoriteArtist}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="rounded-full bg-white/5 p-3 text-softText transition hover:bg-white/10 hover:text-white">
            <RiSettings4Line size={24} />
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[24px] bg-card p-6">
          <h3 className="text-lg font-bold">Local Library Size</h3>
          <div className="mt-4 text-4xl font-black text-accent">{localTracks.length}</div>
          <div className="mt-1 text-sm text-softText">Audio files indexed</div>
        </div>
        <div className="rounded-[24px] bg-card p-6">
          <h3 className="text-lg font-bold">Custom Folders</h3>
          <div className="mt-4 text-4xl font-black text-blue-400">{localPlaylists.length}</div>
          <div className="mt-1 text-sm text-softText">Playlists created</div>
        </div>
        <div className="rounded-[24px] bg-card p-6">
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
