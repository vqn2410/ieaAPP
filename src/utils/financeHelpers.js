/**
 * Utilidades puras para el alcance y cruce financiero por campus/sede.
 */

export function normalizeFinanceText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determina si una sede (ID o nombre) de IEA Finanzas corresponde a un campus de IEA APP.
 * - Sede Central: incluye 'central', 'sedecentral' y registros legacy sin sede.
 * - Apóstoles: incluye 'apostoles' o variantes con 'apostol'.
 * - Las Heras: incluye 'las-heras', 'lasheras' o variantes con 'heras'.
 */
export function matchesCampusFinance(sedeIdOrName, campus) {
  if (!campus) return true;
  const raw = normalizeFinanceText(String(sedeIdOrName || ''));
  const slug = normalizeFinanceText(String(campus.slug || ''));
  const name = normalizeFinanceText(String(campus.name || ''));
  const id = normalizeFinanceText(String(campus.id || ''));

  // Caso Sede Central
  if (slug.includes('central') || name.includes('central') || id.includes('central')) {
    if (!raw) return true; // Datos legacy sin sede corresponden a Sede Central
    return raw === 'central' || raw === 'sedecentral' || raw.includes('central');
  }

  // Caso Apóstoles
  if (slug.includes('apostol') || name.includes('apostol') || id.includes('apostol')) {
    if (!raw) return false;
    return raw.includes('apostol');
  }

  // Caso Las Heras
  if (slug.includes('heras') || name.includes('heras') || id.includes('heras')) {
    if (!raw) return false;
    return raw.includes('heras');
  }

  // Otro campus
  if (!raw) return false;
  return (name && raw.includes(name)) || (slug && raw.includes(slug)) || raw === id;
}
