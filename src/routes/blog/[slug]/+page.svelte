<script lang="ts">
	import BlogPost from '$lib/components/blog/BlogPost.svelte';
	import type { Post, RelatedPost } from '$lib/blog';

	interface Props {
		data: { post: Post; related: RelatedPost[] };
	}

	let { data }: Props = $props();
</script>

<BlogPost post={data.post} related={data.related} />
