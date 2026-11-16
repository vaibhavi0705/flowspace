import { X, Activity as ActivityIcon } from 'lucide-react';
import Avatar from './Avatar';
import { timeAgo } from '../utils/format';

export default function ActivityPanel({ activity, onClose }) {
  return (
    <aside className="activity" aria-label="Board activity">
      <header>
        <h3><ActivityIcon size={18} /> Activity</h3>
        <button className="icon-btn" onClick={onClose} aria-label="Close activity">
          <X size={18} />
        </button>
      </header>
      <ul>
        {activity.map((a) => (
          <li key={a._id}>
            <Avatar user={a.user} size={28} />
            <div>
              <p><strong>{a.user?.name ?? 'Someone'}</strong> {a.text}</p>
              <small>{timeAgo(a.createdAt)}</small>
            </div>
          </li>
        ))}
        {activity.length === 0 && <li className="muted small">Nothing has happened yet.</li>}
      </ul>
    </aside>
  );
}
