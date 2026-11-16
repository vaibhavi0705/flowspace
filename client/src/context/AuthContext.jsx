import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import { TOKEN_KEY } from '../config';
import { connectSocket, disconnectSocket } from '../socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // While a saved token is being verified we show a loader instead of flashing the login page
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  // The socket is opened here, before `user` is set, so child pages always find it ready
  const startSession = useCallback(({ token, user: u }) => {
    localStorage.setItem(TOKEN_KEY, token);
    connectSocket(token);
    setUser(u);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    api
      .get('/auth/me')
      .then((res) => {
        connectSocket(token);
        setUser(res.data.user);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => startSession((await api.post('/auth/login', { email, password })).data);
  const register = async (name, email, password) =>
    startSession((await api.post('/auth/register', { name, email, password })).data);
  const guest = async () => startSession((await api.post('/auth/guest')).data);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    disconnectSocket();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, guest, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
