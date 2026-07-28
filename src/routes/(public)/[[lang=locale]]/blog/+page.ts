import { getPosts, getTools } from '$lib/blog';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	// El idioma viene del prefijo de la URL (lo resuelve el layout del grupo),
	// no del store global: así cada índice se prerenderiza en su propio idioma.
	const { locale } = await parent();
	const posts = getPosts(locale);
	const tools = getTools();

	return { posts, lang: locale, tools };
};
