/**
 * SCRIPT PARA CARGA MASIVA DE USUARIOS A FIREBASE AUTHENTICATION
 * Versión CommonJS (.cjs) para compatibilidad con proyectos ESM
 */

const admin = require('firebase-admin');
// Buscamos el archivo en la raíz del proyecto
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function bulkImport() {
  console.log('--- Iniciando carga masiva de usuarios ---');
  
  try {
    const membersSnap = await db.collection('members').get();
    const members = [];
    membersSnap.forEach(doc => {
      const data = doc.data();
      if (data.email && data.email.includes('@')) {
        members.push({
          email: data.email.toLowerCase().trim(),
          displayName: `${data.firstName} ${data.lastName}`.trim(),
          memberId: doc.id
        });
      }
    });

    console.log(`Se encontraron ${members.length} miembros con correo.`);

    for (const member of members) {
      try {
        const userRecord = await auth.createUser({
          email: member.email,
          password: '123456',
          displayName: member.displayName,
        });

        console.log(`✅ Creado: ${member.email}`);

        await db.collection('users').doc(userRecord.uid).set({
          name: member.displayName,
          email: member.email,
          role: ['Member'],
          needsPasswordChange: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          memberId: member.memberId
        });

      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          console.warn(`⚠️ Omitido (ya existe): ${member.email}`);
        } else {
          console.error(`❌ Error con ${member.email}:`, error.message);
        }
      }
    }

    console.log('--- Proceso finalizado ---');
    process.exit(0);

  } catch (error) {
    console.error('CRITICAL ERROR:', error);
    process.exit(1);
  }
}

bulkImport();
