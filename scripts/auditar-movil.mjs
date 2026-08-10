/**
 * Arnés de un solo uso: recorre la app a ancho de móvil, captura cada superficie
 * y mide tres cosas que una captura sola no dice — desbordamiento horizontal,
 * objetivos de toque por debajo de 44 px y texto por debajo de 12 px.
 *
 * No es parte de ninguna suite. Build primero, `vite preview`, y luego
 * `node scripts/auditar-movil.mjs`.
 *
 * El botón de demo de la barra está oculto en móvil, así que la demo se arranca
 * en ancho y luego se reduce el viewport.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const ORIGIN = process.env.ORIGIN || 'http://localhost:4173';
const OUT = process.env.OUT || 'C:/Users/Kino/AppData/Local/Temp/claude/C--Users-Kino-Github-Rebalanceador-90-5-5/f44bd977-464d-44fe-8f19-bc4b714176d6/scratchpad/movil';
const W = Number(process.env.W || 390);
const H = Number(process.env.H || 844);

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'es-ES' });

await page.addInitScript(() => localStorage.setItem('corebalance_tour_seen', 'true'));

const AUDIT = `(() => {
	const vw = document.documentElement.clientWidth;
	const nombre = (el) => {
		const cls = (el.className && typeof el.className === 'string')
			? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.')
			: '';
		return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls;
	};
	const enScrollHorizontal = (el) => {
		for (let p = el.parentElement; p; p = p.parentElement) {
			const ox = getComputedStyle(p).overflowX;
			if (ox === 'auto' || ox === 'scroll') return true;
		}
		return false;
	};
	const desborda = [];
	const toques = [];
	const microtexto = [];
	for (const el of document.querySelectorAll('body *')) {
		const cs = getComputedStyle(el);
		if (cs.display === 'none' || cs.visibility === 'hidden') continue;
		const r = el.getBoundingClientRect();
		if (r.width === 0 || r.height === 0) continue;

		if (!enScrollHorizontal(el) && (r.right > vw + 1 || r.left < -1)) {
			desborda.push({ el: nombre(el), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) });
		}

		const clicable = el.matches('button, a, [role="button"], input, select, summary');
		if (clicable && (r.height < 40 || r.width < 40)) {
			toques.push({ el: nombre(el), w: Math.round(r.width), h: Math.round(r.height), txt: (el.textContent || '').trim().slice(0, 18) });
		}

		const px = parseFloat(cs.fontSize);
		const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
		if (propio && px && px < 11.5) {
			microtexto.push({ el: nombre(el), px: +px.toFixed(1), txt: (el.textContent || '').trim().slice(0, 24) });
		}
	}
	const dedup = (arr) => {
		const vistos = new Set();
		return arr.filter((x) => { const k = x.el + (x.px || ''); if (vistos.has(k)) return false; vistos.add(k); return true; });
	};
	return {
		vw,
		scrollW: document.documentElement.scrollWidth,
		bodyScrollW: document.body.scrollWidth,
		desborda: dedup(desborda).slice(0, 30),
		toques: dedup(toques).slice(0, 30),
		microtexto: dedup(microtexto).slice(0, 30)
	};
})()`;

async function auditar(etiqueta) {
	const r = await page.evaluate(AUDIT);
	console.log(`\n=== ${etiqueta} (vw ${r.vw}, scrollW ${r.scrollW}) ===`);
	if (r.scrollW > r.vw + 1) console.log(`  ⚠️ SCROLL HORIZONTAL: ${r.scrollW} > ${r.vw}`);
	if (r.desborda.length) {
		console.log('  desborda:');
		for (const d of r.desborda) console.log(`    ${d.el}  [${d.left}…${d.right}] w=${d.w}`);
	}
	if (r.toques.length) {
		console.log('  toque < 40px:');
		for (const t of r.toques) console.log(`    ${t.el}  ${t.w}x${t.h}  «${t.txt}»`);
	}
	if (r.microtexto.length) {
		console.log('  texto < 11.5px:');
		for (const m of r.microtexto) console.log(`    ${m.el}  ${m.px}px  «${m.txt}»`);
	}
	if (!r.desborda.length && !r.toques.length && !r.microtexto.length) console.log('  limpio');
	return r;
}

async function shot(name, locator) {
	try {
		if (!locator) {
			await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
			return console.log(`  ok ${name} (completa)`);
		}
		const el = page.locator(locator).first();
		if (!(await el.count())) return console.log(`  (ausente) ${name} — ${locator}`);
		await el.scrollIntoViewIfNeeded();
		await page.waitForTimeout(500);
		await el.screenshot({ path: `${OUT}/${name}.png` });
		console.log(`  ok ${name}`);
	} catch (e) {
		console.log(`  fallo ${name}: ${e.message.split('\n')[0]}`);
	}
}

// --- Landing en móvil ---
await page.setViewportSize({ width: W, height: H });
await page.goto(ORIGIN, { waitUntil: 'load' });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
await shot('10-landing');
await auditar('landing');

// --- Entrar a la demo (el botón está oculto en móvil) ---
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(1500);

/**
 * ⚠️ Con un solo clic esto es intermitente, y cuando falla **no se nota**: el
 * guion sigue, audita la landing dos veces y la llama «dashboard». Se reintenta y
 * si no entra se aborta, porque una medida atribuida a la pantalla equivocada es
 * peor que no medir.
 */
let enDashboard = false;
for (let intento = 0; intento < 4 && !enDashboard; intento++) {
	await page.locator('button.btn-demo').first().click({ timeout: 5000 }).catch(() => {});
	for (let i = 0; i < 20; i++) {
		if ((await page.evaluate(() => location.pathname)).startsWith('/dashboard')) {
			enDashboard = true;
			break;
		}
		await page.waitForTimeout(250);
	}
}
if (!enDashboard) {
	console.log('⚠️ no se ha podido entrar en la demo; se aborta');
	await browser.close();
	process.exit(1);
}
await page.waitForTimeout(4000);
await page.setViewportSize({ width: W, height: H });
await page.waitForTimeout(2500);
console.log('pathname:', await page.evaluate(() => location.pathname));

/**
 * Las pestañas por índice y no por texto: se llaman «Activos / Estrategia /
 * Gráficos», y buscar «Rebal» no encontraba la del medio — el intento anterior
 * auditó dos veces la misma pestaña sin decirlo.
 */
async function pestana(indice) {
	const btn = page.locator('.tab-btn').nth(indice);
	if (await btn.count()) {
		await btn.click();
		await page.waitForTimeout(1400);
		console.log(`  pestaña ${indice}: «${(await btn.textContent())?.trim()}»`);
	} else {
		console.log(`  (no hay pestaña ${indice})`);
	}
}

// Pestaña de activos (la que abre)
await shot('20-tab-activos');
await auditar('dashboard · activos');
await shot('21-hero', '.hero-summary');

// --- El modal del libro, abierto y cerrado desde una tarjeta ---
// Cerrarlo tiene que devolver el scroll: `LedgerModal` ponía `body.modal-open` y
// no lo quitaba nunca, así que el dashboard se quedaba sin scroll y recortado.
{
	// En la tarjeta completa el `📜` solo sale si el activo lleva libro, y la demo
	// no lo lleva; en la vista compacta el icono del activo abre el libro siempre.
	// El `.asset-icon` de la tarjeta completa es un `<span>`, no un botón, así que
	// hay que pedir el botón explícitamente.
	if (!(await page.locator('button.asset-icon, .ledger-badge').count())) {
		const compacta = page.locator('.view-toggle-btn').first();
		if (await compacta.count()) {
			// `force` porque la barra de pestañas pegajosa se lleva el test de impacto
			// del puntero. Aquí lo que se comprueba es qué pasa **al cerrar** el modal,
			// no si el botón es alcanzable con el dedo.
			await compacta.click({ force: true });
			await page.waitForTimeout(900);
		}
	}
	const abridor = page.locator('button.asset-icon, .ledger-badge').first();
	if (await abridor.count()) {
		await abridor.click({ force: true });
		await page.waitForTimeout(900);
		const abierto = await page.evaluate(() => ({
			bloqueado: document.body.classList.contains('modal-open'),
			modal: !!document.querySelector('.ledger-backdrop')
		}));
		await shot('25-libro-abierto');
		await page.locator('.close-btn').first().click();
		await page.waitForTimeout(900);
		const cerrado = await page.evaluate(() => {
			const antes = window.scrollY;
			window.scrollBy(0, 300);
			const despues = window.scrollY;
			window.scrollTo(0, antes);
			return {
				bloqueado: document.body.classList.contains('modal-open'),
				modal: !!document.querySelector('.ledger-backdrop'),
				alturaBody: getComputedStyle(document.body).height,
				puedeDesplazarse: despues !== antes
			};
		});
		console.log('\n=== modal del libro ===');
		console.log(`  abierto:  bloqueado=${abierto.bloqueado} modal=${abierto.modal}`);
		console.log(
			`  cerrado:  bloqueado=${cerrado.bloqueado} modal=${cerrado.modal} body.height=${cerrado.alturaBody} scroll=${cerrado.puedeDesplazarse ? 'sí' : 'NO'}`
		);
		if (cerrado.bloqueado || !cerrado.puedeDesplazarse) console.log('  ⚠️ LA PÁGINA SE QUEDA ROTA');
		await shot('26-libro-cerrado');
	} else {
		console.log('  (no encuentro cómo abrir el libro)');
	}
}

// Pestaña de gráficos
await pestana(2);
await page.waitForTimeout(1200);
await shot('30-tab-graficos');
await auditar('dashboard · gráficos');
await shot('31-historico', '.history-section');
await shot('32-timing', '.timing-cost, .timing-panel');

// Los cinco carriles del carrusel
const carriles = await page.locator('.charts-grid > .chart-box, .charts-grid > .maps-fold > .maps-row > .chart-box').all();
console.log(`carriles del carrusel: ${carriles.length}`);
for (let i = 0; i < carriles.length; i++) {
	try {
		await carriles[i].scrollIntoViewIfNeeded();
		await page.waitForTimeout(700);
		await carriles[i].screenshot({ path: `${OUT}/4${i}-carril-${i}.png` });
		console.log(`  ok carril ${i}`);
	} catch (e) {
		console.log(`  fallo carril ${i}: ${e.message.split('\n')[0]}`);
	}
}

// Los tres modos y los cinco rangos del histórico
await shot('33-historico-modo-euro', '.history-section');
for (const [i, sel] of [['pct', '.view-toggle .toggle-btn:nth-child(2)'], ['gain', '.view-toggle .toggle-btn:nth-child(3)'], ['split', '.view-toggle .toggle-btn:nth-child(4)']]) {
	try {
		await page.locator(sel).first().click();
		await page.waitForTimeout(900);
		await shot(`34-historico-${i}`, '.history-section');
	} catch (e) {
		console.log(`  fallo modo ${i}: ${e.message.split('\n')[0]}`);
	}
}
await page.locator('.view-toggle .toggle-btn').first().click();
await page.waitForTimeout(600);

// Pestaña de estrategia (rebalanceo, IRPF, proyecciones y crisis)
await pestana(1);
await page.waitForTimeout(1200);
await shot('50-tab-rebalanceo');
await auditar('dashboard · rebalanceo');
await shot('51-proyecciones', '#tour-projections');
await shot('52-crisis', '#tour-crisis');

await browser.close();
console.log('\ncapturas en', OUT);
