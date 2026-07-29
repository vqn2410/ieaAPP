/**
 * Helper functions for Portal IEA
 */

/**
 * Removes accents and tildes from a string
 */
export const normalizeString = (str) => {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

/**
 * Fixes broken 'Sánchez' encodings
 */
export const fixSanchezEncoding = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/S[^\w]?nchez/gi, (match) => {
    return match.charAt(0) === 'S' ? 'Sánchez' : 'sánchez';
  });
};

/**
 * Groups migration logic (moved from components)
 */
export const migrateGroupName = (groupName) => {
  if (typeof groupName !== 'string') return groupName;
  
  if (groupName === '8. Perez, Pereira (La Tribu) - Viernes') return 'LA TRIBU';
  if (groupName.includes('5. Quaresima')) return 'QUARESIMA';
  if (groupName.includes('4. Ortiz')) return 'ORTIZ-HARDOY (MARTES)';
  if (groupName.includes('3. T')) return 'TEVEZ-DIAZ';
  if (groupName.includes('10. Sanchez')) return 'SANCHEZ';
  if (groupName.includes('2. Jara, Gomez')) return 'JARA-GÓMEZ';
  if (groupName.includes('9. Fernando, Díaz') || groupName.includes('9. Fernando, Diaz')) return 'DIAZ-DIAZ (VIERNES)';
  if (groupName.includes('6. Rivas, Coronel')) return 'RIVAS-CORONEL (MATRIMONIOS)';
  
  return groupName;
};

/**
 * Formats a date to local Argentinian string
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return 'Sin fecha';
  return new Date(dateStr + "T12:00:00").toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
};

export const getArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') return val.split(',').map(s => s.trim());
  return [];
};

export const isBaptised = (member) => {
  const baptismPathStatus = normalizeString(member?.growthPath?.Bautismo?.status).trim().toLowerCase();
  if (['realizado', 'completo', 'completado'].includes(baptismPathStatus)) return true;

  const value = member?.extraData?.baptism ?? member?.baptism ?? member?.bautismo;
  if (value === true || value === 1) return true;
  return ['si', 'yes', 'true', '1', 'bautizado', 'bautizada'].includes(
    normalizeString(value).trim().toLowerCase()
  );
};
