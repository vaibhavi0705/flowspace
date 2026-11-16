import { useEffect, useRef, useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Plus, Trash2, X } from 'lucide-react';
import CardItem from './CardItem';
import { cardsForList } from '../utils/board';

export default function ListColumn({ list, index, cards, members, onOpenCard, onAddCard, onRename, onDelete }) {
  const items = cardsForList(cards, list._id);
  const [title, setTitle] = useState(list.title);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const composer = useRef(null);

  // Keep the title in sync when a teammate renames the list
  useEffect(() => setTitle(list.title), [list.title]);
  useEffect(() => {
    if (adding) composer.current?.focus();
  }, [adding]);

  const commitTitle = () => {
    const clean = title.trim();
    if (!clean) return setTitle(list.title);
    if (clean !== list.title) onRename(list._id, clean);
  };

  const submit = async (e) => {
    e?.preventDefault();
    const clean = draft.trim();
    if (!clean) return;
    setDraft('');
    await onAddCard(list._id, clean);
    composer.current?.focus(); // stay open so several cards can be added quickly
  };

  return (
    <Draggable draggableId={`list-${list._id}`} index={index}>
      {(provided, snapshot) => (
        <section
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={snapshot.isDragging ? 'list dragging' : 'list'}
        >
          <header className="list-head" {...provided.dragHandleProps}>
            <input
              className="list-title"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              aria-label="List title"
            />
            <span className="count">{items.length}</span>
            <button className="icon-btn icon-btn-sm" onClick={() => onDelete(list)} aria-label="Delete list" title="Delete list">
              <Trash2 size={15} />
            </button>
          </header>

          <Droppable droppableId={list._id} type="CARD">
            {(drop, dropSnapshot) => (
              <div
                ref={drop.innerRef}
                {...drop.droppableProps}
                className={dropSnapshot.isDraggingOver ? 'cards over' : 'cards'}
              >
                {items.map((card, i) => (
                  <CardItem key={card._id} card={card} index={i} members={members} onOpen={onOpenCard} />
                ))}
                {drop.placeholder}
              </div>
            )}
          </Droppable>

          {adding ? (
            <form className="composer" onSubmit={submit}>
              <textarea
                ref={composer}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What needs to be done?"
                rows={3}
                maxLength={200}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) submit(e);
                  if (e.key === 'Escape') setAdding(false);
                }}
              />
              <div className="composer-actions">
                <button className="btn btn-primary btn-sm">Add card</button>
                <button type="button" className="icon-btn" onClick={() => setAdding(false)} aria-label="Cancel">
                  <X size={18} />
                </button>
              </div>
            </form>
          ) : (
            <button className="add-card" onClick={() => setAdding(true)}>
              <Plus size={16} /> Add a card
            </button>
          )}
        </section>
      )}
    </Draggable>
  );
}
