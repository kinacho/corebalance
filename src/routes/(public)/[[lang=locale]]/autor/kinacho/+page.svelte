<script lang="ts">
	import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { link } from '$lib/i18n/link';
	import { absoluteUrl, localizePath, SITE_URL } from '$lib/i18n/routing';
	import { AUTHOR, GITHUB_REPO } from '$lib/seo/author';
	import { pageOgImage } from '$lib/seo/og';
	import type { Locales } from '$lib/i18n/i18n-types';
	import type { RelatedPost } from '$lib/blog';

	interface Props {
		data: { posts: RelatedPost[]; lang: Locales };
	}

	let { data }: Props = $props();

	const lang = $derived(data.lang);
	const isEs = $derived(lang === 'es');

	const t = $derived(
		isEs
			? {
					eyebrow: 'Autor',
					title: AUTHOR.headline.es,
					postsTitle: 'Artículos publicados',
					postsSubtitle: (n: number) => `${n} artículos en español sobre inversión indexada`,
					github: 'Perfil de GitHub',
					project: 'Código de CoreBalance',
					disclaimerTitle: 'Aviso',
					disclaimer:
						'CoreBalance es una herramienta de cálculo. Ni la aplicación ni los artículos de este blog constituyen asesoramiento financiero ni una recomendación de compra o venta de ningún producto.',
					readTime: (min: number) => `${min} min de lectura`,
					topics: 'Sobre lo que escribo'
				}
			: {
					eyebrow: 'Author',
					title: AUTHOR.headline.en,
					postsTitle: 'Published articles',
					postsSubtitle: (n: number) => `${n} articles in English on index investing`,
					github: 'GitHub profile',
					project: 'CoreBalance source code',
					disclaimerTitle: 'Disclaimer',
					disclaimer:
						'CoreBalance is a calculation tool. Neither the app nor the articles on this blog are financial advice or a recommendation to buy or sell any product.',
					readTime: (min: number) => `${min} min read`,
					topics: 'What I write about'
				}
	);

	const metaTitle = $derived(
		isEs
			? `${AUTHOR.displayName} — autor en CoreBalance`
			: `${AUTHOR.displayName} — author at CoreBalance`
	);
	const metaDesc = $derived(AUTHOR.bio[lang][0]);

	const bio = $derived(AUTHOR.bio[lang]);

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	const schema = $derived({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'ProfilePage',
				'@id': `${absoluteUrl($page.url.pathname)}#profile`,
				url: absoluteUrl($page.url.pathname),
				inLanguage: lang,
				name: metaTitle,
				mainEntity: { '@id': `${SITE_URL}${AUTHOR.path}#person` }
			},
			{
				'@type': 'Person',
				'@id': `${SITE_URL}${AUTHOR.path}#person`,
				name: AUTHOR.name,
				alternateName: AUTHOR.displayName,
				url: absoluteUrl(localizePath(AUTHOR.path, lang)),
				jobTitle: AUTHOR.jobTitle[lang],
				description: bio.join(' '),
				knowsAbout: AUTHOR.knowsAbout,
				sameAs: [AUTHOR.github, GITHUB_REPO],
				worksFor: { '@id': `${SITE_URL}/#org` }
			}
		]
	});
</script>

<SeoHead
	title={metaTitle}
	description={metaDesc}
	path={$page.url.pathname}
	{lang}
	image={pageOgImage('autor', lang)}
	jsonLd={schema}
/>

<div class="author-page">
	<div class="background-mesh"></div>

	<LandingNavBar onStart={() => goto($link('/'))} />

	<main class="author-container">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href={$link('/')}>{isEs ? 'Inicio' : 'Home'}</a>
			<span class="separator">/</span>
			<a href={$link('/blog')}>Blog</a>
			<span class="separator">/</span>
			<span class="current" aria-current="page">{AUTHOR.displayName}</span>
		</nav>

		<header class="author-header">
			<span class="eyebrow">{t.eyebrow}</span>
			<h1>{t.title}</h1>
			<p class="job-title">{AUTHOR.jobTitle[lang]}</p>
			<div class="author-links">
				<a href={AUTHOR.github} target="_blank" rel="me noopener noreferrer">{t.github}</a>
				<a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">{t.project}</a>
			</div>
		</header>

		<section class="bio">
			{#each bio as paragraph}
				<p>{paragraph}</p>
			{/each}
		</section>

		<section class="topics">
			<h2>{t.topics}</h2>
			<ul class="topic-list">
				{#each AUTHOR.knowsAbout as topic}
					<li>{topic}</li>
				{/each}
			</ul>
		</section>

		<aside class="disclaimer">
			<h2>{t.disclaimerTitle}</h2>
			<p>{t.disclaimer}</p>
		</aside>

		{#if data.posts.length > 0}
			<section class="posts">
				<h2>{t.postsTitle}</h2>
				<p class="posts-subtitle">{t.postsSubtitle(data.posts.length)}</p>
				<ul class="post-list">
					{#each data.posts as post}
						<li>
							<a href={`/blog/${post.slug}`}>
								<span class="post-title">{post.title}</span>
								<span class="post-meta">
									<time datetime={post.publishDate}>{formatDate(post.publishDate)}</time>
									· {t.readTime(post.readingMinutes ?? 3)}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</main>

	<LandingFooter />
</div>

<style>
	.author-page {
		background: var(--bg-primary, #05050a);
		color: var(--text-primary, #ffffff);
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow-x: hidden;
	}

	.author-container {
		max-width: 820px;
		width: 100%;
		margin: 0 auto;
		padding: 130px 1.5rem 80px;
		flex-grow: 1;
		z-index: 10;
	}

	.breadcrumb {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: rgba(160, 160, 200, 0.6);
		margin-bottom: 2.5rem;
	}

	.breadcrumb a {
		color: inherit;
		text-decoration: none;
	}

	.breadcrumb a:hover {
		color: #fff;
	}

	.breadcrumb .separator {
		color: rgba(255, 255, 255, 0.2);
	}

	.breadcrumb .current {
		color: rgba(255, 255, 255, 0.9);
		font-weight: 500;
	}

	.eyebrow {
		color: #3b82f6;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-size: 0.75rem;
		display: block;
		margin-bottom: 0.75rem;
	}

	h1 {
		font-size: clamp(1.85rem, 5vw, 2.5rem);
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.2;
		margin: 0 0 0.5rem;
		color: #fff;
	}

	.job-title {
		color: rgba(160, 160, 200, 0.8);
		font-size: 1.05rem;
		margin: 0 0 1.25rem;
	}

	.author-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 3rem;
	}

	.author-links a {
		font-size: 0.85rem;
		font-weight: 600;
		color: #60a5fa;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.2);
		padding: 0.45rem 0.9rem;
		border-radius: 9999px;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.author-links a:hover {
		background: rgba(59, 130, 246, 0.18);
		color: #93c5fd;
	}

	.bio p {
		font-size: 1.05rem;
		line-height: 1.8;
		color: rgba(255, 255, 255, 0.82);
		margin: 0 0 1.25rem;
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 800;
		color: #fff;
		letter-spacing: -0.01em;
		margin: 3rem 0 1rem;
	}

	.topic-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.topic-list li {
		font-size: 0.8rem;
		font-weight: 600;
		color: #a78bfa;
		background: rgba(139, 92, 246, 0.1);
		padding: 0.3rem 0.75rem;
		border-radius: 9999px;
	}

	.disclaimer {
		margin-top: 3rem;
		padding: 1.5rem;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.07);
		background: rgba(255, 255, 255, 0.02);
	}

	.disclaimer h2 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}

	.disclaimer p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.65;
		color: rgba(160, 160, 200, 0.8);
	}

	.posts-subtitle {
		color: rgba(160, 160, 200, 0.6);
		font-size: 0.9rem;
		margin: -0.5rem 0 1.25rem;
	}

	.post-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.post-list a {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem 1.25rem;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		background: rgba(255, 255, 255, 0.02);
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.post-list a:hover {
		border-color: rgba(139, 92, 246, 0.25);
		background: rgba(255, 255, 255, 0.04);
	}

	.post-title {
		font-weight: 700;
		color: #fff;
		font-size: 0.98rem;
		line-height: 1.4;
	}

	.post-meta {
		font-size: 0.8rem;
		color: rgba(160, 160, 200, 0.6);
	}
</style>
