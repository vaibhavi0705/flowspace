import { Link } from 'react-router-dom';

export default function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className={light ? 'logo logo-light' : 'logo'} aria-label="Flowspace home">
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
        <rect x="14" y="14" width="10" height="36" rx="3" fill="#fff" />
        <rect x="27" y="14" width="10" height="24" rx="3" fill="#fff" opacity=".85" />
        <rect x="40" y="14" width="10" height="16" rx="3" fill="#fff" opacity=".7" />
      </svg>
      <span>Flowspace</span>
    </Link>
  );
}
