<script lang="ts">
	import BlogList from '$lib/components/blog/BlogList.svelte';
	let { data } = $props<{
		data: { posts: any[] };
	}>();
</script>

<BlogList posts={data.posts} lang="en" />
