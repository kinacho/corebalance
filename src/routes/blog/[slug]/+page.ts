import { getPosts } from '$lib/blog';
import { error } from '@sveltejs/kit';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

/**
 * Genera todas las entradas estáticas del blog (ES + EN).
 * Cada slug es único por idioma, por lo que se prerenderiza
 * uno HTML por slug → Googlebot indexa HTML puro sin esperar JS.
 */
export const entries: EntryGenerator = () => {
	const esPosts = getPosts('es');
	const enPosts = getPosts('en');
	return [...esPosts, ...enPosts].map((p) => ({ slug: p.slug }));
};

export const load: PageLoad = async ({ params }) => {
	// Buscamos el post por slug directamente (slug es único por idioma).
	// Evitamos el fallback cross-language para que cada URL sirva
	// contenido consistente en build time y en runtime.
	const allPosts = [...getPosts('es'), ...getPosts('en')];
	const post = allPosts.find((p) => p.slug === params.slug);

	if (!post) {
		error(404, 'Post not found');
	}

	return { post };
};
