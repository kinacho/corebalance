import type { Page } from '@playwright/test';
import { test, expect } from './util/test-base';
import {
	abrirDashboard,
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

test.describe('Mapa del subyacente', () => {
	test('ocupa dos carriles de la rejilla en escritorio', async ({ page }) => {
		// Regla que estuvo documentada en el CSS y en CLAUDE.md sin que nadie la
		// implementara: la fila de mapas se veía como dos carriles y una columna muerta.
		await sembrarCartera(page, CON_OBJETIVOS);
		await abrirDashboard(page);

		const desviacion = mapaDesviacion(page);
		const subyacente = mapaSubyacente(page);
		await expect(subyacente).toBeVisible();

		const anchoDesviacion = (await desviacion.boundingBox())!.width;
		const anchoSubyacente = (await subyacente.boundingBox())!.width;
		// Dos carriles de tres: claramente más ancho que el otro panel, sin exigir un
		// número exacto que dependa del gap de la rejilla.
		expect(anchoSubyacente).toBeGreaterThan(anchoDesviacion * 1.5);
	});
});
