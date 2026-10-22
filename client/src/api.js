import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
api.interceptors.request.use(c => { const t = localStorage.getItem('ssa_token'); if (t) c.headers.Authorization = 'Bearer ' + t; return c; });
api.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401 && !e.config.url.includes('/auth/login')) { localStorage.clear(); window.location.href = '/login'; }
  return Promise.reject(e);
});
export const err = e => e.response?.data?.message || e.message || 'Something went wrong';
const fileBase = import.meta.env.VITE_FILE_URL || (import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL, window.location.origin).origin : '');
export const fileUrl = u => (!u ? '' : u.startsWith('http') ? u : `${fileBase.replace(/\/$/, '')}${u}`);
