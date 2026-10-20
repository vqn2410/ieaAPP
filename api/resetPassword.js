import admin from 'firebase-admin';

const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60_000;
const FORCED_PASSWORD = process.env.DEFAULT_RESET_PASSWORD || '123456';

function checkRateLimit(key) {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  record.count++;
  return true;
}

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID || 'iea-app-73f5f';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64
    ? Buffer.from(String(process.env.FIREBASE_PRIVATE_KEY_BASE64).replace(/\s/g, ''), 'base64').toString('utf8')
    : process.env.FIREBASE_PRIVATE_KEY;
  try {
    const json = JSON.parse(privateKey);
    privateKey = json.private_key || privateKey;
  } catch {
    // La variable también puede contener directamente la clave PEM.
  }

  if (!clientEmail || !privateKey) {
    throw new Error('Faltan Variables de Entorno en Vercel.');
  }

  privateKey = String(privateKey)
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`ip:${ip}`)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });
  }

  try {
    initializeFirebaseAdmin();
  } catch (initError) {
    return res.status(500).json({ error: initError.message });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }

  const callerUid = decodedToken.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();

  if (!callerDoc.exists) {
    return res.status(403).json({ error: 'Usuario no encontrado en Firestore.' });
  }

  const callerData = callerDoc.data();
  const callerRoles = Array.isArray(callerData.role) ? callerData.role : [callerData.role];

  const allowedRoles = ['Admin', 'Pastor', 'CampusAdmin', 'Facilitator', 'CoFacilitator', 'Leader', 'Líder de ministerio'];
  if (!callerRoles.some((r) => allowedRoles.includes(r))) {
    return res.status(403).json({ error: 'No tienes permisos suficientes para gestionar contraseñas y usuarios.' });
  }

  const { email, oldEmail, authUid, memberId, name, roles } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'El email es obligatorio.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanOldEmail = oldEmail ? String(oldEmail).trim().toLowerCase() : '';
  const assignedRoles = Array.isArray(roles) && roles.length > 0 ? roles : ['Member'];

  try {
    let userRecord = null;
    let isCreated = false;

    // 1. Intentar resolver por authUid si fue provisto
    if (authUid) {
      try {
        const existingByUid = await admin.auth().getUser(authUid);
        if (existingByUid) {
          if (cleanEmail !== existingByUid.email?.toLowerCase()) {
            try {
              userRecord = await admin.auth().updateUser(authUid, {
                email: cleanEmail,
                password: FORCED_PASSWORD,
                ...(name ? { displayName: name } : {}),
              });
            } catch (updateErr) {
              if (updateErr.code === 'auth/email-already-exists') {
                userRecord = await admin.auth().getUserByEmail(cleanEmail);
                await admin.auth().updateUser(userRecord.uid, {
                  password: FORCED_PASSWORD,
                  ...(name ? { displayName: name } : {}),
                });
              } else {
                throw updateErr;
              }
            }
          } else {
            userRecord = await admin.auth().updateUser(authUid, {
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
        const oldUser = await admin.auth().getUserByEmail(cleanOldEmail);
        if (oldUser) {
          try {
            userRecord = await admin.auth().updateUser(oldUser.uid, {
              email: cleanEmail,
              password: FORCED_PASSWORD,
              ...(name ? { displayName: name } : {}),
            });
          } catch (updateErr) {
            if (updateErr.code === 'auth/email-already-exists') {
              userRecord = await admin.auth().getUserByEmail(cleanEmail);
              await admin.auth().updateUser(userRecord.uid, {
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
        userRecord = await admin.auth().getUserByEmail(cleanEmail);
        await admin.auth().updateUser(userRecord.uid, {
          password: FORCED_PASSWORD,
          ...(name ? { displayName: name } : {}),
        });
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          userRecord = await admin.auth().createUser({
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
    await admin.firestore().collection('users').doc(userRecord.uid).set(
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
      await admin.firestore().collection('users').doc(`pre-${cleanOldEmail}`).delete().catch(() => {});
      try {
        const oldUsersSnap = await admin.firestore().collection('users').where('email', '==', cleanOldEmail).get();
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

    const preDocRef = admin.firestore().collection('users').doc(`pre-${cleanEmail}`);
    const preDoc = await preDocRef.get();
    if (preDoc.exists) {
      await preDocRef.set({ migratedTo: userRecord.uid, isPending: false }, { merge: true });
    }

    // 5. Vincular authUid en el documento de 'members' si se envió memberId
    if (memberId) {
      await admin.firestore().collection('members').doc(memberId).set(
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
    console.error('Error gestionando usuario/contraseña:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
}
