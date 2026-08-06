import { describe, it, expect } from 'vitest';
// @ts-expect-error — script en JS sin tipos, importado a propósito desde el test.
import { auditarDeriva, extraerReferencias } from './doc-drift.mjs';
import * as fs from 'fs';
import * as path from 'path';

/**
 * El comprobador de deriva, comprobado.
 *
 * Dos mitades, y las dos hacen falta:
 *
 *  1. Que `CLAUDE.md` esté limpio **hoy**. Es la comprobación que habría cazado
 *     `NO_TARGET_HUES` y `DARK_SURFACE`, dos constantes documentadas que nunca
 *     existieron y que sobrevivieron a una revisión de código a esfuerzo máximo.
 *  2. Que el comprobador **detecte** cuando hay algo que detectar, contra un
 *     documento roto a propósito. Sin esto, el día que la extracción de referencias
 *     deje de encontrar nada, el informe diría «0 huérfanas» con el mismo aspecto
 *     verde de siempre. Es literalmente el defecto que esta capa existe para
 *     perseguir, así que la herramienta no se exime de él.
 */

const FIXTURE = path.join(process.cwd(), 'scripts', '__fixtures__', 'doc-drift', 'roto.md');

/**
 * ⚠️ Los nombres inventados se componen por trozos, y hace falta.
 *
 * El comprobador busca los identificadores en **todo** el repo, ficheros de test
 * incluidos —tiene que ser así: `CLAUDE.md` cita cosas que solo existen en tests,
 * como `CLAVES_VALIDAS`—. Escribir aquí el nombre inventado tal cual hacía que el
 * comprobador lo encontrara *en esta misma aserción* y diera el fixture por limpio.
 * El test se invalidaba a sí mismo, en silencio y en verde.
 */
const CONSTANTE_INVENTADA = ['PALETA', 'FANTASMA'].join('_');
const FUNCION_INVENTADA = 'funcionQue' + 'NoExiste';

describe('doc-drift · CLAUDE.md', () => {
	it('no cita ningún identificador ni ruta que no exista en el repo', () => {
		const informe = auditarDeriva();
		expect(
			[...informe.identificadoresHuerfanos, ...informe.rutasHuerfanas],
			'CLAUDE.md cita algo que no existe: o se renombró, o nunca existió'
		).toEqual([]);
	});

	it('comprueba una cantidad de referencias que se parece a la realidad', () => {
		// Sin esto, un fallo en `extraerReferencias` que devolviera lista vacía daría
		// verde en el test de arriba. El umbral es holgado a propósito: lo que se vigila
		// es que siga extrayendo, no cuántas hay exactamente.
		const informe = auditarDeriva();
		expect(informe.total).toBeGreaterThan(80);
		expect(informe.ficherosLeidos).toBeGreaterThan(100);
	});
});

describe('doc-drift · el comprobador detecta lo que dice detectar', () => {
	const informe = () => auditarDeriva({ docPath: FIXTURE });

	it('el fixture roto existe', () => {
		expect(fs.existsSync(FIXTURE)).toBe(true);
	});

	it('caza la constante y la función inventadas', () => {
		expect(informe().identificadoresHuerfanos).toEqual(
			expect.arrayContaining([CONSTANTE_INVENTADA, FUNCION_INVENTADA])
		);
	});

	it('caza el fichero y el directorio inexistentes', () => {
		expect(informe().rutasHuerfanas).toEqual(
			expect.arrayContaining(['src/lib/modulo-inexistente.ts', 'src/lib/carpeta-que-no-existe/'])
		);
	});

	it('no se queja de lo que sí existe', () => {
		const { identificadoresHuerfanos, rutasHuerfanas } = informe();
		const todo = [...identificadoresHuerfanos, ...rutasHuerfanas];
		for (const valida of [
			'CHART_NEUTRAL',
			'calculateRebalance',
			'src/lib/constants.ts',
			'src/lib/rebalance.ts',
			'rebalance.test.ts',
			'importers/parsers.ts'
		]) {
			expect(todo, `«${valida}» existe y se ha marcado como huérfana`).not.toContain(valida);
		}
	});

	it('no confunde rutas de URL, banderas de CSS ni variables de entorno con ficheros', () => {
		// La primera versión daba 53 falsos positivos de 53 por esto exactamente, y un
		// comprobador así no se arregla: se silencia.
		const todo = [...informe().identificadoresHuerfanos, ...informe().rutasHuerfanas];
		for (const noEsRuta of ['/dashboard', '/en/', '--accent-inventado', 'VAR_UNO/VAR_DOS', '.html']) {
			expect(todo, `«${noEsRuta}» no es una ruta del repo y se ha comprobado como tal`).not.toContain(
				noEsRuta
			);
		}
	});

	it('separa identificadores de rutas al extraer', () => {
		const { identificadores, rutas } = extraerReferencias(
			'Ver `CHART_NEUTRAL`, `algo()` y `src/lib/x.ts` en `/dashboard`.'
		);
		expect(identificadores).toEqual(['CHART_NEUTRAL', 'algo']);
		expect(rutas).toEqual(['src/lib/x.ts', '/dashboard']);
	});
});
