import { useState } from 'react';
import { Calendar, Check, MessageSquare, Tag, Trash2, Users, AlignLeft, Send } from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import { LABELS } from '../utils/constants';
import { timeAgo, toDateInput } from '../utils/format';

export default function CardModal({ card, listTitle, members, onClose, onUpdate, onDelete, onComment }) {
  // Local copies of the text fields so typing is instant; they are saved when the field loses focus
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const saveTitle = () => {
    const clean = title.trim();
    if (!clean) return setTitle(card.title);
    if (clean !== card.title) onUpdate(card._id, { title: clean });
  };
  const saveDescription = () => description !== card.description && onUpdate(card._id, { description });

  const toggle = (field, value) => {
    const current = card[field];
    onUpdate(card._id, { [field]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
  };

  const send = async (e) => {
    e.preventDefault();
    if (!comment.trim() || sending) return;
    setSending(true);
    await onComment(card._id, comment.trim());
    setComment('');
    setSending(false);
  };

  return (
    <Modal onClose={onClose} size="lg" hideHeader title="Card details">
      <div className="card-modal">
        <div className="card-modal-main">
          <p className="in-list">in list <strong>{listTitle}</strong></p>
          <input
            className="modal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            maxLength={200}
            aria-label="Card title"
          />

          <h4><AlignLeft size={16} /> Description</h4>
          <textarea
            className="modal-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            placeholder="Add more detail about this card…"
            rows={5}
          />

          <h4><MessageSquare size={16} /> Comments</h4>
          <form className="comment-form" onSubmit={send}>
            <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" maxLength={1000} />
            <button className="btn btn-primary btn-sm" disabled={!comment.trim() || sending} aria-label="Send comment">
              <Send size={15} />
            </button>
          </form>
          <ul className="comments">
            {[...card.comments].reverse().map((c) => (
              <li key={c._id}>
                <Avatar user={c.user} size={28} />
                <div>
                  <p><strong>{c.user?.name ?? 'Former member'}</strong> <span>{timeAgo(c.createdAt)}</span></p>
                  <div className="comment-bubble">{c.text}</div>
                </div>
              </li>
            ))}
            {card.comments.length === 0 && <li className="muted small">No comments yet.</li>}
          </ul>
        </div>

        <aside className="card-modal-side">
          <section>
            <h4><Tag size={15} /> Labels</h4>
            <div className="chips">
              {Object.entries(LABELS).map(([key, { name, color }]) => {
                const on = card.labels.includes(key);
                return (
                  <button
                    key={key}
                    className={on ? 'chip chip-on' : 'chip'}
                    style={on ? { background: color, borderColor: color } : { '--dot': color }}
                    onClick={() => toggle('labels', key)}
                  >
                    {on ? <Check size={12} /> : <i style={{ background: color }} />} {name}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h4><Calendar size={15} /> Due date</h4>
            <div className="date-row">
              <input
                type="date"
                value={toDateInput(card.dueDate)}
                onChange={(e) => onUpdate(card._id, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
              {card.dueDate && (
                <button className="btn btn-ghost btn-sm" onClick={() => onUpdate(card._id, { dueDate: null })}>Clear</button>
              )}
            </div>
          </section>

          <section>
            <h4><Users size={15} /> Assignees</h4>
            <ul className="assign-list">
              {members.map((m) => {
                const on = card.assignees.includes(m._id);
                return (
                  <li key={m._id}>
                    <button className={on ? 'assign on' : 'assign'} onClick={() => toggle('assignees', m._id)}>
                      <Avatar user={m} size={26} />
                      <span>{m.name}</span>
                      {on && <Check size={15} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <button className="btn btn-danger btn-block" onClick={() => onDelete(card)}>
            <Trash2 size={16} /> Delete card
          </button>
        </aside>
      </div>
    </Modal>
  );
}
