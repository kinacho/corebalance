/**
 * El contraste tal y como lo pinta el navegador, en los dos temas.
 *
 * `scripts/contraste.mjs` es estático: lee declaraciones de CSS. Eso caza mucho y
 * hay tres cosas que **estructuralmente** no puede ver, y las tres han producido
 * defectos reales en este proyecto:
 *
 * - **Quién queda encima de quién.** `.landing-page` pintaba `background: #05050a`
 *   opaco sobre un `--bg-primary` perfectamente correcto: la página clara salía
 *   negra entera, con 234 nodos de texto bajo umbral, y cada token resolvía bien.
 * - **Lo que solo existe al interactuar.** El botón «Siguiente» del tour era texto
 *   negro sobre azul en claro. Un barrido que solo mide lo visible al cargar deja
 *   fuera el tour, los modales y los paneles.
 * - **Lo que solo existe a cierta anchura.** La hamburguesa era blanca sobre botón
 *   blanco, y solo se pinta por debajo de 1140 px.
 *
 * Uso:
 *   npm run build && node scripts/contraste-vivo.mjs
 *   node scripts/contraste-vivo.mjs --movil
 *   node scripts/contraste-vivo.mjs --tema light --ruta /cursos
 *   node scripts/contraste-vivo.mjs --json
 *
 * Sale con 1 si encuentra algo. No está en CI a propósito: recorre ~100 rutas por
 * tema y eso es un minuto largo. En CI va `e2e/tema.spec.ts`, que es corto.
 */

import { spawn } from 'node:child_process';
// Desde `@playwright/test`, que es la dependencia declarada. `playwright-core`
// resuelve por izado de node_modules, pero es transitiva: cambia el aplanado y
// el script deja de encontrarla. Mismo criterio que `measure-filters.mjs`.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * ⚠️ **Puerto propio, y no es manía.** `playwright.config.ts` declara
 * `reuseExistingServer: !process.env.CI`, así que en local Playwright **reutiliza
 * lo que haya en el 4173 en vez de arrancar nada**. Un preview olvidado de otra
 * comprobación, sirviendo el HTML de un build anterior, es lo que una vez produjo
 * 21 fallos falsos en los e2e. `auditar-movil.mjs` además *espera* encontrar uno
 * en ese mismo puerto. Este script usa el suyo, con `--strictPort` para fallar en
 * vez de irse a otro en silencio, y lo mata pase lo que pase.
 */
const PORT = 4188;
const ORIGIN = `http://localhost:${PORT}`;

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
	const i = args.indexOf(`--${n}`);
	return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const MOVIL = flag('movil');
const JSON_OUT = flag('json');
const VIEWPORT = MOVIL ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
const TEMAS = opt('tema', null) ? [opt('tema', null)] : ['light', 'dark'];
const RUTA_UNICA = opt('ruta', null);

// ---------------------------------------------------------------- rutas

/**
 * Las rutas se **derivan del contenido**, nunca de una lista a mano.
 *
 * ⚠️ Y el slug de una lección **no es el nombre del fichero**: `cursos.ts` le quita
 * el prefijo numérico. Con el nombre crudo las cuarenta rutas dan 404 — y un 404
 * se mide igual de bien que una lección, así que el barrido devuelve «cero
 * problemas» habiendo medido cuarenta páginas de error. Pasó. De ahí también la
 * guarda de `es404()` más abajo.
 */
function rutas() {
	const out = [
		'/',
		'/dashboard',
		'/blog',
		'/herramientas',
		'/comparativas',
		'/cursos',
		'/autor/kinacho',
		'/privacy',
		'/terms',
		'/en',
		'/en/herramientas',
		'/herramientas/calculadora-ter',
		'/herramientas/calculadora-precio-medio',
		'/herramientas/checklist-rebalanceo',
		'/herramientas/simulador-crisis',
		'/herramientas/acumulacion-vs-distribucion',
		'/herramientas/cuando-puedo-recomprar'
	];

	const comparativas = path.join(ROOT, 'src/routes/(public)/[[lang=locale]]/comparativas');
	if (fs.existsSync(comparativas)) {
		for (const d of fs.readdirSync(comparativas, { withFileTypes: true })) {
			if (d.isDirectory()) out.push(`/comparativas/${d.name}`);
		}
	}

	const cursos = path.join(ROOT, 'src/content/cursos');
	for (const curso of fs.readdirSync(cursos)) {
		const dir = path.join(cursos, curso);
		if (!fs.statSync(dir).isDirectory()) continue;
		out.push(`/cursos/${curso}`);
		for (const f of fs.readdirSync(dir)) {
			if (f.endsWith('.md')) {
				out.push(`/cursos/${curso}/${f.replace(/\.md$/, '').replace(/^\d+-/, '')}`);
			}
		}
	}

	// Los posts tienen slug propio por idioma y comparten la ruta `/blog/<slug>`.
	for (const idioma of ['es', 'en']) {
		const dir = path.join(ROOT, 'src/content/blog', idioma);
		if (!fs.existsSync(dir)) continue;
		for (const f of fs.readdirSync(dir)) {
			if (f.endsWith('.md')) out.push(`/blog/${f.replace(/\.md$/, '')}`);
		}
	}

	return RUTA_UNICA ? [RUTA_UNICA] : out;
}

// ---------------------------------------------------------------- la sonda

/**
 * Se inyecta entera en la página. Cuatro decisiones que parecen detalles y cada
 * una viene de un falso positivo o un falso negativo real — cambiarlas sin leer
 * esto es reintroducirlos.
 */
const SONDA = () => {
	/**
	 * ⚠️ **El color se resuelve pintándolo y leyendo el píxel, nunca parseando su
	 * sintaxis.** CSS moderno devuelve el color computado en el espacio en que se
	 * escribió: `color-mix(in oklab, …)` sale como `oklab(0.33 -0.01 -0.10)` y
	 * `color-mix(in srgb, …)` como `color(srgb 0.11 0.30 0.84 / .12)`. Leídos como
	 * `rgb()` dan cifras absurdas — un botón que está a 7,09:1 salía a 1,03.
	 * Muestrear resuelve cualquier espacio, y el alfa, sin saber su gramática.
	 */
	const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
	const px = (css) => {
		cv.clearRect(0, 0, 1, 1);
		cv.fillStyle = '#000';
		cv.fillStyle = css;
		cv.fillRect(0, 0, 1, 1);
		const d = cv.getImageData(0, 0, 1, 1).data;
		return [d[0], d[1], d[2], d[3] / 255];
	};
	const opaco = (css) => px(css)[3] > 0.9;

	const lum = ([r, g, b]) => {
		const f = (c) => {
			c /= 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		};
		return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
	};
	const ratio = (a, b) => {
		const l1 = lum(a);
		const l2 = lum(b);
		return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
	};
	const sobre = (c, base) => c.slice(0, 3).map((v, i) => v * c[3] + base[i] * (1 - c[3]));

	/** El primer ancestro con fondo opaco de verdad. */
	function fondoDe(desde) {
		let n = desde;
		while (n && n !== document.documentElement) {
			const cs = getComputedStyle(n);
			const bi = cs.backgroundImage;
			if (bi && bi !== 'none') {
				const c = bi.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}|color\([^)]*\)|oklab\([^)]*\)/i);
				if (c && opaco(c[0])) return px(c[0]).slice(0, 3);
			}
			if (opaco(cs.backgroundColor)) return px(cs.backgroundColor).slice(0, 3);
			n = n.parentElement;
		}
		return px(getComputedStyle(document.documentElement).backgroundColor).slice(0, 3);
	}

	const donde = (el) => {
		const p = [];
		let n = el;
		while (n && n !== document.body && p.length < 3) {
			const c = (n.className || '')
				.toString()
				.split(' ')
				.filter((x) => x && !x.startsWith('svelte-'))[0];
			p.unshift(n.tagName.toLowerCase() + (c ? '.' + c : ''));
			n = n.parentElement;
		}
		return p.join('>');
	};

	const out = [];

	// ---- Texto ----
	for (const el of document.querySelectorAll('*')) {
		const t = [...el.childNodes]
			.filter((x) => x.nodeType === 3)
			.map((x) => x.textContent.trim())
			.join('');
		if (t.length < 2) continue;

		const cs = getComputedStyle(el);
		if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.1) continue;

		/**
		 * ⚠️ **El modo privacidad no es un fallo.** Pone el texto `transparent` a
		 * propósito y lo sustituye por un borrón; medirlo da 1,03:1.
		 *
		 * ⚠️ **Pero saltarse `.privacy-blur` era saltarse TODAS las cifras de dinero
		 * de la app, y así se escaparon las tres del desglose del capital global**
		 * (`#fff` en línea sobre el `#ffffff` de `--bg-card`: 1,00:1, invisibles, y
		 * lo reportó un usuario). La clase está puesta **siempre** en el marcado; lo
		 * que pinta transparente es `.privacy-mode .privacy-blur`, que solo aplica
		 * con el modo activo — y ese caso ya lo recoge la línea de abajo, porque
		 * entonces el color computado *es* transparente. Es decir: la exclusión era
		 * redundante en el caso para el que se escribió y destruía la cobertura en
		 * el que no. La forma de fallo de siempre aquí — una guarda que no puede
		 * fallar sobre justo lo que más importa.
		 */
		if (cs.color === 'rgba(0, 0, 0, 0)' || cs.color === 'transparent') continue;

		const caja = el.getBoundingClientRect();
		if (caja.width < 4 || caja.height < 4) continue;

		/**
		 * ⚠️ **El texto con degradado se mide, no se salta.** Saltarlo escondió doce
		 * titulares que arrancaban en blanco — invisibles a media palabra en tema
		 * claro — porque `getComputedStyle().color` de un `background-clip: text`
		 * devuelve el color de reserva, no lo que se pinta. Se miden **todos los
		 * topes**: basta que uno falle para que un trozo del titular no se lea. Y el
		 * fondo se busca **desde el padre**, o el degradado se compara consigo mismo
		 * y da 1,00.
		 */
		const esDegradado = (cs.webkitBackgroundClip || cs.backgroundClip) === 'text';
		const topes = esDegradado
			? [
					...cs.backgroundImage.matchAll(
						/rgba?\([^)]+\)|#[0-9a-f]{3,8}|color\([^)]*\)|oklab\([^)]*\)/gi
					)
				].map((m) => m[0])
			: [cs.color];
		if (!topes.length) continue;

		const bg = fondoDe(esDegradado ? el.parentElement : el);
		let peor = Infinity;
		let culpable = null;
		for (const tope of topes) {
			const c = px(tope);
			if (c[3] < 0.05) continue;
			const r = ratio(sobre(c, bg), bg);
			if (r < peor) {
				peor = r;
				culpable = tope;
			}
		}
		if (culpable === null) continue;

		const tam = parseFloat(cs.fontSize);
		const umbral = tam >= 24 || (tam >= 18.66 && +cs.fontWeight >= 700) ? 3 : 4.5;
		if (peor < umbral) {
			out.push({
				tipo: 'texto',
				texto: t.slice(0, 40),
				sel: donde(el),
				color: culpable,
				fondo: `rgb(${bg.map(Math.round).join(',')})`,
				px: +tam.toFixed(1),
				ratio: +peor.toFixed(2),
				umbral
			});
		}
	}

	/**
	 * ---- Objetos gráficos: WCAG 1.4.11 pide 3:1 al dato, no solo al texto ----
	 *
	 * ⚠️ **La lista es de clases del kit didáctico, no de nombres genéricos.** `.dot`
	 * estaba dentro y cazaba los tres semáforos de macOS del marco del navegador
	 * falso de la portada: rojo, ámbar y verde sobre blanco, marcados como fallo.
	 * Son un dibujo de una ventana, no un dato — y sus colores son literalmente lo
	 * que los identifica. Un detector que grita sobre eso acaba silenciado.
	 */
	const MARCAS = '.barra, .barra-fill, .fill, .track, .paso-num, .swatch, .marker';
	for (const el of document.querySelectorAll(MARCAS)) {
		const cs = getComputedStyle(el);
		if (cs.visibility === 'hidden' || cs.display === 'none') continue;
		const caja = el.getBoundingClientRect();
		if (caja.width < 3 || caja.height < 3) continue;
		if (!opaco(cs.backgroundColor)) continue;
		const fg = px(cs.backgroundColor).slice(0, 3);
		const bg = fondoDe(el.parentElement);
		const r = ratio(fg, bg);
		if (r < 3) {
			out.push({
				tipo: 'marca',
				texto: donde(el),
				sel: donde(el),
				color: cs.backgroundColor,
				fondo: `rgb(${bg.map(Math.round).join(',')})`,
				px: 0,
				ratio: +r.toFixed(2),
				umbral: 3
			});
		}
	}

	/**
	 * ---- Cajas que no existen ----
	 *
	 * ⚠️ **Esto mide algo distinto del contraste de texto.** Un panel puede tener
	 * su texto perfectamente legible y no existir como caja: en claro `--bg-card`
	 * es blanco sobre un fondo `#f4f4f9`, o sea 1,07 de separación. Le pasaba a las
	 * cuatro tarjetas de métricas del dashboard — cuatro cifras flotando sin caja.
	 *
	 * Se da por visible si **el relleno o el borde** separan, porque WCAG 1.4.11
	 * pide 3:1 al *límite* del componente, no a su relleno.
	 */
	for (const el of document.querySelectorAll('div, section, aside, figure, article, li, form')) {
		const cs = getComputedStyle(el);
		if (cs.display === 'none' || cs.visibility === 'hidden') continue;
		const caja = el.getBoundingClientRect();
		if (caja.width < 80 || caja.height < 40) continue;

		// La maqueta del hero es un dibujo de la app, no interfaz: sus realces
		// internos son parte de la ilustración. Misma razón que los semáforos.
		if (el.closest('.hero-mockup, .floating-card')) continue;

		const radio = parseFloat(cs.borderRadius) || 0;
		const grosor = parseFloat(cs.borderTopWidth) || 0;
		if (radio < 4 && grosor < 1) continue; // no pretende ser una caja

		const propio = px(cs.backgroundColor);
		if (propio[3] < 0.02) continue; // sin relleno

		const detras = fondoDe(el.parentElement);
		const relleno = sobre(propio, detras);
		const rRelleno = ratio(relleno, detras);

		let rBorde = 0;
		if (grosor >= 1) {
			const b = px(cs.borderTopColor);
			if (b[3] > 0.02) rBorde = ratio(sobre(b, relleno), relleno);
		}

		/**
		 * ⚠️ **Umbrales flojos a propósito: aquí un falso positivo cuesta más que un
		 * falso negativo.** Con 1,2 / 1,35 saltaban los bloques didácticos de las 34
		 * lecciones y los paneles de gestión, que se ven perfectamente — porque un
		 * tinte de color se distingue por **tono** y esto solo sabe de luminancia.
		 * Con 1,06 / 1,15 solo salta lo que de verdad no está: blanco sobre blanco
		 * con un borde fantasma, que es el caso que motivó la comprobación.
		 */
		if (rRelleno < 1.06 && rBorde < 1.15) {
			out.push({
				tipo: 'caja',
				texto: donde(el),
				sel: donde(el),
				color: cs.backgroundColor,
				fondo: `borde ${grosor >= 1 ? cs.borderTopColor : '(ninguno)'}`,
				px: 0,
				ratio: +Math.max(rRelleno, rBorde).toFixed(2),
				umbral: 1.2
			});
		}
	}

	return out;
};

// ---------------------------------------------------------------- servidor

async function esperarServidor(msMax = 90_000) {
	const t0 = Date.now();
	while (Date.now() - t0 < msMax) {
		try {
			const r = await fetch(ORIGIN + '/');
			if (r.ok) return;
		} catch {
			/* aún no */
		}
		await new Promise((r) => setTimeout(r, 400));
	}
	throw new Error(`El preview no respondió en ${ORIGIN}. ¿Hiciste \`npm run build\`?`);
}

// ---------------------------------------------------------------- recorrido

const hallazgos = [];

async function medir(page, etiqueta, tema) {
	const malos = await page.evaluate(SONDA);
	for (const m of malos) hallazgos.push({ ...m, tema, escena: etiqueta });
	return malos.length;
}

/**
 * ⚠️ **Sin esta guarda el barrido puede devolver un cero rotundo y falso.** Una
 * página de error se mide igual de bien que una lección y sale limpia: con los
 * slugs mal construidos, cuarenta rutas dieron 404 y el informe dijo «0 fallos».
 */
async function es404(page) {
	return page.evaluate(() => /404|no encontrada|not found/i.test(document.title));
}

/**
 * Lo que solo existe al pasar por encima: 63 reglas repintan el fondo sin tocar
 * el color.
 *
 * ⚠️ **Mide solo el elemento bajo el puntero, no la página entera.** La primera
 * versión llamaba a la sonda completa tras cada `hover`, así que cuarenta pasadas
 * multiplicaban por cuarenta *todos* los hallazgos de la página: el informe decía
 * 2.269 donde había unas decenas. Un recuento inflado es tan inútil como uno a
 * cero — nadie lee una lista que repite lo mismo cuarenta veces.
 */
async function pasadaHover(page, etiqueta, tema) {
	const objetivos = await page.locator('a:visible, button:visible').all();
	let n = 0;
	for (const el of objetivos.slice(0, 40)) {
		try {
			await el.hover({ timeout: 800 });
		} catch {
			continue;
		}
		const malos = await el.evaluate((nodo, fn) => {
			const sonda = new Function('return ' + fn)();
			// Se acota la sonda al elemento bajo el puntero y su subárbol.
			const antes = document.querySelectorAll;
			document.querySelectorAll = (s) => nodo.parentElement.querySelectorAll(s);
			try {
				return sonda();
			} finally {
				document.querySelectorAll = antes;
			}
		}, SONDA.toString());
		for (const m of malos) hallazgos.push({ ...m, tema, escena: `${etiqueta} · hover` });
		n += malos.length;
	}
	return n;
}

const nav = await chromium.launch();
const servidor = spawn(
	process.platform === 'win32' ? 'npx.cmd' : 'npx',
	['vite', 'preview', '--port', String(PORT), '--strictPort'],
	{ cwd: ROOT, stdio: 'ignore', shell: process.platform === 'win32' }
);

try {
	await esperarServidor();
	const RUTAS = rutas();
	if (!JSON_OUT) {
		console.log(
			`[contraste-vivo] ${RUTAS.length} rutas × ${TEMAS.length} tema(s) a ${VIEWPORT.width}×${VIEWPORT.height}\n`
		);
	}

	for (const tema of TEMAS) {
		const ctx = await nav.newContext({ viewport: VIEWPORT, locale: 'es-ES' });
		await ctx.addInitScript((t) => {
			localStorage.setItem('corebalance_theme', t);
			localStorage.setItem('corebalance_tour_seen', 'true');
			sessionStorage.setItem('bypassLanding', 'true');
		}, tema);
		const page = await ctx.newPage();

		for (const ruta of RUTAS) {
			/**
			 * ⚠️ **Una ruta que no carga cuenta como fallo, no como aviso.**
			 *
			 * Antes imprimía «(no carga)» y seguía, que es otro cero falso esperando:
			 * una lista de rutas con un error tipográfico mide nada y reporta limpio.
			 * Es la misma figura que la guarda de 404 de abajo, por el otro extremo.
			 */
			try {
				await page.goto(ORIGIN + ruta, { waitUntil: 'networkidle', timeout: 30_000 });
			} catch (e) {
				hallazgos.push({
					tipo: 'ruta',
					texto: ruta,
					sel: '(no carga)',
					color: e.message.split('\n')[0].slice(0, 60),
					fondo: '',
					px: 0,
					ratio: 0,
					umbral: 0,
					tema,
					escena: ruta
				});
				console.error(`  ✖ no carga: ${ruta}`);
				continue;
			}
			await page.waitForTimeout(ruta === '/dashboard' ? 2500 : 400);
			if (await es404(page)) {
				throw new Error(`RUTA INEXISTENTE: ${ruta} — el barrido estaría midiendo un 404`);
			}
			const n = await medir(page, ruta, tema);
			const h = ruta === '/' || ruta === '/dashboard' ? await pasadaHover(page, ruta, tema) : 0;
			if (!JSON_OUT && n + h) console.log(`${tema.padEnd(5)} ${ruta.padEnd(52)} ${n + h}`);
		}

		/**
		 * El tour, que por definición no se ve con `tour_seen` puesto.
		 *
		 * ⚠️ En `try` porque `/dashboard` con `networkidle` se agota de vez en
		 * cuando —el sondeo de precios mantiene la red viva— y sin esto un tramo
		 * lento tira el barrido entero justo antes de imprimir el informe. Un
		 * arnés que muere al final es peor que uno que reporta de menos: pierdes
		 * también lo que ya había medido.
		 */
		const ctxTour = await nav.newContext({ viewport: VIEWPORT, locale: 'es-ES' });
		await ctxTour.addInitScript((t) => {
			localStorage.setItem('corebalance_theme', t);
			sessionStorage.setItem('bypassLanding', 'true');
		}, tema);
		const pTour = await ctxTour.newPage();
		try {
		await pTour.goto(ORIGIN + '/dashboard', { waitUntil: 'domcontentloaded' });
		await pTour.waitForTimeout(3500);
		for (let paso = 1; paso <= 4; paso++) {
			if (!(await pTour.locator('.driver-popover').count())) break;
			const n = await medir(pTour, `tour · paso ${paso}`, tema);
			if (!JSON_OUT && n) console.log(`${tema.padEnd(5)} tour · paso ${paso}${' '.repeat(38)}${n}`);
			const sig = pTour.locator('.driver-popover-next-btn');
			if (!(await sig.count())) break;
			await sig.click({ timeout: 3000 }).catch(() => {});
			await pTour.waitForTimeout(600);
		}
		} catch (e) {
			console.error(`  (el tour no se pudo recorrer en ${tema}: ${e.message.split('\n')[0]})`);
		}
		await ctxTour.close();

		// Paneles y modales del dashboard.
		try {
			await page.goto(ORIGIN + '/dashboard', { waitUntil: 'domcontentloaded' });
			await page.waitForTimeout(2500);
			await page.evaluate(() =>
				window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'manage' } }))
			);
			await page.waitForTimeout(1000);
			const nPanel = await medir(page, 'panel gestionar activos', tema);
			if (!JSON_OUT && nPanel)
				console.log(`${tema.padEnd(5)} panel gestionar activos${' '.repeat(29)}${nPanel}`);
			await page.evaluate(() =>
				window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: 'close-all' } }))
			);

			/**
			 * ⚠️ Los paneles plegables del dashboard hay que **abrirlos** o esto mide su
			 * cabecera y nada más: su contenido está en el DOM pero sin pintar, así que
			 * un panel entero puede salir con cero hallazgos por no haberse mirado —
			 * que es el modo de fallo que este repo llama «un guard que no puede fallar».
			 * Su cabecera es un `<button>` cuyo estado no se fuerza desde fuera, y el
			 * `tour-step` es el mecanismo que la propia app ya tiene para eso.
			 *
			 * Salió al medir el panel de solapamiento: la pasada daba 0 en los dos temas
			 * y a los dos anchos, y el contenido nuevo no estaba entrando. Quien lo cubría
			 * era `e2e/tema.spec.ts`, que sí lo abre.
			 */
			/*
			 * Los cinco, y no uno. ⚠️ **Cuatro de los cinco estaban en ese hueco**: la
			 * pasada solo abría el de solapamiento, así que el contenido de los otros
			 * cuatro nunca se midió y salía en cero por no haberse mirado.
			 *
			 * Con una herramienta abierta a la vez, abrir la siguiente cierra la anterior:
			 * son cinco escenas de una herramienta cada una en vez de una escena con cinco
			 * abiertas. Es más cobertura y ~4 s más por tema, en un script que ya está
			 * fuera de CI a propósito.
			 */
			for (const [objetivo, etiqueta, sel] of [
				['abrir-rebalance', 'panel rebalanceo', '#tour-rebalance'],
				['abrir-tax', 'panel fiscal', '#tour-tax'],
				['abrir-concentracion', 'panel solapamiento', '#tour-concentracion'],
				['abrir-projections', 'panel proyección', '#tour-projections'],
				['abrir-crisis', 'panel crisis', '#tour-crisis']
			]) {
				await page.evaluate(
					(t) => window.dispatchEvent(new CustomEvent('tour-step', { detail: { target: t } })),
					objetivo
				);
				await page.waitForTimeout(700);
				/**
				 * ⚠️ Guarda sobre la guarda: si el panel no se abre —objetivo renombrado,
				 * panel movido, `<details>` en vez de clase— la pasada mediría cero y se
				 * leería como «limpio». Que lo diga en voz alta es la diferencia entre un
				 * hueco y un silencio.
				 */
				const abierto = await page.evaluate(
					(id) => document.querySelector(id)?.classList.contains('open') ?? null,
					sel
				);
				if (abierto !== true) {
					console.error(
						`  ⚠️ ${etiqueta} NO se abrió en ${tema} (${abierto === null ? 'no está en la página' : 'sigue plegado'}): lo medido no incluye su contenido.`
					);
				}
				const n = await medir(page, etiqueta, tema);
				if (!JSON_OUT && n)
					console.log(`${tema.padEnd(5)} ${etiqueta}${' '.repeat(Math.max(1, 52 - etiqueta.length))}${n}`);
			}
		} catch (e) {
			console.error(`  (el panel no se pudo abrir en ${tema}: ${e.message.split('\n')[0]})`);
		}

		await ctx.close();
	}
} finally {
	await nav.close().catch(() => {});
	servidor.kill();
}

// ---------------------------------------------------------------- informe

if (JSON_OUT) {
	console.log(JSON.stringify(hallazgos, null, 2));
} else {
	const grupos = new Map();
	for (const h of hallazgos) {
		const k = `${h.tema}|${h.tipo}|${h.sel}|${h.color}|${h.fondo}`;
		if (!grupos.has(k)) grupos.set(k, { ...h, n: 0, escenas: new Set() });
		const g = grupos.get(k);
		g.n++;
		g.escenas.add(h.escena);
	}
	if (grupos.size) {
		console.log('\n===== AGRUPADO POR CAUSA =====\n');
		for (const g of [...grupos.values()].sort((a, b) => a.ratio - b.ratio)) {
			console.log(
				`${String(g.n).padStart(4)}x  ${g.ratio} (min ${g.umbral})  [${g.tema}/${g.tipo}]  ${g.sel}`
			);
			console.log(`        «${g.texto}»  ${g.color} sobre ${g.fondo}${g.px ? '  ' + g.px + 'px' : ''}`);
			console.log(
				`        en: ${[...g.escenas].slice(0, 2).join(' · ')}${g.escenas.size > 2 ? ` (+${g.escenas.size - 2})` : ''}`
			);
		}
	}
	console.log(
		`\n${hallazgos.length ? '✖' : '✔'} ${hallazgos.length} hallazgos en ${grupos.size} causas` +
			`${MOVIL ? ' (móvil)' : ''}\n`
	);
}

process.exit(hallazgos.length ? 1 : 0);
