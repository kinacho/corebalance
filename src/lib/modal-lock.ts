/**
 * El bloqueo de scroll de los modales, contado.
 *
 * ⚠️ **Estaba escrito cinco veces a mano y estaba mal en dos de las cinco, con
 * los dos errores posibles, uno en cada sentido:**
 *
 * - `LedgerModal` añadía `body.modal-open` y **no lo quitaba nunca**. Su
 *   `onDestroy` era un bloque vacío con un comentario que lo justificaba para el
 *   caso en que el modal vive *encima* de `ManageAssets` —donde es cierto— y se
 *   olvidaba de que también se abre desde `AssetCard` y `CompactAssetRow`, donde
 *   no hay nada detrás. Al cerrarlo desde una tarjeta, el `body` se quedaba con
 *   `overflow: hidden; height: 100vh`: el dashboard sin scroll y recortado a la
 *   altura de la ventana, que es lo que se ve como «la página se queda medio
 *   rota».
 * - `ImportModal` lo quitaba **siempre**, y solo se abre desde dentro de
 *   `ManageAssets`. Al cerrarlo, el panel de gestión seguía abierto y la página
 *   de detrás volvía a moverse bajo él.
 *
 * Es el mismo defecto que este repo ya tiene documentado del `MapFrame`, que era
 * un modal y arrastraba el bloqueo al cerrarse con Escape.
 *
 * Contar es lo único que responde bien a las dos preguntas a la vez: cada modal
 * pide y suelta lo suyo, y el `body` se desbloquea cuando lo suelta el último.
 * Ningún modal necesita saber qué hay detrás de él, que es justo lo que los dos
 * comentarios equivocados intentaban adivinar.
 */

const CLASE = 'modal-open';

let abiertos = 0;

/** Pide el bloqueo. Idempotente por modal: cada uno llama una vez al montarse. */
export function bloquearScroll(): void {
	abiertos += 1;
	if (typeof document !== 'undefined') document.body.classList.add(CLASE);
}

/**
 * Suelta el bloqueo. El `body` solo se libera cuando no queda ningún modal.
 *
 * No baja de cero a propósito: un `desbloquearScroll()` de más —un `onDestroy`
 * que corre dos veces, un modal que se cierra por dos caminos— dejaría el
 * contador en negativo y el siguiente bloqueo real no llegaría a aplicarse.
 */
export function desbloquearScroll(): void {
	abiertos = Math.max(0, abiertos - 1);
	if (abiertos === 0 && typeof document !== 'undefined') {
		document.body.classList.remove(CLASE);
	}
}

/** Cuántos modales tienen el bloqueo pedido. Para los tests. */
export function modalesAbiertos(): number {
	return abiertos;
}

/** Estado limpio entre tests. No lo usa la app. */
export function reiniciarBloqueoScroll(): void {
	abiertos = 0;
	if (typeof document !== 'undefined') document.body.classList.remove(CLASE);
}
