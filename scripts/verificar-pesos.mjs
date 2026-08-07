/**
 * Comprobación en navegador del reparto de pesos, tras sacarlo del componente a
 * `$lib/weights`. Los tests unitarios prueban la aritmética; esto prueba que el
 * cableado sigue vivo: que mover el control cambia el store, que los demás se
 * reajustan y que la suma sigue enseñando 100 %.
 *
 * No es parte de la suite: es un arnés de un solo uso, se lanza a mano contra
 * `vite preview` con el build hecho.
 */
import { chromium } from '@playwright/test';

const ORIGIN = process.env.ORIGIN || 'http://localhost:4173';

const app = await chromium.launch();
const page = await app.newPage({ viewport: { width: 1440, height: 900 } });

// El tour monta un overlay que intercepta todos los clics.
await page.addInitScript(() => localStorage.setItem('corebalance_tour_seen', 'true'));
await page.goto(ORIGIN, { waitUntil: 'load' });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2500);

await page.locator('button.btn-demo').first().click();

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
 * ⚠️ El botón de gestionar **está oculto en modo demo** (`{#if !portfolio.isDemo}` en
 * `Header.svelte`), así que no se puede llegar por ahí. Se abre con el mismo evento
 * que usa el tour, que es un mecanismo de la propia app y no un truco del test.
 */
await page.evaluate(() =>
	window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'manage' } }))
);
await page.waitForTimeout(1500);

const leerEstado = () =>
	page.evaluate(() => {
		const suma = document.querySelector('.weight-sum')?.textContent?.trim() ?? null;
		const rangos = [...document.querySelectorAll('input[type="range"]')].map((i) =>
			Number(i.value)
		);
		return { suma, rangos };
	});

const antes = await leerEstado();
console.log('ANTES  → suma:', antes.suma, '| pesos:', antes.rangos.join(', '));

// Mover el primer control a 60 y dejar que el store se asiente.
const primero = page.locator('input[type="range"]').first();
await primero.evaluate((el) => {
	const input = el;
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
	setter.call(input, '60');
	input.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(1200);

const despues = await leerEstado();
console.log('DESPUÉS → suma:', despues.suma, '| pesos:', despues.rangos.join(', '));

await page.screenshot({ path: 'scripts/__salida__/pesos.png', fullPage: false });

// Comprobaciones mínimas, para no depender sólo de mirar la captura.
const sumaNum = Number((despues.suma ?? '').replace('%', '').replace(',', '.'));
const problemas = [];
if (!enDashboard) problemas.push('no se llegó al dashboard');
if (despues.rangos.length === 0) problemas.push('no hay controles de peso en pantalla');
if (Math.abs(sumaNum - 100) > 0.15) problemas.push(`la suma no cierra: ${despues.suma}`);
if (despues.rangos[0] !== 60) problemas.push(`el primero no quedó en 60: ${despues.rangos[0]}`);
if (JSON.stringify(antes.rangos) === JSON.stringify(despues.rangos))
	problemas.push('los pesos no cambiaron: el cableado no llegó al store');

console.log(problemas.length ? 'PROBLEMAS: ' + problemas.join(' | ') : 'OK: reparto vivo y suma cuadrada');
await app.close();
process.exit(problemas.length ? 1 : 0);
