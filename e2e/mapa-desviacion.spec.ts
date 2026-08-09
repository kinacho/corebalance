import type { Page } from '@playwright/test';
import { test, expect } from './util/test-base';
import {
	abrirDashboard,
	abrirMapas,
	mapaDesviacion,
	mapaSubyacente,
	sembrarCartera,
	CON_OBJETIVOS,
	SIN_OBJETIVOS
} from './util/cartera';

/**
 * El mapa de desviación en sus dos estados, en el navegador.
 *
 * Los tests de componente ya cubren la geometría y los rótulos con el store simulado.
 * Lo que solo se ve aquí es el estado **real** de una cartera recién importada, que es
 * el primero que ve casi cualquiera: todo activo nace con `targetWeight: 0`, ningún
 * bloque se mide, y durante meses el mapa afirmaba en ese estado que el color era «la
 * distancia a tu objetivo» sin haber ningún objetivo. Eso no lo caza un unitario porque
 * el fixture del unitario siempre tenía objetivos.
 */

async function celdas(page: Page) {
	return page.locator('svg.treemap > g').filter({ has: page.locator('> rect') });
}

async function rellenos(page: Page): Promise<string[]> {
	return page.locator('svg.treemap > g > rect').evaluateAll((nodos) =>
		nodos.map((n) => n.getAttribute('fill') ?? '')
	);
}

test.describe('Mapa de desviación · cartera sin ningún objetivo', () => {
	test.beforeEach(async ({ page }) => {
		await sembrarCartera(page, SIN_OBJETIVOS);
		await abrirDashboard(page);
		await abrirMapas(page);
		await page.locator('svg.treemap').first().waitFor({ state: 'visible' });
	});

	test('el subtítulo no promete una distancia al objetivo que no existe', async ({ page }) => {
		const panel = mapaDesviacion(page);
		await expect(panel).toContainText('a qué cartera pertenece');
		await expect(panel).not.toContainText('la distancia a tu objetivo');
	});

	test('ninguna celda va rayada ni muestra la leyenda de la escala', async ({ page }) => {
		// El rayado es para la anomalía —un activo sin objetivo dentro de un bloque que sí
		// se mide—, no para lo normal. Y sin bloques medidos no hay escala que explicar.
		for (const relleno of await rellenos(page)) {
			expect(relleno, 'una celda de un bloque sin escala va rayada').not.toMatch(/^url\(#/);
		}
		const panel = mapaDesviacion(page);
		await expect(panel.locator('.legend')).not.toContainText('Por debajo');
	});

	test('los tres bloques llevan tonos planos distintos', async ({ page }) => {
		const tonos = new Set(await rellenos(page));
		expect(tonos.size, `tonos en pantalla: ${[...tonos].join(', ')}`).toBe(3);
	});

	test('el tooltip no acusa de no haber fijado un objetivo', async ({ page }) => {
		const titulos = await page
			.locator('svg.treemap title')
			.evaluateAll((nodos) => nodos.map((n) => n.textContent?.trim() ?? ''));
		expect(titulos.length).toBeGreaterThan(0);
		for (const titulo of titulos) {
			expect(titulo, `«${titulo}» habla de objetivos donde no hay ninguno`).not.toMatch(
				/objetivo/i
			);
		}
	});
});

test.describe('Mapa de desviación · cartera con objetivos', () => {
	test('vuelve la escala divergente, su leyenda y el objetivo en el tooltip', async ({ page }) => {
		await sembrarCartera(page, CON_OBJETIVOS);
		await abrirDashboard(page);
		await abrirMapas(page);
		await page.locator('svg.treemap').first().waitFor({ state: 'visible' });

		const panel = mapaDesviacion(page);
		await expect(panel).toContainText('la distancia a tu objetivo');
		await expect(panel.locator('.legend')).toContainText('Por debajo');
		await expect(panel.locator('.legend')).toContainText('En objetivo');

		// La rampa se calcula y sale como `rgb(...)`; los tonos planos de bloque son hex.
		// Que haya al menos uno de cada confirma que conviven escala y bloques sin medir.
		const lista = await rellenos(page);
		expect(lista.some((f) => f.startsWith('rgb('))).toBe(true);
		expect(lista.some((f) => f.startsWith('#'))).toBe(true);

		const titulos = await panel
			.locator('svg.treemap title')
			.evaluateAll((nodos) => nodos.map((n) => n.textContent ?? ''));
		expect(titulos.some((t) => /objetivo/i.test(t))).toBe(true);
	});
});

test.describe('Los dos mapas', () => {
	test('se reparten el ancho a partes iguales en escritorio', async ({ page }) => {
		/*
		 * ⚠️ Este test decía lo contrario —«el subyacente ocupa dos carriles de
		 * tres»— y era correcto mientras la fila de mapas convivía con los donuts
		 * en la misma rejilla: en un solo carril de 400 px dejaba media fila
		 * muerta. Desde que los mapas viven plegados en su propia fila esa razón
		 * desapareció, y son dos paneles solos repartiéndose el ancho. El cambio
		 * de contrato se reescribe aquí, con su motivo, en vez de borrar el test.
		 */
		await sembrarCartera(page, CON_OBJETIVOS);
		await abrirDashboard(page);
		await abrirMapas(page);

		await expect(mapaSubyacente(page)).toBeVisible();

		const { desviacion, subyacente, fila } = await page.evaluate(() => {
			const ancho = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().width;
			return {
				desviacion: ancho('.map-box:not(.is-lookthrough)'),
				subyacente: ancho('.map-box.is-lookthrough'),
				fila: ancho('.maps-row')
			};
		});

		// Mitades: la diferencia entre los dos tiene que ser ruido de redondeo,
		// no un carril. Un `span 2` de vuelta daría una proporción de 1 a 2.
		expect(
			Math.abs(subyacente - desviacion),
			`desviación ${desviacion} px contra subyacente ${subyacente} px`
		).toBeLessThan(2);

		// Y cada uno es media fila descontando el hueco de la rejilla (2rem).
		expect(subyacente).toBeGreaterThan(fila / 2 - 40);

		// El subyacente sigue por encima de su umbral de 460 px, que es lo que
		// mantiene los nombres de región dentro de los rectángulos.
		expect(subyacente).toBeGreaterThan(460);
	});
});
