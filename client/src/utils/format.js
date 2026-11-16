export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDue(date) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// 'overdue' | 'soon' (within 2 days) | 'later'
export function dueStatus(date) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 2 * 24 * 60 * 60 * 1000) return 'soon';
  return 'later';
}

// <input type="date"> wants yyyy-mm-dd
export function toDateInput(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : '';
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}
