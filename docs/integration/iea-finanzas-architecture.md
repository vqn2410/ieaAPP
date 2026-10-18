# Integración ieaAPP e IEA Finanzas: auditoría y arquitectura propuesta

Fecha de auditoría: 2026-10-10  
Alcance: revisión estática de los dos repositorios y sus reglas versionadas. No se consultaron bases de producción ni se modificaron datos.

## 1. Decisiones del requerimiento

- ieaAPP e IEA Finanzas conservan despliegues, bases de datos, autenticación, usuarios y lógica de negocio independientes.
- ieaAPP es fuente de referencia de los datos personales y congregacionales de sus miembros.
- IEA Finanzas es fuente de referencia de contribuciones, ingresos, gastos, transacciones y contabilidad.
- La integración se realiza mediante endpoints de servidor. El navegador no recibe credenciales de servicio ni accede directamente a la base financiera desde ieaAPP.
- Ningún rol de ieaAPP obtiene permisos financieros automáticamente. La autorización financiera será asignada explícitamente en IEA Finanzas y además limitada por campus.
- El primer módulo dentro de ieaAPP será de consulta. Las altas, modificaciones, aprobaciones y eliminaciones continúan en los flujos de IEA Finanzas salvo que se aprueben expresamente como parte de una etapa posterior.
- El enlace entre una persona y un contribuyente será una asociación lógica reversible y auditable; no fusiona ni copia registros.

## 2. Arquitectura actual observada

### ieaAPP

- SPA React 19 + Vite, React Router y Capacitor para Android/iOS.
- Firebase Web SDK 12: Authentication y Cloud Firestore.
- Proyecto Firestore/Auth configurado como `iea-app-73f5f`.
- Tiene funciones serverless bajo `api/` en el despliegue Vercel y ya importa Firebase Admin en `api/resetPassword.js`.
- `src/context/AuthContext.jsx` resuelve el perfil mediante `users/{uid}`. El campo `role` admite cadena o arreglo. Los campus permitidos se representan con `campusIds`.
- Datos de miembros en `members`; grupos en `groups`; sedes/campus en `campuses`; actividades en `events`; asistencia y otros módulos en colecciones separadas.
- El miembro usa el ID de documento de Firestore como identidad local y contiene campos como `firstName`, `lastName`, `dni`, `campusId` y estado congregacional.
- `/dashboard/finanzas` redirige a `https://iea-finanzas.vercel.app/`. `src/services/financeService.js` es actualmente un stub que devuelve una lista vacía.
- Las reglas de `members` limitan acceso por rol, grupo y campus; las funciones Admin del servidor deben volver a aplicar la autorización porque Firebase Admin no evalúa reglas Firestore.

### IEA Finanzas

- SPA React 18 + TypeScript + Vite, desplegada en Vercel.
- Firebase Web SDK 12: Authentication, Firestore y Storage.
- Proyecto Firestore/Auth independiente: `iea-finanzas`.
- Tiene autenticación propia y conserva su flujo independiente. El perfil de Finanzas se consulta en `users/{email_normalizado}` y maneja roles como Administrador Central, Administrador de Sede, Tesorero, Contador y Revisor, además de `sedeIds`.
- Datos financieros principales: `transactions`, `contribuyentes`, `installment_plans`, `sedes`, `budgets`, `categories`, `methods`, `roles`, `notifications` y `audit`.
- Finanzas ya relaciona internamente las transacciones con su padrón mediante `transactions.memberId` y el nombre histórico `transactions.diezmante`. Ese `memberId` apunta al ID financiero de `contribuyentes`; no es el ID del miembro de ieaAPP.
- No tiene hoy una carpeta `api/` ni una capa backend de integración. Su frontend consulta Firestore directamente.
- El filtro por campus usa `sedeId`; no hay garantía de que ese ID coincida con el `campusId` de ieaAPP.

### Diferencias que impiden una unión directa

| Concepto | ieaAPP | IEA Finanzas |
|---|---|---|
| Proyecto Firebase | `iea-app-73f5f` | `iea-finanzas` |
| Clave de usuario Firestore | UID de Firebase Auth | correo normalizado |
| Roles | nombres institucionales, a veces arreglo | roles financieros propios |
| Alcance territorial | `campusIds` | `sedeIds` |
| Persona/miembro | documento `members/{uidLocal}` | `contribuyentes/{idFinanciero}` |
| Relación con movimientos | no administra el ledger financiero | `transactions.memberId` refiere a `contribuyentes` |

No se debe comparar personas por nombre como identidad ni pasar un `campusId` del cliente al backend sin traducirlo y comprobarlo.

## 3. Hallazgos de seguridad y compatibilidad

1. Las reglas financieras actuales permiten a cualquier usuario autenticado leer `contribuyentes`, `users`, sedes y ciertas configuraciones. El módulo nuevo no dependerá de esas lecturas directas: el API filtrará cada respuesta. Antes de endurecer reglas existentes hay que validar todos los flujos autónomos para no bloquear a los usuarios actuales.
2. Las reglas de Finanzas buscan el perfil por correo; las de ieaAPP lo buscan por UID. El API debe verificar tokens contra el proyecto Firebase emisor correcto y leer la asignación financiera separada. No debe crear ni actualizar usuarios de Finanzas al iniciar una sesión de ieaAPP.
3. Las reglas de ieaAPP son específicas por rol/campus, pero una función Admin las omite. El API tendrá una autorización equivalente para buscar miembros y obtener historiales.
4. El repositorio ieaAPP contiene una función de recuperación de contraseña heredada con una contraseña temporal fijada en código. No se reutilizará ese patrón ni se llamará desde la integración; su remediación es un trabajo de seguridad independiente.
5. El repositorio IEA Finanzas ya tenía un cambio local previo: eliminación de `public/anuncios/reu_voluntarios.jpeg` y adición de `public/anuncios/reu_voluntarios.jpg`. Ese cambio no forma parte de esta integración y debe conservarse.

## 4. Propuesta mínima de arquitectura

### API gateway de integración

Agregar funciones serverless en el despliegue existente de ieaAPP, que ya tiene carpeta `api/`, Vercel Functions y Firebase Admin instalado. Este es el cambio de infraestructura mínimo: no añade otro runtime en IEA Finanzas. El gateway inicializa clientes Admin nombrados para los dos proyectos, lee/escribe la información financiera solo en el proyecto `iea-finanzas` y consulta miembros solo en `iea-app-73f5f`. Finanzas sigue siendo propietaria de sus esquemas y datos; el gateway no replica ni traslada registros.

IEA Finanzas seguirá usando Firestore directamente para sus funciones autónomas actuales. Su configuración agregará una URL pública (no secreta) para que la pantalla de gestión de concesiones/vínculos invoque el gateway. El API permite explícitamente los orígenes configurados y autentica toda solicitud con token Bearer; CORS por sí solo nunca autoriza.

Cada ruta acepta un token Bearer emitido por uno de los dos proyectos y verifica emisor/proyecto de forma explícita:

- Token de ieaAPP: validar `users/{uid}` en ieaAPP y buscar una asignación financiera activa en Finanzas. Sin asignación financiera, responder 403.
- Token de Finanzas: validar el perfil y rol financiero existentes. Este flujo permite a los usuarios autónomos seguir usando Finanzas y administrar vínculos con las mismas reglas financieras.

La API debe aplicar allowlist de orígenes, validación de parámetros, paginación, respuesta mínima, manejo de errores sin filtrar excepciones y registro de operaciones sensibles. Los secretos de Firebase Admin viven solo en variables de entorno de Vercel; nunca en `VITE_*`, archivos del cliente ni URL.

### Autorización financiera para usuarios de ieaAPP

Agregar en la base financiera un documento administrado explícitamente por un administrador financiero, por ejemplo `integration_access/{ieaAppUid}`:

```text
ieaAppUid, active, financeRole, permissions[], financeSedeIds[],
grantedBy, createdAt, updatedAt
```

Los nombres de rol de ieaAPP no se convierten automáticamente en permisos financieros. `permissions` usa capacidades concretas —consulta global, consulta de campus, lectura de contribuciones, consulta contable, vinculación de miembros— y el servidor limita cada petición. Un pastor general solo tendrá lectura global si la concesión financiera lo especifica. Un encargado de campus solo verá las sedes incluidas en su asignación.

Agregar una relación explícita de campus, por ejemplo `integration_campuses/{financeSedeId}` con `ieaAppCampusId` y estado. Una sede sin relación válida no se expone a través de la integración.

### Vínculo entre contribuyente y miembro

Agregar una colección independiente y no destructiva en Finanzas, por ejemplo `member_links/{financialContributorId}`:

```text
financialContributorId, ieaAppMemberId, status, linkedBy,
linkedAt, updatedAt, matchMethod
```

Los movimientos existentes permanecen iguales y continúan refiriendo a `contribuyentes` mediante su `memberId`. El historial se obtiene primero de la asociación confirmada y luego de `transactions.memberId`. Los movimientos históricos que solo tienen un nombre en `diezmante` no se atribuyen automáticamente; pueden mostrarse como candidatos para revisión manual. La API impide vínculos duplicados/incompatibles y escribe un evento de auditoría. Desvincular cambia el estado y conserva la trazabilidad; no elimina transacciones.

### Datos mínimos de la consulta de miembros

La API puede buscar por nombre, apellido y DNI, pero devuelve solo los campos necesarios para confirmar identidad: ID local, nombre, apellido, DNI, campus y estado. El DNI se usa solo para comparación autorizada y no se almacena en Finanzas como copia. Los datos personales de la ficha siguen siendo obtenidos desde ieaAPP.

### Interfaces

- ieaAPP: reemplazar el redirect ciego por una ruta protegida `/dashboard/finanzas` con resumen y vistas de consulta (consolidado, campus, ingresos, gastos, contribuciones, movimientos, contabilidad y reportes soportados por la API). La pantalla muestra datos de origen; no mantiene una segunda copia.
- ieaAPP: agregar una pestaña de contribuciones a la ficha del miembro; si Finanzas o el servicio personal no responde, mostrar estado de indisponibilidad y no reutilizar datos antiguos como si fueran confirmados.
- IEA Finanzas: conservar íntegra la app autónoma. Agregar herramientas administrativas para conceder/revocar acceso integrado, mapear campus y vincular/revisar contribuyentes. Estas operaciones requieren rol financiero autorizado y auditoría.
- Navegación existente y autenticación directa de Finanzas permanecen disponibles.

## 5. Endpoints propuestos

Todos los endpoints son versionados y paginados. Los filtros del cliente son sugerencias, no autoridad de acceso.

| Endpoint | Uso | Autorización mínima |
|---|---|---|
| `GET /api/integration/v1/finance?view=summary` | Consolidado financiero y resumen por campus permitido | `finance.read.summary` |
| `GET /api/integration/v1/finance?view=transactions` | Ingresos, gastos y movimientos filtrados (paginados) | `finance.read.transactions` |
| `GET /api/integration/v1/members/search` | Coincidencias mínimas de ieaAPP para vinculación | `members.link.search` |
| `GET /api/integration/v1/member-history?memberId={ieaAppMemberId}` | Historial y agregados por filtros de fecha/tipo | `finance.read.contributions` y acceso al miembro/campus |
| `POST /api/integration/v1/member-links` | Crear/reconfirmar vínculo confirmado con ambos IDs en JSON | `members.link.manage` y rol financiero admin |
| `DELETE /api/integration/v1/member-links` | Desactivar vínculo con auditoría; `financialContributorId` en JSON | `members.link.manage` y rol financiero admin |
| `GET /api/integration/v1/member-links` | Listado de pendientes y asociaciones | permiso específico y campus permitido |

Para la vinculación se exige confirmación de un usuario; coincidencias ambiguas no se vinculan automáticamente. Toda ruta vuelve a comprobar la sede de cada documento antes de devolverlo o modificarlo.

## 6. Cambios mínimos por repositorio

### ieaAPP

1. Añadir un cliente de API con token Firebase de ieaAPP y URL configurable de IEA Finanzas.
2. Crear la ruta/pantalla de Finanzas, con filtros, estados de carga/error/vacío y visualización de datos devueltos por API.
3. Añadir la sección de contribuciones a `MemberProfile`, usando el ID del miembro existente.
4. No leer Firestore `iea-finanzas` desde el navegador ni duplicar lógica contable.

### IEA Finanzas

1. Añadir capa API serverless y utilidades de verificación de tokens de ambos proyectos.
2. Añadir tipos/servicios para grants, mapeo de campus y `member_links`.
3. Añadir administración de permisos integrados y vinculación manual en el área de contribuyentes.
4. Añadir consultas read-only para las vistas de ieaAPP, reutilizando modelos, agregaciones y reglas de negocio actuales.
5. Conservar la autenticación, navegación, usuarios y escrituras directas de Finanzas para su operación autónoma.

### Configuración de despliegue

En Vercel de ieaAPP: credenciales Admin existentes para `iea-app-73f5f`, credenciales Admin nuevas y solo de servidor para `iea-finanzas`, allowlist de orígenes del cliente Finanzas, y bandera de habilitación gradual. En el frontend de Finanzas: URL pública del API gateway (variable `VITE_*`, no contiene secretos). Antes del despliegue se configuran en el proveedor; no se guardan valores en repositorio, cliente, URL ni logs. En esta auditoría no se inspeccionaron ni se requieren secretos de producción.

## 7. Secuencia de implementación

1. **Contrato y seguridad API:** funciones de autenticación/autorización, allowlist CORS, errores y paginación; primero habilitadas solo en desarrollo.
2. **Concesiones y campus:** administración explícita de `integration_access` y `integration_campuses`; denegación por defecto.
3. **Vinculación manual:** búsqueda mínima de miembros, vista previa, confirmación, control de unicidad y auditoría; sin matching masivo.
4. **Historial personal:** consulta desde la ficha de ieaAPP, filtros y estados sin datos/no vinculado/indisponible.
5. **Panel financiero de ieaAPP:** summary, transacciones, campus y reportes read-only. Las mutaciones siguen en Finanzas.
6. **Vinculación progresiva histórica:** primero informe dry-run; luego confirmación humana por grupos de registros, idempotencia y respaldo restaurable.
7. **Despliegue gradual:** comparar recuentos/sumas por rangos con Finanzas; habilitar usuarios/campus de prueba; después ampliar concesiones.

No se reemplazan las reglas completas de Firestore ni se mueven transacciones. Cualquier cambio a reglas existentes requiere una matriz de compatibilidad con todos los roles autónomos de Finanzas antes de desplegar.

## 8. Criterios de aceptación técnicos

- Un usuario de Finanzas sin ieaAPP sigue ingresando y operando en Finanzas.
- Un usuario ieaAPP sin concesión financiera recibe 403 aun cuando tenga rol `Admin` o `Pastor` institucional.
- Un usuario integrado ve solo permisos y sedes concedidas; alterar filtros, URL, IDs o cuerpos de petición no amplía el alcance.
- Un encargado no obtiene registros de otras sedes; las transacciones filtradas se verifican por sede en servidor.
- Miembros y movimientos no se copian entre bases. La asociación guarda ambos IDs y autoría de la operación.
- El historial consulta por IDs financieros vinculados; no atribuye por nombre de forma automática.
- Vínculos duplicados/ambiguos se bloquean o requieren revisión. Crear una asociación dos veces es idempotente.
- Filtros por fecha/tipo producen registros y totales del mismo conjunto.
- Miembro sin contribuciones y persona sin vínculo se muestran como estados válidos, sin error ni inferencia de ausencia real de donaciones.
- Caídas de cualquiera de las APIs producen error/indisponibilidad explícita sin escritura parcial ni datos financieros obsoletos presentados como actuales.
- Las asociaciones, cambios de permisos y consultas/operaciones sensibles quedan auditadas con actor, momento y recurso, sin credenciales ni datos innecesarios.
- No se altera el historial original ni se elimina ningún usuario o funcionalidad.

## 9. Fuera de este primer cambio

- Fusionar bases o mover cuentas/contraseñas.
- SSO o emisión de tokens personalizados.

## 10. Implementación realizada en esta rama

- Gateway Vercel en ieaAPP: `finance` (resumen/transacciones), `members/search`, `member-history` y `member-links` (alta idempotente y baja lógica con auditoría). Verifica Firebase ID tokens contra ambos proyectos, deniega por defecto y limita las consultas por sedes mapeadas.
- La vista `/dashboard/finanzas` de ieaAPP ahora muestra resumen por sede y conserva un enlace a la app financiera autónoma. La ficha del miembro tiene sección de aportes que consulta solo registros asociados explícitamente.
- En Finanzas, Configuración incluye una herramienta para buscar personas/contribuyentes y confirmar el vínculo manual. Solo Administrador Central puede usarla; el backend vuelve a validar rol, autorización y alcance.
- El servicio no modifica movimientos ni copia personas entre proyectos. Una asociación puede desactivarse vía DELETE del API, operación que conserva el documento y registra actor/fecha.

### Configuración obligatoria antes de habilitar

1. En Vercel de ieaAPP, conservar las variables Admin de ieaAPP y cargar `FINANCE_FIREBASE_PROJECT_ID=iea-finanzas`, `FINANCE_FIREBASE_CLIENT_EMAIL`, `FINANCE_FIREBASE_PRIVATE_KEY` (cuenta de servicio del proyecto financiero con acceso Firestore) y `FINANCE_INTEGRATION_ORIGINS` con el origen exacto desplegado de Finanzas. Nunca prefijar las credenciales con `VITE_`.
2. En el build de ieaAPP, `VITE_FINANCE_INTEGRATION_API_URL` puede usar `/api/integration/v1` si frontend y funciones se sirven desde el mismo dominio.
3. En el build de Finanzas, definir `VITE_IEAAPP_INTEGRATION_API_URL` con la URL pública del gateway ieaAPP, hasta `/api/integration/v1` inclusive. Esta variable solo contiene una URL pública.
4. En Firestore financiero, un Administrador Central debe crear concesiones `integration_access/{ieaAppUid}` y mapas `integration_campuses/{financeSedeId}` conforme a las estructuras de este documento. Los grants requieren permisos explícitos (`finance.read.summary`, `finance.read.contributions`, opcionalmente `finance.read.transactions`, `finance.read.global`, `members.link.search`, `members.link.manage`) y `financeSedeIds`. Mantener `active: false` hasta verificar identidad, rol y sede.
5. La búsqueda/vinculación inicial desde Finanzas requiere `VITE_IEAAPP_INTEGRATION_API_URL`, servicio de credenciales del gateway y mapeos de campus. Las reglas existentes de Firestore no se endurecieron ni se ampliaron para exponer estas colecciones al cliente; las mutaciones de asociación pasan por el API.

### Limitaciones del corte

- La vista financiera actual ofrece resumen por sede; la ruta soporta vista paginada de movimientos pero la pantalla aún no presenta ese detalle ni libros contables. La pestaña de miembro presenta ingresos del contribuyente vinculado, no infiere aportes desde nombres históricos.
- La administración de grants y de mapeos de campus aún se provisiona en Firestore por un administrador autorizado, no desde una pantalla. No habilitar usuarios hasta configurar ambos documentos.
- La tabla `integration_audit` registra cambios de vínculo; todavía no registra cada lectura de datos. La auditoría de consultas debe agregarse si la política institucional exige trazabilidad de acceso por consulta.
- La cuenta de servicio financiera tiene permisos de servidor amplios por diseño. Debe limitarse al mínimo necesario, protegerse en Vercel y rotarse según el procedimiento institucional.
- Automatizar coincidencias por nombre, DNI u otros campos.
- Cambiar las reglas financieras globales sin matriz de regresión.
- Habilitar desde ieaAPP operaciones de escritura que actualmente pertenecen a Finanzas.
- Modificar el endpoint de restablecimiento de contraseña heredado; se documentó como hallazgo separado y no se reutilizará.
