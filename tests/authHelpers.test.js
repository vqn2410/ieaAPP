import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUserDataFromPreAssignment } from '../src/utils/authHelpers.js';

test('builds a user from a campus pre-assignment', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const result = buildUserDataFromPreAssignment({
    name: 'Ana Pérez',
    role: ['CampusAdmin'],
    campusIds: ['campus-1'],
    defaultCampusId: 'campus-1',
    isPending: true,
  }, 'ANA@EXAMPLE.COM', 'Fallback', createdAt);

  assert.deepEqual(result, {
    role: ['CampusAdmin'],
    email: 'ana@example.com',
    name: 'Ana Pérez',
    campusIds: ['campus-1'],
    defaultCampusId: 'campus-1',
    needsPasswordChange: true,
    createdAt,
  });
  assert.equal('isPending' in result, false);
});

test('uses safe defaults for incomplete pre-assignments', () => {
  const result = buildUserDataFromPreAssignment({ campusIds: 'campus-1' }, 'user@example.com', 'Usuario');

  assert.deepEqual(result.role, ['Member']);
  assert.equal(result.name, 'Usuario');
  assert.deepEqual(result.campusIds, []);
  assert.equal(result.defaultCampusId, null);
  assert.equal(result.needsPasswordChange, true);
  assert.ok(result.createdAt instanceof Date);
});
