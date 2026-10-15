import {
  authenticateCommunication,
  handleCommunicationError,
  sendCommunication,
} from './_lib/communication.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido. Usa POST.' });

  try {
    await authenticateCommunication(req);
    const { channel, message } = req.body || {};
    const result = await sendCommunication(channel, message);
    return res.status(202).json(result);
  } catch (error) {
    return handleCommunicationError(res, error);
  }
}
