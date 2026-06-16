<script lang="ts">
	import BlogPost from '$lib/components/blog/BlogPost.svelte';
	let { data } = $props<{
		data: { post: any };
	}>();
</script>

<BlogPost post={data.post} />
