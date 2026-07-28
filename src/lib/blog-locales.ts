import type { Locales } from '$lib/i18n/i18n-types';

/**
 * Mapa slug → idioma de los posts del blog.
 *
 * Usa el glob perezoso a propósito: sólo necesitamos las rutas de los ficheros,
 * no su contenido, así que esto no arrastra los 34 markdown compilados al bundle
 * del servidor (importante porque lo consume `hooks.server.ts`, que corre en
 * cada petición).
 */
const paths = import.meta.glob('/src/content/blog/**/*.md');

const langBySlug = new Map<string, Locales>(
	Object.keys(paths).map((path) => {
		const parts = path.split('/');
		const lang = parts[parts.length - 2] as Locales;
		const slug = parts[parts.length - 1].replace('.md', '');
		return [slug, lang];
	})
);

/** Idioma en el que está escrito un post, o undefined si el slug no existe. */
export function postLocale(slug: string): Locales | undefined {
	return langBySlug.get(slug);
}
