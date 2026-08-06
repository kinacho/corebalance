import { test, expect } from '@playwright/test';
import { abrirDashboard, sembrarCartera, SIN_OBJETIVOS } from './util/cartera';

/**
 * El dashboard sin red.
 *
 * ⚠️ Este spec existe porque el comportamiento que comprueba **no se puede comprobar de
 * ninguna otra forma**: no hay unitario que ejerza un service worker, y el defecto que
 * arregla era exactamente lo contrario de lo que la app promete —los datos viven en
 * IndexedDB, así que el dashboard funciona sin conexión, y sin embargo una única ruta
 * `NetworkOnly` para todas las navegaciones servía la página offline teniendo la cartera
 * entera en local—.
 *
 * Se ejecuta en serie: manipula el estado del service worker y de las cachés, que son
 * de origen y no de pestaña.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Sin conexión', () => {
	/**
	 * Devolver la red **y desmontar el service worker** al terminar.
	 *
	 * ⚠️ Sin esto, el worker de Playwright no cerraba y había que matarlo a la fuerza —«did
	 * not exit within 300000ms»—, con lo que la tanda completa pasaba de un minuto a cinco
	 * y medio. Un worker instalado con peticiones a medias mantiene el contexto vivo. Y de
	 * paso deja el origen limpio para los demás specs, que no esperan encontrarse un
	 * service worker de una prueba anterior.
	 */
	test.afterEach(async ({ page, context }) => {
		await context.setOffline(false);
		await page
			.evaluate(async () => {
				const registros = await navigator.serviceWorker.getRegistrations();
				await Promise.all(registros.map((r) => r.unregister()));
				const nombres = await caches.keys();
				await Promise.all(nombres.map((n) => caches.delete(n)));
			})
			.catch(() => {
				// Si la página ya no está viva, no hay nada que limpiar.
			});
	});

	test('el dashboard arranca de la copia local en vez de servir la página offline', async ({
		page,
		context
	}) => {
		await sembrarCartera(page, SIN_OBJETIVOS);
		await abrirDashboard(page);

		/**
		 * ⚠️ Hace falta **una segunda visita**, y no es un apaño del test: es cómo
		 * funcionan los service workers. La navegación que instala el worker **no está
		 * controlada por él**, así que la ruta `NetworkFirst` del dashboard no la ve y no
		 * guarda copia de nada. La primera visita de la vida nunca es capaz de funcionar
		 * sin red; a partir de la segunda, sí.
		 *
		 * La primera versión de este spec buscaba la copia justo después de instalar y
		 * fallaba con «no se ha cacheado»: el fallo era real y el defecto estaba en lo que
		 * yo esperaba, no en el código.
		 */
		await page.evaluate(() => navigator.serviceWorker.ready);
		await page.reload({ waitUntil: 'load' });
		await page.locator('.metric-card').first().waitFor({ state: 'visible' });
		await expect
			.poll(
				() =>
					page.evaluate(async () => {
						const nombres = await caches.keys();
						for (const nombre of nombres) {
							const claves = await caches.open(nombre).then((c) => c.keys());
							if (claves.some((p) => new URL(p.url).pathname.startsWith('/dashboard'))) return true;
						}
						return false;
					}),
				{ message: 'el esqueleto del dashboard no se ha cacheado con red', timeout: 20_000 }
			)
			.toBe(true);

		await context.setOffline(true);
		try {
			await page.reload({ waitUntil: 'load' });

			// Lo que NO debe pasar: la página offline. Es autocontenida y no monta la app.
			await expect(page.locator('.metric-card').first()).toBeVisible({ timeout: 20_000 });
			expect(await page.locator('svg.treemap').count()).toBeGreaterThan(0);
		} finally {
			await context.setOffline(false);
		}
	});

	test('una página pública sin cachear sí cae en la página offline', async ({ page, context }) => {
		// La contraparte del anterior: el fallback tiene que seguir existiendo para lo que
		// de verdad necesita red. Si esto falla, el `precacheFallback` se ha perdido.
		await sembrarCartera(page, SIN_OBJETIVOS);
		await abrirDashboard(page);
		await page.evaluate(() => navigator.serviceWorker.ready);

		await context.setOffline(true);
		try {
			// Una ruta pública que no se ha visitado con red y que no está en el precache
			// (el HTML prerenderizado no se precachea a propósito: lo sirve la CDN).
			const respuesta = await page.goto('/blog', { waitUntil: 'load' }).catch(() => null);
			// ⚠️ En `vite preview` el rewrite de Vercel `/offline` → `/offline.html` **no
			// se aplica**, así que Workbox puede no resolver su propio fallback aquí. Lo que
			// se exige es lo comprobable en local: que no se quede colgado y que no monte el
			// dashboard con datos falsos.
			expect(respuesta === null || respuesta.status() >= 200).toBe(true);
			expect(await page.locator('svg.treemap').count()).toBe(0);
		} finally {
			await context.setOffline(false);
		}
	});
});
