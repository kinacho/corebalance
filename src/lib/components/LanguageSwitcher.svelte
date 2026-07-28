<script lang="ts">
	import { locale } from '$lib/i18n/i18n-svelte';
	import type { Locales } from '$lib/i18n/i18n-types';
	import { page } from '$app/stores';
	import { switchLocale } from '$lib/i18n/i18n-custom';
	import { isBilingualRoute, localizePath, stripLocale } from '$lib/i18n/routing';

	const LOCALES: { code: Locales; label: string; flag: string }[] = [
		{ code: 'es', label: 'ES', flag: '🇪🇸' },
		{ code: 'en', label: 'EN', flag: '🇬🇧' }
	];

	/**
	 * En las rutas bilingües cada idioma tiene su URL, así que el selector es un
	 * enlace real: el usuario cambia de URL y Googlebot descubre la variante en
	 * inglés siguiéndolo. En el resto (dashboard, posts) seguimos cambiando el
	 * idioma en sitio mediante cookie + store.
	 */
	const isRouted = $derived(isBilingualRoute($page.url.pathname));
	const basePath = $derived(stripLocale($page.url.pathname));

	// Sólo el pathname: `url.search` y `url.hash` no son accesibles durante el
	// prerender, y la variante de idioma no depende de ellos.
	function hrefFor(code: Locales) {
		return localizePath(basePath, code);
	}

	async function handleChange(newLocale: Locales) {
		await switchLocale(newLocale);
	}

	const cls = (code: Locales) =>
		`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center gap-1.5 cursor-pointer select-none no-underline ${
			$locale === code
				? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
				: 'text-slate-400 hover:text-white hover:bg-white/5'
		}`;
</script>

<div
	class="inline-flex items-center bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-inner gap-1"
>
	{#each LOCALES as { code, label, flag }}
		{#if isRouted}
			<a
				class={cls(code)}
				href={hrefFor(code)}
				hreflang={code}
				aria-current={$locale === code ? 'true' : undefined}
				aria-label={code === 'es' ? 'Ver esta página en español' : 'View this page in English'}
			>
				<span class="text-sm leading-none">{flag}</span>
				<span>{label}</span>
			</a>
		{:else}
			<button
				class={cls(code)}
				onclick={() => handleChange(code)}
				aria-label={code === 'es' ? 'Cambiar idioma a español' : 'Switch language to English'}
			>
				<span class="text-sm leading-none">{flag}</span>
				<span>{label}</span>
			</button>
		{/if}
	{/each}
</div>
