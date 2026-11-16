import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { ArrowLeft, History, Moon, Plus, Share2, Sun, X } from 'lucide-react';
import ListColumn from '../components/ListColumn';
import CardModal from '../components/CardModal';
import ShareModal from '../components/ShareModal';
import ActivityPanel from '../components/ActivityPanel';
import Loader from '../components/Loader';
import { AvatarStack } from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api, { errMsg } from '../api/client';
import { getSocket } from '../socket';
import { BOARD_THEMES } from '../utils/constants';
import { moveCardLocal } from '../utils/board';

export default function Board() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();

  const [data, setData] = useState(null); // { board, lists, cards, activity }
  const [error, setError] = useState('');
  const [online, setOnline] = useState([]);
  const [openCardId, setOpenCardId] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [title, setTitle] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [listDraft, setListDraft] = useState('');
  const syncTimer = useRef(null);

  // ---------- Loading ----------
  const load = useCallback(async () => {
    try {
      const res = await api.get(`/boards/${id}`);
      setData(res.data);
      setTitle(res.data.board.title);
      setError('');
    } catch (err) {
      setError(errMsg(err));
    }
  }, [id]);

  useEffect(() => {
    setData(null);
    setOpenCardId(null);
    load();
  }, [load]);

  // ---------- Real-time ----------
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const join = () => socket.emit('board:join', id);
    const leaveToDashboard = (message) => {
      toast(message, 'info');
      navigate('/dashboard', { replace: true });
    };

    const onPresence = (p) => p.boardId === id && setOnline(p.users);

    // Someone else changed something: refetch the snapshot (debounced so a burst becomes one request)
    const onSync = (p) => {
      if (p.boardId !== id) return;
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(load, 150);
    };

    const onActivity = (p) => {
      if (p.boardId !== id) return;
      setData((d) => {
        if (!d || d.activity.some((a) => a._id === p.activity._id)) return d;
        return { ...d, activity: [p.activity, ...d.activity].slice(0, 50) };
      });
      if (p.activity.user._id !== user._id) toast(`${p.activity.user.name} ${p.activity.text}`, 'info');
    };

    const onRemoved = (p) => {
      if (p.boardId === id && p.userId === user._id) leaveToDashboard('You were removed from this board');
    };
    const onDeleted = (p) => p.boardId === id && leaveToDashboard('This board was deleted by its owner');

    socket.on('connect', join); // also fires after a dropped connection comes back
    socket.on('presence:update', onPresence);
    socket.on('board:sync', onSync);
    socket.on('activity:new', onActivity);
    socket.on('member:removed', onRemoved);
    socket.on('board:deleted', onDeleted);
    socket.on('board:denied', () => leaveToDashboard('You do not have access to that board'));
    if (socket.connected) join();

    return () => {
      clearTimeout(syncTimer.current);
      socket.emit('board:leave', id);
      socket.off('connect', join);
      socket.off('presence:update', onPresence);
      socket.off('board:sync', onSync);
      socket.off('activity:new', onActivity);
      socket.off('member:removed', onRemoved);
      socket.off('board:deleted', onDeleted);
      socket.off('board:denied');
    };
  }, [id, load, navigate, toast, user._id]);

  const lists = useMemo(() => (data ? [...data.lists].sort((a, b) => a.position - b.position) : []), [data]);

  // ---------- Mutations (each one updates the screen first or right after the response) ----------
  const fail = (err) => {
    toast(errMsg(err), 'error');
    load(); // fall back to the server's truth
  };

  const renameBoard = async () => {
    const clean = title.trim();
    if (!clean) return setTitle(data.board.title);
    if (clean === data.board.title) return;
    try {
      await api.patch(`/boards/${id}`, { title: clean });
      setData((d) => ({ ...d, board: { ...d.board, title: clean } }));
    } catch (err) {
      setTitle(data.board.title);
      toast(errMsg(err), 'error');
    }
  };

  const addList = async (e) => {
    e.preventDefault();
    const clean = listDraft.trim();
    if (!clean) return;
    setListDraft('');
    try {
      const res = await api.post(`/boards/${id}/lists`, { title: clean });
      setData((d) => ({ ...d, lists: [...d.lists, res.data] }));
    } catch (err) {
      fail(err);
    }
  };

  const renameList = async (listId, newTitle) => {
    setData((d) => ({ ...d, lists: d.lists.map((l) => (l._id === listId ? { ...l, title: newTitle } : l)) }));
    try {
      await api.patch(`/lists/${listId}`, { title: newTitle });
    } catch (err) {
      fail(err);
    }
  };

  const deleteList = async (list) => {
    if (!window.confirm(`Delete the list "${list.title}" and all of its cards?`)) return;
    try {
      await api.delete(`/lists/${list._id}`);
      setData((d) => ({
        ...d,
        lists: d.lists.filter((l) => l._id !== list._id),
        cards: d.cards.filter((c) => c.list !== list._id),
      }));
    } catch (err) {
      fail(err);
    }
  };

  const addCard = async (listId, cardTitle) => {
    try {
      const res = await api.post(`/lists/${listId}/cards`, { title: cardTitle });
      setData((d) => ({ ...d, cards: [...d.cards, res.data] }));
    } catch (err) {
      fail(err);
    }
  };

  const replaceCard = (card) => setData((d) => ({ ...d, cards: d.cards.map((c) => (c._id === card._id ? card : c)) }));

  const updateCard = async (cardId, patch) => {
    try {
      replaceCard((await api.patch(`/cards/${cardId}`, patch)).data);
    } catch (err) {
      fail(err);
    }
  };

  const commentOnCard = async (cardId, text) => {
    try {
      replaceCard((await api.post(`/cards/${cardId}/comments`, { text })).data);
    } catch (err) {
      fail(err);
    }
  };

  const deleteCard = async (card) => {
    if (!window.confirm(`Delete "${card.title}"?`)) return;
    try {
      await api.delete(`/cards/${card._id}`);
      setOpenCardId(null);
      setData((d) => ({ ...d, cards: d.cards.filter((c) => c._id !== card._id) }));
    } catch (err) {
      fail(err);
    }
  };

  // ---------- Drag and drop ----------
  const onDragEnd = async ({ source, destination, draggableId, type }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'LIST') {
      const ordered = [...lists];
      const [moved] = ordered.splice(source.index, 1);
      ordered.splice(destination.index, 0, moved);
      setData((d) => ({ ...d, lists: ordered.map((l, position) => ({ ...l, position })) }));
      try {
        await api.post(`/boards/${id}/lists/reorder`, { orderedIds: ordered.map((l) => l._id) });
      } catch (err) {
        fail(err);
      }
      return;
    }

    // Optimistic: the card moves on screen immediately, the request follows
    setData((d) => ({ ...d, cards: moveCardLocal(d.cards, draggableId, destination.droppableId, destination.index) }));
    try {
      await api.post(`/cards/${draggableId}/move`, { toListId: destination.droppableId, index: destination.index });
    } catch (err) {
      fail(err);
    }
  };

  // ---------- Render ----------
  if (error) {
    return (
      <div className="center-screen">
        <div className="empty">
          <h2>Board unavailable</h2>
          <p>{error}</p>
          <Link className="btn btn-primary" to="/dashboard">Back to my boards</Link>
        </div>
      </div>
    );
  }
  if (!data) return <Loader full label="Loading board" />;

  const { board, cards, activity } = data;
  const openCard = cards.find((c) => c._id === openCardId);

  return (
    <div className="board-page" style={{ background: BOARD_THEMES[board.color] }}>
      <header className="board-bar">
        <Link to="/dashboard" className="bar-btn" aria-label="Back to boards">
          <ArrowLeft size={18} />
        </Link>
        <input
          className="board-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={renameBoard}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          maxLength={80}
          aria-label="Board title"
        />
        <div className="bar-spacer" />

        <div className="online" title={`${online.length} online`}>
          <span className="live-dot" />
          <AvatarStack users={online} size={28} max={5} />
          <span className="online-count">{online.length} online</span>
        </div>

        <button className="bar-btn" onClick={() => setShowActivity((s) => !s)} aria-label="Activity" title="Activity">
          <History size={18} />
        </button>
        <button className="bar-btn" onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="bar-btn bar-btn-solid" onClick={() => setShowShare(true)}>
          <Share2 size={16} /> Share
        </button>
      </header>

      <div className="board-body">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" direction="horizontal" type="LIST">
            {(provided) => (
              <div className="lists" ref={provided.innerRef} {...provided.droppableProps}>
                {lists.map((list, index) => (
                  <ListColumn
                    key={list._id}
                    list={list}
                    index={index}
                    cards={cards}
                    members={board.members}
                    onOpenCard={setOpenCardId}
                    onAddCard={addCard}
                    onRename={renameList}
                    onDelete={deleteList}
                  />
                ))}
                {provided.placeholder}

                <div className="add-list">
                  {addingList ? (
                    <form onSubmit={addList}>
                      <input
                        autoFocus
                        value={listDraft}
                        onChange={(e) => setListDraft(e.target.value)}
                        placeholder="List title"
                        maxLength={80}
                        onKeyDown={(e) => e.key === 'Escape' && setAddingList(false)}
                      />
                      <div className="composer-actions">
                        <button className="btn btn-primary btn-sm">Add list</button>
                        <button type="button" className="icon-btn" onClick={() => setAddingList(false)} aria-label="Cancel">
                          <X size={18} />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setAddingList(true)}>
                      <Plus size={18} /> Add another list
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {showActivity && <ActivityPanel activity={activity} onClose={() => setShowActivity(false)} />}
      </div>

      {openCard && (
        <CardModal
          key={openCard._id}
          card={openCard}
          listTitle={lists.find((l) => l._id === openCard.list)?.title ?? ''}
          members={board.members}
          onClose={() => setOpenCardId(null)}
          onUpdate={updateCard}
          onDelete={deleteCard}
          onComment={commentOnCard}
        />
      )}
      {showShare && <ShareModal board={board} me={user} onClose={() => setShowShare(false)} onChanged={load} />}
    </div>
  );
}
