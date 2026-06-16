import { getPost, getPosts } from '$lib/blog';
import { error } from '@sveltejs/kit';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

export const load: PageLoad = ({ params }) => {
	const post = getPost(params.slug, 'es');
	if (!post) {
		error(404, 'Post not found');
	}
	return { post };
};

export const entries: EntryGenerator = () => {
	const posts = getPosts('es');
	return posts.map((post) => ({ slug: post.slug }));
};
