/**
 * Arnés de un solo uso: abre el modal del libro desde una tarjeta y comprueba que
 * al cerrarlo la página vuelve a funcionar.
 *
 * `LedgerModal` ponía `body.modal-open` y **no lo quitaba nunca** —su `onDestroy`
 * era un bloque vacío—, así que al cerrarlo el `body` se quedaba con
 * `overflow: hidden` y la altura de la ventana: dashboard sin scroll y recortado.
 *
 * Se hace en ancho de escritorio a propósito: el defecto no es de móvil, y ahí no
 * hay barra de pestañas pegajosa robándole el clic al arnés. Los clics se
 * despachan sobre el elemento (`el.click()`) y no por coordenadas.
 *
 * Build primero, `vite preview`, y luego `node scripts/comprobar-modal-libro.mjs`.
 */
import { chromium } from '@playwright/test';

const ORIGIN = process.env.ORIGIN || 'http://localhost:4173';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'es-ES' });
await page.addInitScript(() => localStorage.setItem('corebalance_tour_seen', 'true'));
await page.goto(ORIGIN, { waitUntil: 'load' });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2500);

let dentro = false;
for (let intento = 0; intento < 4 && !dentro; intento++) {
	await page.locator('button.btn-demo').first().click({ timeout: 5000 }).catch(() => {});
	for (let i = 0; i < 20; i++) {
		if ((await page.evaluate(() => location.pathname)).startsWith('/dashboard')) dentro = true;
		if (dentro) break;
		await page.waitForTimeout(250);
	}
}
if (!dentro) {
	console.log('no se ha podido entrar en la demo');
	await browser.close();
	process.exit(1);
}
await page.waitForTimeout(3500);

/** Clic sobre el elemento, sin test de impacto por coordenadas. */
async function pulsar(selector) {
	return page.evaluate((sel) => {
		const el = document.querySelector(sel);
		if (!el) return false;
		el.click();
		return true;
	}, selector);
}

/**
 * ⚠️ Aquí había un `window.scrollBy` para comprobar si la página se movía, y **no
 * medía nada**: el proyecto tiene `scroll-behavior: smooth`, así que leer
 * `scrollY` en la línea siguiente da siempre el valor de antes — daba «no se
 * desplaza» incluso con la página perfectamente sana. Lo que de verdad rompe la
 * página es el `overflow: hidden` y la altura recortada del `body`, y eso sí se
 * lee directo.
 */
const estado = () =>
	page.evaluate(() => ({
		bloqueado: document.body.classList.contains('modal-open'),
		modal: !!document.querySelector('.ledger-backdrop'),
		overflow: getComputedStyle(document.body).overflowY,
		alto: Math.round(parseFloat(getComputedStyle(document.body).height))
	}));

console.log('inicio            ', await estado());

// En la tarjeta completa el 📜 solo existe si el activo lleva libro; en la vista
// compacta el icono del activo lo abre siempre.
if (!(await page.locator('button.asset-icon, .ledger-badge').count())) {
	await pulsar('.view-toggle-btn');
	await page.waitForTimeout(1000);
}

const abierto = await pulsar('button.asset-icon, .ledger-badge');
if (!abierto) {
	console.log('no encuentro el botón del libro');
	await browser.close();
	process.exit(1);
}
await page.waitForTimeout(1200);
console.log('libro abierto     ', await estado());

await pulsar('.ledger-modal .close-btn, .close-btn');
await page.waitForTimeout(1200);
const tras = await estado();
console.log('libro cerrado     ', tras);

/**
 * El otro caso, el opuesto: con el panel de gestión detrás, cerrar el libro **no**
 * puede devolver el scroll, porque la página sigue tapada. Es el error que tenía
 * `ImportModal`, que se abre igual desde dentro de `ManageAssets`.
 *
 * El botón de gestión está oculto en modo demo, así que se abre disparando el
 * evento `tour-step` que la propia app escucha — el mismo mecanismo que usa
 * `scripts/verificar-pesos.mjs`, no un gancho de pruebas.
 */
await page.evaluate(() =>
	window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'manage' } }))
);
await page.waitForTimeout(1800);
const gestion = await estado();
console.log('gestión abierta   ', gestion);

let anidado = null;
if (gestion.bloqueado) {
	const abrio = await pulsar('.ledger-btn, button.asset-icon, .ledger-badge');
	await page.waitForTimeout(1200);
	if (abrio && (await page.locator('.ledger-backdrop').count())) {
		// El **último** `.close-btn` del documento, no el primero: el primero es el del
		// panel de gestión, que está antes en el DOM, y cerrar ése no prueba nada.
		await page.evaluate(() => {
			const botones = [...document.querySelectorAll('.close-btn')];
			botones[botones.length - 1]?.click();
		});
		await page.waitForTimeout(1200);
		anidado = await estado();
		console.log('libro cerrado sobre gestión', anidado);
	} else {
		console.log('(no he podido abrir el libro dentro de la gestión)');
	}
}

const suelto = !tras.bloqueado && tras.overflow === 'visible' && !tras.modal && tras.alto > 1000;
const anidadoOk = anidado === null || (anidado.bloqueado && !anidado.modal);
const ok = suelto && anidadoOk;
console.log(
	ok
		? '\nOK: cerrar el libro suelto devuelve la página, y cerrarlo sobre la gestión no'
		: `\n⚠️ FALLA — suelto:${suelto} anidado:${anidadoOk}`
);

await browser.close();
process.exit(ok ? 0 : 1);
