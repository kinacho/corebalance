import { test, expect } from '@playwright/test';
import { sembrarCartera, sembrarHistorial, abrirDashboard, CON_OBJETIVOS } from './util/cartera';

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
		/**
		 * ⚠️ **Hay que alargar el historial o aquí no hay nada que medir, y hacen falta
		 * 400 días exactos.** Desde que los rangos que enseñarían lo mismo que «Todo» se
		 * dejan de dibujar, la cartera sembrada a pelo —ventana mínima de 30 días— no
		 * enseña selector ninguno, y con 200 días solo salen tres botones. Este caso mide
		 * que **los cinco** quepan en 390 px, así que necesita el estado en que existen
		 * los cinco: más de un año de historial. Sin esto el spec falla con «"1M" no
		 * tiene caja» o contando tres, que apuntan al localizador y no a la causa.
		 */
		await sembrarHistorial(page, 400);
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

	/**
	 * La cabecera de los mapas, donde dos defectos distintos salían de una causa.
	 *
	 * ⚠️ `.head-actions` es `flex-shrink: 0`, así que el conmutador región/sector se
	 * quedaba el ancho que pedía y dejaba a `.head-text` en **117,2 px** medidos. De
	 * ahí las dos cosas que se ven mal: el enlace a la lección medía **305,5 px** ahí
	 * dentro —se salía 188— y las pastillas quedaban a **73,4 px**, partiendo «Por
	 * región» en dos líneas y creciendo a 52,1 px de alto. Se percibe como «los
	 * botones son demasiado grandes» cuando la causa es que son demasiado estrechos.
	 *
	 * ⚠️ **Nada de esto desborda la ventana**, así que el primer test de este fichero
	 * pasa sobre ello sin verlo: el enlace se sale de *su contenedor*, no de la
	 * pantalla. Por eso son aserciones aparte y no un caso más del barrido general.
	 *
	 * ⚠️ **Control negativo hecho, y las dos mitades del arreglo son independientes**:
	 * quitando el apilado de `MapFrame` fallan las pastillas (73,4 px de ancho, 52,1
	 * de alto); quitando solo el `max-width`/`min-width` de `LeccionDelPanel` falla
	 * únicamente el enlace. Ninguna aserción cubre a la otra.
	 *
	 * ⚠️ Hubo una tercera aserción —«el texto no se parte en dos líneas», contando
	 * los rects del `Range`— y **está fuera a propósito**. La sonda funciona (con el
	 * botón a 48 px devuelve 2, comprobado), pero con el defecto real puesto seguía
	 * devolviendo 1 mientras el alto ya delataba las dos líneas, así que era una
	 * aserción que no cazaba lo que decía cazar. El ancho ocupa su sitio y sí
	 * distingue los dos casos.
	 */
	test('⚠️ en la cabecera de los mapas nada se sale de su contenedor', async ({ page }) => {
		await sembrarCartera(page, CON_OBJETIVOS);
		await abrirDashboard(page);
		await page.locator('.tab-btn').nth(2).click();
		await page.waitForTimeout(600);

		const medido = await page.evaluate(() => {
			const pastillas = [...document.querySelectorAll('.mode-btn')].map((el) => {
				const c = el.getBoundingClientRect();
				return {
					texto: (el.textContent ?? '').trim(),
					ancho: +c.width.toFixed(1),
					alto: +c.height.toFixed(1)
				};
			});

			const enlaces = [...document.querySelectorAll('.leccion-link')]
				.map((el) => {
					const c = el.getBoundingClientRect();
					if (c.width < 1) return null; // los del panel lateral, sin caja en móvil
					let p = el.parentElement;
					while (p && p.getBoundingClientRect().width < 40) p = p.parentElement;
					const pc = p!.getBoundingClientRect();
					return {
						texto: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
						desborde: +(c.right - pc.right).toFixed(1)
					};
				})
				.filter((x): x is NonNullable<typeof x> => x !== null);

			return { pastillas, enlaces };
		});

		expect(medido.pastillas.length, 'el conmutador región/sector no se ha dibujado').toBe(2);
		for (const p of medido.pastillas) {
			/**
			 * Ancho: es la afirmación del diseño —«dos objetivos grandes se aciertan con
			 * el pulgar»— y la que distingue el caso roto (73,4 px) del bueno (136,8).
			 */
			expect(
				p.ancho,
				`«${p.texto}» mide ${p.ancho} px de ancho; el conmutador no está ocupando el carril`
			).toBeGreaterThanOrEqual(120);
			/**
			 * Alto: la consecuencia de lo anterior, y **la que cazó la regresión en el
			 * control negativo** — 52,1 px, o sea la palabra partida en dos líneas.
			 */
			expect(p.alto, `«${p.texto}» mide ${p.alto} px de alto`).toBeLessThanOrEqual(46);
		}

		expect(medido.enlaces.length, 'no hay ningún enlace a lección que medir').toBeGreaterThan(0);
		for (const e of medido.enlaces) {
			expect(
				e.desborde,
				`«${e.texto}» se sale ${e.desborde} px de su contenedor`
			).toBeLessThanOrEqual(0.5);
		}
	});
});
