<script lang="ts">
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

<div 
	class="background-mesh" 
	style="
		--bg-mesh-1: {portfolio.globalDailyChangePercent > 0.002 ? 'rgba(16, 185, 129, 0.22)' : portfolio.globalDailyChangePercent < -0.002 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(59, 130, 246, 0.22)'};
		--bg-mesh-2: {portfolio.globalDailyChangePercent > 0.005 ? 'rgba(5, 150, 105, 0.18)' : portfolio.globalDailyChangePercent < -0.005 ? 'rgba(185, 28, 28, 0.15)' : 'rgba(139, 92, 246, 0.18)'};
		--bg-mesh-3: {portfolio.globalDailyChangePercent > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(139, 92, 246, 0.12)'};
	"
></div>

{#if !portfolio.isInitialized}
	<SplashScreen loading={portfolio.loading} />
{/if}

{@render children()}
