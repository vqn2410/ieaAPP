import { admin, getDefaultAdmin } from './_lib/firebase-admin.js';
import { httpError, methodGuard, handleError } from './_lib/http.js';
import { requireUser, requireRole } from './_lib/auth.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, 'POST')) return;

  try {
    const { user, roles } = await requireUser(req);
    requireRole(roles, 'Admin');

    const { topic, q, a } = req.body || {};
    if (![topic, q, a].every((value) => typeof value === 'string' && value.trim())) {
      throw httpError(400, 'Tema, pregunta y respuesta son obligatorios.');
    }
    const answer = a.trim().slice(0, 4000);
    const ref = await getDefaultAdmin().firestore().collection('knowledge').add({
      topic: topic.trim().slice(0, 120),
      question: q.trim().slice(0, 1000),
      answer,
      createdBy: user.id,
      createdAt: admin.firestore.Timestamp.now(),
    });
    return res.status(200).json({ id: ref.id, chunks: 1 });
  } catch (error) {
    return handleError(res, error, 'knowledge');
  }
}
