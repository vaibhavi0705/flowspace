import axios from 'axios';
import { API_URL, TOKEN_KEY } from '../config';
import { getSocketId } from '../socket';

const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Lets the server skip echoing our own changes back to this tab
  const socketId = getSocketId();
  if (socketId) config.headers['x-socket-id'] = socketId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthCall = err.config?.url?.startsWith('/auth/') && err.config.url !== '/auth/me';
    if (err.response?.status === 401 && !isAuthCall && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Turns any axios error into a message that is safe to show a user
export function errMsg(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection and try again';
  return 'Something went wrong. Please try again';
}

export default api;
