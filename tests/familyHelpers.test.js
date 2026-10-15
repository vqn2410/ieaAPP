import assert from 'node:assert/strict';
import test from 'node:test';
import {
  reciprocalRelationship,
  removeFamilyLink,
  upsertFamilyLink,
} from '../src/utils/familyHelpers.js';

test('defines reciprocal family relationships', () => {
  assert.equal(reciprocalRelationship['Padre/madre'], 'Hijo/a');
  assert.equal(reciprocalRelationship['Hijo/a'], 'Padre/madre');
  assert.equal(reciprocalRelationship['Cónyuge'], 'Cónyuge');
});

test('replaces an existing link to avoid duplicates', () => {
  const result = upsertFamilyLink(
    [{ memberId: 'm-2', relationship: 'Hermano/a' }],
    'm-2',
    'Hijo/a',
  );

  assert.deepEqual(result, [{ memberId: 'm-2', relationship: 'Hijo/a' }]);
});

test('removes only the requested family link', () => {
  const result = removeFamilyLink([
    { memberId: 'm-2', relationship: 'Hijo/a' },
    { memberId: 'm-3', relationship: 'Cónyuge' },
  ], 'm-2');

  assert.deepEqual(result, [{ memberId: 'm-3', relationship: 'Cónyuge' }]);
});
