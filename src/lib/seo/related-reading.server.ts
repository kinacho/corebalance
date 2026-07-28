import { getPosts } from '$lib/blog';
import { stripLocale, localeFromPath } from '$lib/i18n/routing';
import { RELATED_READING, type ReadingItem } from './related-reading';
import type { ServerLoad } from '@sveltejs/kit';

/**
 * `load` compartido por las cinco páginas con lectura relacionada.
 *
 * Es un load **de servidor** a propósito: `$lib/blog` importa los 34 markdown
 * compilados con un glob eager, y en un load universal eso acabaría en el bundle
 * del cliente de estas páginas. Al ser de servidor, el glob se resuelve en build y
 * al navegador sólo viaja el JSON con los tres títulos.
 *
 * Los títulos salen del frontmatter real, así que no pueden desincronizarse de los
 * artículos.
 */
export const load: ServerLoad = async ({ url }) => {
	const route = stripLocale(url.pathname);
	const lang = localeFromPath(url.pathname);

	const esSlugs = RELATED_READING[route] ?? [];
	if (esSlugs.length === 0) return { relatedReading: [] as ReadingItem[] };

	const esPosts = getPosts('es');
	const targetPosts = getPosts(lang);

	const relatedReading: ReadingItem[] = [];

	for (const esSlug of esSlugs) {
		// El slug guardado es el español; el del idioma pedido sale del frontmatter.
		const esPost = esPosts.find((p) => p.slug === esSlug);
		const slug = lang === 'es' ? esSlug : esPost?.slugs?.en;
		if (!slug) continue;

		const post = targetPosts.find((p) => p.slug === slug);
		if (!post) continue;

		relatedReading.push({
			slug: post.slug,
			title: post.title,
			description: post.description,
			readingMinutes: post.readingMinutes
		});
	}

	return { relatedReading };
};
