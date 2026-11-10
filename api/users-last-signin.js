import { getDefaultAdmin } from './_lib/firebase-admin.js';
import { applyCors, methodGuard, handleError } from './_lib/http.js';
import { requireUser, requireRole } from './_lib/auth.js';

/**
 * GET /api/users-last-signin
 * Devuelve la última conexión (lastSignInTime de Firebase Auth) de los usuarios.
 *
 * - Sin parámetros: devuelve un mapa `{ email: lastSignInTime|null }` de todos
 *   los usuarios de autenticación.
 * - Con `?email=foo@bar.com`: devuelve únicamente la última conexión de ese email.
 *
 * Requiere rol Admin o Pastor.
 */
export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (methodGuard(req, res, 'GET')) return;

  try {
    const { roles } = await requireUser(req);
    requireRole(roles, ['Admin', 'Pastor']);

    const app = getDefaultAdmin();
    const requestedEmail = String(req.query?.email || '').trim().toLowerCase();
    const users = {};

    if (requestedEmail) {
      try {
        const record = await app.auth().getUserByEmail(requestedEmail);
        users[requestedEmail] = record.metadata?.lastSignInTime || null;
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
        users[requestedEmail] = null;
      }
    } else {
      let nextPageToken;
      do {
        const listResult = await app.auth().listUsers(1000, nextPageToken);
        listResult.users.forEach((record) => {
          const email = String(record.email || '').trim().toLowerCase();
          if (email) users[email] = record.metadata?.lastSignInTime || null;
        });
        nextPageToken = listResult.pageToken;
      } while (nextPageToken);
    }

    return res.status(200).json({ users });
  } catch (error) {
    return handleError(res, error, 'users-last-signin');
  }
}
