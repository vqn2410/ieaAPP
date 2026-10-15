# Chat IA local

Para desarrollo local, ejecutá Vercel Dev como servidor de funciones API y Vite
como servidor de frontend. Vite proxifica `/api` hacia el puerto 3005.

```bash
npm run dev:vercel
```

En una segunda terminal, ejecutá:

```bash
npm run dev
```

Abrí `http://localhost:5173`. No abras el frontend servido internamente por
Vercel Dev: algunas rutas de módulos Vite pueden recibir la reescritura SPA.

El backend necesita estas variables en el entorno local:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` o `FIREBASE_PRIVATE_KEY_BASE64`
- `AI_API_URL`
- `AI_API_KEY`
- `AI_MODEL`

En producción, configurá las mismas variables en Vercel. No pongas claves
privadas en variables `VITE_*` ni en el cliente.
