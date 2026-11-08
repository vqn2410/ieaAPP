/* global process, Buffer */
import test from 'node:test';
import assert from 'node:assert/strict';
import { decodePrivateKey, readServiceAccount } from '../api/_lib/firebase-admin.js';

const PEM = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';

test('decodePrivateKey devuelve cadena vacía sin valor', () => {
  assert.equal(decodePrivateKey(null), '');
  assert.equal(decodePrivateKey(undefined), '');
  assert.equal(decodePrivateKey(''), '');
});

test('decodePrivateKey conserva un PEM directo y normaliza saltos', () => {
  const escaped = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';
  assert.equal(decodePrivateKey(escaped), PEM);
});

test('decodePrivateKey extrae private_key de un JSON', () => {
  const json = JSON.stringify({ private_key: 'line1\\nline2' });
  assert.equal(decodePrivateKey(json), 'line1\nline2');
});

test('decodePrivateKey decodifica Base64', () => {
  const encoded = Buffer.from(PEM).toString('base64');
  assert.equal(decodePrivateKey(encoded), PEM);
});

test('readServiceAccount devuelve null si faltan credenciales', () => {
  const previousEmail = process.env.TESTX_CLIENT_EMAIL;
  const previousKey = process.env.TESTX_PRIVATE_KEY;
  delete process.env.TESTX_CLIENT_EMAIL;
  delete process.env.TESTX_PRIVATE_KEY;
  try {
    assert.equal(readServiceAccount('TESTX', 'fallback'), null);
  } finally {
    if (previousEmail === undefined) delete process.env.TESTX_CLIENT_EMAIL;
    else process.env.TESTX_CLIENT_EMAIL = previousEmail;
    if (previousKey === undefined) delete process.env.TESTX_PRIVATE_KEY;
    else process.env.TESTX_PRIVATE_KEY = previousKey;
  }
});

test('readServiceAccount resuelve credenciales desde variables de entorno', () => {
  process.env.TESTY_PROJECT_ID = 'proj-test';
  process.env.TESTY_CLIENT_EMAIL = 'svc@proj-test.iam.gserviceaccount.com';
  process.env.TESTY_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';
  try {
    const credentials = readServiceAccount('TESTY', 'fallback');
    assert.equal(credentials.projectId, 'proj-test');
    assert.equal(credentials.clientEmail, 'svc@proj-test.iam.gserviceaccount.com');
    assert.equal(credentials.privateKey, PEM);
  } finally {
    delete process.env.TESTY_PROJECT_ID;
    delete process.env.TESTY_CLIENT_EMAIL;
    delete process.env.TESTY_PRIVATE_KEY;
  }
});

test('readServiceAccount completa project_id y client_email desde un JSON', () => {
  const serviceAccount = {
    project_id: 'from-json',
    client_email: 'json@example.com',
    private_key: 'line1\\nline2',
  };
  process.env.TESTZ_PRIVATE_KEY_BASE64 = Buffer.from(JSON.stringify(serviceAccount)).toString('base64');
  try {
    const credentials = readServiceAccount('TESTZ', 'fallback');
    assert.equal(credentials.projectId, 'from-json');
    assert.equal(credentials.clientEmail, 'json@example.com');
    assert.equal(credentials.privateKey, 'line1\nline2');
  } finally {
    delete process.env.TESTZ_PRIVATE_KEY_BASE64;
  }
});
