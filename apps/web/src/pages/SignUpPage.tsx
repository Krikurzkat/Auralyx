import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function SignUpPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDisplayName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password || !trimmedDisplayName) {
      return toast.error('Please fill all required fields');
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail, password, displayName: trimmedDisplayName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      login(data.user, data.token);
      toast.success(`Welcome to Go-Music, ${data.user.displayName}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-glass-heavy backdrop-blur-2xl p-8 shadow-float glass-heavy">
        <h2 className="mb-2 text-center text-3xl font-bold text-white">Create Account</h2>
        <p className="mb-8 text-center text-sm text-dimText">Join the Go-Music community today</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-softText">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
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
              onChange={e => setEmail(e.target.value)}
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
              onChange={e => setPassword(e.target.value)}
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
