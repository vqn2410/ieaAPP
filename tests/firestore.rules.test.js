import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';

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

  await assertSucceeds(setDoc(doc(context.firestore(), 'users', 'new-user'), {
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

test('allows a member to query only their own member profile by exact email', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'members/member-1'), {
      email: 'person@example.com',
      firstName: 'Persona',
      lastName: 'Prueba',
    });
  });

  const context = testEnv.authenticatedContext('member-1', { email: 'person@example.com' });
  const ownQuery = query(collection(context.firestore(), 'members'), where('email', '==', 'person@example.com'));

  await assertSucceeds(getDocs(ownQuery));
});

test('allows facilitators to read only assigned groups and their members by UID', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, 'groups/group-1'), {
      name: 'Grupo Uno',
      campusId: 'campus-1',
      facilitatorUids: ['facilitator-uid'],
    });
    await setDoc(doc(firestore, 'members/member-1'), {
      firstName: 'Miembro',
      lastName: 'Asignado',
      groupId: 'group-1',
      campusId: 'campus-1',
    });
  });

  const facilitator = testEnv.authenticatedContext('facilitator-uid', { email: 'facilitator@example.com' });
  const otherUser = testEnv.authenticatedContext('other-uid', { email: 'other@example.com' });
  await assertSucceeds(getDoc(doc(facilitator.firestore(), 'groups/group-1')));
  await assertSucceeds(getDoc(doc(facilitator.firestore(), 'members/member-1')));
  await assertFails(getDoc(doc(otherUser.firestore(), 'groups/group-1')));
  await assertFails(getDoc(doc(otherUser.firestore(), 'members/member-1')));
});
