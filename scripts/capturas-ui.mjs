/**
 * Captura las superficies principales de la app para revisarlas a ojo.
 * Arnés de un solo uso: build + `vite preview` + `node scripts/capturas-ui.mjs`.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const ORIGIN = process.env.ORIGIN || 'http://localhost:4173';
const DIR = 'scripts/__salida__';
mkdirSync(DIR, { recursive: true });

const app = await chromium.launch();

async function nuevaPagina(width, height) {
	const page = await app.newPage({ viewport: { width, height } });
	await page.addInitScript(() => localStorage.setItem('corebalance_tour_seen', 'true'));
	return page;
}

async function entrarAlDashboard(page) {
	await page.goto(ORIGIN, { waitUntil: 'load' });
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(2500);
	await page.locator('button.btn-demo').first().click();
	for (let i = 0; i < 40; i++) {
		if ((await page.evaluate(() => location.pathname)).startsWith('/dashboard')) break;
		await page.waitForTimeout(250);
	}
	await page.waitForTimeout(2500);
}

// ── Landing, escritorio y móvil ───────────────────────────────────────────────
{
	const page = await nuevaPagina(1440, 900);
	await page.goto(ORIGIN, { waitUntil: 'load' });
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(1500);
	await page.screenshot({ path: `${DIR}/01-landing.png` });
	await page.screenshot({ path: `${DIR}/02-landing-completa.png`, fullPage: true });
	await page.close();
}
{
	const page = await nuevaPagina(390, 844);
	await page.goto(ORIGIN, { waitUntil: 'load' });
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(1500);
	await page.screenshot({ path: `${DIR}/03-landing-movil.png` });
	await page.close();
}

// ── Dashboard escritorio ──────────────────────────────────────────────────────
{
	const page = await nuevaPagina(1440, 900);
	await entrarAlDashboard(page);
	await page.screenshot({ path: `${DIR}/04-dashboard.png` });
	await page.screenshot({ path: `${DIR}/05-dashboard-completo.png`, fullPage: true });

	// Panel de gestión (el botón está oculto en demo: se abre con el evento del tour).
	await page.evaluate(() =>
		window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'manage' } }))
	);
	await page.waitForTimeout(1200);
	await page.screenshot({ path: `${DIR}/06-gestionar.png` });
	await page.close();
}

// ── Dashboard móvil, con sus pestañas ─────────────────────────────────────────
{
	// ⚠️ El botón de demo está oculto en móvil: se entra en ancho y luego se estrecha.
	const page = await nuevaPagina(1440, 900);
	await entrarAlDashboard(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.waitForTimeout(1500);
	await page.screenshot({ path: `${DIR}/07-movil-resumen.png` });

	const pestañas = await page.locator('.tab-btn, [role="tab"], nav button').all();
	for (let i = 0; i < Math.min(pestañas.length, 5); i++) {
		try {
			await pestañas[i].click({ timeout: 3000 });
			await page.waitForTimeout(900);
			await page.screenshot({ path: `${DIR}/08-movil-pestaña-${i}.png` });
		} catch {
			/* pestaña no clicable, seguimos */
		}
	}
	await page.close();
}

console.log('capturas en', DIR);
await app.close();
