import { derived, type Readable } from 'svelte/store';
import { locale } from './i18n-svelte';
import { localeLink } from './routing';

/**
 * Enlaces internos conscientes del idioma: `$link('/blog')` devuelve `/blog` en
 * español y `/en/blog` en inglés.
 *
 * Deja intacto lo que no tiene variante de idioma en la URL (`/dashboard`, los
 * posts del blog, los enlaces externos), así que es seguro usarlo en cualquier
 * componente compartido entre la landing y la app.
 */
export const link: Readable<(href: string) => string> = derived(
	locale,
	($locale) => (href: string) => localeLink(href, $locale)
);
