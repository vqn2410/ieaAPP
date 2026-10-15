const CONFIGURED_BASE = (import.meta.env.VITE_IA_BACKEND_URL || '').replace(/\/+$/, '');
const LOCAL_BACKEND = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;

export function iaUrl(path) {
  // In production, localhost refers to each visitor's own device, not Vercel.
  const base = import.meta.env.PROD && LOCAL_BACKEND.test(CONFIGURED_BASE)
    ? ''
    : CONFIGURED_BASE;
  return base ? base + path : path;
}
