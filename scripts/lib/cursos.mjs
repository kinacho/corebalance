/**
 * Los cursos y sus lecciones, leídos desde Node.
 *
 * ⚠️ **`src/lib/cursos.ts` no se puede importar desde un script `.mjs`**, y por tres
 * motivos independientes: es TypeScript, usa `import.meta.glob` (una transformación de
 * Vite que no existe en Node) y ese glob es `eager` sobre `.md`, así que necesita el
 * pipeline de mdsvex para producir el componente. De ahí esta lectura por expresión
 * regular.
 *
 * Los títulos de los cursos viven en `CURSOS` dentro de `src/lib/cursos.ts` y se leen con
 * una expresión regular **comprobando que salen tantos como directorios hay**: si alguien
 * cambia la forma de ese array, esto falla en el `prebuild` en vez de emitir un índice
 * incompleto, que es la clase de error que nadie ve.
 *
 * ⚠️ **Estaba dentro de `generate-llms.mjs` y salió aquí al necesitarlo también
 * `generate-og.mjs`** para las cards sociales de los cursos. Vive en su propio módulo y no
 * como export de `generate-llms.mjs` porque en el `prebuild` el de OG corre **antes** que
 * el de llms (`node generate-icons && node generate-og && node generate-llms`), así que
 * depender de él sería depender del que va después.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFrontmatter } from './frontmatter.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CURSOS_DIR = join(ROOT, 'src', 'content', 'cursos');
const CURSOS_TS = join(ROOT, 'src', 'lib', 'cursos.ts');

/**
 * @typedef {{slug: string, titulo: string, descripcion: string, orden: number}} Leccion
 * @typedef {{slug: string, titulo: string, lecciones: Leccion[]}} Curso
 */

/**
 * Los cursos declarados en `CURSOS`, cada uno con sus lecciones ordenadas.
 *
 * @param {string} [etiqueta] Prefijo de los mensajes de error, para que el fallo diga qué
 *   script lo encontró (`llms` u `og`).
 * @returns {Promise<Curso[]>} Vacío si no existe el directorio de contenido.
 */
export async function collectCursos(etiqueta = 'cursos') {
	if (!existsSync(CURSOS_DIR)) return [];

	const fuente = await readFile(CURSOS_TS, 'utf8');
	const declarados = [...fuente.matchAll(/slug:\s*'([^']+)',\s*\n\s*titulo:\s*'([^']+)'/g)].map(
		(m) => ({ slug: m[1], titulo: m[2] })
	);

	const dirs = (await readdir(CURSOS_DIR, { withFileTypes: true }))
		.filter((d) => d.isDirectory())
		.map((d) => d.name);

	if (declarados.length !== dirs.length) {
		throw new Error(
			`[${etiqueta}] Leí ${declarados.length} cursos de cursos.ts y hay ${dirs.length} directorios. ` +
				'Si ha cambiado la forma de CURSOS, actualiza la expresión regular de collectCursos().'
		);
	}

	const cursos = [];
	for (const curso of declarados) {
		const dir = join(CURSOS_DIR, curso.slug);
		if (!existsSync(dir)) {
			throw new Error(`[${etiqueta}] El curso ${curso.slug} no tiene directorio`);
		}

		const lecciones = [];
		for (const file of await readdir(dir)) {
			if (!file.endsWith('.md')) continue;
			const fm = readFrontmatter(await readFile(join(dir, file), 'utf8'));
			if (!fm.titulo) continue;
			lecciones.push({
				slug: file.replace(/\.md$/, '').replace(/^\d+-/, ''),
				titulo: fm.titulo,
				descripcion: fm.descripcion ?? '',
				orden: Number(fm.orden ?? 0)
			});
		}
		lecciones.sort((a, b) => a.orden - b.orden);
		cursos.push({ ...curso, lecciones });
	}
	return cursos;
}
