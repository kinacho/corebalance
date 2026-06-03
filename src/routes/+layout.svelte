<script lang="ts">
	import './layout.css';
	import SplashScreen from '$lib/components/SplashScreen.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { dev, browser } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	let { children } = $props();
	let SupportModal = $state<any>(null);
	let ChangelogModal = $state<any>(null);

	// Carga diferida de modales
	$effect(() => {
		if (ui.showSupportModal && !SupportModal) {
			import('$lib/components/SupportModal.svelte').then(m => SupportModal = m.default);
		}
	});

	$effect(() => {
		if (ui.showChangelog && !ChangelogModal) {
			import('$lib/components/ChangelogModal.svelte').then(m => ChangelogModal = m.default);
		}
	});

	let canonicalUrl = $derived(`https://corebalance.app${$page.url.pathname}`);

	// Determinar de manera síncrona si hay datos locales o flag de bypass para evitar flashes en la redirección.
	const hasLocalHoldings = browser ? (() => {
		try {
			const saved = localStorage.getItem('corebalance_holdings_v2');
			if (!saved) return false;
			const parsed = JSON.parse(saved);
			return Object.values(parsed).some((h: any) => h.shares > 0);
		} catch {
			return false;
		}
	})() : false;

	const isBypassed = browser ? sessionStorage.getItem('bypassLanding') === 'true' : false;

	// Solo mostrar la pantalla de carga si el usuario va al dashboard,
	// o si va a la landing pero va a ser redirigido (tiene datos locales o flag de bypass).
	let showSplash = $derived.by(() => {
		if ($page.url.pathname === '/dashboard') {
			return !portfolio.isInitialized;
		}
		if ($page.url.pathname === '/') {
			const willRedirect = hasLocalHoldings || isBypassed;
			return willRedirect && !portfolio.isInitialized;
		}
		return false;
	});

	// Ocultar la splash screen estática de app.html cuando el portfolio esté listo
	$effect(() => {
		if (portfolio.isInitialized && browser && (window as any).__hideInitialSplash) {
			(window as any).__hideInitialSplash();
		}
	});

	onMount(() => {
		injectAnalytics({ mode: dev ? 'development' : 'production' });
		injectSpeedInsights();

		if ((window as any).__deferredPrompt) {
			ui.deferredPrompt = (window as any).__deferredPrompt;
		}
		window.addEventListener('pwa-prompt-ready', () => {
			ui.deferredPrompt = (window as any).__deferredPrompt;
		});
	});
</script>

<svelte:head>
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="es" href="https://corebalance.app" />
	<link rel="alternate" hreflang="x-default" href="https://corebalance.app" />
</svelte:head>

<div 
	class="background-mesh" 
	style="
		--bg-mesh-1: {portfolio.globalDailyChangePercent > 0.002 ? 'rgba(16, 185, 129, 0.22)' : portfolio.globalDailyChangePercent < -0.002 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(59, 130, 246, 0.22)'};
		--bg-mesh-2: {portfolio.globalDailyChangePercent > 0.005 ? 'rgba(5, 150, 105, 0.18)' : portfolio.globalDailyChangePercent < -0.005 ? 'rgba(185, 28, 28, 0.15)' : 'rgba(139, 92, 246, 0.18)'};
		--bg-mesh-3: {portfolio.globalDailyChangePercent > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(139, 92, 246, 0.12)'};
	"
></div>

{#if showSplash}
	<SplashScreen loading={!portfolio.isInitialized} />
{/if}

{@render children()}

<Toast />
<InstallPrompt />

{#if ui.showSupportModal && SupportModal}
	<SupportModal />
{/if}

{#if ui.showChangelog && ChangelogModal}
	<ChangelogModal onClose={() => ui.showChangelog = false} />
{/if}
