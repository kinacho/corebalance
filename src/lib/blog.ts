import type { ComponentType } from 'svelte';

export interface PostMetadata {
	title: string;
	description: string;
	publishDate: string;
	updatedDate: string;
	author: string;
	tags: string[];
	lang: 'es' | 'en';
	canonical: string;
	ogImage: string;
	slugs: { es: string; en: string };
}

export interface Post extends PostMetadata {
	slug: string;
	content: ComponentType;
}

// Carga estática de todos los archivos markdown en tiempo de compilación
const modules = import.meta.glob<{
	metadata: PostMetadata;
	default: ComponentType;
}>('/src/content/blog/**/*.md', { eager: true });

// Convertimos los módulos a una lista tipada de posts
const postsList: Post[] = Object.entries(modules).map(([path, module]) => {
	const parts = path.split('/');
	const lang = parts[parts.length - 2] as 'es' | 'en';
	const slug = parts[parts.length - 1].replace('.md', '');

	return {
		...module.metadata,
		slug,
		lang,
		content: module.default
	};
});

/**
 * Obtiene todos los posts ordenados por fecha de publicación (más recientes primero)
 * @param lang Filtrar por idioma ('es' o 'en')
 */
export function getPosts(lang: 'es' | 'en'): Post[] {
	return postsList
		.filter((post) => post.lang === lang)
		.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
}

/**
 * Obtiene un post específico por su slug e idioma.
 * Si el post no existe en ese idioma, intenta buscar su equivalente mediante el campo 'slugs'.
 * @param slug El identificador del post
 * @param lang El idioma del post
 */
export function getPost(slug: string, lang: 'es' | 'en'): Post | undefined {
	// 1. Buscar directamente por slug e idioma
	let post = postsList.find((p) => p.slug === slug && p.lang === lang);
	if (post) return post;

	// 2. Si no, buscar el post original en el otro idioma y luego buscar su equivalente
	const otherLang = lang === 'es' ? 'en' : 'es';
	const originalPost = postsList.find((p) => p.slug === slug && p.lang === otherLang);

	if (originalPost && originalPost.slugs) {
		const targetSlug = originalPost.slugs[lang];
		return postsList.find((p) => p.slug === targetSlug && p.lang === lang);
	}

	return undefined;
}
