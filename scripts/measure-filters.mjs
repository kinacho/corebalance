/**
 * Mide lo que cuestan de verdad los tres efectos visuales del sitio antes de
 * decidir si se tocan: el mesh de fondo (`filter: blur(80px)` + animación
 * infinita), el `noise-overlay` (`feTurbulence` a pantalla completa) y los
 * `backdrop-filter: blur()` de las tarjetas.
 *
 * Existe porque el plan decía "medir antes", y con razón: los tres son cambios
 * de aspecto visual y no merece la pena pagarlos a ciegas. Lo que sale de aquí
 * son números de laboratorio con CPU frenada, no datos de campo; sirven para
 * ordenar sospechosos, no para sustituir a Speed Insights.
 *
 * Uso:
 *   npm run build && node scripts/measure-filters.mjs
 *   node scripts/measure-filters.mjs --runs 7 --path /dashboard
 */

import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4173;
const ORIGIN = `http://localhost:${PORT}`;

/** Móvil de gama media: es donde duelen los filtros, no en un portátil. */
const DEVICE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true };
const CPU_THROTTLE = 4;

/** Ventana de observación de la animación del mesh, en ms. */
const ANIMATION_WINDOW = 3000;

/** Un fotograma por encima de esto se nota: 60 fps son 16,7 ms. */
const LONG_FRAME_MS = 32;

const VARIANTS = [
	{ key: 'baseline', label: 'Tal cual está hoy', css: '' },
	{
		key: 'mesh-sin-animar',
		label: 'Mesh quieto (blur intacto)',
		css: '.background-mesh { animation: none !important; }'
	},
	{
		key: 'sin-mesh',
		label: 'Sin mesh de fondo',
		css: '.background-mesh { display: none !important; }'
	},
	{
		key: 'sin-ruido',
		label: 'Sin noise-overlay (feTurbulence)',
		css: '.noise-overlay { display: none !important; }'
	},
	{
		key: 'sin-backdrop',
		label: 'Sin backdrop-filter en tarjetas',
		css: '*, *::before, *::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }'
	},
	{
		key: 'sin-nada',
		label: 'Los tres efectos fuera',
		css: `.background-mesh, .noise-overlay { display: none !important; }
		      *, *::before, *::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }`
	}
];

function arg(name, fallback) {
	const i = process.argv.indexOf(`--${name}`);
	return i === -1 ? fallback : process.argv[i + 1];
}

const RUNS = Number(arg('runs', 5));
const PATHNAME = arg('path', '/');

function median(values) {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function waitForServer(timeoutMs = 60000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(ORIGIN, { method: 'HEAD' });
			if (res.ok || res.status === 404) return;
		} catch {
			// El servidor todavía no escucha.
		}
		await new Promise((r) => setTimeout(r, 300));
	}
	throw new Error(`El servidor de preview no respondió en ${ORIGIN}`);
}

/**
 * Una carga con la CPU frenada. Devuelve FCP, LCP y el comportamiento de los
 * fotogramas mientras la animación del mesh está corriendo.
 */
async function measureOnce(browser, variant) {
	const context = await browser.newContext({
		viewport: { width: DEVICE.width, height: DEVICE.height },
		deviceScaleFactor: DEVICE.deviceScaleFactor,
		isMobile: DEVICE.isMobile,
		hasTouch: true,
		// Sin esto el mesh no se anima y estaríamos midiendo otra página.
		reducedMotion: 'no-preference'
	});

	const page = await context.newPage();

	if (variant.css) {
		await page.addInitScript((css) => {
			// En `addInitScript` para que el estilo exista antes del primer pintado:
			// inyectarlo después mediría la página con el efecto ya pagado una vez.
			document.addEventListener('DOMContentLoaded', () => {
				const style = document.createElement('style');
				style.textContent = css;
				document.head.appendChild(style);
			});
			const observer = new MutationObserver(() => {
				if (!document.head) return;
				observer.disconnect();
				const style = document.createElement('style');
				style.textContent = css;
				document.head.appendChild(style);
			});
			observer.observe(document.documentElement, { childList: true, subtree: true });
		}, variant.css);
	}

	const cdp = await context.newCDPSession(page);
	await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });

	await page.goto(`${ORIGIN}${PATHNAME}`, { waitUntil: 'load', timeout: 60000 });

	const paint = await page.evaluate(() => {
		const fcp = performance.getEntriesByName('first-contentful-paint')[0];
		return new Promise((resolve) => {
			let lcp = 0;
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) lcp = entry.startTime;
			});
			observer.observe({ type: 'largest-contentful-paint', buffered: true });
			// El LCP sólo es definitivo cuando deja de haber candidatos nuevos.
			setTimeout(() => {
				observer.disconnect();
				resolve({ fcp: fcp ? fcp.startTime : null, lcp });
			}, 1000);
		});
	});

	// Coste sostenido: cuántos fotogramas se pasan de largo mientras el mesh anima.
	const frames = await page.evaluate((window_ms) => {
		return new Promise((resolve) => {
			const deltas = [];
			let last = performance.now();
			const start = last;
			function tick(now) {
				deltas.push(now - last);
				last = now;
				if (now - start < window_ms) requestAnimationFrame(tick);
				else resolve(deltas);
			}
			requestAnimationFrame(tick);
		});
	}, ANIMATION_WINDOW);

	await context.close();

	const usable = frames.slice(1);
	return {
		fcp: paint.fcp,
		lcp: paint.lcp,
		frameMedian: median(usable),
		longFrames: usable.filter((d) => d > LONG_FRAME_MS).length,
		frameCount: usable.length
	};
}

async function main() {
	if (!existsSync(join(ROOT, '.svelte-kit', 'output'))) {
		throw new Error('No hay build. Ejecuta "npm run build" antes de medir.');
	}

	const server = spawn(
		process.platform === 'win32' ? 'npx.cmd' : 'npx',
		['vite', 'preview', '--port', String(PORT), '--strictPort'],
		{ cwd: ROOT, stdio: 'ignore', shell: process.platform === 'win32' }
	);

	let browser;
	try {
		await waitForServer();
		browser = await chromium.launch();

		console.log(
			`\nmedición sobre ${PATHNAME} — ${DEVICE.width}x${DEVICE.height} @${DEVICE.deviceScaleFactor}x, ` +
				`CPU /${CPU_THROTTLE}, mediana de ${RUNS} cargas\n`
		);

		const results = [];
		for (const variant of VARIANTS) {
			const runs = [];
			for (let i = 0; i < RUNS; i++) {
				runs.push(await measureOnce(browser, variant));
			}
			const lcps = runs.map((r) => r.lcp);
			const row = {
				label: variant.label,
				fcp: median(runs.map((r) => r.fcp).filter((v) => v != null)),
				lcp: median(lcps),
				// El margen entre la carga más rápida y la más lenta de la misma
				// variante. Es el suelo de ruido: una diferencia entre variantes más
				// pequeña que esto no significa nada.
				lcpSpread: Math.max(...lcps) - Math.min(...lcps),
				frameMedian: median(runs.map((r) => r.frameMedian)),
				longFrames: median(runs.map((r) => r.longFrames)),
				frameCount: runs[0].frameCount
			};
			results.push(row);
			console.log(
				`${row.label.padEnd(34)} FCP ${String(Math.round(row.fcp)).padStart(5)} ms   ` +
					`LCP ${String(Math.round(row.lcp)).padStart(5)} ms ±${String(Math.round(row.lcpSpread)).padStart(4)}   ` +
					`fotograma ${row.frameMedian.toFixed(1).padStart(5)} ms   ` +
					`largos ${String(row.longFrames).padStart(3)}`
			);
		}

		const base = results[0];
		console.log('\ndiferencia contra el estado actual:');
		for (const row of results.slice(1)) {
			const d = (a, b) => {
				const delta = b - a;
				return `${delta >= 0 ? '+' : ''}${Math.round(delta)}`;
			};
			console.log(
				`${row.label.padEnd(34)} LCP ${d(base.lcp, row.lcp).padStart(6)} ms   ` +
					`fotograma ${(row.frameMedian - base.frameMedian).toFixed(1).padStart(6)} ms   ` +
					`largos ${d(base.longFrames, row.longFrames).padStart(4)}`
			);
		}
		const noiseFloor = Math.max(...results.map((r) => r.lcpSpread));
		console.log(
			`\n(“largos” = fotogramas por encima de ${LONG_FRAME_MS} ms en una ventana de ` +
				`${ANIMATION_WINDOW / 1000} s, ~${base.frameCount} fotogramas)`
		);
		console.log(
			`\n⚠️  Suelo de ruido: ${Math.round(noiseFloor)} ms. Es el margen entre la carga más\n` +
				`   rápida y la más lenta de una misma variante, así que cualquier diferencia\n` +
				`   entre variantes por debajo de esa cifra es ruido y no un ahorro.\n`
		);
	} finally {
		if (browser) await browser.close();
		server.kill();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
