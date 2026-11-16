import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, LayoutGrid, Layers } from 'lucide-react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import { AvatarStack } from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api, { errMsg } from '../api/client';
import { BOARD_THEMES } from '../utils/constants';
import { timeAgo } from '../utils/format';

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [boards, setBoards] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setBoards((await api.get('/boards')).data);
    } catch (err) {
      toast(errMsg(err), 'error');
      setBoards([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (e, board) => {
    e.preventDefault(); // the tile is a link, so stop the click from navigating
    e.stopPropagation();
    if (!window.confirm(`Delete "${board.title}" and everything in it? This cannot be undone.`)) return;
    try {
      await api.delete(`/boards/${board._id}`);
      setBoards((list) => list.filter((b) => b._id !== board._id));
      toast('Board deleted', 'success');
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const firstName = user.name.split(' ')[0];

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="page-head">
          <div>
            <h1>Hi {firstName} 👋</h1>
            <p className="muted">Pick up a board or start a new one.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={18} /> New board
          </button>
        </div>

        {boards === null ? (
          <div className="board-grid">
            {[0, 1, 2].map((i) => <div key={i} className="board-tile skeleton" />)}
          </div>
        ) : boards.length === 0 ? (
          <div className="empty">
            <LayoutGrid size={40} />
            <h2>No boards yet</h2>
            <p>Create your first board to start organising work with your team.</p>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <Plus size={18} /> Create a board
            </button>
          </div>
        ) : (
          <div className="board-grid">
            <button className="board-tile board-new" onClick={() => setCreating(true)}>
              <Plus size={26} />
              <span>Create new board</span>
            </button>
            {boards.map((b) => (
              <Link key={b._id} to={`/board/${b._id}`} className="board-tile" style={{ background: BOARD_THEMES[b.color] }}>
                <div className="board-tile-top">
                  <h3>{b.title}</h3>
                  {b.owner === user._id && (
                    <button className="tile-delete" onClick={(e) => remove(e, b)} aria-label={`Delete ${b.title}`} title="Delete board">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                {b.description && <p>{b.description}</p>}
                <div className="board-tile-foot">
                  <AvatarStack users={b.members} size={26} />
                  <span className="tile-meta"><Layers size={13} /> {b.cardCount} · {timeAgo(b.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {creating && <NewBoardModal onClose={() => setCreating(false)} />}
    </>
  );
}

function NewBoardModal({ onClose }) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('indigo');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post('/boards', { title, color });
      navigate(`/board/${data._id}`);
    } catch (err) {
      toast(errMsg(err), 'error');
      setBusy(false);
    }
  };

  return (
    <Modal title="Create a board" onClose={onClose} size="sm">
      <form className="modal-body" onSubmit={submit}>
        <div className="preview" style={{ background: BOARD_THEMES[color] }}>
          <span>{title.trim() || 'Board title'}</span>
        </div>
        <label className="field">
          <span>Title</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Website redesign" maxLength={80} />
        </label>
        <div className="field">
          <span>Background</span>
          <div className="swatches">
            {Object.entries(BOARD_THEMES).map(([key, bg]) => (
              <button
                type="button"
                key={key}
                className={color === key ? 'swatch active' : 'swatch'}
                style={{ background: bg }}
                onClick={() => setColor(key)}
                aria-label={key}
              />
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !title.trim()}>{busy ? 'Creating…' : 'Create board'}</button>
        </div>
      </form>
    </Modal>
  );
}
