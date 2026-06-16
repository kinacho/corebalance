import { getPost, getPosts } from '$lib/blog';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { get } from 'svelte/store';
import { locale } from '$lib/i18n/i18n-svelte';

export const prerender = false;

export const load: PageLoad = async ({ params, parent }) => {
    await parent();
    const currentLocale = get(locale);
    
	const post = getPost(params.slug, currentLocale);
	if (!post) {
		error(404, 'Post not found');
	}
	return { post };
};
