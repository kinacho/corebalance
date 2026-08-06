/**
 * Comprobador de deriva de `CLAUDE.md`.
 *
 * `CLAUDE.md` es la única fuente de verdad en prosa de este repo, y eso lo
 * convierte en el sitio donde una afirmación falsa hace más daño: se lee como
 * verificada. Ya pasó — documentaba `NO_TARGET_HUES` y `DARK_SURFACE`, dos
 * constantes que **nunca existieron**, y la frase sobrevivió a una revisión de
 * código a esfuerzo máximo porque nadie comprueba los nombres a mano.
 *
 * Esto comprueba la parte de esa afirmación que es mecánica: que todo
 * identificador y toda ruta que el documento cita entre acentos graves exista de
 * verdad en el repositorio. No comprueba que la prosa *describa bien* lo que hace
 * el código —eso sigue necesitando leerlo— pero sí caza el caso más común de
 * deriva, que es citar algo que se renombró o que se borró.
 *
 * Uso: `npm run docs:check`. Devuelve código de salida 1 si encuentra huérfanos.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Menciones que **no** son referencias al código de hoy, con su razón.
 *
 * ⚠️ Esta lista es la válvula de escape imprescindible, y también el sitio donde
 * este comprobador se puede volver inútil: cada entrada apaga una comprobación, así
 * que necesita un motivo escrito. Si crece sin motivos, es que el comprobador está
 * midiendo mal.
 */
const MENCIONES_HISTORICAS = new Map([
	[
		'NO_TARGET_HUES',
		'nunca existió; se cita como aviso de que el documento la inventó (ver la nota del mapa de desviación)'
	],
	[
		'DARK_SURFACE',
		'nunca existió; se cita como aviso de que el documento la inventó'
	],
	[
		'chartjs-chart-treemap',
		'paquete que se decidió NO instalar; se cita para explicar por qué el treemap es propio'
	],
	['tailwind.config.js', 'se cita justamente para decir que no existe: Tailwind v4 no lo usa'],
	['static/sw.js', 'se cita para explicar que se borró y por qué no debe volver'],
	['training_csv/', 'se cita como el directorio equivocado al que apuntaba un test'],
	['.ai/', 'árbol de 61 ficheros borrado a propósito; se cita para que no vuelva'],
	['page.waitForURL', 'API de Playwright, no de este repo; se cita como aviso de que no sirve con SvelteKit'],
	// Rutas del **output del build**, no del repositorio: viven en
	// `.svelte-kit/output/`, que está ignorado. Se citan porque explicar el service
	// worker sin nombrarlas es imposible.
	['client/sw.js', 'ruta del output del build, no del repo'],
	['registerSW.js', 'fichero que generaba el plugin en el output; se cita para explicar por qué ya no se genera'],
	['_app/version.json', 'ruta del output del build que SvelteKit sirve en runtime']
]);

/** Dónde se busca. El orden no importa: se concatena todo. */
const RAICES = ['src', 'scripts', 'static', '.github'];
const FICHEROS_SUELTOS = [
	'package.json',
	'vite.config.ts',
	'vitest.config.ts',
	'svelte.config.js',
	'tsconfig.json',
	'vercel.json',
	'firestore.rules',
	'.gitignore',
	'.nvmrc',
	'README.md',
	'SECURITY.md'
];

const EXTENSIONES_TEXTO = /\.(ts|tsx|js|mjs|cjs|svelte|json|md|css|html|txt|yml|yaml|rules)$/;

function listarFicheros(dir) {
	if (!fs.existsSync(dir)) return [];
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
		const completo = path.join(dir, entrada.name);
		if (entrada.isDirectory()) return listarFicheros(completo);
		return EXTENSIONES_TEXTO.test(entrada.name) ? [completo] : [];
	});
}

/** Todas las rutas del repo —ficheros y directorios, sin filtrar por extensión— en
 *  formato POSIX, que es como las escribe el documento. */
function listarTodo(dir, acumulado = []) {
	if (!fs.existsSync(dir)) return acumulado;
	for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
		const completo = path.join(dir, entrada.name);
		acumulado.push(completo.replace(/\\/g, '/') + (entrada.isDirectory() ? '/' : ''));
		if (entrada.isDirectory() && entrada.name !== 'node_modules') listarTodo(completo, acumulado);
	}
	return acumulado;
}

/**
 * Cómo se cita una ruta en `CLAUDE.md`, que no es como se escribe en el código.
 *
 * ⚠️ La primera versión de esto comprobaba `fs.existsSync(token)` y devolvía **53
 * huérfanas de 53**, todas falsas: el documento escribe `fiscal.ts` a secas,
 * `importers/parsers.test.ts` en relativo desde otro sitio, y `/dashboard` o `/en/`
 * que son rutas de URL y no de disco. Un comprobador con 53 falsos positivos no se
 * arregla, se silencia — y entonces vuelve a pasar lo de `NO_TARGET_HUES`. Así que
 * cada forma de citar tiene su regla, y lo que no encaja en ninguna **no se
 * comprueba** en vez de contarse como error.
 *
 * @returns {'ok'|'falta'|'no-comprobable'}
 */
function clasificarRuta(token, rutasDelRepo) {
	// Rutas de URL, no de disco: `/dashboard`, `/en/`, `/api`, `/offline`.
	if (token.startsWith('/')) return 'no-comprobable';
	// Ni banderas de CSS (`--accent-blue/green/orange`) ni extensiones sueltas (`.html`).
	if (token.startsWith('-') || /^\.[a-z]+$/.test(token)) return 'no-comprobable';
	// Grupos de variables de entorno: `KV_REST_API_URL/TOKEN`.
	if (!/[a-z]/.test(token)) return 'no-comprobable';

	const limpio = token.replace(/^\.\//, '');
	// Lo más directo primero: que la ruta exista tal cual desde la raíz del repo.
	// Cubre `CLAUDE.md`, `package-lock.json`, `static/` y `training/`, que no están en
	// las listas de arriba pero son rutas de verdad.
	if (fs.existsSync(limpio.replace(/\/$/, ''))) return 'ok';
	// Cita completa desde una raíz conocida: si no existe, es deriva de verdad.
	if (/^(src|scripts|static|e2e|\.github|training)\//.test(limpio)) {
		return rutasDelRepo.has(limpio) || rutasDelRepo.has(limpio + '/') ? 'ok' : 'falta';
	}
	// Cita parcial (`importers/parsers.test.ts`, `og/`) o nombre suelto (`fiscal.ts`):
	// vale que sea el final de la ruta de algo que existe.
	const sufijo = limpio.endsWith('/') ? limpio : limpio;
	for (const ruta of rutasDelRepo) {
		if (ruta === sufijo || ruta.endsWith('/' + sufijo)) return 'ok';
	}
	// Un nombre con extensión conocida que no aparece en ninguna ruta sí es deriva.
	if (EXTENSIONES_TEXTO.test(limpio) || limpio.endsWith('/')) return 'falta';
	return 'no-comprobable';
}

/**
 * Los tokens entre acentos graves que parecen código.
 *
 * Se filtra a lo que se puede comprobar sin falsos positivos: CONSTANTES_ASÍ,
 * `funciones()`, `objeto.propiedad` y rutas con extensión o con barra. Todo lo demás
 * —prosa entre acentos, fragmentos de CSS, valores hex— se deja pasar a propósito:
 * un comprobador que grita por cosas que no son referencias se acaba silenciando.
 */
export function extraerReferencias(markdown) {
	const tokens = [...new Set([...markdown.matchAll(/`([^`\n]{2,80})`/g)].map((m) => m[1].trim()))];

	const identificadores = [];
	const rutas = [];

	for (const token of tokens) {
		// Rutas: llevan barra o extensión conocida, y nada de espacios ni comodines.
		if (/^[\w@./-]+$/.test(token) && (token.includes('/') || EXTENSIONES_TEXTO.test(token))) {
			// Los paquetes de npm (`@sveltejs/kit`) no son rutas del repo.
			if (!token.startsWith('@') && !token.startsWith('node_modules')) rutas.push(token);
			continue;
		}
		// Identificadores: CONSTANTE_CASE, llamada(), objeto.propiedad en camelCase.
		const limpio = token.replace(/\(\)$/, '');
		const esConstante = /^[A-Z][A-Z0-9_]{3,}$/.test(limpio);
		const esLlamada = /^[A-Za-z_$][\w$]*$/.test(limpio) && token.endsWith('()');
		const esAcceso = /^[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*$/.test(limpio);
		if (esConstante || esLlamada || esAcceso) identificadores.push(limpio);
	}

	return { identificadores: [...new Set(identificadores)], rutas: [...new Set(rutas)] };
}

/**
 * @param {{ docPath?: string, raices?: string[], sueltos?: string[], allowlist?: Map<string,string> }} opciones
 */
export function auditarDeriva(opciones = {}) {
	const {
		docPath = 'CLAUDE.md',
		raices = RAICES,
		sueltos = FICHEROS_SUELTOS,
		allowlist = MENCIONES_HISTORICAS
	} = opciones;

	const markdown = fs.readFileSync(docPath, 'utf8');
	const { identificadores, rutas } = extraerReferencias(markdown);

	const ficheros = [...raices.flatMap(listarFicheros), ...sueltos.filter((f) => fs.existsSync(f))];
	/**
	 * Un identificador tiene que existir **en código**, no en otro documento.
	 *
	 * ⚠️ Excluir los `.md` no es una optimización: con ellos dentro, el propio
	 * documento auditado se buscaba a sí mismo y **toda cita se validaba sola**. Se vio
	 * con el fixture roto, cuyas constantes inventadas daban «existe» porque estaban
	 * escritas en el markdown que las inventaba; y habría pasado igual con `CLAUDE.md`
	 * en cuanto alguien lo metiera en las raíces. Un comprobador que se satisface con
	 * la afirmación que está comprobando no comprueba nada.
	 *
	 * Corolario para quien toque el fixture: **no escribas sus nombres inventados en
	 * ningún fichero de código**, ni siquiera en un comentario como este. Pasó aquí
	 * mismo y desactivó la mitad del fixture.
	 */
	const contenido = ficheros
		.filter((f) => !f.endsWith('.md') && path.resolve(f) !== path.resolve(docPath))
		.map((f) => fs.readFileSync(f, 'utf8'))
		.join('\n');
	const rutasDelRepo = new Set([
		...raices.flatMap((r) => listarTodo(r)),
		...sueltos.filter((f) => fs.existsSync(f))
	]);

	const identificadoresHuerfanos = identificadores
		.filter((id) => !allowlist.has(id))
		// Para `objeto.propiedad` basta con que exista la propiedad: el objeto puede
		// llamarse de otra forma en el código (`BLOCK_HUES.core` vs `block.key`).
		.filter((id) => !contenido.includes(id) && !contenido.includes(id.split('.').pop()));

	const comprobables = rutas
		.filter((ruta) => !allowlist.has(ruta))
		// Rutas con comodín o placeholder: `src/lib/i18n/{es,en}/index.ts`.
		.filter((ruta) => !/[{}*[\]]/.test(ruta))
		.map((ruta) => ({ ruta, veredicto: clasificarRuta(ruta, rutasDelRepo) }));

	const rutasHuerfanas = comprobables.filter((r) => r.veredicto === 'falta').map((r) => r.ruta);

	return {
		total: identificadores.length + comprobables.filter((r) => r.veredicto !== 'no-comprobable').length,
		citadas: identificadores.length + rutas.length,
		identificadoresHuerfanos,
		rutasHuerfanas,
		ficherosLeidos: ficheros.length
	};
}

function principal() {
	const informe = auditarDeriva();
	const huerfanos = [...informe.identificadoresHuerfanos, ...informe.rutasHuerfanas];

	console.log(
		`[doc-drift] ${informe.total} referencias comprobables de ${informe.citadas} citadas contra ${informe.ficherosLeidos} ficheros.`
	);

	if (huerfanos.length === 0) {
		console.log('[doc-drift] 0 huérfanas.');
		return 0;
	}

	console.error(`\n[doc-drift] ${huerfanos.length} referencias que no existen en el repo:\n`);
	for (const nombre of informe.identificadoresHuerfanos) {
		console.error(`  · identificador  ${nombre}`);
	}
	for (const nombre of informe.rutasHuerfanas) {
		console.error(`  · ruta          ${nombre}`);
	}
	console.error(
		'\nO se renombró y hay que actualizar CLAUDE.md, o nunca existió —pasó con\n' +
			'NO_TARGET_HUES y DARK_SURFACE—. Si es una mención histórica a propósito,\n' +
			'añádela a MENCIONES_HISTORICAS en scripts/doc-drift.mjs **con su motivo**.'
	);
	return 1;
}

/**
 * Solo al ejecutarlo directamente: el test importa las funciones.
 *
 * ⚠️ `import.meta.url === \`file://${process.argv[1]}\`` —el idiom habitual— **no
 * funciona en Windows**: `import.meta.url` trae tres barras (`file:///C:/…`) y esa
 * comparación da siempre falso, así que el script salía con código 0 sin haber
 * comprobado nada. Un comprobador que no comprueba y además dice que todo va bien
 * es exactamente lo que este fichero existe para evitar, así que la comparación se
 * hace con `fileURLToPath` y rutas normalizadas.
 */
const esEjecucionDirecta =
	process.argv[1] &&
	path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (esEjecucionDirecta) {
	process.exit(principal());
}
