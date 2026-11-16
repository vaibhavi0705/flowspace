import { Draggable } from '@hello-pangea/dnd';
import { Calendar, MessageSquare, AlignLeft } from 'lucide-react';
import { AvatarStack } from './Avatar';
import { LABELS } from '../utils/constants';
import { dueStatus, formatDue } from '../utils/format';

export default function CardItem({ card, index, members, onOpen }) {
  const assignees = card.assignees.map((id) => members.find((m) => m._id === id)).filter(Boolean);
  const hasMeta = card.dueDate || card.comments.length > 0 || card.description || assignees.length > 0;

  return (
    <Draggable draggableId={card._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={snapshot.isDragging ? 'card dragging' : 'card'}
          onClick={() => onOpen(card._id)}
          onKeyDown={(e) => e.key === 'Enter' && onOpen(card._id)}
          role="button"
          tabIndex={0}
        >
          {card.labels.length > 0 && (
            <div className="label-row">
              {card.labels.map((key) => (
                <span key={key} className="label-bar" style={{ background: LABELS[key]?.color }} title={LABELS[key]?.name} />
              ))}
            </div>
          )}
          <p className="card-title">{card.title}</p>

          {hasMeta && (
            <div className="card-meta">
              <div className="card-badges">
                {card.dueDate && (
                  <span className={`badge badge-${dueStatus(card.dueDate)}`}>
                    <Calendar size={12} /> {formatDue(card.dueDate)}
                  </span>
                )}
                {card.description && <span className="badge" title="Has a description"><AlignLeft size={12} /></span>}
                {card.comments.length > 0 && (
                  <span className="badge">
                    <MessageSquare size={12} /> {card.comments.length}
                  </span>
                )}
              </div>
              <AvatarStack users={assignees} size={24} max={3} />
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
