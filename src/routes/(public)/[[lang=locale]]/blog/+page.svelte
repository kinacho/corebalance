<script lang="ts">
	import BlogList from '$lib/components/blog/BlogList.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { page } from '$app/stores';
	import { absoluteUrl, localizePath, SITE_URL } from '$lib/i18n/routing';
	import { AUTHOR } from '$lib/seo/author';
	import { pageOgImage } from '$lib/seo/og';
	import type { Post, Tool } from '$lib/blog';
	import type { Locales } from '$lib/i18n/i18n-types';

	interface Props {
		data: { posts: Post[]; lang: Locales; tools: Tool[] };
	}

	let { data }: Props = $props();

	const isEs = $derived(data.lang === 'es');

	const metaTitle = $derived(
		isEs
			? 'Blog de Inversión Indexada y Rebalanceo | CoreBalance'
			: 'Index Investing & Rebalancing Blog | CoreBalance'
	);
	const metaDesc = $derived(
		isEs
			? 'Artículos, guías y tutoriales sobre inversión pasiva, fondos indexados, ETFs y rebalanceo de carteras para optimizar tus finanzas.'
			: 'Articles, guides, and tutorials on passive investing, index funds, ETFs, and portfolio rebalancing to optimize your finances.'
	);

	/** El feed vive en la raíz de cada idioma: /rss.xml y /en/rss.xml. */
	const rssPath = $derived(localizePath('/', data.lang).replace(/\/$/, '') + '/rss.xml');

	const schema = $derived({
		'@context': 'https://schema.org',
		'@type': 'Blog',
		'@id': `${absoluteUrl($page.url.pathname)}#blog`,
		name: metaTitle,
		description: metaDesc,
		url: absoluteUrl($page.url.pathname),
		inLanguage: data.lang,
		publisher: { '@id': `${SITE_URL}/#org` },
		author: { '@id': `${SITE_URL}${AUTHOR.path}#person` },
		blogPost: data.posts.map((post) => ({
			'@type': 'BlogPosting',
			headline: post.title,
			description: post.description,
			url: `${SITE_URL}/blog/${post.slug}`,
			datePublished: post.publishDate,
			dateModified: post.updatedDate || post.publishDate,
			inLanguage: post.lang
		}))
	});
</script>

<SeoHead
	title={metaTitle}
	description={metaDesc}
	path={$page.url.pathname}
	lang={data.lang}
	image={pageOgImage('blog', data.lang)}
	jsonLd={schema}
/>

<svelte:head>
	<link
		rel="alternate"
		type="application/rss+xml"
		title={isEs ? 'Blog de CoreBalance' : 'CoreBalance Blog'}
		href={rssPath}
	/>
</svelte:head>

<BlogList posts={data.posts} lang={data.lang} tools={data.tools} />
