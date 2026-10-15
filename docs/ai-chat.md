# Chat IA local

Vercel Dev ejecuta el frontend Vite y las funciones serverless bajo el mismo
origen. No ejecutes `npm run dev` en paralelo. Iniciá el proyecto completo con:

```bash
npm run dev:vercel
```

Abrí la URL que imprima Vercel Dev (por defecto `http://localhost:3005`).

El backend necesita estas variables en el entorno local:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` o `FIREBASE_PRIVATE_KEY_BASE64`
- `AI_API_URL`
- `AI_API_KEY`
- `AI_MODEL`

En producción, configurá las mismas variables en Vercel. No pongas claves
privadas en variables `VITE_*` ni en el cliente.
