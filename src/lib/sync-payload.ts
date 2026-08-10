import type { Asset, HoldingsMap, Transaction } from '$lib/types';
import type { HoldingEdit } from '$lib/history/types';

/**
 * El códec del traspaso entre dispositivos, y el único sitio donde vive.
 *
 * ## Lo que estaba roto, que eran cuatro capas
 *
 * 1. `SyncModal` generaba un QR con `https://corebalance.app/sync#<payload>` y **`/sync`
 *    no existía**: ni ruta, ni `rewrite` en `vercel.json`. Escanear el código llevaba a
 *    un 404 con la cartera entera en el fragmento.
 * 2. **Nada en el repo leía ese fragmento.** No había un solo uso de `location.hash` ni
 *    de `DecompressionStream`: el emisor estaba escrito y el receptor no se escribió
 *    nunca. Crear la ruta sin más no habría importado nada.
 * 3. El payload era el **respaldo completo**, con el historial de snapshots dentro.
 *    Medido con una cartera realista —9 activos, 25 operaciones, 400 días de
 *    snapshots—: **6.423 caracteres de URL** contra el límite de 2.000 que la propia
 *    app declara para que una cámara pueda leer el código. Con historial no habría
 *    funcionado nunca; los 400 snapshots son 42 de los 53 KB.
 * 4. ⚠️ **Y el emisor le pedía los datos al proveedor de nube.** `PUBLIC_USE_FIREBASE`
 *    es `true` en el entorno que se publica, así que `storageProvider` es
 *    `FirebaseStorage`, y su `getAllData()` empieza con `if (!auth?.currentUser) throw`.
 *    Comprobado en pantalla: sin iniciar sesión, la pestaña del QR dice **«Error: Debes
 *    iniciar sesión para exportar datos»** y no dibuja nada. O sea que la función no
 *    existía para el usuario por defecto de una app cuyo argumento es justo ése — y el
 *    subtítulo del propio modal dice «tus datos viven en este navegador» mientras el
 *    código se los pedía a la nube.
 *
 * ## De ahí la forma de esto
 *
 * El traspaso sale del **store**, que es quien tiene la cartera en un navegador
 * cualquiera, y no del proveedor de almacenamiento. Consecuencias, todas buenas:
 * funciona sin sesión, funciona igual con Firebase y sin él, y **hay una sola forma**
 * del payload — mientras que `getAllData()` devuelve una forma distinta en cada backend
 * (`LocalDBStorage` da `transactions` plano y `FirebaseStorage` lo envuelve en
 * `[{userId, items}]`, que es un desajuste latente aparte de éste).
 *
 * Para quien ha iniciado sesión no se pierde nada: el store sube lo aplicado a la nube
 * él solo, por el camino de siempre (`saveToStorage` → `scheduleCloudSave`).
 *
 * ## Dos decisiones que parecen detalles y no lo son
 *
 * - **El payload viaja en el fragmento (`#`), nunca en la query.** El fragmento no se
 *   envía al servidor, así que la cartera no pasa por los registros de Vercel. Es lo
 *   que obliga a que `/sync` sea una página de cliente (`ssr = false`).
 * - **Sin `Blob`.** La versión anterior comprimía con `new Blob([json]).stream()`, y el
 *   `Blob` de jsdom no tiene `stream()`: por eso este códec no tenía ni un test. Con
 *   `ReadableStream` + `Response` funciona igual en el navegador y además se puede
 *   probar, que es lo que hace falta cuando emisor y receptor tienen que entenderse.
 */

/** Longitud máxima de la URL que una cámara lee con fiabilidad en una pantalla. */
export const MAX_SYNC_URL_LENGTH = 2000;

/** Versión del formato. Si algún día cambia, el receptor puede rechazar lo viejo. */
export const SYNC_PAYLOAD_VERSION = 1;

/**
 * Lo que se transfiere: la cartera y su libro.
 *
 * **No lleva el historial de snapshots** (ni la caché de precios): el dispositivo que
 * recibe lo reconstruye él solo a partir de los precios y del libro —es literalmente lo
 * que hace `performanceSeries`—, y mandarlo es lo que hacía imposible el QR.
 */
export interface SyncPayload {
	v: number;
	assets: {
		coreAssets: Asset[];
		satelliteAssets: Asset[];
		stockAssets: Asset[];
	};
	holdings: HoldingsMap;
	contribution: number;
	transactions?: Transaction[];
	holdingEdits?: HoldingEdit[];
}

/** ¿Esto es un traspaso de CoreBalance? Lo que llega viene de una URL cualquiera. */
export function isSyncPayload(valor: unknown): valor is SyncPayload {
	if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
	const p = valor as Record<string, unknown>;
	if (p.v !== SYNC_PAYLOAD_VERSION) return false;
	if (typeof p.contribution !== 'number') return false;
	if (!p.holdings || typeof p.holdings !== 'object') return false;
	const assets = p.assets as Record<string, unknown> | undefined;
	if (!assets) return false;
	for (const clave of ['coreAssets', 'satelliteAssets', 'stockAssets']) {
		if (!Array.isArray(assets[clave])) return false;
	}
	return true;
}

function base64UrlDesde(bytes: Uint8Array): string {
	let binario = '';
	for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
	return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function bytesDesdeBase64Url(texto: string): Uint8Array<ArrayBuffer> {
	const base64 = texto.replace(/-/g, '+').replace(/_/g, '/');
	// `atob` exige el relleno que el formato url quita.
	const relleno = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
	const binario = atob(base64 + relleno);
	const bytes = new Uint8Array(binario.length);
	for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
	return bytes;
}

/**
 * El chunk se declara `BufferSource` y no `Uint8Array` porque es lo que aceptan
 * `CompressionStream`/`DecompressionStream` en su lado escribible; con `Uint8Array`,
 * `pipeThrough` no tipa (`npm run check` lo dice, no es cosmética).
 */
function flujoDe(bytes: Uint8Array<ArrayBuffer>): ReadableStream<BufferSource> {
	return new ReadableStream({
		start(controlador) {
			controlador.enqueue(bytes);
			controlador.close();
		}
	});
}

/** Comprime y codifica el payload para meterlo en el fragmento de la URL. */
export async function encodeSyncPayload(payload: SyncPayload): Promise<string> {
	const bytes = new TextEncoder().encode(JSON.stringify(payload));
	const comprimido = await new Response(
		flujoDe(bytes).pipeThrough(new CompressionStream('deflate'))
	).arrayBuffer();
	return base64UrlDesde(new Uint8Array(comprimido));
}

/**
 * El inverso. **Lanza** si el fragmento no es un traspaso de CoreBalance, y ese es su
 * trabajo: lo que llega viene de una URL que cualquiera puede haber tocado, y de aquí
 * sale un objeto que se va a escribir **encima** de la cartera del usuario.
 */
export async function decodeSyncPayload(fragmento: string): Promise<SyncPayload> {
	const limpio = fragmento.replace(/^#/, '').trim();
	if (!limpio) throw new Error('empty');

	const bytes = bytesDesdeBase64Url(limpio);
	const descomprimido = await new Response(
		flujoDe(bytes).pipeThrough(new DecompressionStream('deflate'))
	).arrayBuffer();
	const datos = JSON.parse(new TextDecoder().decode(descomprimido));
	if (!isSyncPayload(datos)) throw new Error('shape');
	return datos;
}

/** La URL que se dibuja en el QR. */
export function syncUrl(origin: string, encoded: string): string {
	return `${origin}/sync#${encoded}`;
}

/**
 * Qué hay dentro, para poder decírselo al usuario **antes** de escribir.
 *
 * ⚠️ No es adorno: aplicar un traspaso **reemplaza la cartera de este dispositivo**.
 * Este repo ya tiene escrito lo que cuesta aplicar una restauración sin que se vea
 * (`importAllData({history: []})` vaciando la cartera, con una recarga segundo y medio
 * después que impedía enterarse).
 */
export function describeSyncPayload(payload: SyncPayload): {
	assets: number;
	transactions: number;
	edits: number;
} {
	const { coreAssets, satelliteAssets, stockAssets } = payload.assets;
	return {
		assets: coreAssets.length + satelliteAssets.length + stockAssets.length,
		transactions: payload.transactions?.length ?? 0,
		edits: payload.holdingEdits?.length ?? 0
	};
}
