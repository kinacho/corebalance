import { getPosts, getRelatedPosts } from '$lib/blog';
import { error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { loadLocaleAsync } from '$lib/i18n/i18n-util.async';
import { setLocale } from '$lib/i18n/i18n-svelte';
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

	// El idioma de un post lo manda el propio artículo, no la cookie ni la
	// preferencia guardada: un post en español es un post en español. Fijando el
	// locale aquí, la navbar, el footer y el resto de la interfaz salen en el
	// idioma del texto que se está leyendo, en vez de quedar a medias.
	await loadLocaleAsync(post.lang);
	setLocale(post.lang);

	// El `lang` del <html> lo pone el hook al servir la página, pero en una
	// navegación de cliente entre un post y su gemelo no se vuelve a renderizar
	// app.html. Sin esto, un lector de pantalla leería el artículo en inglés con
	// voz española.
	if (browser) document.documentElement.lang = post.lang;

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

	return { post, related, locale: post.lang, langAlternates };
};
