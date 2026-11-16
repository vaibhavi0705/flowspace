// Empty string in development (the Vite proxy handles it); full API origin in production
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const TOKEN_KEY = 'fs_token';
