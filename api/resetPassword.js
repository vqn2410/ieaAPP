import { randomBytes } from 'node:crypto';
import { getDefaultAdmin } from './_lib/firebase-admin.js';
import { httpError, methodGuard, handleError } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { createRateLimiter } from './_lib/rate-limit.js';

const limiter = createRateLimiter({ max: 30, windowMs: 60_000 });

// Clave temporal para creación/reseteo de usuarios. Nunca se deja un valor por
// defecto predecible: si no hay variable de entorno se genera una aleatoria.
function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const FORCED_PASSWORD =
  process.env.DEFAULT_RESET_PASSWORD || process.env.DEFAULT_USER_PASSWORD || generateTemporaryPassword();

export default async function handler(req, res) {
  if (methodGuard(req, res, 'POST')) return;

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!limiter.check(`ip:${ip}`)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });
  }

  try {
    const app = getDefaultAdmin();
    const { roles } = await requireUser(req, app);

    const allowedRoles = ['Admin', 'Pastor', 'CampusAdmin', 'Facilitator', 'CoFacilitator', 'Leader', 'Líder de ministerio'];
    if (!allowedRoles.some((r) => roles.includes(r))) {
      throw httpError(403, 'No tienes permisos suficientes para gestionar contraseñas y usuarios.');
    }

    const { email, oldEmail, authUid, memberId, name, roles: requestedRoles } = req.body || {};

    if (!email) {
      throw httpError(400, 'El email es obligatorio.');
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOldEmail = oldEmail ? String(oldEmail).trim().toLowerCase() : '';
    const assignedRoles = Array.isArray(requestedRoles) && requestedRoles.length > 0 ? requestedRoles : ['Member'];

    let userRecord = null;
    let isCreated = false;

    // 1. Intentar resolver por authUid si fue provisto
    if (authUid) {
      try {
        const existingByUid = await app.auth().getUser(authUid);
        if (existingByUid) {
          if (cleanEmail !== existingByUid.email?.toLowerCase()) {
            try {
              userRecord = await app.auth().updateUser(authUid, {
                email: cleanEmail,
                password: FORCED_PASSWORD,
                ...(name ? { displayName: name } : {}),
              });
            } catch (updateErr) {
              if (updateErr.code === 'auth/email-already-exists') {
                userRecord = await app.auth().getUserByEmail(cleanEmail);
                await app.auth().updateUser(userRecord.uid, {
                  password: FORCED_PASSWORD,
                  ...(name ? { displayName: name } : {}),
                });
              } else {
                throw updateErr;
              }
            }
          } else {
            userRecord = await app.auth().updateUser(authUid, {
              password: FORCED_PASSWORD,
              ...(name ? { displayName: name } : {}),
            });
          }
        }
      } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
      }
    }

    // 2. Si no se resolvió por authUid y hay un oldEmail distinto, buscar el usuario anterior en Auth para actualizarlo
    if (!userRecord && cleanOldEmail && cleanOldEmail !== cleanEmail) {
      try {
        const oldUser = await app.auth().getUserByEmail(cleanOldEmail);
        if (oldUser) {
          try {
            userRecord = await app.auth().updateUser(oldUser.uid, {
              email: cleanEmail,
              password: FORCED_PASSWORD,
              ...(name ? { displayName: name } : {}),
            });
          } catch (updateErr) {
            if (updateErr.code === 'auth/email-already-exists') {
              userRecord = await app.auth().getUserByEmail(cleanEmail);
              await app.auth().updateUser(userRecord.uid, {
                password: FORCED_PASSWORD,
                ...(name ? { displayName: name } : {}),
              });
            } else {
              throw updateErr;
            }
          }
        }
      } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
      }
    }

    // 3. Si aún no tenemos userRecord, buscar o crear directamente con cleanEmail
    if (!userRecord) {
      try {
        userRecord = await app.auth().getUserByEmail(cleanEmail);
        await app.auth().updateUser(userRecord.uid, {
          password: FORCED_PASSWORD,
          ...(name ? { displayName: name } : {}),
        });
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          userRecord = await app.auth().createUser({
            email: cleanEmail,
            password: FORCED_PASSWORD,
            displayName: name || '',
          });
          isCreated = true;
        } else {
          throw err;
        }
      }
    }

    // 4. Actualizar / consolidar Firestore 'users'
    await app.firestore().collection('users').doc(userRecord.uid).set(
      {
        email: cleanEmail,
        name: name || userRecord.displayName || '',
        role: assignedRoles,
        needsPasswordChange: true,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // Si había un pre-registro para el email anterior o el nuevo, marcarlos o limpiarlos
    if (cleanOldEmail && cleanOldEmail !== cleanEmail) {
      await app.firestore().collection('users').doc(`pre-${cleanOldEmail}`).delete().catch(() => {});
      try {
        const oldUsersSnap = await app.firestore().collection('users').where('email', '==', cleanOldEmail).get();
        for (const docSnap of oldUsersSnap.docs) {
          if (docSnap.id !== userRecord.uid) {
            await docSnap.ref.update({
              email: cleanEmail,
              migratedTo: userRecord.uid,
              needsPasswordChange: true,
              updatedAt: new Date(),
            }).catch(() => {});
          }
        }
      } catch (oldSyncErr) {
        console.warn('Error sincronizando registros previos de Firestore:', oldSyncErr.message);
      }
    }

    const preDocRef = app.firestore().collection('users').doc(`pre-${cleanEmail}`);
    const preDoc = await preDocRef.get();
    if (preDoc.exists) {
      await preDocRef.set({ migratedTo: userRecord.uid, isPending: false }, { merge: true });
    }

    // 5. Vincular authUid en el documento de 'members' si se envió memberId
    if (memberId) {
      await app.firestore().collection('members').doc(memberId).set(
        {
          email: cleanEmail,
          authUid: userRecord.uid,
          updatedAt: new Date(),
        },
        { merge: true }
      ).catch(() => {});
    }

    res.status(200).json({
      success: true,
      created: isCreated,
      uid: userRecord.uid,
      email: cleanEmail,
      forcedPassword: FORCED_PASSWORD,
      message: isCreated
        ? `¡Usuario creado con éxito! Se asignó la clave temporal "${FORCED_PASSWORD}".`
        : `Contraseña establecida a "${FORCED_PASSWORD}". El usuario deberá cambiarla al ingresar.`,
    });
  } catch (error) {
    return handleError(res, error, 'resetPassword');
  }
}
