// For production, set these environment variables in your hosting provider (Vercel/Netlify/etc)
// If not set, it defaults to the current hostname (useful for same-server deployment)
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const API_URL = import.meta.env.VITE_API_BASE_URL || `http://${hostname}:8080`;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_BASE_URL || API_URL;
