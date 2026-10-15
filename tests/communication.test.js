/* global process */
import assert from 'node:assert/strict';
import test from 'node:test';
import { sendCommunication } from '../api/_lib/communication.js';

test('rejects communication when the provider is not configured', async () => {
  const previousProvider = process.env.COMMUNICATION_PROVIDER;
  const previousViteProvider = process.env.VITE_COMMUNICATION_PROVIDER;
  delete process.env.COMMUNICATION_PROVIDER;
  delete process.env.VITE_COMMUNICATION_PROVIDER;

  try {
    await assert.rejects(
      sendCommunication('email', { to: 'member@example.com', body: 'Mensaje de prueba' }),
      error => error.code === 'COMMUNICATION_PROVIDER_NOT_CONFIGURED'
        && error.statusCode === 503,
    );
  } finally {
    if (previousProvider === undefined) delete process.env.COMMUNICATION_PROVIDER;
    else process.env.COMMUNICATION_PROVIDER = previousProvider;
    if (previousViteProvider === undefined) delete process.env.VITE_COMMUNICATION_PROVIDER;
    else process.env.VITE_COMMUNICATION_PROVIDER = previousViteProvider;
  }
});
