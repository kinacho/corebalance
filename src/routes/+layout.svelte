	import './layout.css';
	import SplashScreen from '$lib/components/SplashScreen.svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="background-mesh"></div>

{#if !portfolio.isInitialized}
	<SplashScreen loading={portfolio.loading} />
{/if}

{@render children()}
