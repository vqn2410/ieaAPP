import {
  authenticateCommunication,
  sendCommunication,
} from './_lib/communication.js';
import { methodGuard, handleError } from './_lib/http.js';

export default async function handler(req, res) {
  if (methodGuard(req, res, 'POST')) return;

  try {
    await authenticateCommunication(req);
    const { channel, message } = req.body || {};
    const result = await sendCommunication(channel, message);
    return res.status(202).json(result);
  } catch (error) {
    return handleError(res, error, 'communication');
  }
}
