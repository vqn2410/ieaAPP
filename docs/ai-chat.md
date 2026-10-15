# Chat IA local

El frontend Vite corre en `localhost:5173` y proxifica `/api` hacia
`localhost:3005`. Para probar las funciones serverless localmente, ejecutá:

```bash
npx vercel dev --listen 3005
```

En otra terminal:

```bash
npm run dev
```

El backend necesita estas variables en el entorno local:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` o `FIREBASE_PRIVATE_KEY_BASE64`
- `AI_API_URL`
- `AI_API_KEY`
- `AI_MODEL`

En producción, configurá las mismas variables en Vercel. No pongas claves
privadas en variables `VITE_*` ni en el cliente.
