import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HttpError,
  httpError,
  asArray,
  readBearerToken,
  methodGuard,
  handleError,
  applyCors,
  handleOptions,
} from '../api/_lib/http.js';

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { this.ended = true; return this; },
  };
}

// Silencia console.error durante un bloque (handleError loguea los 5xx).
async function withoutConsoleError(fn) {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

test('HttpError guarda statusCode, message y code', () => {
  const err = new HttpError(404, 'No encontrado', 'NOT_FOUND');
  assert.equal(err.name, 'HttpError');
  assert.equal(err.statusCode, 404);
  assert.equal(err.message, 'No encontrado');
  assert.equal(err.code, 'NOT_FOUND');
});

test('httpError es una fábrica corta', () => {
  const err = httpError(400, 'Malo');
  assert.equal(err.name, 'HttpError');
  assert.equal(err.statusCode, 400);
  assert.equal(err.code, undefined);
});

test('asArray normaliza string, arreglo y valores vacíos', () => {
  assert.deepEqual(asArray('Admin'), ['Admin']);
  assert.deepEqual(asArray(['A', 'B']), ['A', 'B']);
  assert.deepEqual(asArray(null), []);
  assert.deepEqual(asArray(undefined), []);
  assert.deepEqual(asArray(''), []);
});

test('readBearerToken extrae el token en distintos formatos', () => {
  assert.equal(readBearerToken({ headers: { authorization: 'Bearer abc.def' } }), 'abc.def');
  assert.equal(readBearerToken({ headers: { authorization: 'bearer XYZ' } }), 'XYZ');
  assert.equal(readBearerToken({ headers: {} }), '');
  assert.equal(readBearerToken({}), '');
});

test('methodGuard deja pasar el método correcto', () => {
  const res = mockRes();
  assert.equal(methodGuard({ method: 'POST' }, res, 'POST'), false);
  assert.equal(res.statusCode, 200);
});

test('methodGuard rechaza método incorrecto con 405', () => {
  const res = mockRes();
  assert.equal(methodGuard({ method: 'GET' }, res, ['POST', 'PUT']), true);
  assert.equal(res.statusCode, 405);
  assert.match(res.body.error, /POST o PUT/);
});

test('handleError oculta el detalle de errores 500 inesperados', async () => {
  await withoutConsoleError(() => {
    const res = mockRes();
    handleError(res, new Error('detalle interno sensible'), 'test');
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error, 'No se pudo completar la operación.');
  });
});

test('handleError expone mensaje y code en errores 4xx', () => {
  const res = mockRes();
  handleError(res, httpError(403, 'Acceso denegado.', 'FORBIDDEN'), 'test');
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: 'Acceso denegado.', code: 'FORBIDDEN' });
});

test('handleError expone mensaje en 503 (configuración pendiente)', async () => {
  await withoutConsoleError(() => {
    const res = mockRes();
    handleError(res, httpError(503, 'El proveedor no está configurado.', 'COMMUNICATION_PROVIDER_NOT_CONFIGURED'));
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, 'El proveedor no está configurado.');
  });
});

test('applyCors público permite cualquier origen', () => {
  const res = mockRes();
  const ok = applyCors({ headers: { origin: 'https://example.com' } }, res);
  assert.equal(ok, true);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://example.com');
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'GET, POST, PUT, DELETE, OPTIONS');
});

test('applyCors con allowlist rechaza orígenes no permitidos', () => {
  const res = mockRes();
  const ok = applyCors(
    { headers: { origin: 'https://evil.com' } },
    res,
    { allowedOrigins: 'https://iea-finanzas.vercel.app' },
  );
  assert.equal(ok, false);
});

test('handleOptions responde al preflight permitido', () => {
  const res = mockRes();
  const done = handleOptions(
    { method: 'OPTIONS', headers: { origin: 'https://iea-finanzas.vercel.app' } },
    res,
    { allowedOrigins: 'https://iea-finanzas.vercel.app' },
  );
  assert.equal(done, true);
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
});
