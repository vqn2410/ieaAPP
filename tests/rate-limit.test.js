import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../api/_lib/rate-limit.js';

test('permite hasta max solicitudes en la ventana', () => {
  const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
  assert.equal(limiter.check('ip:1'), true);
  assert.equal(limiter.check('ip:1'), true);
  assert.equal(limiter.check('ip:1'), true);
  assert.equal(limiter.check('ip:1'), false);
});

test('aisla el conteo por clave', () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
  assert.equal(limiter.check('ip:1'), true);
  assert.equal(limiter.check('ip:2'), true);
  assert.equal(limiter.check('ip:1'), false);
});

test('reinicia la ventana después de windowMs', async () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 20 });
  assert.equal(limiter.check('ip:1'), true);
  assert.equal(limiter.check('ip:1'), false);
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(limiter.check('ip:1'), true);
});
