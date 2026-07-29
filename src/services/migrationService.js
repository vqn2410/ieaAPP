import { getMembers, updateMember } from './memberService';
import { normalizeString, fixSanchezEncoding, migrateGroupName } from '../utils/helpers';

const peopleToOrtiz = [
  'diaz, micaela trinidad', 'furia, giselle', 'furia, jorge alberto',
  'gomez, rocio', 'larralde, ines', 'pereira, marcia abigail',
  'perez, jesus sebastian', 'pino, daniela', 'quaresima, veronica alicia',
  'sanchez, franco ezequiel', 'sierra, karen aez', 'sierra, karen anez',
  'tevez, misael jorge', 'wilde, yeison',
];

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

    const normalizedFullName = normalizeString(`${m.lastName}, ${m.firstName}`)
      .toLowerCase().trim().replace(/\s+/g, ' ');

    if (peopleToOrtiz.includes(normalizedFullName) && m.group !== 'ORTIZ-HARDOY (MARTES)') {
      m.group = 'ORTIZ-HARDOY (MARTES)';
      updated = true;
    }

    if (updated) {
      await updateMember(m.id, { group: m.group, lastName: m.lastName, firstName: m.firstName });
      madeChanges = true;
    }
  }

  return madeChanges;
}
