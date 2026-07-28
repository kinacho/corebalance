import { getPosts, getRelatedPosts } from '$lib/blog';
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

	// Sólo los campos que pinta la tarjeta: el componente compilado del post
	// relacionado no hace falta aquí.
	const related = getRelatedPosts(post).map((p) => ({
		slug: p.slug,
		title: p.title,
		description: p.description,
		publishDate: p.publishDate,
		readingMinutes: p.readingMinutes
	}));

	/**
	 * Aquí cambiar de idioma no es cambiar un texto: es irse al artículo gemelo,
	 * que vive en otra URL con su slug traducido. Sin esto, el selector de idioma
	 * parecía no hacer nada en las páginas de post.
	 */
	const langAlternates = {
		es: post.slugs?.es ? `/blog/${post.slugs.es}` : null,
		en: post.slugs?.en ? `/blog/${post.slugs.en}` : null
	};

	// `locale` se expone para que el selector marque el idioma correcto y los
	// componentes puedan leerlo de `$page.data`. Quien lo *aplica* al store es el
	// layout raíz, con el valor que ya resolvió el hook a partir del slug.
	return { post, related, locale: post.lang, langAlternates };
};
