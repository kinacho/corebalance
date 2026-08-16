/**
 * ¿Se puede leer el texto?
 *
 * La quinta guarda mecánica, y existe por la misma razón que las otras cuatro: el
 * defecto que se repite en este repo no es un algoritmo mal, es **una comprobación
 * que no puede fallar**. Aquí el equivalente es un color: 212 declaraciones `color:`
 * estaban por debajo de AA —105 de ellas por debajo incluso de 3:1— y no había
 * nada, en ningún sitio, que se pusiera rojo por ello. Se enteró el proyecto por
 * tres comentarios en un foro.
 *
 * Un barrido sin guarda se deshace solo, y de eso hay prueba dentro del propio
 * repo: `--accent-blue` se migró de `#3b82f6` a `#2563eb` y **los 128 literales se
 * quedaron atrás**, así que la app siguió pintada del color del que se había
 * migrado. El token cambió y nadie comprobó lo demás.
 *
 * Qué comprueba, y qué NO:
 *
 * - Calcula el ratio WCAG de cada declaración `color:` contra los fondos
 *   declarados de cada tema, y **falla** por debajo de 4,5:1.
 * - Avisa —no falla— de `color:` con alfa, que es la causa mecánica de todo esto:
 *   un alfa se compone con lo que haya detrás, así que el mismo valor da un ratio
 *   distinto en cada sitio y ninguno es el que se midió.
 * - **No** mira fondos, bordes ni sombras. Su contraste lo pide WCAG 1.4.11 contra
 *   el color adyacente, que un analizador estático no conoce.
 *
 * ⚠️ **`color` tiene que ir precedido de algo que no sea un guion, y no es un
 * detalle de estilo.** `\bcolor:` casa también `border-color:` y
 * `background-color:`: con ese regex la primera medición dio 286 en vez de 212
 * —contando bordes como si fueran texto— y el codemod del barrido llegó a
 * convertir 23 bordes en tokens de texto antes de que un control lo cazara. El
 * mismo error, dos veces, en dos herramientas distintas del mismo trabajo.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** El umbral de texto normal. AAA (7:1) sería un objetivo, no un suelo. */
export const UMBRAL_AA = 4.5;

/**
 * Los fondos contra los que se mide, por tema.
 *
 * Tres por tema y no uno: una tarjeta no es el fondo de página, y la malla del
 * fondo cambia de color con el P&L del día (`+layout.svelte` inyecta
 * `--bg-mesh-*`), así que el peor caso realista es su zona más clara. Se exige el
 * umbral contra **el peor de los tres**.
 */
export const FONDOS = {
	dark: ['#05050a', '#0d0d12', '#131f2e'],
	light: ['#f4f4f9', '#ffffff', '#e8eaf2']
};

/**
 * El valor de cada token de texto, por tema, para poder **medirlo**.
 *
 * ⚠️ **La primera versión llevaba aquí un `Set` de nombres que se daban por
 * buenos y se saltaban sin medir, y eso escondió un fallo real durante todo el
 * trabajo**: `--accent-blue` da 3,22 como texto sobre el peor fondo oscuro, y la
 * guarda decía que todo estaba bien porque era un token. Una guarda que confía en
 * lo que debería comprobar es la misma figura que este repo persigue en los tests
 * — una comprobación que no puede fallar. Se miden.
 *
 * Duplica los valores de `layout.css`, y esa duplicación es el precio de no
 * ejecutar un navegador para resolver `var()`. `contraste.test.ts` la vigila
 * comparándola con el fichero real.
 */
const TOKENS = {
	dark: {
		'--text-primary': '#ffffff',
		'--text-secondary': '#d7d7e6',
		'--text-muted': '#a8a8c0',
		'--text-faint': '#8a8aa3',
		'--text-on-accent': '#ffffff',
		'--accent-blue': '#2563eb',
		'--accent-green': '#059669',
		'--accent-orange': '#d97706',
		'--surface-green': '#047857',
		'--surface-danger': '#b91c1c',
		'--surface-orange': '#b45309',
		'--accent-blue-ink': '#60a5fa',
		'--accent-green-ink': '#10b981',
		'--accent-orange-ink': '#f59e0b',
		'--accent-violet-ink': '#a78bfa',
		'--state-positive': '#34d399',
		'--state-negative': '#f43f5e',
		'--border-strong': '#61617a'
	},
	light: {
		'--text-primary': '#111118',
		'--text-secondary': '#3a3a4d',
		'--text-muted': '#5c5c73',
		'--text-faint': '#66667c',
		'--text-on-accent': '#ffffff',
		'--accent-blue': '#1d4ed8',
		'--accent-green': '#046c4e',
		'--accent-orange': '#9a5408',
		'--surface-green': '#046c4e',
		'--surface-danger': '#b91c1c',
		'--surface-orange': '#9a5408',
		'--accent-blue-ink': '#1d4ed8',
		'--accent-green-ink': '#046c4e',
		'--accent-orange-ink': '#9a5408',
		'--accent-violet-ink': '#6d28d9',
		'--state-positive': '#03714f',
		'--state-negative': '#be123c',
		'--border-strong': '#8a8aa0'
	}
};

/**
 * Excepciones, **con motivo escrito por entrada**.
 *
 * La lista es de pares `fichero::valor`. Mismo criterio que `MENCIONES_HISTORICAS`
 * en `doc-drift.mjs`: una excepción sin motivo es una excepción que nadie puede
 * revisar, y a los seis meses es indistinguible de un descuido.
 */
export const EXCEPCIONES = [
	{
		fichero: 'src/lib/components/SyncModal.svelte',
		valor: 'rgba(0, 0, 0, 0.5)',
		motivo:
			'`.qr-skeleton` es el rótulo de carga que va ENCIMA del QR, y el QR tiene ' +
			'`background: white` en su contenedor — 8,6:1, correcto. Falla porque el ' +
			'analizador solo empareja `color` con el `background` de su MISMO bloque, y ' +
			'aquí el fondo lo pone el padre. Modelar la cascada entera para un caso no ' +
			'compensa; declararlo con su medición, sí.'
	}
];

// ---------------------------------------------------------------- color

function aRgb(hex) {
	let h = hex.replace('#', '');
	if (h.length === 3)
		h = h
			.split('')
			.map((c) => c + c)
			.join('');
	return [
		parseInt(h.slice(0, 2), 16),
		parseInt(h.slice(2, 4), 16),
		parseInt(h.slice(4, 6), 16)
	];
}

function canalLineal(c) {
	const v = c / 255;
	return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function luminancia([r, g, b]) {
	return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b);
}

export function ratio(rgbA, rgbB) {
	const a = luminancia(rgbA);
	const b = luminancia(rgbB);
	const [alto, bajo] = a > b ? [a, b] : [b, a];
	return (alto + 0.05) / (bajo + 0.05);
}

/** Compone un color con alfa sobre un fondo opaco. */
function componer(rgb, alfa, fondo) {
	return rgb.map((c, i) => c * alfa + fondo[i] * (1 - alfa));
}

// ---------------------------------------------------------------- análisis

/**
 * `color:` no precedido de guion — ver la nota de arriba, que es la razón de ser
 * de este regex y no de otro.
 */
const RE_DECL = /(?:^|[^-\w])color:\s*([^;{}]+)/g;

const RE_RGBA = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)$/;
const RE_HEX = /^#[0-9a-fA-F]{3,8}$/;
const RE_VAR = /^var\(\s*(--[a-z-]+)/;

/** Palabras clave que no son un color medible aquí. */
const IGNORAR = new Set(['inherit', 'transparent', 'currentcolor', 'unset', 'initial']);

/** Quita comentarios para no auditar prosa. La misma lección que `doc-drift`. */
function sinComentarios(css) {
	return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Solo los bloques `<style>` de un `.svelte`; el `<script>` no pinta nada. */
function cssDe(archivo, texto) {
	if (archivo.endsWith('.css')) return sinComentarios(texto);
	const bloques = [...texto.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];
	return bloques.map((m) => sinComentarios(m[1])).join('\n');
}

/**
 * Colores escritos en el atributo `style=` del **marcado**.
 *
 * ⚠️ **Este era el agujero por el que se coló el defecto que motivó la función, y
 * es estructural: `cssDe()` devuelve solo los bloques `<style>`, así que un color
 * en el marcado no lo ve esta guarda por construcción.** `HeroSummary.svelte`
 * tenía `style="color: #fff"` en las tres cifras del desglose del capital global;
 * en tema claro eso es blanco sobre el `#ffffff` de `--bg-card` —1,00:1 medido en
 * el navegador, invisibles— y la guarda salía verde. Lo reportó un usuario. Es la
 * misma forma que este repo ya tiene fichada para los dos colores que se habían
 * escapado a JS (`CompositionBars`, `AssetCard`): el análisis mira donde mira, y
 * lo que vive fuera no existe para él.
 *
 * No se mide el ratio y es deliberado: aquí no hay regla de la que sacar un fondo,
 * así que el analizador no sabe contra qué compone. Lo que se afirma es más
 * simple y más fuerte — **un literal en línea es incomprobable**, y moverlo a una
 * clase lo devuelve al alcance de la guarda. Por eso es error y no aviso pese a
 * que el color pudiera pasar: lo que falla no es el color, es que nadie puede
 * saberlo.
 *
 * Tres cosas que **no** se marcan, cada una por su razón:
 * - `var(--token)` sigue al tema y está validado en su propia escala.
 * - Un valor con `{…}` es una expresión de Svelte (`{release.badgeColor}`): su
 *   valor no existe hasta que corre, así que esto no puede decir nada de él.
 * - Una propiedad personalizada (`--slider-color: …`) no pinta texto; la alterna
 *   `[^-\w]` de la expresión ya la excluye, igual que a `border-color`.
 */
export function coloresEnLinea(texto) {
	const marcado = texto
		.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
		.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');

	const hallazgos = [];
	for (const attr of marcado.matchAll(/\sstyle=(["'])([\s\S]*?)\1/g)) {
		for (const decl of attr[2].matchAll(/(?:^|[^-\w])color:\s*([^;"']+)/g)) {
			const valor = decl[1].replace(/!important/, '').trim();
			if (IGNORAR.has(valor.toLowerCase())) continue;
			if (valor.includes('{')) continue;

			const respaldo = valor.match(/^var\(\s*--[a-z-]+\s*,\s*([^)]+)\)\s*$/);
			if (respaldo) {
				hallazgos.push({ valor, tipo: 'en-linea-respaldo' });
				continue;
			}
			if (RE_VAR.test(valor)) continue;
			if (RE_HEX.test(valor) || RE_RGBA.test(valor)) {
				hallazgos.push({ valor, tipo: 'en-linea' });
			}
		}
	}
	return hallazgos;
}

/**
 * Los valores de los tokens de fondo, para poder resolver
 * `background: var(--bg-card)` sin leer `layout.css`.
 *
 * `--bg-card` se da ya compuesto sobre `--bg-primary`, que es lo que la tarjeta
 * enseña de verdad — y en oscuro resulta ser exactamente `#0d0d12`, la superficie
 * contra la que están validadas las paletas de datos. Ver su docblock.
 */
const FONDOS_TOKEN = {
	dark: {
		'--bg-primary': '#05050a',
		'--bg-card': '#0d0d12',
		'--bg-elevated': '#0f0f14',
		// La placa de las cabeceras de curso. Coincide a propósito con la zona de malla
		// de `FONDOS`, así que no añade ninguna superficie nueva que auditar.
		'--surface-quiet': '#131f2e',
		'--chart-surface': '#0d0d12',
		// Los acentos también son fondo: es sobre ellos donde va `--text-on-accent`.
		'--accent-blue': '#2563eb',
		'--accent-green': '#059669',
		'--accent-orange': '#d97706',
		'--surface-green': '#047857',
		'--surface-orange': '#b45309',
		'--surface-danger': '#b91c1c',
		// `--bg-overlay` es casi opaco (alfa .95/.96); se resuelve a su tono.
		'--bg-overlay': '#0f0f14',
		'--bg-scrim': '#05050a'
	},
	light: {
		'--bg-primary': '#f4f4f9',
		'--bg-card': '#ffffff',
		'--bg-elevated': '#ffffff',
		'--surface-quiet': '#e8eaf2',
		'--chart-surface': '#ffffff',
		'--accent-blue': '#1d4ed8',
		'--accent-green': '#046c4e',
		'--accent-orange': '#9a5408',
		'--surface-green': '#046c4e',
		'--surface-orange': '#9a5408',
		'--surface-danger': '#b91c1c',
		'--bg-overlay': '#ffffff',
		'--bg-scrim': '#f4f4f9'
	}
};

/**
 * El fondo que declara la propia regla, si declara uno opaco.
 *
 * ⚠️ **Sin esto la guarda es inservible, y no por poco.** `.toggle-btn.active`
 * pone `background: #ffffff; color: #05050a` — texto oscuro sobre blanco, 20:1,
 * perfecto — y medido contra el fondo de la página da **1,00:1**, o sea el peor
 * resultado posible sobre el caso mejor. Un analizador que grita en el código
 * correcto no se arregla: se silencia. Es la lección que `doc-drift.mjs` ya tiene
 * escrita, cuando su primera versión dio 53 falsos positivos de 53.
 *
 * Solo cuenta un fondo **opaco**: uno translúcido deja pasar lo que hay detrás, y
 * eso el analizador no lo sabe, así que en ese caso se sigue midiendo contra el
 * tema y se acepta el conservadurismo.
 */
function fondoDeLaRegla(cuerpo, tema) {
	const m = cuerpo.match(/(?:^|[^-\w])background(?:-color|-image)?:\s*([^;{}]+)/);
	if (!m) return null;
	const valor = m[1].replace(/!important/, '').trim();

	/*
	 * Un degradado de acento cuenta como fondo de acento. No se modela la rampa
	 * entera: se toma el **primer** tono, que es de donde arranca. Es una
	 * aproximación, y por eso el botón principal se comprobó además en el
	 * navegador — donde su extremo claro daba 2,54:1 con el blanco encima y hubo
	 * que oscurecerlo.
	 */
	if (valor.startsWith('linear-gradient') || valor.startsWith('radial-gradient')) {
		const acento = valor.match(/var\(\s*(--(?:accent|surface|bg)-[a-z-]+)/);
		if (acento) {
			const hex = FONDOS_TOKEN[tema][acento[1]];
			return hex ? aRgb(hex) : null;
		}
		const primerHex = valor.match(/#[0-9a-fA-F]{6}\b/);
		return primerHex ? aRgb(primerHex[0]) : null;
	}

	const varM = valor.match(RE_VAR);
	if (varM) {
		const hex = FONDOS_TOKEN[tema][varM[1]];
		return hex ? aRgb(hex) : null;
	}

	if (RE_HEX.test(valor)) return aRgb(valor.slice(0, 7));

	const rgbaM = valor.match(RE_RGBA);
	// Con alfa no se puede resolver: lo de detrás es desconocido.
	if (rgbaM && (rgbaM[4] === undefined || parseFloat(rgbaM[4]) === 1))
		return [+rgbaM[1], +rgbaM[2], +rgbaM[3]];

	return null;
}

/**
 * Trocea el CSS en bloques `selector { declaraciones }`.
 *
 * Deliberadamente ingenuo —no entiende anidamiento ni `@media` con reglas
 * dentro— y basta: lo único que necesita es emparejar cada `color:` con el
 * `background` de su mismo bloque, que es la relación que causa los falsos
 * positivos. Un bloque no reconocido se mide contra el tema, que es el lado
 * conservador.
 */
function bloques(css) {
	return [...css.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
}

export function analizarCss(css, tema = 'dark') {
	const hallazgos = [];
	for (const cuerpo of bloques(css)) {
		const propio = fondoDeLaRegla(cuerpo, tema);
		hallazgos.push(...analizarBloque(cuerpo, tema, propio));
	}
	return hallazgos;
}

function analizarBloque(css, tema, fondoPropio) {
	const fondos = fondoPropio ? [fondoPropio] : FONDOS[tema].map(aRgb);
	const hallazgos = [];

	for (const m of css.matchAll(RE_DECL)) {
		const valor = m[1].replace(/!important/, '').trim();
		if (IGNORAR.has(valor.toLowerCase())) continue;

		let rgb = null;
		let alfa = 1;

		// Un token se resuelve a su valor y se mide como cualquier otro color. Ver
		// la nota de `TOKENS`: saltárselos es lo que escondió un fallo real.
		const varM = valor.match(RE_VAR);
		if (varM) {
			/**
			 * ⚠️ **Un `var(--x, literal)` es un literal disfrazado, y hay que mirarlo.**
			 *
			 * `BlogPost.svelte` tiene seis, y el respaldo de uno es exactamente
			 * `rgba(160,160,200,0.6)` — el valor que este proyecto tiene fichado con
			 * 40 usos a 3,45:1. Hoy no se pinta nunca porque el token existe; el día
			 * que alguien renombre un token, seis declaraciones caen **en silencio**
			 * al valor malo y nada se pone rojo. Se avisa, no se falla: mientras el
			 * token exista no hay defecto visible.
			 */
			const respaldo = valor.match(/^var\(\s*--[a-z-]+\s*,\s*([^)]+(?:\)[^)]*)?)\)\s*$/);
			if (respaldo) {
				const r = respaldo[1].trim();
				const m = r.match(RE_RGBA);
				const rgbR = RE_HEX.test(r) ? aRgb(r) : m ? [+m[1], +m[2], +m[3]] : null;
				if (rgbR) {
					const aR = m && m[4] !== undefined ? parseFloat(m[4]) : 1;
					let peorR = Infinity;
					for (const f of FONDOS[tema]) {
						const fr = aRgb(f);
						peorR = Math.min(peorR, ratio(componer(rgbR, aR, fr), fr));
					}
					if (peorR < UMBRAL_AA) hallazgos.push({ valor, tipo: 'respaldo-malo', ratio: peorR });
				}
			}

			const hex = TOKENS[tema][varM[1]];
			if (!hex) {
				hallazgos.push({ valor, tipo: 'token-desconocido', ratio: null });
				continue;
			}
			rgb = aRgb(hex);
		} else if (RE_HEX.test(valor)) {
			rgb = aRgb(valor.slice(0, 7));
		} else {
			const rgbaM = valor.match(RE_RGBA);
			if (!rgbaM) continue; // degradados, `color-mix`, etc.: fuera de alcance
			rgb = [+rgbaM[1], +rgbaM[2], +rgbaM[3]];
			alfa = rgbaM[4] === undefined ? 1 : parseFloat(rgbaM[4]);
		}

		// El peor de los fondos posibles: si falla contra uno, falla.
		let peor = Infinity;
		for (const fondoRgb of fondos) {
			peor = Math.min(peor, ratio(componer(rgb, alfa, fondoRgb), fondoRgb));
		}

		if (peor < UMBRAL_AA) {
			hallazgos.push({ valor, tipo: 'bajo-contraste', ratio: peor });
		} else if (alfa < 1) {
			hallazgos.push({ valor, tipo: 'alfa', ratio: peor });
		}
	}

	return hallazgos;
}

// ---------------------------------------------------------------- recorrido

function recorrer(dir, acc = []) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) {
			if (e.name === 'node_modules' || e.name === '.svelte-kit') continue;
			recorrer(p, acc);
		} else if (/\.(svelte|css)$/.test(e.name)) acc.push(p);
	}
	return acc;
}

export function auditar(raiz = path.join(RAIZ, 'src')) {
	const errores = [];
	const avisos = [];

	for (const archivo of recorrer(raiz)) {
		const rel = path.relative(RAIZ, archivo).replace(/\\/g, '/');

		const texto = fs.readFileSync(archivo, 'utf8');

		// El marcado se audita aparte del CSS, y antes del `continue`: un fichero sin
		// bloque `<style>` puede perfectamente traer un color en línea.
		if (archivo.endsWith('.svelte')) {
			for (const h of coloresEnLinea(texto)) {
				const exenta = EXCEPCIONES.some(
					(e) => e.fichero === rel && (e.valor === undefined || e.valor === h.valor)
				);
				if (exenta) continue;
				if (h.tipo === 'en-linea')
					errores.push(
						`${rel}  style="…color: ${h.valor}…"  →  color literal en el marcado: esta guarda no puede medirlo, llévalo a una clase`
					);
				else
					avisos.push(
						`${rel}  style="…color: ${h.valor}…"  →  respaldo de var() en línea: incomprobable desde aquí`
					);
			}
		}

		const css = cssDe(archivo, texto);
		if (!css.trim()) continue;

		/**
		 * ⚠️ **Los dos temas, y esto era un agujero de la primera versión.**
		 *
		 * `auditar()` llamaba solo con `'dark'`. La tabla de tokens claros estaba
		 * escrita, medida y sin usar: el tema recién añadido —el que nadie ha mirado
		 * durante años, al revés que el oscuro— era exactamente el que ninguna guarda
		 * vigilaba. Es la figura que este repo persigue en sus tests, aplicada a la
		 * guarda que se escribió para perseguirla.
		 *
		 * Un fallo se reporta con su tema delante, porque el mismo color puede pasar
		 * en uno y fallar en el otro — que es el caso normal, no la excepción.
		 */
		for (const tema of ['dark', 'light']) {
			for (const h of analizarCss(css, tema)) {
				// Una excepción sin `valor` silencia el fichero entero; con `valor`, solo
				// esa declaración. Lo segundo es lo normal: eximir un fichero completo
				// apaga también los fallos que todavía no se han escrito en él.
				const exenta = EXCEPCIONES.some(
					(e) =>
						e.fichero === rel &&
						(e.valor === undefined || e.valor === h.valor) &&
						(e.tema === undefined || e.tema === tema)
				);
				if (exenta) continue;

				const linea = `[${tema}] ${rel}  ${h.valor}`;
				if (h.tipo === 'bajo-contraste')
					errores.push(`${linea}  →  ${h.ratio.toFixed(2)}:1 (mínimo ${UMBRAL_AA})`);
				else if (h.tipo === 'alfa')
					avisos.push(`${linea}  →  alfa en texto: el ratio depende de lo que haya detrás`);
				else if (h.tipo === 'respaldo-malo')
					avisos.push(`${linea}  →  el respaldo del var() da ${h.ratio.toFixed(2)}:1; si el token desaparece, cae ahí`);
				else if (tema === 'dark')
					// Un token desconocido lo es en los dos temas: se avisa una vez.
					avisos.push(`${linea}  →  token no medido; añádelo a TOKENS o usa uno de la escala`);
			}
		}
	}

	return { errores, avisos };
}

// ---------------------------------------------------------------- cli

const esCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (esCli) {
	const { errores, avisos } = auditar();
	const verAvisos = process.argv.includes('--avisos');

	if (errores.length) {
		// El encabezado no puede decir «por debajo de AA» a secas: desde que se audita
		// también el marcado, un error puede ser un literal en línea, que no tiene ratio.
		console.error(`\n✖ ${errores.length} declaraciones de texto sin garantía de AA (${UMBRAL_AA}:1):\n`);
		for (const e of errores) console.error('   ' + e);
	}

	if (avisos.length && verAvisos) {
		console.warn(`\n⚠ ${avisos.length} avisos:\n`);
		for (const a of avisos) console.warn('   ' + a);
	} else if (avisos.length) {
		console.warn(`\n⚠ ${avisos.length} avisos (--avisos para verlos)`);
	}

	if (!errores.length) console.log('\n✔ Ningún texto por debajo de AA.\n');

	process.exit(errores.length ? 1 : 0);
}
