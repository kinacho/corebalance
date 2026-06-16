import { getPost } from '$lib/blog';
import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { get } from 'svelte/store';
import { locale } from '$lib/i18n/i18n-svelte';

export const prerender = false;

export const load: PageLoad = async ({ params, parent }) => {
    // Esperamos a que el layout resuelva el locale
    await parent();
    const currentLocale = get(locale);
    
	let post = getPost(params.slug, currentLocale);
	
    // Fallback: si no existe en el idioma actual, buscamos en el otro antes de dar error
    if (!post) {
        const otherLocale = currentLocale === 'es' ? 'en' : 'es';
        post = getPost(params.slug, otherLocale);
        
        // Si no existe en ningún idioma, entonces sí es un 404
        if (!post) {
            error(404, 'Post not found');
        }
        
        // Si existe en el otro idioma, podríamos forzar el cambio de idioma 
        // o simplemente mostrar el post en ese idioma. Por ahora, mostramos 404
        // pero evitamos el "pete" si hay un desajuste temporal.
    }
    
	return { post };
};
