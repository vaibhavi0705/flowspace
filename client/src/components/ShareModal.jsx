import { useState } from 'react';
import { Copy, Check, UserPlus, X } from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import api, { errMsg } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ShareModal({ board, me, onClose, onChanged }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOwner = board.owner === me._id;
  const link = `${window.location.origin}/join/${board.inviteCode}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('Could not copy. Select the link and copy it manually', 'error');
    }
  };

  const invite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await api.post(`/boards/${board._id}/members`, { email });
      setEmail('');
      toast('Member added', 'success');
      onChanged();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
    setBusy(false);
  };

  const remove = async (member) => {
    try {
      await api.delete(`/boards/${board._id}/members/${member._id}`);
      onChanged();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  return (
    <Modal title="Share this board" onClose={onClose} size="md">
      <div className="modal-body">
        <div className="field">
          <span>Invite link</span>
          <div className="copy-row">
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <button className="btn btn-primary" onClick={copy}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <small className="muted">Anyone with this link can join after signing in or continuing as a guest.</small>
        </div>

        {isOwner && (
          <form className="field" onSubmit={invite}>
            <span>Add by email</span>
            <div className="copy-row">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" />
              <button className="btn btn-soft" disabled={busy || !email.trim()}>
                <UserPlus size={16} /> Add
              </button>
            </div>
          </form>
        )}

        <div className="field">
          <span>Members ({board.members.length})</span>
          <ul className="member-list">
            {board.members.map((m) => (
              <li key={m._id}>
                <Avatar user={m} size={34} />
                <div className="member-info">
                  <strong>{m.name}{m._id === me._id && ' (you)'}</strong>
                  <small>{m.isGuest ? 'Guest' : m.email}</small>
                </div>
                {m._id === board.owner ? (
                  <span className="pill">Owner</span>
                ) : (
                  (isOwner || m._id === me._id) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(m)}>
                      <X size={14} /> {m._id === me._id ? 'Leave' : 'Remove'}
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
