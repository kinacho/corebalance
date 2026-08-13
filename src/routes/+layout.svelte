<script lang="ts">
	import './layout.css';
	import SplashScreen from '$lib/components/SplashScreen.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import UpdatePrompt from '$lib/components/UpdatePrompt.svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { hasLocalHoldingsData } from '$lib/utils';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { dev, browser } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
	import { resolverExclusion, NO_TRACK_KEY } from '$lib/analytics-opt-out';

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
	let ogLocale = $derived($page.data.locale === 'en' ? 'en_US' : 'es_ES');

	/**
	 * ⚠️ Este layout envuelve también a `+error.svelte`, así que sin esta condición
	 * cualquier URL muerta emitía `<link rel="canonical">` apuntándose a sí misma:
	 * una canónica autorreferencial hacia una URL que no existe. El canonical se
	 * compone del pathname pedido, que no sabe nada de si la ruta es real.
	 *
	 * No lo caza ningún guarda: `seo:audit` exige exactamente un canonical
	 * autorreferencial por página, pero solo lee el HTML prerenderizado y en el build
	 * no hay ningún artefacto 404 — lo genera en runtime la función del adaptador.
	 * Lo cubre `e2e/error-404.spec.ts`, que sí pide una URL muerta por HTTP.
	 */
	let esError = $derived($page.status >= 400);

	// Determinar de manera síncrona si hay datos locales o flag de bypass para evitar flashes en la redirección.
	const hasLocalHoldings = browser ? hasLocalHoldingsData() : false;

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
		/**
		 * Las visitas propias no cuentan, si este navegador lo ha pedido con `?notrack=1`.
		 *
		 * La decisión vive en `$lib/analytics-opt-out` porque decide algo —y algo cuyo
		 * fallo es invisible—, así que se prueba sin navegador. Aquí solo queda leer, y
		 * escribir la marca cuando venga en la URL.
		 *
		 * ⚠️ El `console.info` no es depuración olvidada: es la **única señal** de que la
		 * exclusión está activa. Sin él, un navegador con la marca puesta por error se
		 * comporta igual que uno normal y las métricas se pierden en silencio.
		 */
		const { excluido, guardar } = resolverExclusion(
			location.search,
			localStorage.getItem(NO_TRACK_KEY)
		);
		if (guardar !== null) localStorage.setItem(NO_TRACK_KEY, guardar);
		if (excluido) console.info('[corebalance] visita excluida de las métricas (?notrack=0 para revertir)');

		// `beforeSend` devolviendo `null` cancela el evento: es el mecanismo que la propia
		// librería documenta, y deja la inyección igual para todos, con o sin exclusión.
		injectAnalytics({
			mode: dev ? 'development' : 'production',
			beforeSend: (event) => (excluido ? null : event)
		});
		injectSpeedInsights({ beforeSend: (event) => (excluido ? null : event) });

		/**
		 * Registro del service worker, **a mano y a propósito**.
		 *
		 * ⚠️ `injectRegister: 'auto'` no funciona en este proyecto y su fallo es
		 * silencioso: el plugin genera `registerSW.js` y lo despliega —se sirve con
		 * 200— pero no inserta la etiqueta `<script>` que lo carga en el HTML
		 * prerenderizado de SvelteKit. Resultado medido en producción antes de este
		 * cambio: `getRegistrations()` devolvía **0**, cero cachés, cero entradas, y
		 * ni un error en consola. Es decir, la PWA entera —precache, modo offline,
		 * `autoUpdate` y el `beforeinstallprompt` del que depende `InstallPrompt`—
		 * nunca llegó a existir para ningún usuario, y las veinte líneas de
		 * comentario que razonan sobre el fallback en `vite.config.ts` describían
		 * código que no se ejecutaba.
		 *
		 * Importar el módulo virtual y llamarlo aquí no depende de que el plugin
		 * acierte a inyectar nada. Si algún día vuelve a romperse, se rompe en un
		 * sitio que se lee.
		 */
		import('virtual:pwa-register')
			.then(({ registerSW }) => {
				const updateSW = registerSW({
					immediate: true,
					/**
					 * Hay versión nueva esperando. Se avisa y **no se recarga solo**: con
					 * `registerType: 'autoUpdate'` esto no se ejecutaba nunca y la pestaña se
					 * recargaba sin preguntar en cada despliegue, capaz de llevarse por
					 * delante un import de CSV a medio hacer. Ver `UpdatePrompt.svelte`.
					 */
					onNeedRefresh() {
						ui.applySwUpdate = () => updateSW(true);
						ui.swUpdateReady = true;
					},
					/**
					 * ⚠️ Sin esto, un fallo real de registro es **mudo**: build verde,
					 * consola limpia y PWA inexistente. Es exactamente el silencio que este
					 * bloque decía cerrar, y se había dejado abierto — el `.catch()` de abajo
					 * solo cubre que falle el `import()`, no que falle el registro.
					 */
					onRegisterError(error: unknown) {
						console.error('[pwa] el registro del service worker falló', error);
					}
				});
			})
			.catch((error) => {
				// Nunca debe tumbar la app: sin service worker CoreBalance funciona igual,
				// solo pierde instalación y offline.
				console.warn('[pwa] no se pudo cargar el registro del service worker', error);
			});

		if ((window as any).__deferredPrompt) {
			ui.deferredPrompt = (window as any).__deferredPrompt;
		}
		window.addEventListener('pwa-prompt-ready', () => {
			ui.deferredPrompt = (window as any).__deferredPrompt;
		});
	});
</script>

<svelte:head>
	{#if !esError}
		<link rel="canonical" href={canonicalUrl} />
	{/if}
	<!-- og:site_name y og:locale globales para todas las páginas -->
	<meta property="og:site_name" content="CoreBalance" />
	<meta property="og:locale" content={ogLocale} />
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
<UpdatePrompt />

{#if ui.showSupportModal && SupportModal}
	<SupportModal />
{/if}

{#if ui.showChangelog && ChangelogModal}
	<ChangelogModal onClose={() => ui.showChangelog = false} />
{/if}
