import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Users, History, ShieldCheck, Moon, Sun, GripVertical } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { errMsg } from '../api/client';

const FEATURES = [
  { icon: Zap, title: 'Instant sync', text: 'Move a card and every teammate sees it land, with no refresh and no waiting.' },
  { icon: Users, title: 'Live presence', text: 'See exactly who is on the board right now, across tabs and devices.' },
  { icon: History, title: 'Activity feed', text: 'A running log of every change, so nothing happens behind your back.' },
  { icon: GripVertical, title: 'Drag and drop', text: 'Reorder cards and whole columns smoothly, on desktop and touch screens.' },
  { icon: ShieldCheck, title: 'Private by default', text: 'Only members you invite can open a board, enforced on the server.' },
  { icon: Sparkles, title: 'Made for focus', text: 'Labels, due dates, assignees and comments, without the clutter.' },
];

export default function Landing() {
  const { user, guest } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const tryDemo = async () => {
    setBusy(true);
    setError('');
    try {
      await guest();
      navigate('/dashboard');
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo />
        <nav>
          <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user ? (
            <Link className="btn btn-primary" to="/dashboard">Open dashboard</Link>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">Sign in</Link>
              <Link className="btn btn-primary" to="/register">Get started</Link>
            </>
          )}
        </nav>
      </header>

      <section className="hero">
        <span className="eyebrow"><span className="live-dot" /> Real-time collaboration</span>
        <h1>Plan work together,<br /><span className="gradient-text">in real time.</span></h1>
        <p>
          Flowspace is a board that updates on every screen the moment something changes.
          Organise tasks, see who is online, and stay in sync without ever hitting refresh.
        </p>
        <div className="hero-cta">
          {user ? (
            <Link className="btn btn-primary btn-lg" to="/dashboard">
              Go to my boards <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <button className="btn btn-primary btn-lg" onClick={tryDemo} disabled={busy}>
                {busy ? 'Setting up your demo…' : 'Try the live demo'} {!busy && <ArrowRight size={18} />}
              </button>
              <Link className="btn btn-outline btn-lg" to="/register">Create an account</Link>
            </>
          )}
        </div>
        {error && <div className="alert hero-alert" role="alert">{error}</div>}
        {!user && <small className="muted">No sign-up needed for the demo.</small>}

        <div className="mock" aria-hidden="true">
          <div className="mock-bar">
            <span /><span /><span />
            <div className="mock-presence">
              <i style={{ background: '#6366f1' }}>A</i><i style={{ background: '#ec4899' }}>M</i><i style={{ background: '#14b8a6' }}>R</i>
              <b>3 online</b>
            </div>
          </div>
          <div className="mock-cols">
            <div className="mock-col">
              <h5>To do <em>3</em></h5>
              <div className="mock-card"><u style={{ background: '#22c55e' }} />Write launch announcement</div>
              <div className="mock-card"><u style={{ background: '#8b5cf6' }} />Design pricing page</div>
              <div className="mock-card">Plan sprint review</div>
            </div>
            <div className="mock-col">
              <h5>In progress <em>2</em></h5>
              <div className="mock-card mock-float"><u style={{ background: '#ef4444' }} />Fix checkout redirect</div>
              <div className="mock-card"><u style={{ background: '#0ea5e9' }} />Update API docs</div>
            </div>
            <div className="mock-col">
              <h5>Done <em>4</em></h5>
              <div className="mock-card">Set up CI pipeline</div>
              <div className="mock-card">Onboarding emails</div>
              <div className="mock-card">Brand colours</div>
            </div>
          </div>
          <div className="mock-toast"><Zap size={14} /> Maya moved “Fix checkout redirect”</div>
        </div>
      </section>

      <section className="features">
        <h2>Everything a team board needs</h2>
        <p className="muted">Simple on the surface, with real-time infrastructure underneath.</p>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="feature">
              <span className="feature-icon"><Icon size={20} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-foot">
        <Logo />
        <p>Built with React, Node.js, Express, MongoDB and Socket.io.</p>
      </footer>
    </div>
  );
}
