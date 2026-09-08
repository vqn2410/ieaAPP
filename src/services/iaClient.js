const BASE = (import.meta.env.VITE_IA_BACKEND_URL || '').replace(/\/+$/, '');

export function iaUrl(path) {
  return BASE ? BASE + path : path;
}