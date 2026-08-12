import { describe, it, expect } from 'vitest';
import { getCursos, getCurso, getLecciones, getLeccion, vecinas, PROMESA_GRATIS } from './cursos';

/**
 * Lo que se prueba aquí es el **orden**, porque es lo que se rompe en silencio.
 *
 * ⚠️ La lista interna se ordena por `orden` sobre **todas** las lecciones de todos los
 * cursos, y luego se filtra por curso. Hoy funciona porque `filter` conserva el orden
 * relativo, pero con dos cursos las lecciones 1 de ambos quedan contiguas en la lista
 * global: si alguien cambia ese `sort` por otro criterio, o filtra antes de ordenar mal,
 * un curso empieza por la lección 4 y **nada falla** — se lee como un curso raro, no como
 * un error. De ahí este fichero.
 */
describe('cursos', () => {
	const cursos = getCursos();

	it('hay cursos y todos tienen lecciones', () => {
		expect(cursos.length).toBeGreaterThan(0);
		for (const c of cursos) {
			expect(getLecciones(c.slug).length, `${c.slug} no tiene lecciones`).toBeGreaterThan(0);
		}
	});

	it('⚠️ cada curso empieza en 1 y no se salta ni repite ningún número', () => {
		for (const c of cursos) {
			const ordenes = getLecciones(c.slug).map((l) => l.orden);
			expect(ordenes, `${c.slug}`).toEqual(ordenes.map((_, i) => i + 1));
		}
	});

	it('⚠️ ningún curso arrastra lecciones de otro', () => {
		// El filtro por curso sale del nombre del directorio; un fichero mal colocado
		// aparecería en el curso equivocado sin que nada lo denuncie.
		for (const c of cursos) {
			for (const l of getLecciones(c.slug)) {
				expect(l.curso, `${l.slug} está en el curso equivocado`).toBe(c.slug);
			}
		}
	});

	it('las lecciones declaran todo lo que la plantilla pinta', () => {
		for (const c of cursos) {
			for (const l of getLecciones(c.slug)) {
				const donde = `${c.slug}/${l.slug}`;
				expect(l.titulo, donde).toBeTruthy();
				expect(l.descripcion, donde).toBeTruthy();
				expect(l.gancho, donde).toBeTruthy();
				expect(l.minutos, donde).toBeGreaterThan(0);
				// El ejercicio es lo que separa esto de un artículo: sin él, la lección no
				// deja nada hecho en la app y el formato pierde su razón de ser.
				expect(l.accion?.texto, donde).toBeTruthy();
				expect(l.accion?.cta, donde).toBeTruthy();
				expect(l.accion?.href, donde).toMatch(/^\//);
			}
		}
	});

	it('los enlaces internos de lecturas y acciones son rutas del sitio', () => {
		// `seo:audit` ya comprueba los enlaces del HTML construido; esto lo caza antes,
		// sin necesidad de un build.
		for (const c of cursos) {
			for (const l of getLecciones(c.slug)) {
				for (const lectura of l.lecturas ?? []) {
					expect(lectura.href, `${l.slug} → ${lectura.texto}`).toMatch(/^\/(blog|herramientas|cursos)?/);
				}
			}
		}
	});

	describe('vecinas', () => {
		const c = cursos[0];
		const lista = getLecciones(c.slug);

		it('la primera no tiene anterior y la última no tiene siguiente', () => {
			expect(vecinas(c.slug, lista[0].slug).anterior).toBeNull();
			expect(vecinas(c.slug, lista[lista.length - 1].slug).siguiente).toBeNull();
		});

		it('encadena en el orden del curso, no del nombre de fichero', () => {
			for (let i = 0; i < lista.length; i++) {
				const v = vecinas(c.slug, lista[i].slug);
				expect(v.indice).toBe(i);
				expect(v.total).toBe(lista.length);
				if (i > 0) expect(v.anterior?.orden).toBe(lista[i].orden - 1);
				if (i < lista.length - 1) expect(v.siguiente?.orden).toBe(lista[i].orden + 1);
			}
		});

		it('⚠️ nunca salta al curso de al lado', () => {
			// El error que este fichero existe para cazar: la última lección de un curso
			// enlazando con la primera del siguiente porque la lista global las junta.
			for (const curso of cursos) {
				const suyas = getLecciones(curso.slug).map((l) => l.slug);
				for (const l of getLecciones(curso.slug)) {
					const v = vecinas(curso.slug, l.slug);
					if (v.anterior) expect(suyas).toContain(v.anterior.slug);
					if (v.siguiente) expect(suyas).toContain(v.siguiente.slug);
				}
			}
		});
	});

	it('getCurso y getLeccion devuelven undefined en vez de reventar', () => {
		expect(getCurso('no-existe')).toBeUndefined();
		expect(getLeccion(cursos[0].slug, 'no-existe')).toBeUndefined();
		expect(getLecciones('no-existe')).toEqual([]);
	});

	it('la promesa de gratuidad sigue siendo la que dice el módulo', () => {
		// Si algún día hay correo, curso de pago o afiliados, este test recuerda que
		// el bloque hay que quitarlo — no dejarlo mintiendo en tres plantillas.
		expect(PROMESA_GRATIS.puntos.length).toBeGreaterThan(0);
		expect(PROMESA_GRATIS.puntos.join(' ')).toMatch(/correo/);
		expect(PROMESA_GRATIS.puntos.join(' ')).toMatch(/afiliado/);
	});
});
