import type { Locales } from '$lib/i18n/i18n-types';

/**
 * Claves de las cards sociales de las páginas fijas.
 * Deben coincidir con las de `PAGES` en `scripts/generate-og.mjs`.
 */
export type OgPageKey =
	| 'landing'
	| 'blog'
	| 'ter'
	| 'checklist'
	| 'crisis'
	| 'precio-medio'
	| 'autor'
	| 'vs-excel'
	| 'vs-indexa-capital'
	| 'vs-portfolio-performance'
	| 'vs-justetf'
	| 'vs-ghostfolio';

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
