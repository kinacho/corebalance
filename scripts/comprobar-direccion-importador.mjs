/**
 * Comprobación en navegador del **paso de dirección** del importador.
 *
 * Los unitarios de `src/lib/importers/direccion.test.ts` prueban la aritmética; esto
 * prueba que el cableado llega: que un CSV sin columna de tipo se para en el paso nuevo
 * en vez de colarse como catorce compras, que la pareja de traspaso se propone sola, y
 * que confirmarla cambia las cifras que la pantalla enseña **antes** de escribir nada.
 *
 * ⚠️ **Por defecto usa un fichero sintético que se escribe al vuelo, y eso es
 * deliberado.** Este defecto se encontró con un export real de MyInvestor, pero
 * `training/` está ignorado entero porque un CSV de bróker lleva ISIN, saldos y números
 * de orden de una persona — y este repo es público. El sintético reproduce la
 * **estructura** del caso: varias compras en un fondo, una salida, y la entrada en otro
 * fondo cinco días después. Con `--csv <ruta>` se le pasa uno real sin dejar rastro.
 *
 * No es parte de ninguna suite: es un arnés de un solo uso. Build primero,
 * `vite preview`, y entonces esto.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ORIGIN = process.env.ORIGIN || 'http://localhost:4173';
const argCsv = process.argv.indexOf('--csv');

/**
 * El formato «Órdenes» de MyInvestor, que es el que no puede decir la dirección: cinco
 * columnas y ni una que distinga un reembolso de una suscripción.
 */
const CSV_SINTETICO = [
	'Fecha de la orden;ISIN;Importe estimado;Nº de participaciones;Estado',
	'20/03/2026;IE00B03HCZ61;500.00 EUR;40,00;Finalizada',
	'15/03/2026;LU0996182563;655.00 EUR;50,00;Finalizada',
	'10/03/2026;IE00B03HCZ61;650.00 EUR;50,00;Finalizada',
	'10/02/2026;IE00B03HCZ61;1200.00 EUR;100,00;Finalizada',
	'10/01/2026;IE00B03HCZ61;1000.00 EUR;100,00;Finalizada'
].join('\n');

let csvPath;
if (argCsv !== -1 && process.argv[argCsv + 1]) {
	csvPath = process.argv[argCsv + 1];
} else {
	csvPath = path.join(os.tmpdir(), 'ordenes-sinteticas.csv');
	fs.writeFileSync(csvPath, CSV_SINTETICO, 'utf8');
}
console.log('CSV:', csvPath);

const salida = 'scripts/__salida__';
fs.mkdirSync(salida, { recursive: true });

/**
 * `--movil` mide a 390×844, que es donde este mismo modal ya derramó una vez: sus hijos
 * se encogen dentro de un panel con `max-height: 85vh` y lo que tiene el `overflow`
 * visible no recorta, desborda. Ver la regla de los importadores.
 */
const movil = process.argv.includes('--movil');
const app = await chromium.launch();
const page = await app.newPage({
	viewport: movil ? { width: 390, height: 844 } : { width: 1440, height: 1000 }
});

// El tour monta un overlay que intercepta todos los clics.
await page.addInitScript(() => localStorage.setItem('corebalance_tour_seen', 'true'));
await page.goto(ORIGIN, { waitUntil: 'load' });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2500);

/**
 * ⚠️ `click()` no vale a 390 px: hay varios `.btn-demo` en la página y el primero está
 * oculto por una `@media`, así que Playwright reintenta treinta segundos contra un
 * elemento invisible y el timeout apunta al localizador en vez de a la causa. Se
 * despacha sobre el primero que de verdad tenga caja.
 */
await page.evaluate(() => {
	const visibles = [...document.querySelectorAll('button.btn-demo')].filter(
		(b) => b.getBoundingClientRect().width > 0
	);
	(visibles[0] ?? document.querySelector('button.btn-demo'))?.click();
});

// ⚠️ `waitForURL` no vale: espera un `load` que la navegación cliente no dispara.
let enDashboard = false;
for (let i = 0; i < 40; i++) {
	if ((await page.evaluate(() => location.pathname)).startsWith('/dashboard')) {
		enDashboard = true;
		break;
	}
	await page.waitForTimeout(250);
}
console.log('en /dashboard:', enDashboard);
await page.waitForTimeout(1500);

/**
 * ⚠️ El botón de gestionar está oculto en modo demo (`{#if !portfolio.isDemo}` en
 * `Header.svelte`). Se abre con el mismo evento que usa el tour, que es un mecanismo de
 * la propia app y no un truco del arnés.
 */
await page.evaluate(() =>
	window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'manage' } }))
);
await page.waitForTimeout(1200);

// El modal de importación se abre desde el panel de gestión.
const abrirImport = page.locator('button', { hasText: /Importar/i }).first();
await abrirImport.evaluate((el) => el.click());
await page.waitForTimeout(800);

await page.setInputFiles('input.file-input', csvPath);

// Resolver los ISIN contra la API tarda; el paso de dirección aparece después.
let enDireccion = false;
for (let i = 0; i < 60; i++) {
	if (await page.locator('.dir-explica').count()) {
		enDireccion = true;
		break;
	}
	await page.waitForTimeout(300);
}
console.log('paso de dirección visible:', enDireccion);

const leer = () =>
	page.evaluate(() => ({
		sugerencias: document.querySelectorAll('.dir-sugerencia').length,
		confirmadas: document.querySelectorAll('.dir-sugerencia.confirmada').length,
		filas: document.querySelectorAll('.dir-fila').length,
		resultado: [...document.querySelectorAll('.dir-res-fila')].map((f) =>
			f.textContent.replace(/\s+/g, ' ').trim()
		),
		coste: document.querySelector('.dir-sug-coste')?.textContent?.replace(/\s+/g, ' ').trim() ?? null
	}));

const antes = await leer();
console.log('\nANTES de confirmar el traspaso');
console.log('  sugerencias:', antes.sugerencias, '| filas:', antes.filas);
antes.resultado.forEach((r) => console.log('  ·', r));
await page.screenshot({ path: `${salida}/direccion-antes.png` });

/**
 * ⚠️ **Cero sugerencias es un resultado legítimo y no un fallo del arnés**, así que no se
 * puede dar por hecho que haya botón que pulsar. Es lo que pasa —y debe pasar— cuando el
 * destino no es un fondo: solo fondo → fondo difiere el impuesto, y ahí la pantalla tiene
 * que ofrecer marcar la salida a mano y nada más. Es el control negativo de esa regla, y
 * la primera versión de este arnés se caía con un timeout de 30 s en vez de contarlo.
 */
let despues = antes;
if (antes.sugerencias > 0) {
	await page.locator('.dir-sug-btn').first().evaluate((el) => el.click());
	await page.waitForTimeout(600);

	despues = await leer();
	console.log('\nDESPUÉS de confirmar el traspaso');
	console.log('  confirmadas:', despues.confirmadas);
	despues.resultado.forEach((r) => console.log('  ·', r));
	console.log('  nota de coste:', despues.coste);
	await page.screenshot({ path: `${salida}/direccion-despues.png` });
} else {
	console.log('\nSin parejas que proponer: el paso solo ofrece marcar salidas a mano.');
}

/**
 * Medido contra el **contenedor** y no contra la ventana: el defecto de este modal a
 * 390 px fue un hijo saliéndose de su propia caja mientras la página no desbordaba nada.
 * Se tolera 1 px de redondeo del motor de maquetación.
 */
const derrames = await page.evaluate(() => {
	const cuerpo = document.querySelector('.import-body');
	if (!cuerpo) return ['no hay cuerpo del modal'];
	const caja = cuerpo.getBoundingClientRect();
	const fuera = [];
	for (const el of cuerpo.querySelectorAll('*')) {
		const r = el.getBoundingClientRect();
		if (r.width === 0 && r.height === 0) continue;
		if (r.right > caja.right + 1 || r.left < caja.left - 1) {
			fuera.push(`${el.className || el.tagName} → ${Math.round(r.right)} vs ${Math.round(caja.right)}`);
		}
	}
	return fuera.slice(0, 6);
});
console.log('\nDerrames horizontales dentro del modal:', derrames.length || 'ninguno');
derrames.forEach((d) => console.log('  ✗', d));

// Y que el paso cierre hacia la previsualización con esas mismas cifras.
await page.locator('.import-footer button').first().evaluate((el) => el.click());
await page.waitForTimeout(800);
const enPreview = (await page.locator('.positions-list').count()) > 0;
const previsualizadas = await page.evaluate(() =>
	[...document.querySelectorAll('.position-row')].map((r) =>
		r.textContent.replace(/\s+/g, ' ').trim()
	)
);
console.log('\nEn previsualización:', enPreview);
previsualizadas.forEach((p) => console.log('  ·', p));
await page.screenshot({ path: `${salida}/direccion-preview.png` });

/**
 * Cada elemento del paso contra su propio contenedor, que es la medida que hace falta:
 * lo que desborda aquí no es la ventana, es la caja. Se mide **antes** de cerrar el paso,
 * así que se guarda arriba y se comprueba abajo.
 */
const desbordes = derrames;

const problemas = [];
for (const d of desbordes) problemas.push(`se sale de su caja: ${d}`);
if (!enDashboard) problemas.push('no se llegó al dashboard');
if (!enDireccion) problemas.push('el paso de dirección no apareció: el CSV se coló como compras');
if (!enPreview) problemas.push('el paso no cerró hacia la previsualización');
if (antes.filas === 0) problemas.push('el paso no listó ninguna operación que marcar');

// Lo que sigue solo aplica cuando había una pareja que proponer. Ver arriba.
if (antes.sugerencias > 0) {
	if (despues.confirmadas !== 1) problemas.push('confirmar la pareja no la marcó');
	if (!despues.coste) problemas.push('no se dijo qué coste hereda el destino');
	if (JSON.stringify(antes.resultado) === JSON.stringify(despues.resultado))
		problemas.push('confirmar el traspaso no cambió las cifras enseñadas');
}

console.log('\n' + (problemas.length ? '✗ ' + problemas.join('\n✗ ') : '✔ Todo correcto'));
await app.close();
process.exit(problemas.length ? 1 : 0);
