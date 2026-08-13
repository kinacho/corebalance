import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getCursos, getLecciones } from '$lib/cursos';
import { CIFRAS_VIGILADAS } from '$lib/cursos-datos';

/**
 * El contrato de formato de una lección, comprobado sobre el markdown de verdad.
 *
 * ⚠️ **Existe porque el defecto que arregla no da ningún error.** Una lección que vuelve a
 * ser un muro de texto compila igual, pasa `svelte-check` igual, se prerenderiza igual y
 * se ve perfectamente: solo es peor de leer. Sin una guarda, la única barrera contra la
 * regresión es que alguien se acuerde — y son 34 ficheros escritos a lo largo de meses.
 *
 * Las reglas no son de estilo: son la definición operativa de «esto no es un muro y
 * tampoco una presentación de diapositivas». R2 pone el techo (nada de tiradas larguísimas
 * sin nada que mirar) y **R3 pone el suelo**, que es la mitad que se olvida: trocear un
 * argumento en tarjetas deja al lector con hechos sueltos y sin la deducción que los une.
 *
 * ⚠️ **`PENDIENTES` es el andamio del rediseño y tiene que quedar vacío.** Mientras una
 * lección esté ahí, las reglas no se le aplican. Es el mismo patrón que
 * `MENCIONES_HISTORICAS` en `doc-drift.mjs`: una válvula explícita y contada, en vez de
 * una suite en rojo durante toda la migración — que es como se acaba desactivando la
 * suite entera. Un test comprueba que cada entrada existe de verdad, para que una lista
 * que se quedó obsoleta no exima a un fichero que ya no se llama así.
 */

/**
 * Lecciones aún no migradas al formato nuevo. **Se vacía, no se amplía.**
 *
 * Formato: `curso/slug`.
 */
const PENDIENTES = new Set<string>([]);

const RAIZ = resolve('src/content/cursos');

/** Los componentes del kit didáctico, más las dos calculadoras que ya existían. */
const COMPONENTES = [
	'Cifras',
	'Barras',
	'Comprueba',
	'Pasos',
	'Mando',
	'CalculadoraAccDist',
	'CalculadoraRecompra',
	'BacktestTable',
	'TerTable'
];

/** Los que abren una parada de tabulación dentro del cuerpo de la lección. */
const INTERACTIVOS = ['Comprueba', 'Mando', 'CalculadoraAccDist', 'CalculadoraRecompra'];

function ficheroDe(curso: string, slug: string): string {
	const dir = join(RAIZ, curso);
	const nombre = readdirSync(dir).find(
		(f) => f.endsWith('.md') && f.replace(/\.md$/, '').replace(/^\d+-/, '') === slug
	);
	if (!nombre) throw new Error(`No encuentro el markdown de ${curso}/${slug}`);
	return join(dir, nombre);
}

function cuerpoDe(texto: string): string {
	// Fuera el frontmatter y el bloque de imports: ninguno de los dos se lee.
	return texto
		.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
		.replace(/<script[\s\S]*?<\/script>/g, '')
		.trim();
}

type Trozo = { tipo: 'prosa' | 'objeto'; clase: string; texto: string };

/**
 * Trocea el cuerpo en prosa y objetos.
 *
 * Un «objeto» es cualquier cosa que rompe la columna de texto y le da al ojo dónde
 * apoyarse: un encabezado, un componente, una tabla, una viñeta o el envoltorio de un
 * bloque. Todo lo demás es prosa corrida, que es lo que se mide.
 */
function trocear(cuerpo: string): Trozo[] {
	const trozos: Trozo[] = [];
	const lineas = cuerpo.split(/\r?\n/);

	for (let i = 0; i < lineas.length; i++) {
		let l = lineas[i].trim();
		if (!l) continue;

		// ⚠️ Una etiqueta puede ocupar varias líneas — un `<Comprueba>` con cuatro opciones
		// ocupa quince. Sin juntarlas, de la segunda en adelante se contarían como prosa y
		// el componente parecería el muro de texto que viene a romper.
		if (l.startsWith('<')) {
			while (i + 1 < lineas.length && !l.includes('>')) {
				i++;
				l += ' ' + lineas[i].trim();
			}
		}

		if (l.startsWith('##')) {
			trozos.push({ tipo: 'objeto', clase: 'h2', texto: l });
			continue;
		}
		if (l.startsWith('|')) {
			trozos.push({ tipo: 'objeto', clase: 'tabla', texto: l });
			continue;
		}
		if (/^[-*]\s/.test(l)) {
			trozos.push({ tipo: 'objeto', clase: 'lista', texto: l });
			continue;
		}
		// La cita. La plantilla la estiliza con barra azul desde el primer día y no la
		// usaba ninguna de las 34 lecciones: sirve para el texto que no es del autor
		// —un ejemplo, una definición legal— y rompe la columna igual que un bloque.
		if (l.startsWith('>')) {
			trozos.push({ tipo: 'objeto', clase: 'cita', texto: l });
			continue;
		}
		if (l.startsWith('<')) {
			const componente = COMPONENTES.find((c) => l.startsWith(`<${c}`));
			trozos.push({
				tipo: 'objeto',
				clase: componente ?? (l.includes('class="bloque') ? 'bloque' : 'html'),
				texto: l
			});
			continue;
		}
		trozos.push({ tipo: 'prosa', clase: 'prosa', texto: l });
	}
	return trozos;
}

function palabras(texto: string): number {
	return texto.split(/\s+/).filter(Boolean).length;
}

/** Las tiradas de prosa seguida, en palabras. Es lo que mide el muro. */
function tiradas(trozos: Trozo[]): number[] {
	const salida: number[] = [];
	let actual = 0;
	for (const t of trozos) {
		if (t.tipo === 'prosa') actual += palabras(t.texto);
		else if (actual > 0) {
			salida.push(actual);
			actual = 0;
		}
	}
	if (actual > 0) salida.push(actual);
	return salida;
}

/**
 * Las palabras que el lector lee de verdad: la prosa, más el texto que viaja dentro de
 * las props de un componente (la pregunta de una comprobación, el porqué de cada opción,
 * el detalle de un paso). Contar solo la prosa haría que trocear pareciese acortar.
 */
function palabrasLegibles(cuerpo: string): number {
	// ⚠️ Las dos comillas, y no es un detalle: un atributo se escribe `pregunta="…"` pero
	// el texto que viaja dentro de un objeto JS se escribe `porque: '…'`. Contando solo las
	// dobles, el porqué de cada opción —que es la mitad de lo que enseña una
	// comprobación— no existía para el medidor, y una lección llena de contenido salía
	// como si estuviera vacía.
	const enProps = [...cuerpo.matchAll(/"([^"]{12,})"|'([^']{12,})'/g)]
		.map((m) => m[1] ?? m[2])
		.join(' ');
	const sinEtiquetas = cuerpo.replace(/<[^>]*>/g, ' ').replace(/\{[^}]*\}/g, ' ');
	return palabras(sinEtiquetas) + palabras(enProps);
}

const cursos = getCursos();
const todas = cursos.flatMap((c) =>
	getLecciones(c.slug).map((l) => ({
		id: `${c.slug}/${l.slug}`,
		curso: c.slug,
		leccion: l,
		texto: readFileSync(ficheroDe(c.slug, l.slug), 'utf8')
	}))
);

const migradas = todas.filter((x) => !PENDIENTES.has(x.id));

describe('formato de las lecciones', () => {
	it('hay lecciones que comprobar', () => {
		// Si el glob dejara de encontrar los .md, todo lo de abajo pasaría por vacío —
		// que es exactamente la forma de fallo que este repo ya ha tenido dos veces.
		expect(todas.length).toBeGreaterThan(30);
	});

	it('⚠️ cada PENDIENTE es una lección real', () => {
		// Una entrada obsoleta exime a un fichero que ya no existe y, peor, deja de eximir
		// al que sí existe con otro nombre — la lista pasaría a mentir en silencio.
		const ids = new Set(todas.map((x) => x.id));
		for (const p of PENDIENTES) {
			expect(ids.has(p), `${p} está en PENDIENTES y no existe`).toBe(true);
		}
	});

	it('⚠️ PENDIENTES está vacía', () => {
		// El andamio del rediseño. Mientras quede una entrada, esa lección no está
		// comprobada por nada de lo de abajo. No se puede mergear así.
		expect([...PENDIENTES]).toEqual([]);
	});

	describe.each(migradas.map((x) => [x.id, x] as const))('%s', (_id, x) => {
		const cuerpo = cuerpoDe(x.texto);
		const trozos = trocear(cuerpo);
		const componentes = trozos.filter((t) => COMPONENTES.includes(t.clase));

		it('R1 · abre con la pregunta que responde, en 30 palabras o menos', () => {
			const primero = trozos.find((t) => t.tipo === 'prosa');
			expect(primero, 'no hay párrafo de entrada').toBeDefined();
			expect(palabras(primero!.texto)).toBeLessThanOrEqual(30);
			expect(primero!.texto.trim().endsWith('?'), `abre con: «${primero!.texto}»`).toBe(true);
		});

		it('R2 · ninguna tirada de prosa pasa de 150 palabras', () => {
			const larga = tiradas(trozos).filter((n) => n > 150);
			expect(larga, `tiradas de ${larga.join(', ')} palabras`).toEqual([]);
		});

		it('R3 · hay al menos un tramo seguido de 100 palabras', () => {
			// El suelo. Un objeto visual puede ilustrar una premisa o enseñar la conclusión,
			// pero no puede sentarse en medio de un «luego»: los conectores viven en la
			// prosa, y sin un tramo largo el lector se lleva hechos sueltos y ni una
			// deducción.
			expect(Math.max(0, ...tiradas(trozos))).toBeGreaterThanOrEqual(100);
		});

		it('R4 · hay algo que mirar en las primeras 120 palabras', () => {
			let contadas = 0;
			for (const t of trozos) {
				if (t.tipo === 'prosa') contadas += palabras(t.texto);
				// Un h2 no cuenta: es texto. Cuenta lo que se mira.
				else if (COMPONENTES.includes(t.clase) || t.clase === 'tabla') break;
			}
			expect(contadas).toBeLessThanOrEqual(120);
		});

		it('R5 · entre dos y cuatro componentes, sin repetir salvo Cifras', () => {
			expect(componentes.length).toBeGreaterThanOrEqual(2);
			expect(componentes.length).toBeLessThanOrEqual(4);

			const repetidos = componentes
				.map((c) => c.clase)
				.filter((c) => c !== 'Cifras')
				.filter((c, i, todos) => todos.indexOf(c) !== i);
			expect(repetidos, `repetidos: ${repetidos.join(', ')}`).toEqual([]);
		});

		it('R6 · exactamente una comprobación, y antes del 70 % del cuerpo', () => {
			const cuantas = componentes.filter((c) => c.clase === 'Comprueba').length;
			expect(cuantas).toBe(1);

			// Al final es un examen y se salta; antes de la explicación es un compromiso.
			const posicion = cuerpo.indexOf('<Comprueba');
			expect(posicion / cuerpo.length).toBeLessThan(0.7);
		});

		it('R7 · las cifras del repo que cita están vigentes', () => {
			for (const clave of x.leccion.datos ?? []) {
				const valor = CIFRAS_VIGILADAS[clave];
				expect(valor, `${clave} no está en CIFRAS_VIGILADAS`).toBeDefined();
				expect(x.texto.includes(valor), `cita ${clave} y ya no dice ${valor}`).toBe(true);
			}
		});

		it('R8 · presupuesto de foco: como mucho dos elementos interactivos', () => {
			// El spec E2E tabula 60 veces desde el principio de la lección y tiene que
			// alcanzar el CTA del ejercicio. Cada componente interactivo es una parada;
			// un `<button>` suelto en el markdown sería otra.
			const cuantos = componentes.filter((c) => INTERACTIVOS.includes(c.clase)).length;
			expect(cuantos).toBeLessThanOrEqual(2);
			expect(cuerpo).not.toMatch(/<button/);
		});

		it('R9 · declara su arquetipo', () => {
			// No es documentación: decide el orden de los tiempos, y es lo que permite
			// comprobar que dos lecciones seguidas no se leen igual.
			expect(x.leccion.arquetipo, 'sin arquetipo en el frontmatter').toBeTruthy();
		});

		/**
		 * ⚠️ **R11 existía como defecto, no como regla: 19 de las 34 lecciones prometían la
		 * cartera del lector y llevaban a la portada.** «Ver mi desviación actual», «Ver mi
		 * FIFO real», «Calcular mi traspaso»… todas con `href: "/"`, y la portada no puede
		 * enseñar «mi» nada. Es el mismo defecto que el botón del índice de herramientas que
		 * decía «ver la calculadora de rebalanceo» y llevaba a la raíz.
		 *
		 * No lo miraba nada: `accion` no aparecía en este fichero. Y no da ningún error —el
		 * enlace funciona, solo lleva a otro sitio del que promete—, que es exactamente la
		 * clase de defecto por la que existe esta suite.
		 *
		 * La regla es la posesión, no una lista de rutas: si el botón dice «mi» o «mis»,
		 * habla de la cartera de quien lee, y eso solo existe en el dashboard. Las dos
		 * lecciones que prometen la **cartera de ejemplo** se quedan en la portada a
		 * propósito, porque el botón que la arranca vive ahí.
		 */
		it('R11 · si el botón promete «mi cartera», no lleva a la portada', () => {
			const { cta, href } = x.leccion.accion;
			const posesivo = /\bmis?\b/i.test(cta);

			if (posesivo) {
				expect(href, `«${cta}» promete la cartera del lector y lleva a ${href}`).not.toBe('/');
			}
		});

		it('R10 · sigue midiendo entre 650 y 1.050 palabras', () => {
			// Trocear no es alargar: el tiempo declarado en `minutos` tiene que seguir siendo
			// honesto.
			//
			// ⚠️ La banda son los valores **medidos** sobre el curso piloto (672 a 1.165)
			// con un poco de holgura, mismo criterio que los suelos de cobertura: solo
			// puede apretarse. Y es más alta que la del formato viejo (600-900) por una
			// razón que conviene no perder: **el porqué de cada opción de una comprobación
			// es contenido nuevo**, unas 150 palabras por lección que antes no existían en
			// ninguna parte. La prosa corrida, que es lo que hacía el muro, bajó de 450-700
			// a 371-608 en las mismas siete lecciones.
			const n = palabrasLegibles(cuerpo);
			expect(n, `${n} palabras`).toBeGreaterThanOrEqual(650);
			expect(n, `${n} palabras`).toBeLessThanOrEqual(1050);
		});
	});

	describe('variedad entre lecciones', () => {
		it.each(cursos.map((c) => [c.slug] as const))(
			'%s · dos lecciones seguidas no comparten arquetipo',
			(slug) => {
				const lista = getLecciones(slug).filter((l) => !PENDIENTES.has(`${slug}/${l.slug}`));
				for (let i = 1; i < lista.length; i++) {
					expect(
						lista[i].arquetipo,
						`${lista[i].slug} repite el arquetipo de ${lista[i - 1].slug}`
					).not.toBe(lista[i - 1].arquetipo);
				}
			}
		);
	});
});
