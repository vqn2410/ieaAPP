/**
 * Gestión centralizada del bloqueo de scroll del <body>.
 *
 * Varios componentes (modales, menú móvil, transición de ruta) necesitan
 * bloquear el scroll de fondo. Si cada uno guarda/restaura `body.style.overflow`
 * por su cuenta, se pisan entre sí y pueden dejar el scroll bloqueado de forma
 * permanente (o liberado a destiempo) en mobile.
 *
 * Esta utilidad usa un contador de referencias: el body queda bloqueado mientras
 * al menos un componente mantenga un lock activo, y se libera solo cuando el
 * último lo suelta. Cada `lockScroll()` debe emparejarse con un `unlockScroll()`.
 */

let lockCount = 0;

/** Bloquea el scroll del body (incrementa el contador). */
export function lockScroll() {
  lockCount += 1;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
}

/** Libera un lock; restaura el scroll solo cuando no queda ninguno activo. */
export function unlockScroll() {
  if (lockCount > 0) lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}

/** Libera todos los locks de forma incondicional (solo al desmontar la app). */
export function releaseAllScrollLocks() {
  lockCount = 0;
  document.body.style.overflow = '';
}
