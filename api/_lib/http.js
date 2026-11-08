/**
 * Utilidades HTTP compartidas por las funciones serverless: errores tipados,
 * guard de método, manejo de errores consistente, CORS y lectura de token.
 */

export class HttpError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    if (code) this.code = code;
  }
}

/** Fábrica corta para crear un HttpError. */
export function httpError(statusCode, message, code) {
  return new HttpError(statusCode, message, code);
}

/** Normaliza un valor a arreglo (roles y permisos pueden venir como string o lista). */
export function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

/** Lee el token Bearer del header `Authorization`. */
export function readBearerToken(req) {
  const header = req.headers?.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

/**
 * Rechaza la petición si el método no está permitido. Devuelve `true` cuando
 * ya se respondió (y el handler debe terminar), `false` en caso contrario.
 */
export function methodGuard(req, res, allowed) {
  const methods = asArray(allowed);
  if (methods.includes(req.method)) return false;
  res.status(405).json({ error: `Método no permitido. Usá ${methods.join(' o ')}.` });
  return true;
}

/**
 * Envía una respuesta de error consistente.
 *
 * - 500 (error inesperado): se loguea el detalle y se responde con un mensaje
 *   genérico, para no filtrar detalles internos al cliente.
 * - 4xx / 502 / 503: se expone el mensaje (intencional) y el `code` si existe.
 */
export function handleError(res, error, context = '') {
  const status = Number(error?.statusCode) || 500;
  if (status >= 500) {
    console.error(`[api${context ? `:${context}` : ''}]`, error);
  }
  const message =
    status === 500 ? 'No se pudo completar la operación.' : error?.message || 'No se pudo completar la operación.';
  const body = { error: message };
  if (status !== 500 && error?.code) body.code = error.code;
  return res.status(status).json(body);
}

/**
 * Aplica cabeceras CORS.
 *
 * - `allowedOrigins = null`: endpoint público (permite cualquier origen, sin credenciales).
 * - `allowedOrigins = 'https://a.com, https://b.com'`: allowlist. Devuelve `false`
 *   si el origen no está permitido.
 */
export function applyCors(req, res, { allowedOrigins = null } = {}) {
  const origin = req.headers?.origin;

  if (allowedOrigins == null) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    if (origin) res.setHeader('Vary', 'Origin');
  } else {
    const set = new Set(String(allowedOrigins).split(',').map((v) => v.trim()).filter(Boolean));
    if (origin && !set.has(origin)) return false;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  }

  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '600');
  return true;
}

/**
 * Atiende preflight OPTIONS y aplica CORS. Devuelve `true` cuando la petición
 * ya fue respondida (y el handler debe terminar).
 */
export function handleOptions(req, res, { allowedOrigins = null } = {}) {
  if (!applyCors(req, res, { allowedOrigins })) {
    res.status(403).json({ error: 'Origen no autorizado.' });
    return true;
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
