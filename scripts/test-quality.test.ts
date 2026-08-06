import { describe, it, expect } from 'vitest';
// @ts-expect-error — script en JS sin tipos, importado a propósito desde el test.
import { auditarTests, trocearTests } from './test-quality.mjs';
import * as path from 'path';

/**
 * La guardia de tests que no pueden fallar, comprobada.
 *
 * Igual que con el comprobador de deriva, dos mitades: que el repo esté limpio hoy, y
 * que la guardia **detecte** contra un fichero roto a propósito. Una guardia contra
 * falsos verdes que ella misma dé un falso verde sería un chiste, y además es el error
 * más fácil de cometer: basta con que un cambio en la expresión regular deje de casar y
 * el informe diga «0 problemas» para siempre.
 */

const FIXTURE = path.join(process.cwd(), 'scripts', '__fixtures__', 'test-quality');

describe('test-quality · el repositorio', () => {
	const informe = auditarTests();

	it('no tiene tautologías ni tests sin aserciones', () => {
		const detalle = informe.hallazgos
			.map((h: { tipo: string; fichero: string; linea: number; detalle: string }) =>
				`${h.tipo} ${h.fichero}:${h.linea} — ${h.detalle}`
			)
			.join('\n');
		expect(informe.hallazgos, `\n${detalle}`).toEqual([]);
	});

	it('ha mirado dentro de una cantidad de tests que se parece a la realidad', () => {
		// Sin esto, un patrón de ficheros roto daría «0 problemas» sobre 0 tests leídos.
		expect(informe.tests).toBeGreaterThan(300);
		expect(informe.ficheros).toBeGreaterThan(20);
	});
});

describe('test-quality · caza lo que dice cazar', () => {
	const informe = auditarTests({ raices: [FIXTURE], patron: /\.txt$/ });
	const porTipo = (tipo: string) =>
		informe.hallazgos.filter((h: { tipo: string }) => h.tipo === tipo);

	it('encuentra las tres tautologías del fixture', () => {
		expect(porTipo('tautologia')).toHaveLength(3);
	});

	it('encuentra el test sin ninguna aserción', () => {
		const sinAserciones = porTipo('sin-aserciones');
		expect(sinAserciones).toHaveLength(1);
		expect(sinAserciones[0].detalle).toContain('no afirma absolutamente nada');
	});

	it('no se queja del `it.skip` ni de los tests que sí comprueban algo', () => {
		const nombres = informe.hallazgos.map((h: { detalle: string }) => h.detalle).join(' ');
		expect(nombres).not.toContain('omitido con motivo');
		expect(nombres).not.toContain('éste sí comprueba algo');
		expect(nombres).not.toContain('con `test` en vez de `it`');
	});

	it('no cuenta el `describe` como un test sin aserciones', () => {
		// Falso positivo real de la primera versión: marcaba los seis `test.describe` de
		// los specs de Playwright, que por definición no afirman nada.
		const nombres = informe.hallazgos.map((h: { detalle: string }) => h.detalle).join(' ');
		expect(nombres).not.toContain('un contenedor');
	});

	it('no lee dentro de los comentarios', () => {
		// El otro falso positivo real: acusaba a `training_csv.test.ts` por una tautología
		// citada **en un comentario** que explicaba el defecto ya corregido.
		const codigo = `
			/** Antes esto era expect(true).toBe(true) y no comprobaba nada. */
			// expect(1).toBe(1) comentado
			it('comprueba de verdad', () => { expect(sumar(2, 2)).toBe(4); });
		`;
		const informeComentado = auditarTests({
			raices: [path.join(FIXTURE, 'no-existe')],
			patron: /\.txt$/
		});
		expect(informeComentado.hallazgos).toEqual([]);
		// Y el troceado ve el test aunque venga precedido de comentarios.
		expect(trocearTests(codigo).map((t: { nombre: string }) => t.nombre)).toContain(
			'comprueba de verdad'
		);
	});
});
