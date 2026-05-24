import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) return toast.error('Please fill in all fields');

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Login failed');
      if (!data?.user || !data?.token) throw new Error('Login response was incomplete');

      login(data.user, data.token);
      toast.success(`Welcome back, ${data.user.displayName}!`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Unable to log in right now');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-panel p-8 shadow-float glass-heavy">
        <h2 className="mb-2 text-center text-3xl font-bold text-white">Welcome Back</h2>
        <p className="mb-8 text-center text-sm text-dimText">Log in to your Go-Music account</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-go-gradient px-4 py-3.5 font-bold text-white shadow-glow transition hover:shadow-glow-lg disabled:opacity-75"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-dimText">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-white hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
