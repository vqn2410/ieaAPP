# Chat IA local

Para desarrollo local, el frontend Vite proxifica `/api` al puerto 3005. El API
local de grupos asignados carga las credenciales privadas desde `.env.local`.

```bash
npm run dev:api
```

En una segunda terminal, ejecutá:

```bash
npm run dev
```

Abrí `http://localhost:5173`. No hace falta ejecutar `vercel dev` para probar
el API local de grupos asignados.

El backend necesita estas variables en el entorno local:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` o `FIREBASE_PRIVATE_KEY_BASE64`
- `AI_API_URL`
- `AI_API_KEY`
- `AI_MODEL`

En producción, configurá las mismas variables en Vercel. No pongas claves
privadas en variables `VITE_*` ni en el cliente.
