import { test as base } from '@playwright/test';

/**
 * El `test` de estos specs, con una limpieza automática detrás de cada uno.
 *
 * ⚠️ **Sin esto, Playwright no puede cerrar sus workers y los mata a la fuerza** —«worker
 * process did not exit within 300000ms»—, con lo que la tanda pasa de 22 segundos a más de
 * cinco minutos y aparece un «1 error was not a part of any test» que en CI se lee como
 * inestabilidad. La causa es que un service worker instalado, con peticiones a medias,
 * mantiene vivo el contexto del navegador.
 *
 * Estuvo primero solo en el spec de offline y la tanda completa siguió colgándose: **todos**
 * los specs registran el service worker, porque lo registra la app al arrancar. De ahí que
 * la limpieza viva aquí, en una fixture automática, y no en un `afterEach` por fichero.
 *
 * De paso, cada test empieza con el origen limpio: sin worker de una prueba anterior y sin
 * cachés heredadas, que es la otra forma de que un spec pase por lo que hizo otro.
 */
export const test = base.extend<{ origenLimpio: void }>({
	origenLimpio: [
		async ({ page, context }, use) => {
			await use();

			// La red vuelve primero: si el contexto se quedó offline, lo de abajo no puede
			// ni ejecutarse.
			await context.setOffline(false).catch(() => {});
			await page
				.evaluate(async () => {
					const registros = await navigator.serviceWorker.getRegistrations();
					await Promise.all(registros.map((r) => r.unregister()));
					const nombres = await caches.keys();
					await Promise.all(nombres.map((n) => caches.delete(n)));
				})
				.catch(() => {
					// La página puede estar ya cerrada, o no haber navegado nunca. No hay nada
					// que limpiar y tampoco nada que reportar.
				});
		},
		{ auto: true }
	]
});

export { expect } from '@playwright/test';
