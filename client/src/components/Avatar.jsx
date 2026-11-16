import { initials } from '../utils/format';

export default function Avatar({ user, size = 32, title }) {
  if (!user) return null;
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: user.color || '#6366f1', fontSize: Math.round(size * 0.38) }}
      title={title ?? user.name}
    >
      {initials(user.name)}
    </span>
  );
}

export function AvatarStack({ users = [], max = 4, size = 28 }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="avatar-stack">
      {shown.map((u) => (
        <Avatar key={u._id} user={u} size={size} />
      ))}
      {extra > 0 && (
        <span className="avatar avatar-more" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
          +{extra}
        </span>
      )}
    </div>
  );
}
