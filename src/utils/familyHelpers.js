export const reciprocalRelationship = {
  'Padre/madre': 'Hijo/a',
  'Hijo/a': 'Padre/madre',
  'Cónyuge': 'Cónyuge',
  'Hermano/a': 'Hermano/a',
  'Tutor': 'Tutelado/a',
  'Tutelado/a': 'Tutor',
};

export const normalizeFamilyLinks = links => Array.isArray(links)
  ? links.filter(link => link?.memberId && link?.relationship)
  : [];

export const upsertFamilyLink = (links, memberId, relationship) => [
  ...normalizeFamilyLinks(links).filter(link => link.memberId !== memberId),
  { memberId, relationship },
];

export const removeFamilyLink = (links, memberId) => normalizeFamilyLinks(links)
  .filter(link => link.memberId !== memberId);
