import { auth } from './firebase';
import { iaUrl } from './iaClient';

export const getAssignedGroups = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('La sesión expiró. Cerrá sesión y volvé a entrar.');
  const token = await user.getIdToken();
  let response;
  try {
    response = await fetch(iaUrl('/api/assigned-groups'), {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('No se pudo conectar con el API de grupos asignados. Verificá el despliegue de Vercel.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error del API de grupos (${response.status}).`);
  return data;
};
