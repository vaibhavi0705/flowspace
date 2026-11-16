import Activity from '../models/Activity.js';

// Tell everyone in the board room EXCEPT the browser tab that made the change.
// The client sends its socket id in the x-socket-id header, so the actor
// is not told to refetch data it already updated optimistically.
export function broadcast(req, boardId, event, payload = {}) {
  const io = req.app.get('io');
  if (!io) return;
  let target = io.to(`board:${boardId}`);
  const socketId = req.headers['x-socket-id'];
  if (socketId) target = target.except(String(socketId));
  target.emit(event, { boardId: String(boardId), ...payload });
}

// Tell everyone in the room including the actor
export function broadcastAll(req, boardId, event, payload = {}) {
  const io = req.app.get('io');
  if (!io) return;
  io.to(`board:${boardId}`).emit(event, { boardId: String(boardId), ...payload });
}

// Save an activity entry, push it live to the board room, and tell other tabs to resync
export async function logChange(req, boardId, text) {
  const activity = await Activity.create({ board: boardId, user: req.user._id, text });
  broadcastAll(req, boardId, 'activity:new', {
    activity: { _id: activity._id, text, createdAt: activity.createdAt, user: req.user.toPublic() },
  });
  broadcast(req, boardId, 'board:sync', { by: req.user.name });
}
