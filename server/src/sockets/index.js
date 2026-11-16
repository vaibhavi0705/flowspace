import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getBoardForUser } from '../utils/access.js';

// boardId -> Map(userId -> { user, sockets: Set<socketId> })
// A user with two tabs open counts once, and only disappears when both close.
const presence = new Map();

function addPresence(boardId, socket) {
  if (!presence.has(boardId)) presence.set(boardId, new Map());
  const room = presence.get(boardId);
  const key = String(socket.user._id);
  if (!room.has(key)) room.set(key, { user: socket.user, sockets: new Set() });
  room.get(key).sockets.add(socket.id);
}

function removePresence(boardId, socket) {
  const room = presence.get(boardId);
  if (!room) return;
  const key = String(socket.user._id);
  const entry = room.get(key);
  if (!entry) return;
  entry.sockets.delete(socket.id);
  if (entry.sockets.size === 0) room.delete(key);
  if (room.size === 0) presence.delete(boardId);
}

function announce(io, boardId) {
  const users = [...(presence.get(boardId)?.values() ?? [])].map((e) => e.user);
  io.to(`board:${boardId}`).emit('presence:update', { boardId, users });
}

export function initSockets(io) {
  // Every connection must present a valid JWT in the handshake
  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user) return next(new Error('unauthorized'));
      socket.user = user.toPublic();
      socket.data.userId = String(user._id);
      socket.data.boards = new Set();
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const leave = (boardId) => {
      if (!socket.data.boards.has(boardId)) return;
      socket.data.boards.delete(boardId);
      socket.leave(`board:${boardId}`);
      removePresence(boardId, socket);
      announce(io, boardId);
    };

    socket.on('board:join', async (boardId) => {
      try {
        await getBoardForUser(boardId, socket.user._id); // members only
        const id = String(boardId);
        socket.join(`board:${id}`);
        socket.data.boards.add(id);
        addPresence(id, socket);
        announce(io, id);
      } catch {
        socket.emit('board:denied', { boardId });
      }
    });

    socket.on('board:leave', (boardId) => leave(String(boardId)));

    socket.on('disconnect', () => {
      for (const boardId of [...socket.data.boards]) leave(boardId);
    });
  });
}
