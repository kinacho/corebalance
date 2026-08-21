import { test, expect } from './util/test-base';
import { sembrarCartera, abrirDashboard, CON_OBJETIVOS } from './util/cartera';

/**
 * El tema claro, y lo que de él solo un navegador puede afirmar.
 *
 * `npm run a11y:contrast` mira declaraciones de CSS y `npm run a11y:vivo` recorre
 * 103 rutas en los dos temas; ninguno de los dos está en CI, el primero porque
 * mide otra cosa y el segundo porque tarda un minuto largo. Aquí va lo corto y
 * estable: lo que se rompería **en silencio** y dejaría la app con un tema muerto
 * sin que nada se pusiera rojo.
 *
 * ⚠️ **Nada de esto lo puede ver un test unitario.** El tema lo decide un script
 * en línea de `app.html` que corre antes de que exista ninguna hoja de estilos, y
 * el repintado de los gráficos viaja por un evento del DOM hasta lienzos de
 * Chart.js. Las dos piezas necesitan un documento de verdad.
 */

/**
 * Brillo medio de la tinta de cada lienzo — solo píxeles no transparentes.
 *
 * ⚠️ **`n > 200` no es un número al azar.** Un lienzo casi vacío (un donut sin
 * ejes, una serie de un punto) apenas tiene cromo que repintar, y su brillo se
 * mueve 0 o 9 puntos al cambiar de tema: con esos dentro, cualquier umbral que
 * discrimine de verdad los marca como fallo. Se miden los que dibujan rejilla y
 * ejes, donde el cambio de tema es inequívoco.
 */
async function brilloDeLienzos(page: import('@playwright/test').Page) {
	return page.evaluate(() => {
		const out: number[] = [];
		for (const c of document.querySelectorAll('canvas')) {
			const el = c as HTMLCanvasElement;
			const g = el.getContext('2d');
			if (!g || !el.width || !el.height) continue;
			const d = g.getImageData(0, 0, el.width, el.height).data;
			let suma = 0;
			let n = 0;
			for (let i = 0; i < d.length; i += 16) {
				if (d[i + 3] < 10) continue;
				suma += (d[i] + d[i + 1] + d[i + 2]) / 3;
				n++;
			}
			if (n > 200) out.push(suma / n);
		}
		return out;
	});
}

test.describe('Tema claro y oscuro', () => {
	test('el conmutador cambia el tema y lo recuerda entre recargas', async ({ page }) => {
		/**
		 * ⚠️ **Aquí NO se puede sembrar el tema con `addInitScript`.**
		 *
		 * Ese init se reejecuta en **cada navegación**, así que reescribiría
		 * `localStorage` justo antes de que la página lo leyera y el test
		 * «demostraría» que el tema no persiste cuando sí lo hace. Se parte del
		 * sistema en **claro** y se deja que la app decida: así la primera
		 * afirmación prueba además que el predeterminado gana al sistema.
		 */
		await page.emulateMedia({ colorScheme: 'light' });
		await page.goto('/');

		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		await page.locator('.theme-toggle').first().click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		await page.reload();
		await expect(
			page.locator('html'),
			'el tema elegido no sobrevive a una recarga'
		).toHaveAttribute('data-theme', 'light');
	});

	test('⚠️ sin elección previa arranca en oscuro, diga lo que diga el sistema', async ({
		page
	}) => {
		/**
		 * El predeterminado es el oscuro y **no** se consulta `prefers-color-scheme`.
		 * Hasta el 15-ago-2026 era al revés, así que este caso afirma justo lo
		 * contrario de lo que afirmaba: se deja escrito para que un cambio de vuelta
		 * tenga que pasar por aquí en vez de colarse.
		 *
		 * Se prueban las dos posiciones del sistema, porque solo con `light` no se
		 * distingue «ignora al sistema» de «el emulador no se aplicó»: con
		 * `dark` el resultado sería el correcto por casualidad.
		 */
		for (const sistema of ['light', 'dark'] as const) {
			await page.emulateMedia({ colorScheme: sistema });
			await page.goto('/');
			await expect(
				page.locator('html'),
				`con el sistema en ${sistema} debería servirse el tema oscuro igualmente`
			).toHaveAttribute('data-theme', 'dark');
		}
	});

	test('⚠️ los lienzos de Chart.js se repintan al cambiar de tema', async ({ page }) => {
		/**
		 * La pieza con más maquinaria y ninguna prueba: `EVENTO_TEMA` →
		 * `seguirTema()` → `reaplicarCromo()`. Chart.js recibe **cadenas** de color al
		 * construirse, así que un cambio de tema no le llega por CSS: si ese camino se
		 * rompe, los gráficos se quedan con la rejilla y los ejes del tema anterior
		 * —blanco sobre blanco— y **nada más de la app se ve mal**, así que no lo nota
		 * nadie.
		 *
		 * ⚠️ **Sin sembrar cartera, y eso es deliberado.** Con una semilla de un solo
		 * activo y sin histórico, los lienzos apenas dibujan cromo y el brillo se
		 * mueve 9 puntos o ninguno; el dashboard por defecto dibuja el histórico con
		 * su rejilla y sus ejes, y ahí el cambio es de **~155 puntos**. Un test cuya
		 * señal es del tamaño del ruido no distingue nada.
		 *
		 * ⚠️ **No sirve leer `window.Chart`**: no es global, y un chequeo así devuelve
		 * cero instancias y pasa siempre. Tampoco sirve «los píxeles han cambiado»:
		 * con la suscripción desactivada a mano, esa versión **seguía pasando** porque
		 * las animaciones de Chart.js mueven algún píxel igualmente. Lo que discrimina
		 * es la **dirección y el tamaño**: la tinta clara sobre lienzo oscuro tiene
		 * que volverse tinta oscura.
		 */
		// Sin sembrar tema: el oscuro es el predeterminado, que es de donde tiene
		// que partir el conmutador.
		await page.addInitScript(() => {
			sessionStorage.setItem('bypassLanding', 'true');
			localStorage.setItem('corebalance_tour_seen', 'true');
		});
		await page.goto('/dashboard');
		await page.waitForTimeout(4500);
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

		const antes = await brilloDeLienzos(page);
		expect(antes.length, 'ningún lienzo dibuja cromo suficiente que medir').toBeGreaterThan(0);
		expect(Math.max(...antes), 'en tema oscuro la tinta de los gráficos debería ser clara').toBeGreaterThan(120);

		await page.locator('.theme-toggle').first().click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
		await page.waitForTimeout(1500);

		const despues = await brilloDeLienzos(page);
		expect(despues.length).toBe(antes.length);
		const caida = Math.max(...antes) - Math.max(...despues);
		expect(
			caida,
			`el cromo de los gráficos no se oscureció (${caida.toFixed(0)} puntos): el evento de tema no llega a los lienzos`
		).toBeGreaterThan(80);
	});

	test('en tema claro no queda texto por debajo de su umbral', async ({ page }) => {
		await sembrarCartera(page, CON_OBJETIVOS);
		/**
		 * ⚠️ **El tema claro se siembra guardándolo, no emulando el sistema.**
		 * `emulateMedia({ colorScheme: 'light' })` bastaba hasta el 15-ago-2026;
		 * desde que el predeterminado es el oscuro y no consulta al sistema, esa
		 * versión mediría el tema oscuro creyendo medir el claro — y saldría verde,
		 * que es la forma de fallo que este repo tiene documentada. Aquí sí procede
		 * `addInitScript` (a diferencia del caso de la persistencia): lo que se
		 * quiere es precisamente que el tema esté puesto en cada navegación.
		 */
		await page.addInitScript(() => localStorage.setItem('corebalance_theme', 'light'));
		await abrirDashboard(page);
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

		/**
		 * El panel de concentración se abre a mano antes de medir.
		 *
		 * ⚠️ Su cabecera es un `<button>`, así que su contenido —el titular, el
		 * ranking de empresas, el aviso de las solapadas y las notas— **solo existe
		 * en pantalla si alguien lo despliega**, y no se puede forzar desde fuera.
		 * Se usa el propio evento de la app, el mismo mecanismo con el que el panel
		 * de traspaso se abre en el tutorial y con el que el arnés llega al panel de
		 * gestión. Sin esta línea el barrido pasaría en verde sobre texto que no ha
		 * mirado, que es la forma de fallo que este fichero ya documenta dos veces.
		 */
		await page.evaluate(() =>
			window.dispatchEvent(
				new CustomEvent('tour-step', { detail: { target: 'abrir-concentracion' } })
			)
		);
		await expect(page.locator('#tour-concentracion .titular, #tour-concentracion .empty')).toBeVisible();

		/**
		 * Y el cajón por cartera de la cabecera, por lo mismo: su contenido está montado
		 * con el cajón cerrado —hace falta para animar el plegado— así que se mide sin
		 * pintar y saldría en cero por no haberse mirado.
		 *
		 * ⚠️ **Aquí no vale `tour-step`: las cajas son botones visibles, así que se
		 * clican.** Y **este** es el sitio y no `scripts/contraste-vivo.mjs`, que entra a
		 * `/dashboard` sin cartera: sin bloques con capital las cajas no llegan a ser
		 * botones, no hay cajón que abrir y el barrido solo podría dejar un aviso
		 * permanente — que es lo que ese mismo fichero llama el modo de fallo a evitar.
		 * Aquí hay `CON_OBJETIVOS` sembrado, con sus tres bloques.
		 *
		 * ⚠️ **Se abre «Cambio hoy» y no «Rentabilidad», y la elección está razonada:**
		 * solo puede haber un cajón abierto a la vez, y el de «hoy» es el que añade las
		 * filas de movers. Lo único que el otro dibuja aparte es lo aportado, cuyos dos
		 * colores —`--text-muted` sobre `--bg-card-hover` y `--text-secondary` sobre lo
		 * mismo— ya los mide esta escena en `.bloque-titulo` y en `.mover-nombre`. O sea
		 * que no queda ningún par color/fondo del cajón sin medir.
		 *
		 * ⚠️ **Y si alguien quiere comprobar que esto de verdad caza algo, dos avisos: los
		 * dos primeros controles negativos que escribí salieron verdes y ninguno era un
		 * hueco del test.** Uno ponía `--accent-blue` en `.mover-nombre` con el argumento
		 * de que mide 3,22:1 — cierto en **oscuro**, donde vale `#3b82f6`; aquí se mide el
		 * tema **claro**, donde es `#1d4ed8` y pasa de sobra. El otro cambiaba el `color`
		 * de `.mover-pct`, que **no es la regla que pinta**: toda fila lleva `.positive` o
		 * `.negative` y esas ganan por especificidad. Para romper esto hay que tocar la
		 * regla de estado, o un rótulo que no tenga ninguna encima.
		 */
		await page.locator('button.metric-card', { hasText: 'Cambio Hoy' }).click();
		await expect(page.locator('.cajon-movers')).toBeVisible();

		/**
		 * ⚠️ Tres detalles de la sonda que vienen de falsos positivos reales, todos
		 * documentados en `scripts/contraste-vivo.mjs`: el color se resuelve pintando
		 * y leyendo el píxel (nunca parseando, porque `color-mix()` se computa como
		 * `oklab(…)`), el texto con degradado se mide por sus topes contra el fondo
		 * del **padre**, y el modo privacidad se excluye porque su texto es
		 * transparente a propósito.
		 *
		 * ⚠️ **Ese tercero se excluía por la clase `.privacy-blur` y eso dejaba fuera
		 * todas las cifras de dinero de la app.** La clase está siempre en el
		 * marcado; el texto solo se vuelve transparente bajo `.privacy-mode`, caso
		 * que ya cubre el descarte por color computado. Con la exclusión por clase,
		 * este mismo test pasaba en verde con las tres cifras del desglose del
		 * capital a 1,00:1 — blanco sobre blanco. Se descarta por color, no por
		 * clase.
		 */
		const malos = await page.evaluate(() => {
			const cv = document.createElement('canvas').getContext('2d', {
				willReadFrequently: true
			})!;
			const px = (css: string) => {
				cv.clearRect(0, 0, 1, 1);
				cv.fillStyle = '#000';
				cv.fillStyle = css;
				cv.fillRect(0, 0, 1, 1);
				const d = cv.getImageData(0, 0, 1, 1).data;
				return [d[0], d[1], d[2], d[3] / 255];
			};
			const lum = ([r, g, b]: number[]) => {
				const f = (c: number) => {
					c /= 255;
					return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
				};
				return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
			};
			const sobre = (c: number[], base: number[]) =>
				c.slice(0, 3).map((v, i) => v * c[3] + base[i] * (1 - c[3]));

			function fondoDe(desde: Element | null) {
				let n = desde;
				while (n && n !== document.documentElement) {
					const cs = getComputedStyle(n);
					if (px(cs.backgroundColor)[3] > 0.9) return px(cs.backgroundColor).slice(0, 3);
					n = n.parentElement;
				}
				return px(getComputedStyle(document.documentElement).backgroundColor).slice(0, 3);
			}

			const out: string[] = [];
			for (const el of document.querySelectorAll('*')) {
				const t = [...el.childNodes]
					.filter((x) => x.nodeType === 3)
					.map((x) => x.textContent!.trim())
					.join('');
				if (t.length < 2) continue;
				const cs = getComputedStyle(el);
				if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.1) continue;
				if (cs.color === 'rgba(0, 0, 0, 0)' || cs.color === 'transparent') continue;
				const caja = el.getBoundingClientRect();
				if (caja.width < 4 || caja.height < 4) continue;

				const degradado = (cs.webkitBackgroundClip || cs.backgroundClip) === 'text';
				const topes = degradado
					? [
							...cs.backgroundImage.matchAll(
								/rgba?\([^)]+\)|#[0-9a-f]{3,8}|color\([^)]*\)|oklab\([^)]*\)/gi
							)
						].map((m) => m[0])
					: [cs.color];
				const bg = fondoDe(degradado ? el.parentElement : el);

				let peor = Infinity;
				for (const tope of topes) {
					const c = px(tope);
					if (c[3] < 0.05) continue;
					const l1 = lum(sobre(c, bg));
					const l2 = lum(bg);
					peor = Math.min(peor, (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
				}
				if (peor === Infinity) continue;

				const tam = parseFloat(cs.fontSize);
				const umbral = tam >= 24 || (tam >= 18.66 && +cs.fontWeight >= 700) ? 3 : 4.5;
				if (peor < umbral) out.push(`${peor.toFixed(2)} (min ${umbral}) «${t.slice(0, 30)}»`);
			}
			return out;
		});

		expect(malos, malos.join('\n')).toHaveLength(0);
	});
});
