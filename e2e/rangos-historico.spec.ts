import { test, expect, type Page } from '@playwright/test';
import { sembrarCartera, sembrarHistorial, abrirDashboard, CON_OBJETIVOS } from './util/cartera';

/**
 * Que ningún rango del histórico sea un botón muerto.
 *
 * ⚠️ **Existe porque pasó, y porque el cálculo era correcto todo el tiempo.** La
 * queja fue *«le doy a 1M, 3M, YTD y a veces no hay reacción»*, y medido con
 * historial parcial era literal: la cola de rangos colapsa en la misma ventana
 * —con ~45 días, `YTD`, `1A` y `Todo` dibujan un lienzo idéntico— y el aviso no
 * lo tapaba, porque `ALL` no avisa nunca por diseño. Tres botones de cinco no
 * podían hacer nada y nada lo decía.
 *
 * ⚠️ **Y esto no lo puede ver un test unitario.** `range.test.ts` prueba la
 * decisión —qué rango sobra— pero no que el componente la aplique, ni que los que
 * quedan repinten de verdad el lienzo de Chart.js. Lo segundo es la mitad que
 * importa: apagar botones sin que los vivos hagan algo distinto sería cambiar un
 * fallo por otro. De hecho **este fichero encontró dos defectos que la suite
 * unitaria daba por buenos**: que con la ventana mínima `1M` cubre la serie
 * exacta y dibuja lo mismo que «Todo» (de ahí el `<=` de `isRangeRedundant`), y
 * que apagar los cuatro deja una fila de botones muertos en vez de un selector.
 */

/** Firma de píxeles del lienzo del histórico: pinta distinto o no pinta distinto. */
async function firmaDelLienzo(page: Page) {
	return page.evaluate(() => {
		const raiz = document.querySelector('.history-section, .history-card');
		const c = raiz?.querySelector('canvas') as HTMLCanvasElement | null;
		if (!c) return 'sin-lienzo';
		const g = c.getContext('2d');
		if (!g || !c.width) return 'sin-contexto';
		const d = g.getImageData(0, 0, c.width, c.height).data;
		let suma = 0;
		let n = 0;
		for (let i = 0; i < d.length; i += 8) {
			if (d[i + 3] > 10) {
				suma += d[i] + d[i + 1] * 3 + d[i + 2] * 7;
				n++;
			}
		}
		return `${suma}:${n}`;
	});
}

test.describe('los rangos del histórico', () => {
	/**
	 * El caso de quien acaba de entrar: sin libro ni ediciones la ventana es el
	 * mínimo de 30 días, así que **ningún** rango puede enseñar nada distinto.
	 */
	test('⚠️ con la ventana mínima no se enseña un selector de botones muertos', async ({ page }) => {
		await sembrarCartera(page, CON_OBJETIVOS);
		await abrirDashboard(page);

		await expect(
			page.locator('.range-selector'),
			'con 30 días no hay ningún rango que elegir, así que el selector sobra'
		).toBeHidden();

		// Y se dice, porque un control que desaparece sin explicación es peor.
		await expect(page.locator('.history-section .note, .history-card .note').first()).toContainText(
			/historial/i
		);
	});

	test('⚠️ ningún rango pulsable deja el gráfico igual', async ({ page }) => {
		await sembrarCartera(page, CON_OBJETIVOS);
		await sembrarHistorial(page, 200);
		await abrirDashboard(page);

		const selector = page.locator('.range-selector');
		await expect(selector, 'con 200 días de historial sí debería haber que elegir').toBeVisible();
		await selector.scrollIntoViewIfNeeded();

		const pulsables = (await page.locator('.range-btn').allTextContents()).map((t) => t.trim());

		/**
		 * ⚠️ **Sin estas dos aserciones el test no puede fallar por lo que importa.** Si
		 * un cambio dejase un solo botón, el bucle de abajo no compararía nada y saldría
		 * verde — la forma de fallo que este repo tiene fichada: un test que pasa por no
		 * medir nada. Y si los dibujara los cinco, no se estaría probando el filtro.
		 */
		expect(pulsables.length, `los rangos dibujados son ${pulsables.join(', ')}`).toBeGreaterThanOrEqual(2);
		expect(
			pulsables.length,
			'con 200 días «1A» debería sobrar; si salen los cinco, el filtro no se aplicó'
		).toBeLessThan(5);
		expect(pulsables, '«Todo» tiene que estar siempre').toContain('Todo');

		const vistas = new Map<string, string>();
		for (const etiqueta of pulsables) {
			await page.locator('.range-btn', { hasText: new RegExp(`^${etiqueta}$`) }).first().click();
			await page.waitForTimeout(900);
			await expect(
				page.locator('.range-btn.active'),
				`«${etiqueta}» no quedó seleccionado`
			).toHaveText(etiqueta);
			vistas.set(etiqueta, await firmaDelLienzo(page));
		}

		const firmas = [...vistas.values()];
		expect(firmas, 'el lienzo no se llegó a leer').not.toContain('sin-lienzo');
		expect(
			new Set(firmas).size,
			`dos rangos pulsables dibujan lo mismo: ${[...vistas].map(([k, v]) => `${k}=${v}`).join(' · ')}`
		).toBe(firmas.length);
	});

	/**
	 * ⚠️ **El filtro tiene que soltar los rangos según crece el historial**, y sin este
	 * caso nada distingue «se filtra bien» de «se filtra siempre igual»: un `1A`
	 * escondido a 200 días es correcto, y escondido a 400 sería un rango secuestrado.
	 */
	test('el selector crece con el historial', async ({ page }) => {
		await sembrarCartera(page, CON_OBJETIVOS);
		await sembrarHistorial(page, 400);
		await abrirDashboard(page);

		const etiquetas = (await page.locator('.range-btn').allTextContents()).map((t) => t.trim());
		expect(etiquetas, 'con más de un año no debería sobrar ninguno').toEqual([
			'1M',
			'3M',
			'YTD',
			'1A',
			'Todo'
		]);
	});
});
