import { auth } from './firebase';

const API_URL = import.meta.env.VITE_COMMUNICATION_API_URL || '/api/communication';

async function send(channel, message) {
  const user = auth.currentUser;
  if (!user) throw new Error('Iniciá sesión para enviar comunicaciones.');

  const token = await user.getIdToken();
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, message }),
    });
  } catch {
    throw new Error('No se pudo conectar con el servicio de comunicaciones.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'No se pudo enviar la comunicación.');
    error.code = data.code;
    throw error;
  }
  return data;
}

export const sendEmail = message => send('email', message);
export const sendSms = message => send('sms', message);
export const sendPush = message => send('push', message);
