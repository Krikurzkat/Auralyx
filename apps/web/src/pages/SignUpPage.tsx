import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { apiUrl, getNetworkErrorMessage } from '../services/api';
import { loginWithSpotifyAuth } from '../services/spotifyAuthLogin';
import StarParticles from '../components/ui/StarParticles';
import AuroraBackground from '../components/ui/AuroraBackground';
import Meteors from '../components/ui/Meteors';

export default function SignUpPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedDisplayName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedUsername || !trimmedEmail || !password || !trimmedDisplayName) {
      const message = 'Please fill all required fields';
      setError(message);
      return toast.error(message);
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/users/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedUsername,
          email: trimmedEmail,
          password,
          displayName: trimmedDisplayName,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Registration failed');
      if (!data?.user || !data?.token) throw new Error('Registration response was incomplete');

      login(data.user, data.token);
      toast.success(`Welcome to Auralyx, ${data.user.displayName}!`);
      navigate('/');
    } catch (err) {
      const message = getNetworkErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotifySignup = async () => {
    try {
      await loginWithSpotifyAuth('signup');
    } catch (err) {
      console.error('Spotify signup error:', err);
      toast.error('Failed to initiate Spotify signup');
    }
  };

  return (
    <div className="relative flex h-full min-h-screen items-center justify-center p-4 overflow-hidden">
      <AuroraBackground />
      <StarParticles />
      <Meteors number={15} />
      <Link
        to="/"
        className="absolute left-4 top-4 z-20 inline-flex items-center rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-black/50 hover:text-white"
        aria-label="Back to landing page"
      >
        Go Back
      </Link>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-glass-heavy backdrop-blur-2xl p-8 shadow-float glass-heavy z-10">
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="Auralyx Logo" className="h-36 w-36 object-contain drop-shadow-md" />
        </div>
        <h2 className="mb-2 text-center text-3xl font-bold text-white">Join Auralyx</h2>
        <p className="mb-8 text-center text-sm text-dimText">Create your account to unlock premium audio</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error ? (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
              {error}
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-softText">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); if (error) setError(''); }}
              placeholder="your_username"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-dimText outline-none transition focus:border-white/20 focus:bg-white/10"
              required
              minLength={3}
              maxLength={30}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-softText">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); if (error) setError(''); }}
              placeholder="Your Name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-dimText outline-none transition focus:border-white/20 focus:bg-white/10"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-softText">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-dimText outline-none transition focus:border-white/20 focus:bg-white/10"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-softText">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); if (error) setError(''); }}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-dimText outline-none transition focus:border-white/20 focus:bg-white/10"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-theme-gradient px-4 py-3.5 font-bold text-white shadow-glow transition hover:shadow-glow-lg disabled:opacity-75"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10"></div>
          <span className="text-xs text-dimText">OR</span>
          <div className="h-px flex-1 bg-white/10"></div>
        </div>

        {/* Spotify Signup Button */}
        <button
          onClick={handleSpotifySignup}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#1DB954] px-4 py-3.5 font-bold text-white transition hover:bg-[#1ed760] disabled:opacity-75"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          Continue with Spotify
        </button>

        <div className="mt-6 text-center text-sm text-dimText">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-white hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
