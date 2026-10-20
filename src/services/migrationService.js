import { getMembers, updateMember } from './memberService';
import { fixSanchezEncoding, migrateGroupName } from '../utils/helpers';

export async function runMemberMigration() {
  const data = await getMembers();
  let madeChanges = false;

  for (const m of data) {
    let updated = false;

    const newGroup = migrateGroupName(m.group);
    if (newGroup !== m.group) { m.group = newGroup; updated = true; }

    const fixedLast = fixSanchezEncoding(m.lastName);
    if (fixedLast !== m.lastName) { m.lastName = fixedLast; updated = true; }

    const fixedFirst = fixSanchezEncoding(m.firstName);
    if (fixedFirst !== m.firstName) { m.firstName = fixedFirst; updated = true; }

    if (updated) {
      await updateMember(m.id, { group: m.group, lastName: m.lastName, firstName: m.firstName });
      madeChanges = true;
    }
  }

  return madeChanges;
}
