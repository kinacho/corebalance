import { test, expect } from '@playwright/test';
import { SYNC_PAYLOAD_VERSION, encodeSyncPayload } from '../src/lib/sync-payload';
import { SIN_OBJETIVOS } from './util/cartera';

/**
 * El traspaso por QR, de punta a punta.
 *
 * ⚠️ **Existe porque la mitad receptora no se había escrito nunca.** `SyncModal`
 * generaba `https://corebalance.app/sync#<payload>` y `/sync` no existía: ni ruta, ni
 * `rewrite`, ni una línea que leyera `location.hash`. Escanear el código llevaba a un
 * 404 con la cartera entera en el fragmento.
 *
 * Ningún test unitario puede cubrir esto: hace falta una navegación real con su
 * fragmento, IndexedDB de verdad y el portero del dashboard opinando al final. Que es
 * justo donde estaba el fallo.
 *
 * El payload se construye aquí con el **mismo códec que usa la app** —importado del
 * `src/lib`, sin duplicar nada—, porque lo que se quiere comprobar es que los dos
 * extremos se entienden.
 */

/** Un traspaso como el que produce `snapshotForTransfer()`, con la semilla de siempre. */
function traspasoDe(semilla: typeof SIN_OBJETIVOS) {
	return {
		v: SYNC_PAYLOAD_VERSION,
		assets: semilla.assets,
		holdings: semilla.holdings,
		contribution: 500,
		transactions: [],
		holdingEdits: []
	} as never;
}

test.describe('Traspaso por QR', () => {
	test('un enlace escaneado trae la cartera, pide confirmación e importa', async ({ page }) => {
		// Precios interceptados por lo de siempre: sin esto el store pisa lo importado
		// con lo que devuelva Yahoo y los tickers de fixture se van a 0.
		await page.route('**/api/prices**', (route) =>
			route.fulfill({
				json: { prices: SIN_OBJETIVOS.prices, timestamp: '2026-08-10T00:00:00.000Z', errors: [] }
			})
		);
		await page.addInitScript(() => localStorage.setItem('corebalance_tour_seen', 'true'));

		const fragmento = await encodeSyncPayload(traspasoDe(SIN_OBJETIVOS));
		await page.goto(`/sync#${fragmento}`, { waitUntil: 'load' });

		// El resumen: cinco activos entre las tres carteras, y ninguna operación.
		const resumen = page.locator('.resumen');
		await expect(resumen).toBeVisible();
		await expect(resumen).toContainText('5');

		// ⚠️ Y el aviso de que esto reemplaza la cartera de este dispositivo, que es lo
		// que `importAllData()` hace de verdad. Sin él sería una restauración silenciosa.
		await expect(page.locator('.aviso')).toBeVisible();

		await page.locator('button.boton').first().click();

		/**
		 * ⚠️ **Aquí sí se usa `waitForURL`, y es el matiz que le falta a la regla de
		 * `util/cartera.ts`.** Esa regla —sondear la ruta en vez de esperar la URL— vale
		 * para la navegación *de cliente* de SvelteKit, que no dispara `load`. Esto es
		 * una navegación de documento de verdad (`window.location.href`), y ahí sondear
		 * con `page.evaluate` es lo que falla: pierde el contexto a mitad del cambio de
		 * documento («Execution context was destroyed»). Salía rojo dos veces de cada
		 * cinco, o sea el tipo de guardia intermitente que se acaba ignorando.
		 */
		await page.waitForURL('**/dashboard', { waitUntil: 'load', timeout: 15000 });

		// Y la cartera importada está ahí: no basta con llegar al dashboard, tiene que
		// haber traído los activos.
		await expect(page.locator('.asset-card, .compact-asset-row').first()).toBeVisible({
			timeout: 15000
		});
		await expect(page.locator('body')).toContainText('Vanguard FTSE All-World');
	});

	test('un fragmento que no es una cartera lo dice en vez de importar nada', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('corebalance_tour_seen', 'true'));
		await page.goto('/sync#esto-no-es-un-payload', { waitUntil: 'load' });

		await expect(page.locator('.estado.error')).toBeVisible();
		// Y no ofrece importar: no hay botón de confirmar, solo la salida.
		await expect(page.locator('button.boton')).toHaveCount(0);
	});

	test('sin fragmento explica de dónde sale el código', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('corebalance_tour_seen', 'true'));
		await page.goto('/sync', { waitUntil: 'load' });

		await expect(page.locator('.estado')).toBeVisible();
		await expect(page.locator('button.boton')).toHaveCount(0);
	});
});
