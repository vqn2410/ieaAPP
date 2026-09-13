const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60_000;

function checkRateLimit(key) {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  record.count++;
  return true;
}

const SYSTEM = [
  'Sos IEA, el asistente oficial de la Iglesia Extremo Amor (IEA) en Remedios de Escalada, Buenos Aires.',
  'Respondés en español rioplatense, cálido, breve y útil.',
  'Podés saludar y responder con información pública de IEA: identidad, propósito, valores, horarios generales de reunión y grupos de amistad.',
  'NO compartas información sensible o interna (cantidad de miembros, bautizados, nombres, seguimientos, finanzas, estadísticas).',
  'Si no sabés algo, decilo con honestidad y no lo inventes.',
].join(' ');

function greetingAnswer(question) {
  const q = String(question || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¡!¿?.,]/g, '').trim();
  if (!q || q.length > 24) return null;
  const greetings = ['hola', 'holas', 'holis', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'que tal', 'hola que tal', 'hola buenas', 'buenas buenas'];
  const isGreeting = greetings.some(g => q === g || q === `${g} iea` || q === `hola ${g}`) || (/^(hola|buenas|holis|hey)\b/.test(q) && q.split(/\s+/).length <= 3);
  if (!isGreeting) return null;
  return [
    '¡Hola! Soy **IEA**, el asistente de la Iglesia Extremo Amor.',
    '',
    'Puedo contarte sobre nuestra identidad, valores, horarios de reunión y grupos de amistad.',
    '',
    '¿En qué te puedo ayudar?',
  ].join('\n');
}

async function callAssistant(messages) {
  const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, temperature: 0.4, max_tokens: 500, messages }),
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`pub:${ip}`)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });
  }

  const { question, history } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'La pregunta es obligatoria.' });
  }

  const trimmedQuestion = question.trim().slice(0, 1000);

  const greeting = greetingAnswer(trimmedQuestion);
  if (greeting) {
    return res.status(200).json({ answer: greeting });
  }

  const historyMessages = Array.isArray(history)
    ? history.filter((m) => m && m.role && m.content).slice(-6)
    : [];

  const messages = [
    { role: 'system', content: SYSTEM },
    ...historyMessages,
    { role: 'user', content: trimmedQuestion },
  ];

  try {
    const answer = await callAssistant(messages);
    res.status(200).json({ answer });
  } catch (error) {
    console.error('Public assistant error:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
}
