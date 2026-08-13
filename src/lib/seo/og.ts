import type { Locales } from '$lib/i18n/i18n-types';

/**
 * Claves de las cards sociales de las páginas fijas.
 * Deben coincidir con las de `PAGES` en `scripts/generate-og.mjs`.
 */
export type OgPageKey =
	| 'landing'
	| 'blog'
	| 'herramientas'
	| 'comparativas'
	| 'ter'
	| 'checklist'
	| 'crisis'
	| 'precio-medio'
	| 'autor'
	| 'vs-excel'
	| 'vs-indexa-capital'
	| 'vs-portfolio-performance'
	| 'vs-justetf'
	| 'vs-ghostfolio'
	| 'cursos';

/**
 * Imagen Open Graph de una página fija, en el idioma que se está sirviendo.
 *
 * Antes todas compartían una imagen en español (y en varios casos apuntaban a un
 * fichero inexistente), así que al compartir la versión inglesa la card salía en
 * el idioma equivocado.
 */
export function pageOgImage(key: OgPageKey, lang: Locales): string {
	return `/og/${key}-${lang}.png`;
}

/**
 * Card social de un curso. La comparten el curso y **todas sus lecciones**: lo que se
 * comparte suele ser una lección suelta, y «Curso 2 de 5 · El 80 % de tu resultado se
 * decide aquí» ya dice de qué va. Una card por lección serían 34 PNG y ~4,4 MB en
 * `static/` para ganar el título exacto.
 *
 * ⚠️ **No es una `OgPageKey` y no puede serlo**, por dos motivos que se refuerzan: el slug
 * del curso solo se conoce en tiempo de ejecución (viene del parámetro de la ruta), y este
 * módulo **no puede importar `$lib/cursos`** para enumerarlos — ese módulo tiene un
 * `import.meta.glob` *eager* sobre los 34 markdown, y `og.ts` lo importan la portada, el
 * blog, herramientas y las comparativas, que arrastrarían los cursos enteros a su bundle.
 *
 * Quien cierra el círculo es `og.test.ts`, que comprueba que cada directorio real de
 * `src/content/cursos/` tiene su entrada en `PAGES` de `scripts/generate-og.mjs`.
 *
 * Solo en español: los cursos no son bilingües.
 */
export function cursoOgImage(cursoSlug: string): string {
	return `/og/curso-${cursoSlug}-es.png`;
}
