import { getPosts } from '$lib/blog';
import type { PageLoad } from './$types';
import { get } from 'svelte/store';
import { locale } from '$lib/i18n/i18n-svelte';

export const prerender = false;

export const load: PageLoad = async ({ parent, depends }) => {
    depends('app:locale');
    
    // Esperamos a que el layout cargue el locale
    await parent();
    
    // Obtenemos el locale actual del store
    const currentLocale = get(locale);
	const posts = getPosts(currentLocale);
    
	return { posts, lang: currentLocale };
};
