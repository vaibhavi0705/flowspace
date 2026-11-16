import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut } from 'lucide-react';
import Logo from './Logo';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <header className="navbar">
      <Logo to="/dashboard" />
      <div className="navbar-right">
        <button className="icon-btn" onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="menu-wrap" ref={menuRef}>
          <button className="avatar-btn" onClick={() => setOpen((o) => !o)} aria-label="Account menu">
            <Avatar user={user} size={34} />
          </button>
          {open && (
            <div className="menu">
              <div className="menu-user">
                <strong>{user.name}</strong>
                <span>{user.isGuest ? 'Guest account' : user.email}</span>
              </div>
              <button
                className="menu-item"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
