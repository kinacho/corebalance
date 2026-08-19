import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ¿Permiten las reglas desplegadas cada ruta que el código toca?
 *
 * ⚠️ **Existe porque una regla que falta no se parece a un error, se parece a una
 * cartera vacía.** `user_transactions/{uid}/items` no estaba cubierta y las
 * reglas de Firestore **no descienden a las subcolecciones**: permitir el
 * documento padre no permite nada por debajo. Resultado, durante meses y en
 * producción: `Missing or insufficient permissions` en cada `saveTransactions`,
 * que `FirebaseStorage` se tragaba con un `console.error`, así que el libro de
 * movimientos de todo usuario registrado **nunca llegó a la nube** y en un
 * navegador nuevo la cartera se restauraba con el libro a cero. Sin nada rojo en
 * ningún sitio: ni en CI, ni en el build, ni en la consola de quien no la mirara.
 *
 * Lo que se comprueba aquí no es que las reglas sean buenas, es que **cubren lo
 * que el código pide**, que es exactamente la pregunta que nadie estaba haciendo.
 * Se lee `FirebaseStorage.ts` como texto en lugar de llamarlo: el defecto es de
 * correspondencia entre dos ficheros, y una llamada real necesitaría credenciales
 * y una red, que es como se acaba sin guarda ninguna.
 *
 * ⚠️ **Lo que NO puede comprobar**: que lo desplegado en el proyecto de Firebase
 * sea este fichero. Eso no se sabe sin credenciales, y es la razón de que existan
 * `firebase.json` y `.firebaserc`: con ellos `firebase deploy --only
 * firestore:rules` despliega **este** fichero, así que auditarlo aquí significa
 * algo. Sin ellos las reglas se pegaban a mano en la consola y este fichero era
 * un documento sobre lo que alguien pegó un día — la misma trampa que
 * `.claude/rules` con `paths` que no casan.
 *
 * Control negativo, ejecutado: sustituyendo el comodín recursivo por el
 * `match /items/{transactionId}` que había antes, sigue verde (es equivalente);
 * quitando ese bloque entero —el estado real del proyecto— se pone **rojo** y
 * nombra `user_transactions/{uid}/items` como ruta sin cubrir.
 */

const RAIZ = process.cwd();
const REGLAS = readFileSync(join(RAIZ, 'firestore.rules'), 'utf8');
const CODIGO = readFileSync(join(RAIZ, 'src', 'lib', 'db', 'FirebaseStorage.ts'), 'utf8');

/** Un segmento literal se compara tal cual; `*` y `**` son comodines. */
type Patron = string[];

/**
 * Las rutas que el código toca, en forma de patrón.
 *
 * `doc(db, 'user_transactions', userId, 'items', item.id)` da
 * `['user_transactions', '*', 'items', '*']`: los literales identifican la
 * colección, y todo lo que sea una variable es un id cualquiera.
 */
function rutasDelCodigo(fuente: string): Patron[] {
	const rutas: Patron[] = [];
	const llamadas = fuente.matchAll(/\b(?:doc|collection)\(\s*db\s*,([^)]*)\)/g);
	for (const llamada of llamadas) {
		const segmentos = llamada[1]
			.split(',')
			.map((arg) => arg.trim())
			.filter((arg) => arg.length > 0)
			.map((arg) => {
				const literal = arg.match(/^'([^']+)'$/);
				return literal ? literal[1] : '*';
			});
		if (segmentos.length > 0) rutas.push(segmentos);
	}
	return rutas;
}

/** Una regla: su ruta como patrón y qué operaciones concede, con su condición. */
interface Regla {
	patron: Patron;
	operaciones: Set<string>;
	condiciones: string[];
}

/**
 * Recorre los `match` anidados llevando el prefijo, porque una regla vale por su
 * ruta completa: `match /items/{id}` dentro de `match /user_transactions/{uid}`
 * es `user_transactions/{uid}/items/{id}`, y suelto no significa nada.
 */
function reglasDe(fuente: string): Regla[] {
	const reglas: Regla[] = [];
	const pila: Patron[] = [];
	let actual: Regla | null = null;

	for (const bruta of fuente.split('\n')) {
		const linea = bruta.trim();
		if (linea.startsWith('//')) continue;

		const match = linea.match(/^match\s+(\S+)\s*\{/);
		if (match) {
			const segmentos = match[1]
				.split('/')
				.filter((s) => s.length > 0)
				.map((s) => {
					if (/^\{[^}]+=\*\*\}$/.test(s)) return '**';
					if (/^\{[^}]+\}$/.test(s)) return '*';
					return s;
				});
			const padre = pila.length > 0 ? pila[pila.length - 1] : [];
			const completo = [...padre, ...segmentos];
			pila.push(completo);
			actual = { patron: completo, operaciones: new Set(), condiciones: [] };
			reglas.push(actual);
			continue;
		}

		const allow = linea.match(/^allow\s+([^:]+):\s*if\s+(.+?);?$/);
		if (allow && actual) {
			for (const op of allow[1].split(',')) actual.operaciones.add(op.trim());
			actual.condiciones.push(allow[2].trim());
			continue;
		}

		if (linea === '}') {
			pila.pop();
			const abierto = pila[pila.length - 1];
			actual = abierto ? (reglas.find((r) => r.patron === abierto) ?? null) : null;
		}
	}

	return reglas;
}

/** `**` consume uno o más segmentos, como en Firestore. `*` consume exactamente uno. */
function cubre(regla: Patron, ruta: Patron): boolean {
	const recursivo = regla[regla.length - 1] === '**';
	const fijos = recursivo ? regla.slice(0, -1) : regla;
	if (recursivo ? ruta.length <= fijos.length : ruta.length !== fijos.length) return false;
	return fijos.every((seg, i) => seg === '*' || seg === ruta[i]);
}

/** El prefijo que Firestore pone delante de todo. No es parte de ninguna ruta. */
const PREFIJO = ['databases', '*', 'documents'];

function sinPrefijo(patron: Patron): Patron {
	const casa = PREFIJO.every((seg, i) => seg === '*' || seg === patron[i]);
	return casa ? patron.slice(PREFIJO.length) : patron;
}

const RUTAS = rutasDelCodigo(CODIGO);
const REGLAS_PARSEADAS = reglasDe(REGLAS)
	.map((r) => ({ ...r, patron: sinPrefijo(r.patron) }))
	.filter((r) => r.patron.length > 0 && r.operaciones.size > 0);

describe('firestore.rules cubre lo que el código pide', () => {
	it('encuentra rutas en el código y reglas en el fichero', () => {
		// Si el parseo dejara de encontrar nada, todo lo de abajo pasaría vacío: el
		// mismo fallo que un `expect(true).toBe(true)` haciendo de «no hay fixtures».
		expect(RUTAS.length).toBeGreaterThan(4);
		expect(REGLAS_PARSEADAS.length).toBeGreaterThan(2);
	});

	it('incluye la subcolección del libro de movimientos entre las rutas del código', () => {
		// La ruta cuyo permiso faltaba. Si `FirebaseStorage` deja de tocarla, este
		// test tiene que caerse para que alguien mire por qué.
		expect(RUTAS.some((r) => cubre(['user_transactions', '*', 'items', '*'], r))).toBe(true);
	});

	it('cada ruta que el código lee o escribe tiene una regla que la permite', () => {
		const sinCubrir = RUTAS.filter(
			(ruta) =>
				!REGLAS_PARSEADAS.some(
					(regla) =>
						cubre(regla.patron, ruta) &&
						regla.operaciones.has('read') &&
						regla.operaciones.has('write')
				)
		).map((r) => r.join('/'));

		expect(sinCubrir).toEqual([]);
	});

	it('ninguna regla concede acceso sin comprobar el dueño', () => {
		// Una regla abierta no rompe nada visible: expone los datos de todos. Lo
		// único que se acepta es la comprobación del uid, directa o por la función.
		const abiertas = REGLAS_PARSEADAS.filter((regla) =>
			regla.condiciones.some((c) => !/esDueno\(|request\.auth\s*!=\s*null/.test(c))
		).map((r) => r.patron.join('/'));

		expect(abiertas).toEqual([]);
	});
});

describe('el despliegue apunta al fichero que se audita', () => {
	it('firebase.json declara firestore.rules', () => {
		// Sin esto, `firebase deploy --only firestore:rules` no sabe qué desplegar y
		// auditar el fichero no prueba nada sobre el proyecto.
		const config = JSON.parse(readFileSync(join(RAIZ, 'firebase.json'), 'utf8'));
		expect(config.firestore?.rules).toBe('firestore.rules');
	});

	it('.firebaserc nombra un proyecto por defecto', () => {
		const proyectos = JSON.parse(readFileSync(join(RAIZ, '.firebaserc'), 'utf8'));
		expect(proyectos.projects?.default).toBeTruthy();
	});
});
