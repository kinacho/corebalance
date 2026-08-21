import { test, expect } from './util/test-base';
import {
	abrirDashboard,
	abrirMapas,
	recogerErrores,
	sembrarCartera,
	SIN_OBJETIVOS
} from './util/cartera';

/**
 * Que el dashboard arranque con datos y sin errores.
 *
 * Es el spec más aburrido y el que más veces habría salvado la sesión: el dashboard es
 * `ssr = false`, así que un error de hidratación no rompe el build, no rompe los tests
 * unitarios y deja la página en blanco. Aquí se comprueba lo mínimo imprescindible —que
 * pinta cifras y que la consola está limpia—, que es justo lo que no puede comprobar un
 * test de componente con el store simulado.
 */
test.describe('Dashboard', () => {
	test('arranca con la cartera sembrada, pinta cifras y no ensucia la consola', async ({
		page
	}) => {
		const errores = recogerErrores(page);
		await sembrarCartera(page, SIN_OBJETIVOS);
		await abrirDashboard(page);

		// Las cifras van animadas desde 0, así que se espera al valor, no al elemento.
		await expect(page.locator('.metric-card .metric-value').first()).toHaveText(/\d/, {
			timeout: 15_000
		});

		// La cartera sembrada vale 26.380 €; basta con comprobar que el patrimonio no es
		// cero, que es el síntoma de que los precios no han entrado.
		const textoMetricas = await page.locator('.hero-metrics').innerText();
		expect(textoMetricas).not.toMatch(/^0[,.]00/);

        // Los tres bloques de estrategia tienen posiciones, así que hay mapa.
		await abrirMapas(page);
		await expect(page.locator('svg.treemap').first()).toBeVisible();

		expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
	});

	/**
	 * El cajón por cartera de la cabecera. En unitario está cubierto con el store
	 * simulado; lo que solo se ve aquí es que las cifras de los **tres bloques de
	 * verdad** llegan y que abrir uno cierra el otro con el DOM real, donde el
	 * plegado es un `grid-template-rows` animado y no un `{#if}`.
	 */
	test('las cajas de la cabecera abren su desglose por cartera, una a la vez', async ({
		page
	}) => {
		const errores = recogerErrores(page);
		await sembrarCartera(page, SIN_OBJETIVOS);
		await abrirDashboard(page);

		const rentabilidad = page.locator('button.metric-card', {
			has: page.locator('.metric-label', { hasText: 'Rentabilidad' })
		});
		const hoy = page.locator('button.metric-card', {
			has: page.locator('.metric-label', { hasText: 'Cambio Hoy' })
		});

		// La cartera sembrada tiene los tres bloques con capital, así que ambas abren.
		await expect(rentabilidad).toHaveAttribute('aria-expanded', 'false');

		await rentabilidad.click();
		await expect(rentabilidad).toHaveAttribute('aria-expanded', 'true');
		await expect(page.locator('.cajon-bloque')).toHaveCount(3);
		// Lo aportado solo sale en este cajón; los movers, en el otro.
		await expect(page.locator('.bloque-aportado').first()).toBeVisible();
		await expect(page.locator('.cajon-movers')).toHaveCount(0);

		await hoy.click();
		await expect(hoy).toHaveAttribute('aria-expanded', 'true');
		await expect(rentabilidad).toHaveAttribute('aria-expanded', 'false');
		await expect(page.locator('.cajon-movers')).toBeVisible();

		// Y Escape lo cierra sin dejar el cajón en el orden de tabulación.
		await page.keyboard.press('Escape');
		await expect(hoy).toHaveAttribute('aria-expanded', 'false');
		await expect(page.locator('.cajon-wrapper')).toHaveJSProperty('inert', true);

		expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
	});

	test('el service worker se registra y precachea el esqueleto', async ({ page }) => {
		// ⚠️ Esto estuvo **inerte en producción desde el primer día** y nadie se enteró:
		// `injectRegister: 'auto'` generaba `registerSW.js` y no insertaba la etiqueta que
		// lo carga, así que `getRegistrations()` devolvía 0, sin un solo error en consola.
		// Un subsistema que no se ejecuta no puede delatar sus propios fallos.
		await sembrarCartera(page, SIN_OBJETIVOS);
		await abrirDashboard(page);

		const estado = await page.evaluate(async () => {
			await navigator.serviceWorker.ready;
			const registros = await navigator.serviceWorker.getRegistrations();
			const nombres = await caches.keys();
			let entradas = 0;
			for (const nombre of nombres) {
				entradas += (await caches.open(nombre).then((c) => c.keys())).length;
			}
			return { registros: registros.length, entradas };
		});

		expect(estado.registros).toBe(1);
		// El precache pasó de 281 entradas y 15,7 MB a ~143 y 2,5 MB al dejar fuera las
		// tarjetas OG y las imágenes del blog. El rango vigila las dos direcciones: que
		// siga precacheando el esqueleto, y que no vuelva a tragarse el repositorio.
		expect(estado.entradas).toBeGreaterThan(100);
		expect(estado.entradas).toBeLessThan(200);
	});
});
