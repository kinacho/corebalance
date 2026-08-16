import { test, expect, type Page } from '@playwright/test';
import { sembrarCartera, CON_OBJETIVOS } from './util/cartera';

/**
 * Que cada parada del tutorial señale a algo que existe y se ve.
 *
 * ⚠️ **Existe porque falló en cuatro paradas de seis y nada se puso rojo.** El tour
 * avisaba al panel de lo que tenía que preparar con `onHighlightStarted`, que corre
 * **mientras** driver.js calcula el recuadro: Svelte aún no había aplicado el cambio,
 * así que se medía lo anterior. Medido paso a paso antes de arreglarlo:
 *
 * - `#tour-maps` en escritorio, **0×0**: los mapas nacen plegados y plegado es
 *   `display: none`.
 * - `#tour-maps` en móvil, en **y=1093**: existía, pero fuera de la pantalla.
 * - `#tour-import-csv`: driver.js ni lo encontraba y caía a su elemento de relleno.
 * - `#tour-manage-btn` **en demo**: no existe, porque `Header.svelte` lo esconde con
 *   `{#if !portfolio.isDemo}`. El último paso del recorrido de la demo señalaba al
 *   vacío.
 *
 * Ninguna de esas cuatro rompe nada: el tutorial avanza, el globo se dibuja y el
 * texto se lee. Solo señala al sitio equivocado, que es la clase de defecto que este
 * repo persigue — se ve perfectamente y no falla nunca.
 *
 * ⚠️ **Los dos controles negativos se corrieron, y este spec solo caza UNA de las dos
 * mitades del arreglo. Conviene saber cuál.**
 *
 * - Quitando la preparación del destino (que se abra el plegado de los mapas, que se
 *   despliegue el panel, que se cambie de pestaña) **falla, y nombra lo suyo**:
 *   `#tour-maps` a 0 px en escritorio, `#tour-rebalance` a 0 px en móvil, y el paso
 *   del CSV sin su botón.
 * - Quitando la **espera** a que el destino tenga caja antes de avanzar, **sigue en
 *   verde**. Y es esperable: este spec mide 600 ms después de cada cambio de paso, y
 *   para entonces el DOM se ha asentado solo. Lo que la espera protege es la carrera
 *   —un dispositivo lento, un componente que se carga tarde—, y un test de una carrera
 *   es un test intermitente. Se deja fuera a propósito.
 *
 * O sea: quien quite la espera de `prepararDestino` no se va a enterar por aquí. Queda
 * escrito porque es justo lo que este repo no quiere descubrir dos veces.
 */

interface Parada {
	progreso: string;
	titulo: string;
	id: string | null;
	alto: number;
	enPantalla: boolean;
}

/**
 * Recorre el tutorial entero anotando cada parada.
 *
 * ⚠️ Espera a que **cambie el contador** antes de volver a medir. El avance es
 * asíncrono a propósito —prepara el destino y aguarda a que tenga caja—, así que
 * pulsar a intervalo fijo adelanta dos pasos y lee estados a medio camino: la
 * primera versión de esta sonda «encontró» un desorden que era suyo.
 */
async function recorrerTutorial(page: Page, maxPasos = 8): Promise<Parada[]> {
	const paradas: Parada[] = [];

	for (let i = 0; i < maxPasos; i++) {
		await page.waitForTimeout(600);
		const p = await page.evaluate(() => {
			const pop = document.querySelector('.driver-popover');
			if (!pop) return null;
			const act = document.querySelector('.driver-active-element');
			const r = act?.getBoundingClientRect();
			return {
				progreso: pop.querySelector('.driver-popover-progress-text')?.textContent?.trim() ?? '',
				titulo: pop.querySelector('.driver-popover-title')?.textContent?.trim() ?? '',
				// El paso de bienvenida no tiene `element` a propósito: driver.js lo
				// centra como modal y marca un elemento de relleno propio suyo.
				id: act && act.id ? act.id : null,
				alto: r ? Math.round(r.height) : 0,
				enPantalla: !!r && r.height > 0 && r.top < window.innerHeight && r.bottom > 0
			};
		});
		if (!p) break;
		paradas.push(p);

		const siguiente = page.locator('.driver-popover-next-btn');
		if (!(await siguiente.count())) break;
		const antes = p.progreso;
		await siguiente.click();
		for (let k = 0; k < 30; k++) {
			await page.waitForTimeout(120);
			const ahora = await page.evaluate(
				() => document.querySelector('.driver-popover-progress-text')?.textContent?.trim() ?? ''
			);
			if (ahora !== antes) break;
		}
	}

	return paradas;
}

/** Lo que se exige de una parada que dice señalar a algo. */
function revisar(paradas: Parada[], minimo: number) {
	expect(paradas.length, 'el tutorial no llegó a abrirse').toBeGreaterThanOrEqual(minimo);

	const conAncla = paradas.filter((p) => p.id !== null);
	/**
	 * ⚠️ Sin esto el test no puede fallar por lo que importa: si un cambio dejara todas
	 * las paradas sin ancla, el bucle de abajo no comprobaría nada y saldría verde.
	 */
	expect(
		conAncla.length,
		`ninguna parada señala a un elemento: ${paradas.map((p) => p.titulo).join(' · ')}`
	).toBeGreaterThanOrEqual(minimo - 1);

	for (const p of conAncla) {
		expect(p.alto, `«${p.titulo}» señala a #${p.id}, que mide ${p.alto} px de alto`).toBeGreaterThan(0);
		expect(p.enPantalla, `«${p.titulo}» señala a #${p.id}, que está fuera de la pantalla`).toBe(true);
	}
}

test.describe('El tutorial señala a donde dice', () => {
	for (const [nombre, viewport] of [
		['escritorio', { width: 1280, height: 900 }],
		['móvil', { width: 390, height: 844 }]
	] as const) {
		test(`⚠️ con cartera, las seis paradas existen y se ven · ${nombre}`, async ({ page }) => {
			await page.setViewportSize(viewport);
			await sembrarCartera(page, CON_OBJETIVOS);
			// `sembrarCartera` marca el tour como visto para que no estorbe; aquí es
			// justo lo que se quiere probar.
			await page.addInitScript(() => localStorage.removeItem('corebalance_tour_seen'));
			await page.goto('/dashboard', { waitUntil: 'load' });
			await page.locator('.metric-card').first().waitFor({ state: 'visible' });
			await page.waitForTimeout(2200);

			revisar(await recorrerTutorial(page), 6);
		});
	}

	test('⚠️ con la cartera vacía, el paso del CSV encuentra su botón', async ({ page }) => {
		await page.addInitScript(() => {
			sessionStorage.setItem('bypassLanding', 'true');
			localStorage.removeItem('corebalance_tour_seen');
		});
		await page.route('**/api/prices**', (r) =>
			r.fulfill({ json: { prices: {}, timestamp: '2026-08-16T00:00:00.000Z', errors: [] } })
		);
		await page.goto('/dashboard', { waitUntil: 'load' });
		await page.waitForTimeout(2600);

		const paradas = await recorrerTutorial(page, 4);
		expect(paradas.length, 'el recorrido de arranque no se abrió').toBe(3);

		/**
		 * El paso del CSV es el que fallaba: `#tour-import-csv` vive dentro del panel de
		 * gestión, que el propio tutorial abre. Antes se medía antes de que existiera.
		 */
		const csv = paradas[2];
		expect(csv.id, `la última parada señala a #${csv.id}`).toBe('tour-import-csv');
		expect(csv.alto, 'el botón de importar CSV no tiene caja').toBeGreaterThan(0);
	});
});
