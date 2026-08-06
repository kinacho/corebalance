#!/usr/bin/env node
/**
 * Guardia contra tests que no pueden fallar.
 *
 * ⚠️ Es el defecto recurrente de este repo, con nombre y apellidos. En una sola
 * revisión de código salieron **tres** casos: una suite que apuntaba a un directorio
 * inexistente y se saltaba entera, un `expect(true).toBe(true)` que hacía de rama
 * «no hay fixtures», y una comprobación de anchos que se medía contra la celda más
 * ancha de todo el mapa y por tanto solo podía fallar en una de nueve. Los tres daban
 * verde, y un verde así es peor que un rojo: dice que algo está comprobado.
 *
 * Esto no sustituye al mutation testing —eso demuestra si un test *detecta* un cambio
 * de comportamiento—, cubre lo que se puede ver sin ejecutar nada: aserciones
 * tautológicas y tests sin ninguna aserción.
 *
 * Uso: `npm run test:quality`, y además se ejecuta como test en `npm test`.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAICES = ['src', 'scripts', 'e2e'];

/**
 * Tautologías: comparar un literal consigo mismo, o afirmar que un literal existe.
 * `expect(true).toBe(true)` es el caso que apareció de verdad.
 */
const TAUTOLOGIAS = [
	/expect\(\s*(true|false|null|undefined|\d+|'[^']*'|"[^"]*")\s*\)\s*\.\s*toBe\(\s*\1\s*\)/g,
	/expect\(\s*(true|1|'[^']*')\s*\)\s*\.\s*(toBeTruthy|toBeDefined)\(\s*\)/g
];

/** Modificadores que hacen legítimo un cuerpo sin aserciones. */
const SIN_CUERPO_OK = new Set(['skip', 'todo', 'fails']);

/** `test.describe` no es un test: es el contenedor, y no le toca afirmar nada. */
const NO_SON_TESTS = new Set(['describe', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'step', 'use', 'slow', 'setTimeout', 'info']);

/**
 * Quita comentarios antes de buscar.
 *
 * ⚠️ Hace falta y lo descubrió el propio informe: marcaba
 * `src/lib/importers/training_csv.test.ts` por una tautología que está **dentro de un
 * comentario**, explicando el defecto que se corrigió ahí. Un comprobador que no
 * distingue código de prosa acusa justo a quien documentó el arreglo.
 *
 * No es un analizador: no intenta respetar comentarios dentro de cadenas. Para lo que
 * hace —decidir si hay un `expect` de verdad— sobra, y un AST traería una dependencia
 * y un modo nuevo de equivocarse.
 */
function quitarComentarios(codigo) {
	return (
		codigo
			.replace(/\/\*[\s\S]*?\*\//g, (bloque) => bloque.replace(/[^\n]/g, ' '))
			// `//` que no venga de un `https://` ni de una ruta.
			.replace(/(^|[^:\w])\/\/[^\n]*/g, (_, previo) => previo)
			/**
			 * ⚠️ Y también se vacían las plantillas (acentos graves), porque un test que
			 * lleva **código de test dentro de una cadena** —el propio test de esta guardia
			 * lo hace— partía el troceo en el `it(` de mentira y dejaba al test de verdad
			 * sin sus aserciones. La guardia se acusaba a sí misma.
			 *
			 * El precio es que un nombre de test escrito con plantilla pierde el nombre en
			 * el informe (sale «(sin nombre)»), no la comprobación: el cuerpo se sigue
			 * mirando. Es el intercambio correcto — importa contar bien, no rotular bien.
			 */
			.replace(/`(?:[^`\\]|\\.)*`/g, (plantilla) => plantilla.replace(/[^\n]/g, ' '))
	);
}

const PATRON_TEST = /\.(test|spec)\.(ts|js)$/;

/**
 * `patron` es parametrizable por una razón concreta: el fixture de esta guardia
 * contiene tests malos a propósito, así que **no puede llamarse `*.test.ts`** —vitest lo
 * recogería y los ejecutaría—. Se llama `.txt` y el test le pasa su propio patrón.
 */
function listarTests(dir, patron = PATRON_TEST) {
	if (!fs.existsSync(dir)) return [];
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
		const completo = path.join(dir, entrada.name);
		if (entrada.isDirectory()) return listarTests(completo, patron);
		return patron.test(entrada.name) ? [completo] : [];
	});
}

/**
 * Los tests de un fichero, troceados sin analizador sintáctico.
 *
 * Se parte por cada `it(`/`test(` y se mira hasta el siguiente. No es un AST y no hace
 * falta: para decidir «¿hay algún `expect` aquí dentro?» sobra, y un AST traería una
 * dependencia y un modo nuevo de fallar.
 */
export function trocearTests(codigo) {
	const patron = /\b(it|test)(?:\.(\w+))?\s*\(\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/g;
	const trozos = [];
	let anterior = null;

	for (const casacion of codigo.matchAll(patron)) {
		if (NO_SON_TESTS.has(casacion[2] ?? '')) continue;
		if (anterior) anterior.cuerpo = codigo.slice(anterior.inicio, casacion.index);
		anterior = {
			nombre: casacion[3] ?? casacion[4] ?? casacion[5] ?? '(sin nombre)',
			modificador: casacion[2] ?? '',
			inicio: casacion.index + casacion[0].length,
			cuerpo: ''
		};
		trozos.push(anterior);
	}
	if (anterior) anterior.cuerpo = codigo.slice(anterior.inicio);
	return trozos;
}

export function auditarTests(opciones = {}) {
	const { raices = RAICES, patron = PATRON_TEST } = opciones;
	const ficheros = raices.flatMap((raiz) => listarTests(raiz, patron));
	const hallazgos = [];
	let tests = 0;

	for (const fichero of ficheros) {
		const codigo = quitarComentarios(fs.readFileSync(fichero, 'utf8'));

		for (const patron of TAUTOLOGIAS) {
			for (const casacion of codigo.matchAll(patron)) {
				const linea = codigo.slice(0, casacion.index).split('\n').length;
				hallazgos.push({
					tipo: 'tautologia',
					fichero,
					linea,
					detalle: casacion[0].replace(/\s+/g, ' ')
				});
			}
		}

		for (const trozo of trocearTests(codigo)) {
			tests++;
			if (SIN_CUERPO_OK.has(trozo.modificador)) continue;
			// `expect(` cubre vitest; `assert` por si algún día entra node:assert.
			if (!/\bexpect\s*\(|\bassert[.(]/.test(trozo.cuerpo)) {
				const linea = codigo.slice(0, trozo.inicio).split('\n').length;
				hallazgos.push({
					tipo: 'sin-aserciones',
					fichero,
					linea,
					detalle: `«${trozo.nombre}» no contiene ninguna aserción`
				});
			}
		}
	}

	return { ficheros: ficheros.length, tests, hallazgos };
}

function principal() {
	const informe = auditarTests();
	console.log(
		`[test-quality] ${informe.tests} tests en ${informe.ficheros} ficheros comprobados.`
	);
	if (informe.hallazgos.length === 0) {
		console.log('[test-quality] 0 tests que no puedan fallar.');
		return 0;
	}
	console.error(`\n[test-quality] ${informe.hallazgos.length} tests que no pueden fallar:\n`);
	for (const h of informe.hallazgos) {
		console.error(`  · ${h.tipo.padEnd(15)} ${h.fichero}:${h.linea} — ${h.detalle}`);
	}
	console.error(
		'\nUn test sin aserciones o con una tautología no comprueba nada y ocupa una línea\n' +
			'verde en el informe. Si de verdad no hay nada que afirmar, usa `it.skip` con el\n' +
			'motivo: en el informe sale como omitido, que es la verdad.'
	);
	return 1;
}

const esEjecucionDirecta =
	process.argv[1] &&
	path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (esEjecucionDirecta) process.exit(principal());
