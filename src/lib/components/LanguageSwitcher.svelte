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
	 * El selector tiene que hacer tres cosas distintas según dónde esté:
	 *
	 * 1. **Páginas con gemelo explícito** (los posts del blog): cada idioma es un
	 *    artículo distinto en su propia URL, así que la ruta la da la propia página
	 *    en `langAlternates`. Antes aquí sólo se cambiaba el store, y como el post
	 *    toma su idioma del frontmatter el resultado era que el selector parecía no
	 *    hacer nada.
	 * 2. **Rutas bilingües** (landing, /blog, comparativas, herramientas, legales):
	 *    misma página con prefijo de idioma, se calcula el path.
	 * 3. **Resto** (dashboard): no hay URL por idioma, se cambia en sitio con
	 *    cookie + store.
	 *
	 * En 1 y 2 es un enlace real, para que el usuario cambie de URL y el crawler
	 * descubra la variante siguiéndolo.
	 *
	 * Y lleva `data-sveltekit-reload` a propósito: cambiar de idioma reemplaza el
	 * 100% del texto de la página, así que la navegación SPA no aporta nada y sí
	 * abre la ventana en la que media interfaz está traducida y la otra mitad no.
	 * Con una carga de documento completa el HTML destino llega ya prerenderizado
	 * en su idioma desde la CDN: es más rápido que la ruta SPA (sin chunk de
	 * diccionario, sin loads, sin re-render) y quedarse a medias es imposible.
	 */
	const alternates = $derived(
		($page.data.langAlternates ?? null) as Record<string, string | null> | null
	);
	const basePath = $derived(stripLocale($page.url.pathname));
	const isRouted = $derived(Boolean(alternates) || isBilingualRoute($page.url.pathname));

	/**
	 * El idioma marcado como activo sale de la página, no del store: en un post el
	 * idioma correcto es el del artículo, aunque la preferencia guardada sea otra.
	 */
	const activeLocale = $derived((($page.data.locale as Locales | undefined) ?? $locale) as Locales);

	function hrefFor(code: Locales): string {
		if (alternates) {
			// Si el gemelo no existe, el índice del blog en ese idioma es el destino
			// menos malo: nunca un enlace roto.
			return alternates[code] ?? localizePath('/blog', code);
		}
		return localizePath(basePath, code);
	}

	async function handleChange(newLocale: Locales) {
		await switchLocale(newLocale);
	}

	/**
	 * ⚠️ **Los colores salen de los tokens, no de utilidades de Tailwind, y eso es
	 * lo que hace que este componente exista en tema claro.**
	 *
	 * Iba con `text-slate-400`, `bg-slate-900/40` y `border-white/10`: valores
	 * fijos elegidos para fondo oscuro. En claro el conmutador se quedaba como una
	 * pastilla oscura pegada en medio de una barra clara, y su texto gris sobre
	 * ella. Las utilidades de espaciado y forma sí se quedan — ésas no dependen
	 * del tema.
	 */
	const cls = (code: Locales) =>
		`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center gap-1.5 cursor-pointer select-none no-underline lang-opcion ${
			activeLocale === code ? 'es-activa' : ''
		}`;
</script>

<div
	class="inline-flex items-center backdrop-blur-md rounded-xl p-1 shadow-inner gap-1 lang-caja"
>
	{#each LOCALES as { code, label, flag }}
		{#if isRouted}
			<a
				class={cls(code)}
				href={hrefFor(code)}
				hreflang={code}
				data-sveltekit-reload
				aria-current={activeLocale === code ? 'true' : undefined}
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

<style>
	.lang-caja {
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
	}

	:global(.lang-opcion) {
		color: var(--text-muted);
		background: transparent;
	}

	:global(.lang-opcion:hover) {
		color: var(--text-primary);
	}

	/* La opción activa lleva fondo de acento, así que su texto es el de encima de
	   un acento y no el del tema. Ver `--text-on-accent` en `layout.css`. */
	:global(.lang-opcion.es-activa) {
		background: var(--accent-blue);
		color: var(--text-on-accent);
	}
</style>
