export function buildUserDataFromPreAssignment(preData = {}, email = '', displayName = 'Usuario', now = new Date()) {
  return {
    role: preData.role || ['Member'],
    email: email.toLowerCase(),
    name: preData.name || displayName || 'Usuario',
    campusIds: Array.isArray(preData.campusIds) ? preData.campusIds : [],
    defaultCampusId: preData.defaultCampusId || null,
    needsPasswordChange: true,
    createdAt: now,
  };
}
