/**
 * Comprobador de deriva de la prosa del repo.
 *
 * La prosa de este repo es la única fuente de verdad sobre por qué el código es como
 * es, y eso la convierte en el sitio donde una afirmación falsa hace más daño: se lee
 * como verificada. Ya pasó — documentaba `NO_TARGET_HUES` y `DARK_SURFACE`, dos
 * constantes que **nunca existieron**, y la frase sobrevivió a una revisión de
 * código a esfuerzo máximo porque nadie comprueba los nombres a mano.
 *
 * ⚠️ Esa prosa ya no es un solo fichero. Vive en `CLAUDE.md` —lo que gobierna siempre—
 * y en `.claude/rules/*.md`, que se cargan **solo** al leer ficheros que casan con su
 * `paths:`. El reparto se hizo para que el conocimiento de cada zona llegue cuando hace
 * falta en vez de en cada turno, y este comprobador es lo único que impide que repita la
 * historia del árbol `.ai/`: 61 ficheros que derivaron del código hasta que hubo que
 * borrarlos. Auditar solo `CLAUDE.md` dejaría sin vigilar las tres cuartas partes.
 *
 * Comprueba dos cosas mecánicas:
 *
 *  1. Que todo identificador y toda ruta citados entre acentos graves —en cualquiera de
 *     los documentos— existan de verdad en el repositorio.
 *  2. Que el `paths:` de cada regla case con al menos un fichero real. ⚠️ Un glob que no
 *     casa con nada es una regla que **no se carga nunca**: su contenido desaparece del
 *     contexto sin que nada falle ni se ponga rojo, que es exactamente la forma de fallo
 *     —un guardián que no puede dispararse— que esta capa entera existe para perseguir.
 *     Se comprueba con `fs.globSync`, que no es el mismo emparejador que usa Claude Code;
 *     vale para «esto casa con algo real», no para «casa exactamente con lo mismo».
 *
 * No comprueba que la prosa *describa bien* lo que hace el código —eso sigue necesitando
 * leerlo— pero sí caza el caso más común de deriva, que es citar algo que se renombró.
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
	[
		'toBeVisible',
		'aserción de Playwright, no código de este repo; se cita para explicar qué falla sobre un mapa plegado'
	],
	[
		'boundingBox',
		'método de Playwright, no código de este repo; se cita por la misma razón que `toBeVisible`'
	],
	['static/sw.js', 'se cita para explicar que se borró y por qué no debe volver'],
	[
		'flowLabel',
		'se borró al extraer `flowTooltipLine`; se cita para decir que se quitó en vez de dejarla como código muerto'
	],
	['training_csv/', 'se cita como el directorio equivocado al que apuntaba un test'],
	[
		'ledgerHoldings.ts',
		'se cita justamente para decir que NO existe: `stores/ledgerHoldings.test.ts` parece su suite y en realidad prueba el ledger a través del store, que es por lo que un recuento de «ficheros sin test» no la ve'
	],
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
/*
 * `e2e` estaba reconocido como raíz de **rutas** válidas más abajo pero no
 * entraba en el pajar de **identificadores**, así que cualquier ayudante citado
 * en CLAUDE.md y definido en un spec —`abrirMapas`, por ejemplo— se denunciaba
 * como inexistente. Añadir una raíz solo puede encontrar más identificadores,
 * nunca inventar huérfanos nuevos.
 */
const RAICES = ['src', 'scripts', 'static', 'e2e', '.github'];
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

/** El directorio de reglas con `paths:`, que se cargan bajo demanda. */
const DIR_REGLAS = '.claude/rules';

/**
 * Todos los documentos en prosa que hay que auditar: la raíz y las reglas.
 *
 * Se descubre en vez de listarse a mano porque una regla nueva sin auditar es
 * indistinguible de una auditada y limpia.
 */
export function reglasDelRepo(dir = DIR_REGLAS) {
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith('.md'))
		.map((f) => `${dir}/${f}`)
		.sort();
}

export function documentosDelRepo() {
	return ['CLAUDE.md', ...reglasDelRepo()].filter((f) => fs.existsSync(f));
}

/**
 * Los globs de `paths:` de cada regla, y si casan con algo.
 *
 * ⚠️ Una regla **sin** `paths:` se carga en todas las sesiones, igual que `CLAUDE.md`.
 * Eso no es un error, pero aquí sí lo es: el reparto entero existe para que estos
 * ficheros NO se carguen siempre, así que una regla sin `paths` deshace en silencio lo
 * que se vino a hacer y el documento seguiría pareciendo repartido.
 */
export function auditarGlobs(reglas = reglasDelRepo()) {
	const problemas = [];
	for (const doc of reglas) {
		const texto = fs.readFileSync(doc, 'utf8');
		/**
		 * ⚠️ CRLF **no** se tolera aquí, y es deliberado: es un fallo de verdad, no una
		 * diferencia cosmética de plataforma. Claude Code no parsea el frontmatter `paths:`
		 * si el fichero viene con CRLF, así que la regla deja de cargarse y su prosa
		 * desaparece del contexto sin que nada falle. Medido el 11-ago-2026 en sesión
		 * limpia: la misma regla carga con LF y no carga con CRLF.
		 *
		 * `.gitattributes` lo evita en el checkout; esto lo caza si alguien la guarda con un
		 * editor que escribe CRLF. Y el orden importa: si esta comprobación tolerase el CRLF
		 * —que fue mi primer impulso al ver el rojo— el comprobador daría verde sobre reglas
		 * que no se cargan, que es exactamente el guardián-que-no-puede-dispararse de siempre.
		 */
		if (texto.includes('\r\n')) {
			problemas.push({
				doc,
				glob: null,
				motivo: 'tiene finales de línea CRLF, y así Claude Code no parsea su frontmatter'
			});
			continue;
		}
		const frontmatter = texto.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatter) {
			problemas.push({ doc, glob: null, motivo: 'no tiene frontmatter con `paths:`' });
			continue;
		}
		const globs = [...frontmatter[1].matchAll(/^\s*-\s*["']?(.+?)["']?\s*$/gm)].map((m) => m[1]);
		if (globs.length === 0) {
			problemas.push({ doc, glob: null, motivo: 'su frontmatter no declara ningún `paths:`' });
			continue;
		}
		for (const glob of globs) {
			let casa = [];
			try {
				casa = [...fs.globSync(glob)];
			} catch {
				problemas.push({ doc, glob, motivo: 'no es un glob válido' });
				continue;
			}
			if (casa.length === 0) problemas.push({ doc, glob, motivo: 'no casa con ningún fichero' });
		}
	}
	return problemas;
}

/**
 * @param {{ docPath?: string, raices?: string[], sueltos?: string[], allowlist?: Map<string,string> }} opciones
 *
 * Sin `docPath` audita **todos** los documentos a la vez y devuelve el agregado; con él,
 * solo ese (que es como lo usa el test contra el fixture roto).
 */
export function auditarDeriva(opciones = {}) {
	const { raices = RAICES, sueltos = FICHEROS_SUELTOS, allowlist = MENCIONES_HISTORICAS } = opciones;

	if (!opciones.docPath) {
		const porDocumento = documentosDelRepo().map((doc) => ({
			doc,
			...auditarDeriva({ ...opciones, docPath: doc })
		}));
		const sumar = (campo) => porDocumento.reduce((n, d) => n + d[campo], 0);
		return {
			total: sumar('total'),
			citadas: sumar('citadas'),
			identificadoresHuerfanos: porDocumento.flatMap((d) => d.identificadoresHuerfanos),
			rutasHuerfanas: porDocumento.flatMap((d) => d.rutasHuerfanas),
			ficherosLeidos: porDocumento[0]?.ficherosLeidos ?? 0,
			porDocumento
		};
	}

	const docPath = opciones.docPath;
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
	const globsRotos = auditarGlobs();

	console.log(
		`[doc-drift] ${informe.total} referencias comprobables de ${informe.citadas} citadas ` +
			`en ${informe.porDocumento.length} documentos, contra ${informe.ficherosLeidos} ficheros.`
	);

	let salida = 0;

	for (const doc of informe.porDocumento) {
		const suyas = [...doc.identificadoresHuerfanos, ...doc.rutasHuerfanas];
		if (suyas.length === 0) continue;
		salida = 1;
		console.error(`\n[doc-drift] ${doc.doc} cita ${suyas.length} cosas que no existen:\n`);
		for (const nombre of doc.identificadoresHuerfanos) console.error(`  · identificador  ${nombre}`);
		for (const nombre of doc.rutasHuerfanas) console.error(`  · ruta           ${nombre}`);
	}

	if (salida === 1) {
		console.error(
			'\nO se renombró y hay que actualizar la prosa, o nunca existió —pasó con\n' +
				'NO_TARGET_HUES y DARK_SURFACE—. Si es una mención histórica a propósito,\n' +
				'añádela a MENCIONES_HISTORICAS en scripts/doc-drift.mjs **con su motivo**.'
		);
	}

	if (globsRotos.length > 0) {
		salida = 1;
		console.error(`\n[doc-drift] ${globsRotos.length} reglas que no se cargarían nunca:\n`);
		for (const { doc, glob, motivo } of globsRotos) {
			console.error(`  · ${doc}${glob ? `  «${glob}»` : ''} — ${motivo}`);
		}
		console.error(
			'\nUna regla cuyo `paths:` no casa con nada no se carga jamás: su contenido\n' +
				'desaparece del contexto sin que nada falle. Corrige el glob o borra la regla.'
		);
	}

	if (salida === 0) console.log('[doc-drift] 0 huérfanas, todos los `paths:` casan.');
	return salida;
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
