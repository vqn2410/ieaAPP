/**
 * Rate limiter en memoria (ventana fija). Es suficiente para desarrollo y
 * despliegues de una sola instancia. Para producción multi-instancia conviene
 * respaldarlo en un almacén compartido (Redis/Upstash o Firestore).
 *
 * @param {{ max: number, windowMs: number }} options
 * @returns {{ check: (key: string) => boolean }}
 */
export function createRateLimiter({ max, windowMs }) {
  const hits = new Map();

  return {
    check(key) {
      const now = Date.now();
      const record = hits.get(key);
      if (!record || now - record.windowStart >= windowMs) {
        hits.set(key, { windowStart: now, count: 1 });
        return true;
      }
      if (record.count >= max) return false;
      record.count += 1;
      return true;
    },
  };
}
