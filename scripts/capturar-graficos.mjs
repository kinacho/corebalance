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

// Por encima de 1024px no hay pestañas: todo se renderiza. Solo hay que
// desplegar los paneles, que nacen colapsados.
for (const header of await page.locator('.panel-header').all()) {
	try {
		await header.click();
		await page.waitForTimeout(400);
	} catch {}
}
await page.waitForTimeout(1800);
await shot('04-proyecciones', '#tour-projections');
await shot('05-crisis', '#tour-crisis');
await shot('06-rebalanceo', '.sidebar');

await browser.close();
console.log('capturas en', OUT);
