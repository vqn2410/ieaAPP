/**
 * SCRIPT PARA CARGA MASIVA DE USUARIOS A FIREBASE AUTHENTICATION
 * Instrucciones:
 * 1. Ve a Firebase Console > Configuración del Proyecto > Cuentas de Servicio.
 * 2. Haz clic en "Generar nueva clave privada" y descarga el archivo JSON.
 * 3. Renombra ese archivo como 'serviceAccountKey.json' y ponlo en la carpeta raíz de este proyecto.
 * 4. Abre tu terminal y ejecuta: 
 *    node scripts/bulkImport.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function bulkImport() {
  console.log('--- Iniciando carga masiva de usuarios ---');
  
  try {
    // 1. Obtener todos los miembros con correo electrónico
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
        // 2. Crear el usuario en Authentication
        const userRecord = await auth.createUser({
          email: member.email,
          password: '123456', // Clave solicitada
          displayName: member.displayName,
        });

        console.log(`✅ Creado: ${member.email}`);

        // 3. Crear el documento en la colección 'users' de Firestore
        await db.collection('users').doc(userRecord.uid).set({
          name: member.displayName,
          email: member.email,
          role: ['Member'],
          needsPasswordChange: true, // Obligar cambio de clave
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
