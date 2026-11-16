import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, ArrowRight, Zap, Users, Radio } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { user, login, register, guest } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const destination = next && next.startsWith('/') ? next : '/dashboard';

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Already signed in, or just finished signing in
  useEffect(() => {
    if (user) navigate(destination, { replace: true });
  }, [user, destination, navigate]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const run = async (action) => {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    run(() => (isLogin ? login(form.email, form.password) : register(form.name, form.email, form.password)));
  };

  const query = next ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <div className="auth">
      <aside className="auth-aside">
        <Logo light />
        <div>
          <h2>Plan together, in real time.</h2>
          <p>Boards that update on every screen the moment something changes. No refreshing, no stale tasks.</p>
          <ul className="auth-points">
            <li><Zap size={18} /> Drag and drop that syncs instantly</li>
            <li><Users size={18} /> See who is on the board right now</li>
            <li><Radio size={18} /> A live activity feed for every change</li>
          </ul>
        </div>
        <small>Built with React, Node, Express, MongoDB and Socket.io</small>
      </aside>

      <main className="auth-main">
        <form className="auth-card" onSubmit={submit} noValidate>
          <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
          <p className="muted">{isLogin ? 'Sign in to pick up where you left off.' : 'Free forever. It takes about 20 seconds.'}</p>

          {error && <div className="alert" role="alert">{error}</div>}

          {!isLogin && (
            <label className="field">
              <span>Full name</span>
              <input value={form.name} onChange={set('name')} placeholder="Ada Lovelace" autoComplete="name" required />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
            />
          </label>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'} {!busy && <ArrowRight size={16} />}
          </button>

          <div className="divider"><span>or</span></div>

          <button type="button" className="btn btn-soft btn-block" disabled={busy} onClick={() => run(guest)}>
            <Sparkles size={16} /> Try it instantly as a guest
          </button>

          <p className="auth-switch">
            {isLogin ? (
              <>New here? <Link to={`/register${query}`}>Create an account</Link></>
            ) : (
              <>Already have an account? <Link to={`/login${query}`}>Sign in</Link></>
            )}
          </p>
        </form>
      </main>
    </div>
  );
}
