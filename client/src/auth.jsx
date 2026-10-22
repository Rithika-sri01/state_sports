import { createContext, useContext, useState } from 'react';
import { api } from './api';
const Ctx = createContext();
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('ssa_user')); } catch { return null; } });
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('ssa_token', data.token); localStorage.setItem('ssa_user', JSON.stringify(data.user)); setUser(data.user); return data.user;
  };
  const logout = () => { localStorage.clear(); setUser(null); };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
