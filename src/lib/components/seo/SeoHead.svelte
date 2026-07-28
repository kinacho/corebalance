<script lang="ts">
	import type { Locales } from '$lib/i18n/i18n-types';
	import { alternates, absoluteUrl, SITE_URL } from '$lib/i18n/routing';

	interface Props {
		/** Título completo de la pestaña, ya incluida la marca si aplica. */
		title: string;
		description: string;
		/** Pathname canónico de la página, con prefijo de idioma si lo lleva. */
		path: string;
		lang: Locales;
		/** Ruta o URL absoluta de la imagen social. */
		image?: string;
		ogType?: 'website' | 'article';
		/** Si es false no se emiten los `hreflang` (páginas monolingües, p. ej. un post). */
		bilingual?: boolean;
		/** Alternativas explícitas, para el blog donde el slug cambia por idioma. */
		altEs?: string | null;
		altEn?: string | null;
		/** Objeto o array JSON-LD. */
		jsonLd?: unknown;
	}

	let {
		title,
		description,
		path,
		lang,
		image = '/og-image.png',
		ogType = 'website',
		bilingual = true,
		altEs = null,
		altEn = null,
		jsonLd = undefined
	}: Props = $props();

	const alts = $derived(alternates(path, lang));
	const canonical = $derived(absoluteUrl(path));
	const imageUrl = $derived(image.startsWith('http') ? image : `${SITE_URL}${image}`);
	const jsonLdString = $derived(jsonLd ? JSON.stringify(jsonLd) : '');

	// Alternativas: las explícitas ganan (blog), si no las derivadas del path.
	const hrefEs = $derived(altEs ?? (bilingual ? alts.es : null));
	const hrefEn = $derived(altEn ?? (bilingual ? alts.en : null));
	const hrefDefault = $derived(hrefEs ?? hrefEn);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />

	<!-- `canonical`, `og:site_name` y `og:locale` los emite `+layout.svelte` para
	     todas las páginas; no se repiten aquí para no duplicar etiquetas. -->

	<!-- Hreflang: cada idioma a su URL real -->
	{#if hrefEs}
		<link rel="alternate" hreflang="es" href={hrefEs} />
	{/if}
	{#if hrefEn}
		<link rel="alternate" hreflang="en" href={hrefEn} />
	{/if}
	{#if hrefDefault}
		<link rel="alternate" hreflang="x-default" href={hrefDefault} />
	{/if}

	<!-- Open Graph -->
	<meta property="og:type" content={ogType} />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={canonical} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={imageUrl} />

	{#if jsonLdString}
		{@html `<script type="application/ld+json">${jsonLdString}</script>`}
	{/if}
</svelte:head>
