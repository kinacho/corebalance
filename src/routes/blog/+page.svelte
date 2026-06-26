<script lang="ts">
	import BlogList from '$lib/components/blog/BlogList.svelte';
	let { data } = $props<{
		data: { posts: any[], lang: 'es' | 'en', tools: any[] };
	}>();
</script>

<svelte:head>
	<title>{data.lang === 'es' ? 'Blog de Inversión Indexada y Rebalanceo | CoreBalance' : 'Index Investing & Rebalancing Blog | CoreBalance'}</title>
	<meta name="description" content={data.lang === 'es' ? 'Artículos, guías y tutoriales sobre inversión pasiva, fondos indexados, ETFs y rebalanceo de carteras para optimizar tus finanzas.' : 'Articles, guides, and tutorials on passive investing, index funds, ETFs, and portfolio rebalancing to optimize your finances.'} />

	<!-- Hreflang: ES/EN/x-default (ambos apuntan al mismo path ya que cambia según locale) -->
	<link rel="alternate" hreflang="es" href="https://corebalance.app/blog" />
	<link rel="alternate" hreflang="en" href="https://corebalance.app/blog" />
	<link rel="alternate" hreflang="x-default" href="https://corebalance.app/blog" />

	<!-- Open Graph -->
	<meta property="og:title" content={data.lang === 'es' ? 'Blog de Inversión Indexada y Rebalanceo | CoreBalance' : 'Index Investing & Rebalancing Blog | CoreBalance'} />
	<meta property="og:description" content={data.lang === 'es' ? 'Artículos, guías y tutoriales sobre inversión pasiva, fondos indexados, ETFs y rebalanceo de carteras para optimizar tus finanzas.' : 'Articles, guides, and tutorials on passive investing, index funds, ETFs, and portfolio rebalancing to optimize your finances.'} />
	<meta property="og:image" content="https://corebalance.app/og-image-blog.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://corebalance.app/blog" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={data.lang === 'es' ? 'Blog de Inversión Indexada y Rebalanceo | CoreBalance' : 'Index Investing & Rebalancing Blog | CoreBalance'} />
	<meta name="twitter:description" content={data.lang === 'es' ? 'Artículos, guías y tutoriales sobre inversión pasiva, fondos indexados, ETFs y rebalanceo de carteras para optimizar tus finanzas.' : 'Articles, guides, and tutorials on passive investing, index funds, ETFs, and portfolio rebalancing to optimize your finances.'} />
	<meta name="twitter:image" content="https://corebalance.app/og-image-blog.png" />
</svelte:head>

<BlogList posts={data.posts} lang={data.lang} tools={data.tools} />

