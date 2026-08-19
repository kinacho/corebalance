/**
 * Arnés de un solo uso: abre la demo y captura cada superficie de gráfico.
 *
 * No es parte de ninguna suite. Build primero, `vite preview`, y luego
 * `node scripts/capturar-graficos.mjs`.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const ORIGIN = process.env.ORIGIN || 'http://localhost:4173';
const OUT = process.env.OUT || 'C:/Users/Kino/AppData/Local/Temp/claude/C--Users-Kino-Github-Rebalanceador-90-5-5/5f057867-54d2-4330-95be-33a1c59b770c/scratchpad/shots';

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, locale: 'es-ES' });

await page.addInitScript(() => localStorage.setItem('corebalance_tour_seen', 'true'));
await page.goto(ORIGIN, { waitUntil: 'load' });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2500);

await page.locator('button.btn-demo').first().click();
for (let i = 0; i < 40; i++) {
	if ((await page.evaluate(() => location.pathname)).startsWith('/dashboard')) break;
	await page.waitForTimeout(250);
}
await page.waitForTimeout(4000);

async function shot(name, locator) {
	try {
		const el = page.locator(locator).first();
		if (!(await el.count())) return console.log(`  (ausente) ${name} — ${locator}`);
		await el.scrollIntoViewIfNeeded();
		await page.waitForTimeout(700);
		await el.screenshot({ path: `${OUT}/${name}.png` });
		console.log(`  ok ${name}`);
	} catch (e) {
		console.log(`  fallo ${name}: ${e.message.split('\n')[0]}`);
	}
}

console.log('pathname:', await page.evaluate(() => location.pathname));

await page.screenshot({ path: `${OUT}/00-dashboard-completo.png`, fullPage: true });
console.log('  ok 00-dashboard-completo');

await shot('01-hero', '.hero-summary');
await shot('02-historico', '.history-section');
await shot('03-carrusel', '.charts-row-card');

/*
 * Por encima de 1024px no hay pestañas: todo se renderiza. Los paneles nacen plegados,
 * así que hay que abrir el que se va a fotografiar.
 *
 * ⚠️ **Antes esto clicaba TODOS los `.panel-header` en bucle, y con la columna abriendo
 * una herramienta a la vez eso deja abierta solo la última**: el script seguiría
 * imprimiendo `ok` sobre la foto de una cabecera plegada, que es un guardián que no puede
 * fallar. Se abre uno por toma, y por el `tour-step` que la app ya tiene en vez de por
 * clic a ciegas.
 */
async function abrir(objetivo) {
	await page.evaluate(
		(t) => window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: t } })),
		objetivo
	);
	await page.waitForTimeout(900);
}

await abrir('abrir-projections');
await shot('04-proyecciones', '#tour-projections');
await abrir('abrir-crisis');
await shot('05-crisis', '#tour-crisis');
await abrir('abrir-rebalance');
await shot('06-rebalanceo', '.sidebar');

await browser.close();
console.log('capturas en', OUT);
