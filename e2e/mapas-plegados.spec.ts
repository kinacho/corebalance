import { test, expect } from './util/test-base';
import {
	abrirDashboard,
	abrirMapas,
	mapaSubyacente,
	sembrarCartera,
	CON_OBJETIVOS
} from './util/cartera';

/**
 * Los mapas del detalle van plegados en escritorio, y este spec vigila las dos
 * mitades de esa frase que se rompen sin hacer ruido.
 *
 * **Plegar oculta, no desmonta.** Si alguien cambia el CSS por un `{#if}`, la
 * pantalla se ve exactamente igual —el mapa aparece al abrir— pero el
 * conmutador región/sector del mapa del subyacente vuelve a cero cada vez, y
 * eso no se nota mirando una captura. Lo mismo que pasaría con los lienzos de
 * Chart.js si las pestañas usaran condicionales.
 *
 * **En móvil el plegado no existe.** Ahí `.maps-fold` es `display: contents`,
 * así que los dos mapas siguen siendo carriles del carrusel. Un envoltorio de
 * verdad los metería a los dos dentro de un solo carril, y el carrusel pasaría
 * de cinco paneles a cuatro con dos mapas apretados en el último: es un fallo
 * de una línea de CSS y se ve solo en un móvil de verdad.
 */

test.describe('Mapas del detalle · escritorio', () => {
	test('nacen plegados, siguen montados, y al abrirlos recuperan su ancho', async ({ page }) => {
		await sembrarCartera(page, CON_OBJETIVOS);
		await abrirDashboard(page);

		// Plegado: sin caja, pero los dos paneles siguen en el DOM.
		await expect(page.locator('.maps-row')).toBeHidden();
		expect(await page.locator('.map-box').count()).toBe(2);
		expect(
			await mapaSubyacente(page).boundingBox(),
			'un mapa plegado no debería ocupar sitio'
		).toBeNull();

		await abrirMapas(page);

		// Y al abrir vuelven a medirse solos: los dos derivan tipografía y
		// proporción de `contentWidth`, que plegados vale 0.
		const caja = await mapaSubyacente(page).boundingBox();
		expect(caja!.width).toBeGreaterThan(0);
		await expect(page.locator('svg.treemap').first()).toBeVisible();
	});
});

test.describe('Mapas del detalle · móvil', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('no hay plegado: los dos mapas siguen siendo carriles del carrusel', async ({ page }) => {
		await sembrarCartera(page, CON_OBJETIVOS);
		await abrirDashboard(page);

		// La pestaña de gráficos solo existe en móvil.
		await page.locator('.tab-btn').nth(2).click();
		await expect(page.locator('.charts-grid')).toBeVisible();

		await expect(page.locator('.maps-fold-head')).toBeHidden();

		/*
		 * ⚠️ Comparar el **ancho** de un mapa contra el de la rejilla no vale, y
		 * el control negativo lo demostró: con un envoltorio normal los dos mapas
		 * caen apilados dentro de un solo carril y cada uno sigue midiendo el
		 * ancho entero, así que la comprobación pasaba con el fallo puesto.
		 *
		 * Lo que separa los dos casos es la **posición**: como carriles van uno al
		 * lado del otro —misma `y`, `x` separada por un ancho de carril—; apilados
		 * comparten `x` y se diferencian en `y`.
		 */
		/*
		 * Las tres cajas se miden **en la misma instantánea**. Con tres
		 * `boundingBox()` seguidos no valían: `switchTab()` lanza un scroll suave,
		 * y cada llamada caía en un punto distinto de la animación, así que la
		 * `y` salía separada por 170 px con el layout perfectamente correcto.
		 */
		const { rejilla, desviacion, subyacente } = await page.evaluate(() => {
			const caja = (sel: string) => {
				const { x, y, width } = document.querySelector(sel)!.getBoundingClientRect();
				return { x, y, width };
			};
			return {
				rejilla: caja('.charts-grid'),
				desviacion: caja('.map-box:not(.is-lookthrough)'),
				subyacente: caja('.map-box.is-lookthrough')
			};
		});

		expect(
			Math.abs(subyacente.y - desviacion.y),
			'apilados en vez de uno al lado del otro: no son carriles del carrusel'
		).toBeLessThan(2);
		expect(
			subyacente.x - desviacion.x,
			'los dos mapas deberían estar separados por un ancho de carril'
		).toBeGreaterThan(rejilla.width * 0.9);
	});
});
