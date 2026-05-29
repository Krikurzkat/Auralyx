import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import { getNetworkErrorMessage } from '../services/api';
import { ensureUsernameAvailable, signUpWithEmail } from '../services/auth';
import { isSupabaseConfigured } from '../services/supabase';
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
  const setSession = useAuthStore((state) => state.setSession);

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

    if (!isSupabaseConfigured) {
      const message = 'Supabase Auth is not configured yet.';
      setError(message);
      return toast.error(message);
    }

    setLoading(true);
    setError('');
    try {
      const isUsernameFree = await ensureUsernameAvailable(trimmedUsername);
      if (!isUsernameFree) {
        throw new Error('Username already taken');
      }

      const { data, error: signUpError } = await signUpWithEmail({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        displayName: trimmedDisplayName,
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        setSession(data.session);
        toast.success(`Welcome to Auralyx, ${trimmedDisplayName}!`);
        navigate('/');
        return;
      }

      toast.success('Account created. Check your email to confirm your sign-up.');
      navigate('/login');
    } catch (err) {
      const message = getNetworkErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
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
