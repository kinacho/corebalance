<script lang="ts">
	import BlogList from '$lib/components/blog/BlogList.svelte';
	let { data } = $props<{
		data: { posts: any[], lang: 'es' | 'en', tools: any[] };
	}>();
</script>

<svelte:head>
	<title>{data.lang === 'es' ? 'Blog de Inversión Indexada y Rebalanceo | CoreBalance' : 'Index Investing & Rebalancing Blog | CoreBalance'}</title>
	<meta name="description" content={data.lang === 'es' ? 'Artículos, guías y tutoriales sobre inversión pasiva, fondos indexados, ETFs y rebalanceo de carteras para optimizar tus finanzas.' : 'Articles, guides, and tutorials on passive investing, index funds, ETFs, and portfolio rebalancing to optimize your finances.'} />
</svelte:head>

<BlogList posts={data.posts} lang={data.lang} tools={data.tools} />

