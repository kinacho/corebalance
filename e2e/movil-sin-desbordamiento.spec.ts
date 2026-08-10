import { test, expect } from '@playwright/test';
import { sembrarCartera, abrirDashboard, CON_OBJETIVOS } from './util/cartera';

/**
 * Que en móvil no se salga nada de la pantalla.
 *
 * ⚠️ Existe porque pasó: medido a 390 px, la pestaña de gráficos dejaba el
 * documento en **431 px de ancho** y el selector de rangos del histórico llegaba
 * hasta el 431 — con «Todo» fuera de la pantalla, que además es el rango por
 * defecto, así que el único botón inalcanzable era el del rango que estabas
 * viendo. Y el scroll horizontal se lo comía la página entera, no solo el panel.
 *
 * Ningún test unitario puede ver esto: es geometría de la ventana real. Y una
 * captura tampoco basta, porque lo que se sale no aparece en ella — que es
 * exactamente el motivo de que llevara ahí tanto tiempo.
 *
 * ⚠️ **El control negativo hubo que hacerlo dos veces.** El arreglo tiene dos
 * mitades —una fila por grupo de controles, y botones que pueden encogerse— y
 * **cada una basta por sí sola**, así que revirtiendo solo una este spec seguía en
 * verde y parecía decorativo. Con las dos fuera falla como debe, y dice el número:
 * «Todo» acabando en el píxel 431 de una pantalla de 390. Quien quite una de las
 * dos mitades no se va a enterar por aquí.
 */
test.use({ viewport: { width: 390, height: 844 } });

test.describe('móvil · nada se sale de la pantalla', () => {
	test('ninguna pestaña del dashboard desborda a lo ancho', async ({ page }) => {
		await sembrarCartera(page, CON_OBJETIVOS);
		await abrirDashboard(page);

		const pestanas = page.locator('.tab-btn');
		const cuantas = await pestanas.count();
		expect(cuantas, 'sin pestañas no se está midiendo nada').toBeGreaterThan(0);

		for (let i = 0; i < cuantas; i++) {
			const nombre = (await pestanas.nth(i).textContent())?.trim() ?? String(i);
			await pestanas.nth(i).click();
			await page.waitForTimeout(500);

			const medida = await page.evaluate(() => ({
				scroll: document.documentElement.scrollWidth,
				cliente: document.documentElement.clientWidth
			}));
			// Un píxel de holgura para el redondeo del navegador.
			expect(
				medida.scroll,
				`la pestaña «${nombre}» deja el documento en ${medida.scroll} px sobre una ventana de ${medida.cliente}`
			).toBeLessThanOrEqual(medida.cliente + 1);
		}
	});

	test('los cinco rangos del histórico caben en la pantalla', async ({ page }) => {
		await sembrarCartera(page, CON_OBJETIVOS);
		await abrirDashboard(page);

		// La pestaña de gráficos es la que lleva el histórico.
		await page.locator('.tab-btn').nth(2).click();
		await page.waitForTimeout(500);

		const botones = page.locator('.range-btn');
		const cuantos = await botones.count();
		expect(cuantos, 'el selector de rangos no se ha dibujado').toBe(5);

		const ancho = page.viewportSize()!.width;
		for (let i = 0; i < cuantos; i++) {
			const caja = await botones.nth(i).boundingBox();
			const etiqueta = (await botones.nth(i).textContent())?.trim() ?? String(i);
			expect(caja, `«${etiqueta}» no tiene caja`).not.toBeNull();
			expect(
				caja!.x + caja!.width,
				`«${etiqueta}» acaba en el píxel ${Math.round(caja!.x + caja!.width)} de una pantalla de ${ancho}`
			).toBeLessThanOrEqual(ancho);
			// Y con sitio para el dedo: era el otro efecto de apretarlos en una fila.
			expect(caja!.height, `«${etiqueta}» mide ${caja!.height} px de alto`).toBeGreaterThanOrEqual(
				36
			);
		}
	});
});
