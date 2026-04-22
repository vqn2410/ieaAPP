import admin from 'firebase-admin';

// Inicializar Firebase Admin si no está inicializado
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) return true;

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
      throw new Error(`Faltan Variables de Entorno en Vercel. ProjectId: ${!!projectId}, ClientEmail: ${!!clientEmail}, PrivateKey: ${!!privateKey}`);
  }

  try {
      // Re-formatear la clave si viene escapada (tipico en Vercel)
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      admin.initializeApp({
          credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey
          })
      });
      return true;
  } catch (error) {
      throw new Error("Fallo al inicializar admin.credential.cert: " + error.message);
  }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
    }

    try {
        // Intenta inicializar e interceptar el error si faltan las credenciales
        initializeFirebaseAdmin();
    } catch (initError) {
        return res.status(500).json({ error: initError.message });
    }

    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ error: 'Email y nueva contraseña son obligatorios.' });
    }

    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        await admin.auth().updateUser(userRecord.uid, {
            password: newPassword
        });

        res.status(200).json({ success: true, message: 'La contraseña fue actualizada con éxito.' });
    } catch (error) {
        console.error("Error reseteando contraseña en Admin SDK:", error);
        res.status(500).json({ error: error.message || 'Error genérico del servidor' });
    }
}
