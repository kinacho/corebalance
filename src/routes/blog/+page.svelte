<script lang="ts">
	import BlogList from '$lib/components/blog/BlogList.svelte';
	let { data } = $props<{
		data: { posts: any[], lang: 'es' | 'en', tools: any[] };
	}>();
</script>

<BlogList posts={data.posts} lang={data.lang} tools={data.tools} />

