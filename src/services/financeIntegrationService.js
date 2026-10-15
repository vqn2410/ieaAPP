import { auth } from './firebase';

const API_URL = import.meta.env.VITE_FINANCE_INTEGRATION_API_URL || '/api/integration/v1';

async function request(path, params = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Iniciá sesión para consultar Finanzas.');
  const token = await user.getIdToken();
  const url = new URL(`${API_URL.replace(/\/$/, '')}/${path}`, window.location.origin);
  Object.entries(params).forEach(([key, value]) => value != null && url.searchParams.set(key, value));
  let response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error('No se pudo conectar con el gateway financiero. Verificá que la API de integración esté disponible.');
  }
  const rawBody = await response.text();
  let data = {};
  try { data = rawBody ? JSON.parse(rawBody) : {}; } catch { /* El proxy local puede devolver texto plano. */ }
  if (response.status === 502) {
    throw new Error('El gateway financiero no está disponible. En desarrollo, iniciá las funciones API en localhost:3005 y configurá las credenciales de servicio de IEA Finanzas.');
  }
  if (response.status === 503) {
    throw new Error(data.error || 'El gateway financiero no está configurado para este entorno.');
  }
  if (!response.ok) throw new Error(data.error || 'No se pudo consultar la información financiera.');
  return data;
}

export const getFinanceSummary = (params = {}) => request('finance', { view: 'summary', ...params });
export const getMemberFinanceHistory = (memberId, params = {}) => request('member-history', { memberId, ...params });
