import { test, expect } from './util/test-base';
import { recogerErrores } from './util/cartera';
import type { Page } from '@playwright/test';

/**
 * Que se pueda llegar a los cursos, recorrerlos y volver — con teclado incluido.
 *
 * Los cursos son 34 páginas prerenderizadas que nacen sin ninguna suite detrás, y su
 * navegación es casi toda enlaces internos: es exactamente el tipo de superficie donde
 * un `href` mal compuesto no rompe el build, no rompe los tests unitarios y solo se nota
 * pinchando. `seo:audit` ya comprueba que ningún enlace apunte a una página inexistente;
 * lo que no puede comprobar es que **encadenen bien** y que el foco no se pierda.
 *
 * ⚠️ `page.waitForURL` no sirve aquí: espera un evento `load` que una navegación de
 * cliente de SvelteKit no dispara nunca, así que expira aunque la URL haya cambiado. Se
 * consulta `location.pathname` en un bucle, como ya documenta el resto del repo.
 */

const CURSO = '/cursos/de-cero-a-tu-primera-aportacion';

/**
 * ⚠️ El `try` no es defensivo por si acaso: sin él este helper falla de forma
 * intermitente y por un motivo que no tiene nada que ver con lo que el test comprueba.
 * Si el sondeo cae justo mientras el navegador confirma una navegación de documento
 * completo, `page.evaluate` revienta con «Execution context was destroyed» — y el
 * informe señala la línea del bucle, no la aserción, así que parece un fallo de la app.
 * Visto una vez en veinticuatro ejecuciones. Un contexto destruido durante el sondeo
 * significa exactamente que se está navegando, que es lo que estábamos esperando: se
 * ignora y se vuelve a mirar.
 */
async function rutaActual(page: Page): Promise<string | null> {
	try {
		return await page.evaluate(() => location.pathname);
	} catch {
		return null;
	}
}

async function esperarRuta(page: Page, esperada: string | RegExp) {
	for (let i = 0; i < 60; i++) {
		const ruta = await rutaActual(page);
		if (ruta && (typeof esperada === 'string' ? ruta === esperada : esperada.test(ruta))) return ruta;
		await page.waitForTimeout(150);
	}
	throw new Error(`La ruta nunca llegó a ${esperada}. Está en ${await rutaActual(page)}`);
}

test.describe('Cursos · se puede llegar y recorrerlos', () => {
	test('desde la landing se llega a los cursos por la navegación y por la sección', async ({
		page
	}) => {
		const errores = recogerErrores(page);
		await page.goto('/');

		// La navegación superior. Es la vía que faltaba: sin ella los cursos existían y
		// eran inalcanzables salvo tecleando la URL.
		await page.locator('.nav-links a[href="/cursos"]').first().click();
		await esperarRuta(page, '/cursos');
		await expect(page.locator('h1')).toBeVisible();

		// Y la sección de la landing, que es la que de verdad los ofrece.
		await page.goBack();
		await esperarRuta(page, '/');
		const seccion = page.locator('#cursos');
		await seccion.scrollIntoViewIfNeeded();
		await expect(seccion).toBeVisible();
		// Cinco tarjetas más el «ver todos».
		expect(await seccion.locator('a[href^="/cursos"]').count()).toBeGreaterThanOrEqual(6);

		expect(errores, `errores de consola: ${errores.join(' | ')}`).toEqual([]);
	});

	test('el índice lleva a un curso y el curso a su primera lección', async ({ page }) => {
		await page.goto('/cursos');
		await page.locator(`a[href="${CURSO}"]`).first().click();
		await esperarRuta(page, CURSO);

		await page.getByRole('link', { name: /Empezar por la lección 1/i }).click();
		await esperarRuta(page, new RegExp(`^${CURSO}/`));
		await expect(page.locator('.paso')).toContainText('Lección 1 de 7');
	});

	test('⚠️ las lecciones encadenan dentro de su curso y nunca saltan a otro', async ({ page }) => {
		await page.goto(`${CURSO}/por-que-un-indice`);

		// Hacia delante hasta el final, comprobando el contador en cada paso.
		for (let n = 1; n < 7; n++) {
			await expect(page.locator('.paso')).toContainText(`Lección ${n} de 7`);
			await page.locator('.vecina.siguiente').click();
			await esperarRuta(page, new RegExp(`^${CURSO}/`));
		}
		await expect(page.locator('.paso')).toContainText('Lección 7 de 7');

		// La última no ofrece «siguiente lección»: ofrece volver al índice del curso.
		await page.locator('.vecina.siguiente').click();
		await esperarRuta(page, CURSO);

		// Y hacia atrás desde la última, que es donde un `anterior` mal compuesto se vería.
		await page.goto(`${CURSO}/la-primera-aportacion`);
		await page.locator('.vecina.anterior').click();
		await esperarRuta(page, new RegExp(`^${CURSO}/`));
		await expect(page.locator('.paso')).toContainText('Lección 6 de 7');
	});

	test('la miga de pan vuelve al curso y al índice', async ({ page }) => {
		// ⚠️ Las aserciones son explícitas a propósito. `esperarRuta` lanza si la ruta no
		// llega, así que el test *funcionaba*, pero no contenía ningún `expect` — y
		// `npm run test:quality` lo marcó como test sin aserciones. Tenía razón: un test
		// cuya única comprobación está escondida dentro de un ayudante se lee igual que uno
		// que no comprueba nada, y es lo que esa capa existe para impedir.
		await page.goto(`${CURSO}/fondo-o-etf`);
		await page.locator('.miga a', { hasText: 'Cursos' }).click();
		expect(await esperarRuta(page, '/cursos')).toBe('/cursos');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		await page.goto(`${CURSO}/fondo-o-etf`);
		await page.locator(`.miga a[href="${CURSO}"]`).click();
		expect(await esperarRuta(page, CURSO)).toBe(CURSO);
		await expect(page.locator('.temario a').first()).toBeVisible();
	});

	test('el ejercicio de cada lección lleva a una página que existe', async ({ page }) => {
		// `seo:audit` comprueba que el destino exista en el build; esto comprueba que el
		// botón navegue de verdad, que es otra cosa.
		await page.goto(`${CURSO}/acumulacion-o-distribucion`);
		await page.locator('.accion-cta').click();
		await esperarRuta(page, '/herramientas/acumulacion-vs-distribucion');
		await expect(page.locator('h1')).toBeVisible();
	});
});

test.describe('Cursos · el foco no se pierde', () => {
	/**
	 * ⚠️ El caso que motiva esta sección.
	 *
	 * Tras una navegación de cliente, SvelteKit devuelve el foco al principio del
	 * documento. Si algo lo retiene —un elemento que se desmonta con el foco puesto, o un
	 * contenedor con `tabindex` mal usado— quien navega con teclado se queda tabulando
	 * dentro de un fragmento invisible, sin ningún síntoma visual. Es un fallo que no se
	 * ve mirando la página y que solo aparece pulsando Tab.
	 */
	test('tras navegar con teclado el foco vuelve al documento, no a un elemento muerto', async ({
		page
	}) => {
		await page.goto('/cursos');

		// Se llega al primer curso tabulando y se entra con Enter, sin ratón.
		await page.keyboard.press('Tab');
		for (let i = 0; i < 30; i++) {
			const href = await page.evaluate(
				() => (document.activeElement as HTMLAnchorElement | null)?.getAttribute?.('href') ?? ''
			);
			if (href.startsWith('/cursos/')) break;
			await page.keyboard.press('Tab');
		}
		const destino = await page.evaluate(
			() => (document.activeElement as HTMLAnchorElement | null)?.getAttribute?.('href') ?? ''
		);
		expect(destino, 'no se alcanzó ningún enlace de curso tabulando').toMatch(/^\/cursos\//);

		await page.keyboard.press('Enter');
		await esperarRuta(page, new RegExp('^/cursos/'));

		// El foco no puede quedarse en un elemento que ya no está en el documento.
		const estado = await page.evaluate(() => {
			const a = document.activeElement;
			return {
				enElDocumento: !!a && document.body.contains(a),
				etiqueta: a?.tagName ?? 'NINGUNO'
			};
		});
		expect(estado.enElDocumento, `el foco quedó fuera del documento (${estado.etiqueta})`).toBe(
			true
		);
	});

	test('desde el inicio del documento se alcanza el contenido tabulando, sin trampas', async ({
		page
	}) => {
		await page.goto(`${CURSO}/fondo-o-etf`);
		await page.evaluate(() => document.body.focus());

		const vistos = new Set<string>();
		let alcanzoElEjercicio = false;

		// Un número de tabulaciones generoso pero acotado: si hace falta más, hay una
		// trampa de foco o un menú oculto capturando el recorrido.
		for (let i = 0; i < 60; i++) {
			await page.keyboard.press('Tab');
			const info = await page.evaluate(() => {
				const a = document.activeElement as HTMLElement | null;
				if (!a) return null;
				return {
					clave: `${a.tagName}:${a.getAttribute('href') ?? a.textContent?.slice(0, 24) ?? ''}`,
					esEjercicio: a.classList.contains('accion-cta')
				};
			});
			if (!info) continue;
			if (info.esEjercicio) alcanzoElEjercicio = true;
			// Un bucle cerrado sobre los mismos tres elementos es la firma de una trampa.
			vistos.add(info.clave);
		}

		expect(alcanzoElEjercicio, 'no se llegó al botón del ejercicio tabulando').toBe(true);
		expect(vistos.size, 'el recorrido de teclado se repite sobre muy pocos elementos').toBeGreaterThan(
			8
		);
	});

	test('el enlace de saltar al contenido, si existe, no rompe el recorrido', async ({ page }) => {
		// No se exige que exista; se exige que si existe, apunte a algo real.
		await page.goto(`${CURSO}/fondo-o-etf`);
		const saltos = page.locator('a[href^="#"]');
		const n = await saltos.count();
		for (let i = 0; i < n; i++) {
			const href = await saltos.nth(i).getAttribute('href');
			if (!href || href === '#') continue;
			const existe = await page.evaluate((h) => !!document.querySelector(h), href);
			expect(existe, `el ancla ${href} no existe en la página`).toBe(true);
		}
	});
});
