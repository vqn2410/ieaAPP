import { getDefaultAdmin } from './_lib/firebase-admin.js';
import { httpError, methodGuard, handleError } from './_lib/http.js';
import { requireUser, requireRole } from './_lib/auth.js';
import { createRateLimiter } from './_lib/rate-limit.js';

const limiter = createRateLimiter({ max: 20, windowMs: 60_000 });

async function callAssistant(question, knowledge = []) {
  const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  const system = [
    'Sos IEA, el asistente oficial de la Iglesia Extremo Amor (IEA) en Remedios de Escalada, Buenos Aires.',
    'Respondés en español rioplatense, de forma breve, amable y útil.',
    'Solo respondés con información de IEA que se te dé en esta conversación. No usés conocimiento general, internet ni datos externos.',
    'Si la información no está disponible, decilo con honestidad y no inventes.',
    'No compartas información sensible o interna (nombres, seguimientos, finanzas o estadísticas) salvo que el rol autenticado tenga autorización.',
    knowledge.length > 0
      ? `Usá también este conocimiento oficial de IEA cuando sea relevante:\n${knowledge.map(item => `Tema: ${item.topic}\nPregunta: ${item.question}\nRespuesta: ${item.answer}`).join('\n\n')}`
      : 'No hay conocimiento adicional cargado por la iglesia.',
  ].join(' ');

  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 600,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Error de la IA (${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const answer = data?.choices?.[0]?.message?.content;
  if (!answer) throw new Error('Respuesta vacía del modelo.');
  return answer.trim();
}

export default async function handler(req, res) {
  if (methodGuard(req, res, 'POST')) return;

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!limiter.check(`ip:${ip}`)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });
  }

  try {
    const { roles } = await requireUser(req);
    requireRole(roles, ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator']);

    const { question } = req.body || {};
    if (!question || typeof question !== 'string') {
      throw httpError(400, 'La pregunta es obligatoria.');
    }
    const trimmedQuestion = question.trim().slice(0, 1000);

    const knowledgeSnapshot = await getDefaultAdmin().firestore().collection('knowledge').get();
    const knowledge = knowledgeSnapshot.docs
      .map((item) => item.data())
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .slice(0, 30);

    const answer = await callAssistant(trimmedQuestion, knowledge);
    return res.status(200).json({ answer });
  } catch (error) {
    return handleError(res, error, 'assistant');
  }
}
