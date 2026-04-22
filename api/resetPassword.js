import admin from 'firebase-admin';

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                // Soporta las variables genéricas o las de Vite
                projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Corrige los saltos de línea de las llaves privadas inyectadas por variables de entorno
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
    } catch (error) {
        console.error("Error inicializando Firebase Admin:", error);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
    }

    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ error: 'Email y nueva contraseña son obligatorios.' });
    }

    try {
        // 1. Obtener el usuario de Firebase Auth por su email
        const userRecord = await admin.auth().getUserByEmail(email);
        
        // 2. Modificar su clave administrativamente
        await admin.auth().updateUser(userRecord.uid, {
            password: newPassword
        });

        res.status(200).json({ success: true, message: 'La contraseña fue actualizada con éxito.' });
    } catch (error) {
        console.error("Error reseteando contraseña en Admin SDK:", error);
        res.status(500).json({ error: error.message || 'Error genérico del servidor' });
    }
}
