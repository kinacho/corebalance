import { getPosts } from '$lib/blog';
import type { PageLoad } from './$types';
import { get } from 'svelte/store';
import { locale } from '$lib/i18n/i18n-svelte';

export const prerender = false; // Desactivar prerender para que dependa del locale (cookie/localStorage)

export const load: PageLoad = async ({ parent }) => {
    // Esperamos a que el layout cargue el locale
    await parent();
    
    // Obtenemos el locale actual del store
    const currentLocale = get(locale);
	const posts = getPosts(currentLocale);
    
	return { posts, lang: currentLocale };
};
