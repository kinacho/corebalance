import { test, expect } from './util/test-base';
import { abrirDashboard, sembrarCartera, CON_LIBRO, FONDOS_CON_LIBRO } from './util/cartera';

/**
 * El formulario de alta del libro de movimientos, en un navegador de verdad.
 *
 * Aquí vive lo que las pruebas de componente **no pueden** decidir, y conviene
 * tener claro el reparto para no duplicar ni fiarse de lo que no toca:
 *
 * - `LedgerModal.test.ts` fija el cableado reactivo (que un `asset` con nueva
 *   identidad y el mismo ticker no cierre el formulario) y la precedencia del
 *   Escape. Eso se puede decidir en jsdom.
 * - Lo de aquí abajo **no**: que el sondeo de precios real no lo cierre, y que un
 *   clic llegue a su destino habiendo una capa por medio. jsdom no tiene
 *   disposición ni prueba de impacto, así que allí una capa superpuesta no
 *   intercepta nada y esa prueba no podría fallar nunca.
 */

/**
 * ⚠️ Las secciones de cartera **nacen plegadas**, así que sin esto las tarjetas
 * están en el DOM pero tapadas por su propio contenedor: el clic falla con
 * «`section#tour-portfolio-categories` intercepts pointer events», que apunta al
 * localizador en vez de a la causa. Es el mismo motivo por el que existe
 * `abrirMapas()` en los ayudantes compartidos.
 */
async function desplegarSecciones(page: import('@playwright/test').Page) {
	const plegadas = page.locator('.section-header-btn[aria-expanded="false"]');
	for (let i = await plegadas.count(); i > 0; i = await plegadas.count()) {
		await plegadas.first().click();
		await expect(plegadas).toHaveCount(i - 1);
	}
	await expect(page.locator('.asset-card').first()).toBeVisible();
}

/**
 * ⚠️ El modal abre en la pestaña **Ficha**, así que llegar al libro es un clic
 * más. Se cambia el ayudante y no las aserciones: lo que cada caso decide sigue
 * siendo lo mismo, lo que cambió es el camino.
 */
async function irAlLibro(panel: import('@playwright/test').Locator) {
	await panel.getByRole('tab', { name: 'Libro' }).click();
}

/** Abre el modal del primer fondo desde su tarjeta. */
async function abrirModal(page: import('@playwright/test').Page) {
	await desplegarSecciones(page);
	await page.locator('.asset-card .asset-icon-wrapper').first().click();
	const panel = page.locator('.ledger-panel');
	await expect(panel).toBeVisible();
	return panel;
}

/** Abre el libro del primer fondo desde su tarjeta y despliega el formulario. */
async function abrirFormularioDelLibro(page: import('@playwright/test').Page) {
	const panel = await abrirModal(page);
	await irAlLibro(panel);

	await panel.locator('.add-tx-btn').click();
	await expect(panel.locator('.add-tx-form')).toBeVisible();
	return panel;
}

test.describe('Libro de operaciones', () => {
	/**
	 * ⚠️ **El fallo tal y como lo reportó el usuario.** El `$effect` que reinicia el
	 * formulario dependía de la identidad del prop `asset`, que se invalida en cada
	 * sondeo de precios (30 s): abrías «+ Añadir», empezabas a escribir y a los
	 * pocos segundos el formulario se cerraba solo, borrando lo escrito.
	 *
	 * Se usa `page.clock` para adelantar el reloj en vez de esperar 35 s reales.
	 */
	test('el sondeo de precios no cierra el formulario ni borra lo escrito', async ({ page }) => {
		await page.clock.install();
		await sembrarCartera(page, CON_LIBRO);
		await abrirDashboard(page);

		const panel = await abrirFormularioDelLibro(page);
		await panel.locator('#tx-shares').fill('12.5');

		// Dos sondeos completos por delante, más margen.
		await page.clock.runFor(70_000);

		await expect(panel.locator('.add-tx-form')).toBeVisible();
		await expect(panel.locator('#tx-shares')).toHaveValue('12.5');
	});

	/**
	 * ⚠️ La otra mitad, la que solo prueba un navegador: el calendario llevaba una
	 * capa de cierre `position: fixed; inset: 0` **dentro** del panel y con
	 * `z-index` por encima de todo él, así que el primer clic de cualquier punto de
	 * la pantalla no hacía más que cerrarla. Guardar exigía dos clics.
	 */
	test('con el calendario abierto, el primer clic en guardar guarda', async ({ page }) => {
		await sembrarCartera(page, CON_LIBRO);
		await abrirDashboard(page);

		const panel = await abrirFormularioDelLibro(page);
		await panel.locator('#tx-shares').fill('3');

		await panel.locator('#tx-date').click();
		await expect(panel.locator('.date-picker')).toBeVisible();

		const movimientosAntes = await panel.locator('.tx-item').count();

		/*
		 * ⚠️ **Se pregunta quién ocupa el punto, no se cuentan clics, y las dos
		 * alternativas obvias se probaron y no valen.** `locator.click()`
		 * **reintenta** cuando algo intercepta el puntero: con la capa puesta el
		 * primer clic se lo comía el fondo, el fondo se cerraba y el reintento
		 * llegaba al botón, así que la prueba pasaba con el defecto delante. Y un
		 * `page.mouse.click()` sobre coordenadas sí falla con el defecto, pero mide
		 * una caja que en la tanda en paralelo llega a quedarse obsoleta mientras el
		 * panel se asienta, y entonces el clic aterriza en el fondo del modal y lo
		 * cierra: rojo intermitente por el motivo equivocado.
		 *
		 * `elementFromPoint` responde justo a la pregunta —¿hay algo tapando el
		 * botón de guardar mientras el calendario está abierto?— sin depender de
		 * ninguna animación. Control negativo ejecutado: con la capa restaurada
		 * devuelve `date-picker-backdrop`.
		 */
		// El cuerpo del modal tiene su propio scroll: sin esto la caja del botón puede
		// caer fuera del panel y `elementFromPoint` devuelve el fondo del modal —rojo
		// por dónde estaba la página, no por lo que se quiere medir.
		await panel.locator('.submit-tx-btn').scrollIntoViewIfNeeded();

		const quienOcupaElBoton = await panel.locator('.submit-tx-btn').evaluate((boton) => {
			const caja = boton.getBoundingClientRect();
			const encima = document.elementFromPoint(caja.x + caja.width / 2, caja.y + caja.height / 2);
			return encima === boton || boton.contains(encima) ? 'el botón' : (encima?.className ?? '?');
		});
		expect(quienOcupaElBoton).toBe('el botón');

		await panel.locator('.submit-tx-btn').click();

		await expect(panel.locator('.date-picker')).toHaveCount(0);
		await expect(panel.locator('.add-tx-form')).toHaveCount(0);
		await expect(panel.locator('.tx-item')).toHaveCount(movimientosAntes + 1);
	});

	/**
	 * El libro era inalcanzable desde la tarjeta grande para cualquier activo que no
	 * tuviera ya el modo libro activado — y el interruptor para activarlo vive
	 * dentro de ese mismo modal, o sea un ciclo cerrado. `SXR8` es el segundo fondo
	 * de la semilla y no lleva libro.
	 */
	test('el libro se abre desde la tarjeta aunque el activo no tenga modo libro', async ({
		page
	}) => {
		await sembrarCartera(page, CON_LIBRO);
		await abrirDashboard(page);

		await desplegarSecciones(page);
		const tarjeta = page.locator('.asset-card', { hasText: 'iShares Core S&P 500' }).first();
		await tarjeta.locator('.asset-icon-wrapper').click();

		const panel = page.locator('.ledger-panel');
		await expect(panel).toBeVisible();
		// Y desde ahí se llega al interruptor que activa el modo libro, que vive en
		// la pestaña del libro.
		await irAlLibro(panel);
		await expect(panel.locator('.toggle-btn')).toBeVisible();
	});

	/**
	 * La ficha es lo primero que se ve al abrir un activo, y su contenido sale
	 * entero de lo que la app ya calculaba y no enseñaba en ninguna parte.
	 */
	test('la ficha abre por defecto y cuenta qué es el activo', async ({ page }) => {
		await sembrarCartera(page, CON_LIBRO);
		await abrirDashboard(page);

		const panel = await abrirModal(page);

		await expect(panel.getByRole('tab', { name: 'Ficha' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		// Qué índice replica, que hasta ahora solo aparecía dentro de un <select>.
		await expect(panel).toContainText('World');
		// Y si se puede traspasar sin tributar: la función existía y no la llamaba nadie.
		await expect(panel.locator('.traspaso')).toBeVisible();
	});

	/**
	 * ⚠️ Desde el panel de gestionar, este modal **cambia de activo sin
	 * remontarse**. Con pestañas eso es peor que antes: sin reiniciar, te enseñaría
	 * el libro de un activo bajo el nombre de otro.
	 */
	test('cambiar de activo desde gestionar devuelve la pestaña a la ficha', async ({ page }) => {
		await sembrarCartera(page, CON_LIBRO);
		await abrirDashboard(page);

		await page.locator('#tour-manage-btn').dispatchEvent('click');
		await expect(page.locator('.manage-panel')).toBeVisible();

		const libros = page.locator('.manage-panel .action-ledger');
		await libros.first().click();
		const panel = page.locator('.ledger-panel');
		await expect(panel).toBeVisible();

		await irAlLibro(panel);
		await expect(panel.getByRole('tab', { name: 'Libro' })).toHaveAttribute(
			'aria-selected',
			'true'
		);

		// Cerrar y abrir el de otro activo, que es lo que reusa el mismo modal.
		await page.keyboard.press('Escape');
		await expect(panel).toHaveCount(0);
		await libros.nth(1).click();
		await expect(page.locator('.ledger-panel')).toBeVisible();

		await expect(page.locator('.ledger-panel').getByRole('tab', { name: 'Ficha' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
	});

	/**
	 * ⚠️ **Cambiar de vista no puede hacer desaparecer una cifra.** El coste anual
	 * del activo lo llevaba la tarjeta grande y no la fila compacta, así que pasar a
	 * compacta —que es justo la vista con la que se comparan posiciones entre sí, o
	 * sea cuando el coste importa— lo escondía sin que nada lo dijera.
	 *
	 * Se compara **la misma cifra en las dos vistas** y no que exista en cada una:
	 * así el caso también se pone rojo si una de las dos la calcula distinto.
	 */
	test('el coste anual del activo está en la tarjeta y en la fila compacta', async ({ page }) => {
		await sembrarCartera(page, CON_LIBRO);
		await abrirDashboard(page);
		await desplegarSecciones(page);

		const enTarjeta = await page
			.locator('.asset-card', { hasText: 'Vanguard' })
			.first()
			.locator('.cost-metric .metric-value')
			.innerText();
		expect(enTarjeta).toMatch(/\d/);

		await page.locator('.view-toggle-btn').first().click();
		await expect(page.locator('.compact-row').first()).toBeVisible();

		const enCompacta = await page
			.locator('.compact-row', { hasText: 'Vanguard' })
			.first()
			.locator('.perf-row.coste .perf-val')
			.innerText();

		expect(enCompacta.trim()).toBe(enTarjeta.trim());
	});

	test('Escape cierra el modal del libro', async ({ page }) => {
		await sembrarCartera(page, CON_LIBRO);
		await abrirDashboard(page);

		await desplegarSecciones(page);
		await page.locator('.asset-card .asset-icon-wrapper').first().click();
		await expect(page.locator('.ledger-panel')).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(page.locator('.ledger-panel')).toHaveCount(0);
	});

	/**
	 * ⚠️ **Esto no es del libro, pero es el mismo descuido y hacía daño de verdad.**
	 * La guarda de Escape de `ManageAssets` enumeraba a mano sus hijos y se dejaba
	 * el importador. Los handlers de `window` no se consumen entre sí, así que un
	 * Escape con el importador abierto cerraba el importador **y además** llamaba a
	 * `handleCancel()` del panel, que hace `restoreState`: salir del importador con
	 * Escape revertía todos los cambios pendientes de la sesión de gestión.
	 *
	 * Se mide por lo que le pasa al usuario —el panel sigue abierto y su cambio
	 * sigue puesto—, no por la llamada interna.
	 */
	test('Escape en el importador no revierte la sesión de gestionar activos', async ({ page }) => {
		await sembrarCartera(page, CON_LIBRO);
		await abrirDashboard(page);

		await page.locator('#tour-manage-btn').click();
		const panel = page.locator('.manage-panel');
		await expect(panel).toBeVisible();

		// Un cambio pendiente que `restoreState` desharía: el peso objetivo de un
		// activo, que es lo primero que se toca en este panel.
		const peso = panel.locator('input.weight-number-input').first();
		await peso.fill('42');
		await peso.dispatchEvent('change');
		await expect(peso).toHaveValue('42');

		await panel.locator('#tour-import-csv').click();
		await expect(page.locator('.import-panel')).toBeVisible();

		await page.keyboard.press('Escape');

		await expect(page.locator('.import-panel')).toHaveCount(0);
		await expect(panel).toBeVisible();
		await expect(peso).toHaveValue('42');
	});
});

/**
 * El traspaso entre fondos, de punta a punta y en un navegador de verdad.
 *
 * Aquí vive lo que ninguna prueba de componente decide: que el par escrito por el
 * store llegue al libro de **los dos** fondos, y que la ficha del destino declare la
 * plusvalía heredada. Eso último es la razón de ser del cambio — antes decía
 * «plusvalía 0 €» justo después de traspasar, que es un número falso y no una
 * ausencia de número — y solo se ve recorriendo el ciclo completo.
 */
test.describe('Traspaso entre fondos', () => {
	/** Abre el libro del fondo cuyo nombre se pide y despliega el formulario de traspaso. */
	async function abrirTraspaso(page: import('@playwright/test').Page, fragmento: string) {
		await desplegarSecciones(page);
		const tarjeta = page.locator('.asset-card').filter({ hasText: fragmento }).first();
		await tarjeta.locator('.asset-icon-wrapper').click();
		const panel = page.locator('.ledger-panel');
		await expect(panel).toBeVisible();
		await irAlLibro(panel);
		await panel.locator('.transfer-btn').click();
		await expect(panel.locator('.transfer-form')).toBeVisible();
		return panel;
	}

	test('la tarjeta nombra los dos fondos y agrupa los destinos por trato fiscal', async ({
		page
	}) => {
		await sembrarCartera(page, FONDOS_CON_LIBRO);
		await abrirDashboard(page);

		const panel = await abrirTraspaso(page, 'Global Stock');

		// El origen ya está nombrado DENTRO del formulario, no solo en la cabecera del
		// modal: es el requisito del que cuelga todo este formulario.
		const ruta = panel.locator('.ruta');
		await expect(ruta).toContainText('Vanguard Global Stock');

		// Y el destino se elige de una lista agrupada: la consecuencia fiscal se lee
		// ANTES de elegir, no en un aviso posterior.
		await expect(panel.locator('.destino-grupo').first()).toContainText('Sin tributar');
		await panel.locator('.destino-op').first().click();

		// Los dos, en la misma tarjeta.
		await expect(ruta).toContainText('Vanguard Global Stock');
		await expect(ruta).toContainText('Vanguard Emerging Markets');
	});

	test('apuntarlo escribe las dos patas, cada una nombrando al otro fondo', async ({ page }) => {
		await sembrarCartera(page, FONDOS_CON_LIBRO);
		await abrirDashboard(page);

		const panel = await abrirTraspaso(page, 'Global Stock');
		await panel.locator('.destino-op').first().click();

		/*
		 * La tercera frase del resumen es la que hace visible el arreglo: 500
		 * participaciones compradas a 120 € son 60.000 € de coste que viajan con el
		 * dinero, con su fecha de 2026.
		 */
		await expect(panel.locator('.resumen')).toContainText('Heredas');
		await expect(panel.locator('.resumen')).toContainText('No tributas');

		await panel.locator('.submit-tx-btn').click();

		// En el libro del ORIGEN: la pata de salida, con el destino nombrado.
		const salida = panel.locator('.tx-item').filter({ hasText: 'Traspaso enviado' });
		await expect(salida).toHaveCount(1);
		await expect(salida).toContainText('Vanguard Emerging Markets');

		// Y en el del DESTINO: la de entrada, con el origen nombrado. Se llega cerrando
		// este modal y abriendo el del otro fondo, que es lo que haría el usuario.
		await page.keyboard.press('Escape');
		await expect(page.locator('.ledger-panel')).toHaveCount(0);

		const tarjetaDestino = page
			.locator('.asset-card')
			.filter({ hasText: 'Emerging Markets' })
			.first();
		await tarjetaDestino.locator('.asset-icon-wrapper').click();
		const panelDestino = page.locator('.ledger-panel');
		await expect(panelDestino).toBeVisible();

		/*
		 * ⚠️ **La aserción que justifica todo el cambio, y la única que solo se puede
		 * hacer aquí.** Antes de heredar el coste, la ficha del destino declaraba
		 * plusvalía y factura ≈ 0 € justo después de un traspaso, porque el lote nacía
		 * al precio del día. Ahora tiene que declarar el valor de adquisición heredado.
		 */
		await expect(panelDestino).toContainText('Si vendieras hoy');

		/*
		 * ⚠️ **70.000 € y no los 60.000 € heredados, y la diferencia es el arreglo del
		 * destino en modo manual.** Este fondo tenía 100 participaciones a 100 € sin
		 * libro, así que apuntar el traspaso primero le siembra un saldo inicial de
		 * 10.000 € —si no, la entrada caería en un libro que nadie mira y la posición se
		 * quedaría a cero— y luego mete el lote heredado de 60.000 €. La suma es lo que
		 * el usuario tiene de verdad.
		 *
		 * Y la fecha es la del lote **heredado**, no la del saldo inicial de hoy: es lo
		 * que destapó que `buildFifoLots` metía los lotes al final de la cola en vez de
		 * por su fecha.
		 */
		await expect(panelDestino).toContainText('70.000,00 €');
		await expect(panelDestino).toContainText('10/2/2026');

		await irAlLibro(panelDestino);
		const entrada = panelDestino.locator('.tx-item').filter({ hasText: 'Traspaso recibido' });
		await expect(entrada).toHaveCount(1);
		await expect(entrada).toContainText('Vanguard Global Stock');
	});

	/**
	 * ⚠️ **Lo que se desborda es justo lo que no sale en la captura**, así que esto no
	 * se puede comprobar mirando: se mide cada elemento contra su propio contenedor,
	 * como ya hace `movil-sin-desbordamiento.spec.ts` con el enlace de la lección.
	 */
	test('a 390 px la tarjeta de la ruta no se sale de su contenedor', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await sembrarCartera(page, FONDOS_CON_LIBRO);
		await abrirDashboard(page);

		const panel = await abrirTraspaso(page, 'Global Stock');
		await panel.locator('.destino-op').first().click();
		await expect(panel.locator('.resumen')).toBeVisible();

		const desbordes = await page.evaluate(() => {
			const form = document.querySelector('.transfer-form') as HTMLElement;
			const limite = form.getBoundingClientRect();
			const fuera: { cls: string; right: number; limite: number }[] = [];
			for (const el of form.querySelectorAll<HTMLElement>('*')) {
				const r = el.getBoundingClientRect();
				if (r.width === 0) continue;
				// Un par de píxeles de tolerancia: los bordes y las sombras cuentan.
				if (r.right > limite.right + 2) {
					fuera.push({
						cls: (el.className || el.tagName).toString().slice(0, 40),
						right: Math.round(r.right),
						limite: Math.round(limite.right)
					});
				}
			}
			return fuera;
		});

		expect(desbordes, JSON.stringify(desbordes)).toEqual([]);

		// Y el documento tampoco se sale de la ventana, que es la otra mitad.
		const ancho = await page.evaluate(() => ({
			doc: document.documentElement.scrollWidth,
			win: window.innerWidth
		}));
		expect(ancho.doc).toBeLessThanOrEqual(ancho.win);
	});
});
