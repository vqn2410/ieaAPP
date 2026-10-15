# Comunicaciones

La aplicación expone `sendEmail`, `sendSms` y `sendPush` desde `src/services/communicationService.js`. Estas funciones nunca llaman a un proveedor desde el navegador: envían una solicitud autenticada a `POST /api/communication`.

## Configuración

Por defecto no hay proveedor (`none`). En ese estado la API responde `503` con el código `COMMUNICATION_PROVIDER_NOT_CONFIGURED` y no intenta enviar nada.

Para conectar un gateway propio o un adaptador interno, configure únicamente en el entorno del servidor:

```text
COMMUNICATION_PROVIDER=webhook
COMMUNICATION_WEBHOOK_URL=https://gateway.example/communications
COMMUNICATION_WEBHOOK_TOKEN=<secreto-del-servidor>
```

`VITE_COMMUNICATION_PROVIDER` puede usarse solo para mostrar el estado o seleccionar una variante en el cliente, pero nunca debe contener secretos. `COMMUNICATION_WEBHOOK_TOKEN` y cualquier credencial del proveedor no deben tener prefijo `VITE_`.

El webhook recibe `POST` con `Authorization: Bearer <token>` y el cuerpo:

```json
{
  "channel": "email | sms | push",
  "message": { "...": "payload específico del gateway" }
}
```

El gateway es responsable de traducir el payload al proveedor elegido (Resend, SendGrid, Twilio, FCM, etc.). Para integrar un proveedor directamente, agregue un adaptador en `api/_lib/communication.js` o un módulo equivalente en servidor; no agregue claves privadas al cliente ni al código fuente.

La ruta exige un token Firebase válido. Mantenga autorización y límites de uso en el gateway y registre auditoría allí sin almacenar secretos ni contenido sensible innecesario.
