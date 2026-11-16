import { io } from 'socket.io-client';
import { API_URL } from './config';

// One socket per signed-in session, shared by the whole app
let socket = null;

export function connectSocket(token) {
  if (socket) return socket;
  socket = io(API_URL || undefined, { auth: { token }, transports: ['websocket', 'polling'] });
  return socket;
}

export const getSocket = () => socket;
export const getSocketId = () => socket?.id;

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
