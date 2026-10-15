import { auth } from './firebase';
import { iaUrl } from './iaClient';

export const getAssignedGroups = async () => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(iaUrl('/api/assigned-groups'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los grupos asignados.');
  return data;
};
