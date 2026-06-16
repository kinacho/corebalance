import { getPost } from '$lib/blog';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { get } from 'svelte/store';
import { locale } from '$lib/i18n/i18n-svelte';

export const prerender = false;

export const load: PageLoad = async ({ params, parent, depends }) => {
    // Declaramos que este load depende del locale para que se re-ejecute al invalidar 'app:locale'
    depends('app:locale');
    
    // Esperamos a que el layout resuelva el locale
    await parent();
    const currentLocale = get(locale);
    
	let post = getPost(params.slug, currentLocale);
	
    // Fallback: si no existe en el idioma actual, buscamos en el otro antes de dar error
    if (!post) {
        const otherLocale = currentLocale === 'es' ? 'en' : 'es';
        post = getPost(params.slug, otherLocale);
        
        if (!post) {
            error(404, 'Post not found');
        }
    }
    
	return { post };
};
