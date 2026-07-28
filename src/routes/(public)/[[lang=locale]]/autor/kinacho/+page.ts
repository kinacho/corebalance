import { getPosts } from '$lib/blog';
import { AUTHOR } from '$lib/seo/author';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { locale } = await parent();

	const posts = getPosts(locale)
		.filter((post) => post.author === AUTHOR.name)
		.map((post) => ({
			slug: post.slug,
			title: post.title,
			description: post.description,
			publishDate: post.publishDate,
			readingMinutes: post.readingMinutes
		}));

	return { posts, lang: locale };
};
