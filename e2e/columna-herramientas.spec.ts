import { test, expect } from '@playwright/test';
import { sembrarCartera, abrirDashboard, FONDOS_DESVIADOS } from './util/cartera';

/**
 * La columna de herramientas abre **una a la vez**, y eso hay que comprobarlo en un
 * navegador por dos razones distintas.
 *
 * La primera es que es la afirmación de diseño de todo el rediseño y no la comprobaba
 * nadie: cinco paneles independientes se convirtieron en cinco que se excluyen, con el
 * estado en el padre.
 *
 * La segunda es el riesgo que solo existe en el teléfono: al abrir una, la que estuviera
 * abierta **encima** se cierra, el contenido salta hacia arriba y la cabecera que acabas
 * de tocar puede irse de la pantalla. Un unitario no lo ve —no hay layout— y una captura
 * tampoco, porque lo que falla es el movimiento entre dos estados.
 *
 * Se siembran `FONDOS_DESVIADOS` para que el panel fiscal tenga algo que proponer: con la
 * cartera en objetivo su cifra de cabecera no se dibuja, y este fichero mide cabeceras.
 */

const PANELES = ['#tour-rebalance', '#tour-tax', '#tour-concentracion', '#tour-projections', '#tour-crisis'];

/** Los ids de los paneles que están abiertos ahora mismo. */
const abiertos = (page: import('@playwright/test').Page) =>
	page.evaluate(
		(sels) =>
			sels.filter((s) => document.querySelector(s)?.getAttribute('data-abierta') === 'true'),
		PANELES
	);

test.describe('columna de herramientas', () => {
	test.beforeEach(async ({ page }) => {
		await sembrarCartera(page, FONDOS_DESVIADOS);
		await abrirDashboard(page);
	});

	test('solo una herramienta puede estar abierta a la vez', async ({ page }) => {
		expect(await abiertos(page)).toEqual([]);

		await page.locator('#tour-rebalance .panel-header').click();
		expect(await abiertos(page)).toEqual(['#tour-rebalance']);

		// Abrir otra cierra la anterior: es la afirmación de diseño.
		await page.locator('#tour-crisis .panel-header').click();
		expect(await abiertos(page)).toEqual(['#tour-crisis']);

		// Y volver a pulsarla la cierra, sin dejar ninguna abierta.
		await page.locator('#tour-crisis .panel-header').click();
		expect(await abiertos(page)).toEqual([]);
	});

	test('el tutorial sigue pudiendo abrir un panel desde fuera', async ({ page }) => {
		/*
		 * ⚠️ Este camino es el que usan `OnboardingTour`, `scripts/contraste-vivo.mjs` y
		 * `e2e/tema.spec.ts`. Al mover el estado al padre había que traducir el evento a
		 * «pídele al padre que me abra», y si eso se rompe el tutorial señala cabeceras
		 * plegadas y los guards de contraste miden cero por no haber mirado.
		 */
		await page.evaluate(() =>
			window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'abrir-tax' } }))
		);
		await expect(page.locator('#tour-tax')).toHaveAttribute('data-abierta', 'true');
		expect(await abiertos(page)).toEqual(['#tour-tax']);
	});

	test('la cabecera cerrada dice una cifra o un supuesto, y los distingue', async ({ page }) => {
		/*
		 * La política honesta: las tres primeras hablan de la cartera (clase `.cifra`), y
		 * los dos simuladores enseñan **sus supuestos** (clase `.supuesto`), porque sus
		 * números salen de deslizadores locales que ni se guardan. Que no se puedan
		 * confundir es el punto, así que se comprueba que ningún simulador dibuja `.cifra`.
		 */
		await expect(page.locator('#tour-tax .cifra')).toHaveCount(1);
		await expect(page.locator('#tour-projections .supuesto')).toHaveCount(1);
		await expect(page.locator('#tour-crisis .supuesto')).toHaveCount(1);
		await expect(page.locator('#tour-projections .cifra')).toHaveCount(0);
		await expect(page.locator('#tour-crisis .cifra')).toHaveCount(0);

		// Y el dinero va difuminado en modo privado. Al panel fiscal le faltaba.
		await expect(page.locator('#tour-tax .cifra')).toHaveClass(/privacy-blur/);
	});
});

test.describe('columna de herramientas en móvil', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test.beforeEach(async ({ page }) => {
		await sembrarCartera(page, FONDOS_DESVIADOS);
		await abrirDashboard(page);
		// En móvil la columna es la pestaña «rebalance» del carrusel de pestañas.
		await page.locator('.mobile-tabs button, .tabs-sticky-nav button').nth(1).click();
		await page.locator('#tour-rebalance').waitFor({ state: 'visible' });
	});

	test('la cabecera con cifra no estrangula el texto ni encoge el objetivo táctil', async ({
		page
	}) => {
		/*
		 * ⚠️ El defecto que este repo ya pagó en `MapFrame`: un hermano que no encoge deja
		 * la columna de texto en 117 px. Se mide **cada** cabecera, incluidas las que
		 * llevan cifra, y también que el botón siga siendo tocable.
		 */
		const medidas = await page.evaluate((sels) => {
			return sels.map((s) => {
				const panel = document.querySelector(s)!;
				const cab = panel.querySelector('.panel-header')!.getBoundingClientRect();
				const texto = panel.querySelector('.panel-text')!.getBoundingClientRect();
				return {
					sel: s,
					alto: cab.height,
					texto: texto.width,
					desborda: cab.right > panel.getBoundingClientRect().right + 1
				};
			});
		}, PANELES);

		for (const m of medidas) {
			expect(m.texto, `${m.sel}: columna de texto`).toBeGreaterThan(150);
			expect(m.alto, `${m.sel}: objetivo táctil`).toBeGreaterThanOrEqual(44);
			expect(m.desborda, `${m.sel}: desborda su contenedor`).toBe(false);
		}
	});

	test('al abrir una herramienta, la cabecera pulsada no se va de la pantalla', async ({
		page
	}) => {
		/*
		 * ⚠️ **El orden importa y al revés este test no puede fallar.** Lo que arrastra la
		 * cabecera pulsada es que se encoja el contenido que está **encima** de ella; si se
		 * cierra un panel que está debajo, no se mueve nada y el test pasaría siempre. Así
		 * que se abre el **primero** de la columna y se toca el **último**.
		 */
		await page.evaluate(() =>
			window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'abrir-rebalance' } }))
		);
		await expect(page.locator('#tour-rebalance')).toHaveAttribute('data-abierta', 'true');
		await page.locator('#tour-crisis .panel-header').scrollIntoViewIfNeeded();

		const salto = await page.evaluate(async () => {
			const cab = document.querySelector('#tour-crisis .panel-header') as HTMLElement;
			const antes = cab.getBoundingClientRect().top;
			cab.click();
			// La animación de plegado dura 400 ms; se mide cuando ha terminado.
			await new Promise((r) => setTimeout(r, 700));
			return cab.getBoundingClientRect().top - antes;
		});

		/*
		 * ⚠️ **Por qué pasa, que es lo que hay que saber para no romperlo: lo sostiene el
		 * anclaje de scroll del navegador, no el código de la app.** Medido: con el
		 * anclaje puesto el salto es **0 px**; desactivándolo (`overflow-anchor: none` en
		 * el `body` y en la columna) es de **238 px**. O sea que la sonda mide algo real, y
		 * que cualquier cosa que suprima el anclaje —una animación de `height` en un
		 * ancestro, un `overflow-anchor: none` heredado— hace aparecer el salto. Este test
		 * es lo que lo diría.
		 *
		 * El umbral no es cero por ruido de layout; un salto de verdad son cientos.
		 */
		expect(Math.abs(salto)).toBeLessThan(12);
	});
});
