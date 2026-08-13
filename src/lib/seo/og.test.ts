import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pageOgImage, cursoOgImage, type OgPageKey } from './og';
import { PAGES, cursoPages } from '../../../scripts/lib/og-pages.mjs';
import { collectCursos } from '../../../scripts/lib/cursos.mjs';

/**
 * Que las claves de las cards sociales no se desincronicen de las imágenes que existen.
 *
 * ⚠️ **Este acoplamiento estaba declarado en un comentario y no lo comprobaba nada.**
 * `og.ts` dice «deben coincidir con las de `PAGES` en `scripts/generate-og.mjs`», y el
 * desajuste es silencioso en una de sus dos direcciones: una clave usada en una ruta sin
 * entrada en `PAGES` sí la caza `seo:audit` (la imagen no existiría y es `err`), pero una
 * entrada en `PAGES` que ninguna ruta usa **no la caza nadie** — son 260 KB huérfanos en
 * `static/` por cada una. Con las cards de los cursos generándose desde `cursos.ts`, hay
 * una tercera fuente que puede desincronizarse.
 *
 * Los PNG están versionados (`git ls-files static/og` los lista), así que comprobar que el
 * fichero existe funciona igual en CI sin haber corrido el `prebuild`.
 */
const STATIC_OG = join(process.cwd(), 'static', 'og');

/** Las claves del tipo `OgPageKey`, leídas del fuente porque un tipo no existe en runtime. */
function clavesDeclaradas(): string[] {
	const fuente = readFileSync(join(process.cwd(), 'src', 'lib', 'seo', 'og.ts'), 'utf8');
	const union = fuente.match(/export type OgPageKey =([\s\S]*?);/);
	if (!union) throw new Error('No encontré la unión OgPageKey en og.ts');
	return [...union[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe('claves de las cards sociales', () => {
	const declaradas = clavesDeclaradas();

	/**
	 * ⚠️ El control de que la lectura del tipo sigue encajando. Sin esto, un cambio de
	 * formato en `og.ts` dejaría la lista vacía y **todas** las comparaciones de abajo
	 * pasarían por comparar nada con nada — que es la forma exacta que tiene un test de
	 * dejar de detectar sin ponerse rojo.
	 */
	it('la lectura del tipo encuentra claves', () => {
		expect(declaradas.length).toBeGreaterThan(10);
		expect(declaradas).toContain('landing');
	});

	it('`OgPageKey` y `PAGES` declaran exactamente las mismas claves', () => {
		const enPages = PAGES.map((p: { key: string }) => p.key);
		expect([...declaradas].sort()).toEqual([...enPages].sort());
	});

	it('cada clave declarada tiene su PNG en todos los idiomas que dice tener', () => {
		const faltan: string[] = [];
		for (const page of PAGES as { key: string; langs?: string[] }[]) {
			for (const lang of page.langs ?? ['es', 'en']) {
				const ruta = pageOgImage(page.key as OgPageKey, lang as 'es' | 'en');
				if (!existsSync(join(STATIC_OG, ruta.replace('/og/', '')))) faltan.push(ruta);
			}
		}
		expect(faltan).toEqual([]);
	});

	/**
	 * El otro lado del `langs`: una página que solo existe en español no debe dejar un
	 * `-en.png` de ~130 KB que ninguna ruta pide. Antes del campo `langs` el bucle
	 * generaba los dos idiomas siempre.
	 */
	it('una página solo-española no genera la variante inglesa', () => {
		const soloEs = (PAGES as { key: string; langs?: string[] }[]).filter(
			(p) => p.langs?.length === 1 && p.langs[0] === 'es'
		);
		expect(soloEs.length).toBeGreaterThan(0);

		for (const page of soloEs) {
			expect(existsSync(join(STATIC_OG, `${page.key}-en.png`))).toBe(false);
		}
	});
});

describe('cards de los cursos', () => {
	it('cada curso real tiene su card, y `cursoOgImage` apunta a ella', async () => {
		const cursos = await collectCursos('test');
		expect(cursos.length).toBeGreaterThan(0);

		for (const curso of cursos) {
			const ruta = cursoOgImage(curso.slug);
			expect(existsSync(join(STATIC_OG, ruta.replace('/og/', '')))).toBe(true);
		}
	});

	/**
	 * Que el nombre que compone la app y el que escribe el generador sean el mismo. Son dos
	 * módulos distintos (`og.ts` en la app, `og-pages.mjs` en los scripts) y nada más los
	 * ataría: si uno cambiase el prefijo, la ruta seguiría siendo válida y apuntaría a un
	 * fichero que no existe.
	 */
	it('el nombre de fichero coincide entre la app y el generador', async () => {
		const cursos = await collectCursos('test');
		const generadas = cursoPages(cursos).map((p: { key: string }) => `/og/${p.key}-es.png`);
		const pedidas = cursos.map((c: { slug: string }) => cursoOgImage(c.slug));

		expect(pedidas).toEqual(generadas);
	});

	it('las lecciones heredan la card de su curso y no tienen una propia', async () => {
		const cursos = (await collectCursos('test')) as { lecciones: { slug: string }[] }[];
		const lecciones = cursos.flatMap((c) => c.lecciones);
		expect(lecciones.length).toBeGreaterThan(0);

		// Es una decisión, no un olvido: 34 PNG más serían ~4,4 MB para ganar el título
		// exacto de la lección. Si alguien añade cards por lección, este test le recuerda
		// que hay que decidirlo, no que se ha roto algo.
		for (const leccion of lecciones) {
			expect(existsSync(join(STATIC_OG, `leccion-${leccion.slug}-es.png`))).toBe(false);
		}
	});
});
