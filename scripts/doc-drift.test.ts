import { describe, it, expect } from 'vitest';
// @ts-expect-error — script en JS sin tipos, importado a propósito desde el test.
import {
	auditarDeriva,
	auditarGlobs,
	documentosDelRepo,
	extraerReferencias,
	reglasDelRepo
} from './doc-drift.mjs';
import * as fs from 'fs';
import * as os from 'os';
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

/**
 * Las reglas de `.claude/rules/` se cargan **solo** al leer un fichero que case con su
 * `paths:`, y ahí vive la tercera parte de la prosa del repo desde el reparto.
 *
 * ⚠️ Una regla cuyo glob no casa con nada no da error en ninguna parte: simplemente no
 * se carga, y su contenido deja de existir para quien trabaje en esa zona. Es la misma
 * forma de fallo que `training_csv.test.ts` apuntando a un directorio borrado —verde,
 * silencioso e inútil— aplicada al documento en vez de a la suite.
 */
const DIR_REGLAS_ROTAS = path.join(process.cwd(), 'scripts', '__fixtures__', 'doc-drift', 'reglas');

describe('doc-drift · las reglas se cargarían de verdad', () => {
	it('todas las reglas del repo declaran `paths:` y todos casan con algo', () => {
		expect(
			auditarGlobs(),
			'una regla que no se carga nunca es prosa que desapareció sin que nada fallara'
		).toEqual([]);
	});

	it('audita la raíz **y** las reglas, no solo la raíz', () => {
		// Sin esto, repartir el documento habría dejado tres cuartas partes de la prosa
		// fuera del comprobador, que es como empezó el árbol `.ai/`.
		const documentos = documentosDelRepo();
		expect(documentos).toContain('CLAUDE.md');
		expect(documentos.filter((d: string) => d.startsWith('.claude/rules/')).length).toBeGreaterThan(4);
		expect(auditarDeriva().porDocumento.length).toBe(documentos.length);
	});

	it('caza un glob que no casa con nada, aunque otro del mismo fichero sí case', () => {
		const problemas = auditarGlobs([path.join(DIR_REGLAS_ROTAS, 'glob-muerto.md')]);
		expect(problemas).toHaveLength(1);
		expect(problemas[0].glob).toBe('src/lib/fichero-que-no-existe.ts');
	});

	it('caza una regla sin frontmatter, que se cargaría siempre', () => {
		const problemas = auditarGlobs([path.join(DIR_REGLAS_ROTAS, 'sin-frontmatter.md')]);
		expect(problemas).toHaveLength(1);
		expect(problemas[0].motivo).toMatch(/frontmatter/);
	});

	it('no se queja de una regla correcta', () => {
		expect(auditarGlobs([path.join(DIR_REGLAS_ROTAS, 'buena.md')])).toEqual([]);
	});

	/**
	 * ⚠️ El fallo que de verdad se llevó por delante el reparto, y que CI no puede ver.
	 *
	 * Con `core.autocrlf=true` —lo normal en Windows— `git checkout` convierte las reglas a
	 * CRLF, y entonces Claude Code no parsea su frontmatter: la regla no se carga y su prosa
	 * desaparece del contexto sin que nada falle. Medido en sesión limpia el 11-ago-2026, la
	 * misma regla con LF sí carga. CI corre en Ubuntu, donde no hay conversión, así que esto
	 * es verde en CI y roto solo en la máquina de quien trabaja.
	 *
	 * El fixture se escribe aquí en vez de versionarse porque un fichero CRLF dentro del repo
	 * es justo lo que `.gitattributes` está para impedir: se normalizaría y el test pasaría a
	 * comprobar el caso contrario del que dice comprobar.
	 */
	it('caza una regla con CRLF, que no se cargaría aunque su glob sea perfecto', () => {
		const temporal = path.join(os.tmpdir(), 'doc-drift-crlf.md');
		fs.writeFileSync(temporal, '---\r\npaths:\r\n  - "scripts/**/*.mjs"\r\n---\r\n\r\n# crlf\r\n');
		const problemas = auditarGlobs([temporal]);
		expect(problemas).toHaveLength(1);
		expect(problemas[0].motivo).toMatch(/CRLF/);
		fs.rmSync(temporal, { force: true });
	});

	it('las reglas del repo están en LF, no solo bien escritas', () => {
		// Control positivo del de arriba: sin esto, `.gitattributes` podría dejar de aplicarse
		// y solo se notaría al abrir una sesión y echar de menos la prosa.
		for (const regla of reglasDelRepo()) {
			expect(fs.readFileSync(regla, 'utf8'), `${regla} está en CRLF y no se cargará`).not.toContain(
				'\r\n'
			);
		}
	});
});
