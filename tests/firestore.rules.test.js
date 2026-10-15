import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

const projectId = 'iea-rules-test';
const preEmail = 'admin@example.com';
const prePath = `users/pre-${preEmail}`;
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), prePath), {
      email: preEmail,
      name: 'Admin pre-asignado',
      role: ['CampusAdmin'],
      campusIds: ['campus-1'],
      defaultCampusId: 'campus-1',
    });
  });
});

after(async () => {
  await testEnv.cleanup();
});

test('allows a user to read only their matching pre-assignment', async () => {
  const context = testEnv.authenticatedContext('new-user', { email: preEmail });

  await assertSucceeds(getDoc(doc(context.firestore(), prePath)));
});

test('denies a different user access to the pre-assignment', async () => {
  const context = testEnv.authenticatedContext('other-user', { email: 'other@example.com' });

  await assertFails(getDoc(doc(context.firestore(), prePath)));
});

test('keeps pre-assignments read-only for the invited user', async () => {
  const context = testEnv.authenticatedContext('new-user', { email: preEmail });
  const preDoc = doc(context.firestore(), prePath);

  await assertFails(setDoc(preDoc, { role: ['Admin'] }, { merge: true }));
  await assertFails(deleteDoc(preDoc));
});

test('allows the invited user to create their own user document', async () => {
  const context = testEnv.authenticatedContext('new-user', { email: preEmail });

  await assertSucceeds(setDoc(doc(context.firestore(), 'new-user'), {
    email: preEmail,
    role: ['CampusAdmin'],
    campusIds: ['campus-1'],
    defaultCampusId: 'campus-1',
  }));
});

test('keeps Admin access to pre-assignments', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'users/admin-user'), {
      email: 'owner@example.com',
      role: 'Admin',
    });
  });

  const context = testEnv.authenticatedContext('admin-user', { email: 'owner@example.com' });
  await assertSucceeds(getDoc(doc(context.firestore(), prePath)));
});
