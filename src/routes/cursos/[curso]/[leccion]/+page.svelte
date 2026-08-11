<script lang="ts">
	import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { AUTHOR } from '$lib/seo/author';
	import { absoluteUrl } from '$lib/i18n/routing';
	import { PROMESA_GRATIS } from '$lib/cursos';

	let { data } = $props();

	const l = $derived(data.leccion);
	const c = $derived(data.curso);
	const ruta = $derived(`/cursos/${c.slug}/${l.slug}`);
	const Contenido = $derived(l.content);

	/**
	 * `Course` + `LearningResource` sobre el `@graph` de la lección.
	 *
	 * ⚠️ Un bloque JSON-LD por URL, nunca dos: dos compiten y Search Console acaba
	 * eligiendo. Es la misma regla que ya siguen las páginas de herramientas.
	 */
	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'Course',
				name: c.titulo,
				description: c.descripcion,
				url: absoluteUrl(`/cursos/${c.slug}`),
				inLanguage: 'es',
				isAccessibleForFree: true,
				provider: { '@type': 'Organization', name: 'CoreBalance', url: absoluteUrl('/') },
				// Sin esto Google marca el `Course` como incompleto: quiere saber en qué
				// formato se imparte y qué cuesta.
				hasCourseInstance: {
					'@type': 'CourseInstance',
					courseMode: 'online',
					courseWorkload: `PT${l.minutos}M`
				},
				offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR', category: 'Free' }
			},
			{
				'@type': 'LearningResource',
				name: l.titulo,
				description: l.descripcion,
				url: absoluteUrl(ruta),
				inLanguage: 'es',
				isAccessibleForFree: true,
				learningResourceType: 'Lesson',
				position: l.orden,
				timeRequired: `PT${l.minutos}M`,
				author: { '@type': 'Person', name: AUTHOR.name, url: absoluteUrl('/autor/kinacho') }
			}
		]
	});
</script>

<SeoHead
	title={l.titulo}
	description={l.descripcion}
	path={ruta}
	lang="es"
	ogType="article"
	bilingual={false}
	{jsonLd}
/>

<LandingNavBar />

<main class="leccion">
	<nav class="miga" aria-label="Ruta">
		<a href="/cursos">Cursos</a>
		<span aria-hidden="true">·</span>
		<a href={`/cursos/${c.slug}`}>{c.titulo}</a>
	</nav>

	<article>
		<header class="cabecera">
			<p class="paso">Lección {l.orden} de {data.total} · {l.minutos} min · gratis</p>
			<h1>{l.titulo}</h1>
			<p class="gancho">{l.gancho}</p>
		</header>

		<!-- El progreso del curso, dibujado sin contar nada a nadie. -->
		<div class="barra" role="img" aria-label={`Lección ${l.orden} de ${data.total}`}>
			<span style={`width:${(l.orden / data.total) * 100}%`}></span>
		</div>

		<div class="markdown-body">
			<Contenido />
		</div>

		<!--
			El ejercicio. Es lo que separa un curso de siete artículos seguidos: cada
			lección deja algo hecho en la herramienta, no una idea en la cabeza.
		-->
		<section class="accion">
			<p class="accion-eyebrow">Hazlo ahora</p>
			<p class="accion-texto">{l.accion.texto}</p>
			<a class="accion-cta" href={l.accion.href}>{l.accion.cta}</a>
		</section>

		{#if l.lecturas?.length}
			<section class="extras">
				<h2>Para profundizar</h2>
				<ul>
					{#each l.lecturas as lectura}
						<li><a href={lectura.href}>{lectura.texto}</a></li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if l.fuentes?.length}
			<section class="extras fuentes">
				<h2>Fuentes</h2>
				<ul>
					{#each l.fuentes as fuente}
						<li>
							<a href={fuente.url} rel="noopener noreferrer nofollow" target="_blank"
								>{fuente.texto}</a
							>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<nav class="vecinas" aria-label="Navegación del curso">
			{#if data.anterior}
				<a class="vecina anterior" href={`/cursos/${c.slug}/${data.anterior.slug}`}>
					<span class="vecina-eyebrow">Anterior</span>
					<span class="vecina-titulo">{data.anterior.titulo}</span>
				</a>
			{:else}
				<span></span>
			{/if}

			{#if data.siguiente}
				<a class="vecina siguiente" href={`/cursos/${c.slug}/${data.siguiente.slug}`}>
					<span class="vecina-eyebrow">Siguiente</span>
					<span class="vecina-titulo">{data.siguiente.titulo}</span>
				</a>
			{:else}
				<a class="vecina siguiente" href={`/cursos/${c.slug}`}>
					<span class="vecina-eyebrow">Has terminado</span>
					<span class="vecina-titulo">Volver al índice del curso</span>
				</a>
			{/if}
		</nav>

		<aside class="gratis">
			<h2>{PROMESA_GRATIS.titulo}</h2>
			<ul>
				{#each PROMESA_GRATIS.puntos as punto}
					<li>{punto}</li>
				{/each}
			</ul>
			<p>{PROMESA_GRATIS.pie}</p>
		</aside>
	</article>
</main>

<LandingFooter />

<style>
	.leccion {
		max-width: 760px;
		margin: 0 auto;
		padding: 5.5rem 1.25rem 4rem;
	}

	.miga {
		display: flex;
		gap: 0.5rem;
		font-size: var(--text-micro);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin-bottom: 2rem;
	}
	.miga a {
		color: inherit;
		text-decoration: none;
	}
	.miga a:hover {
		color: var(--text-primary);
	}

	.paso {
		margin: 0 0 0.75rem;
		font-size: var(--text-micro);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-blue);
	}

	h1 {
		margin: 0 0 0.85rem;
		font-size: clamp(1.75rem, 4.5vw, 2.5rem);
		line-height: 1.15;
		color: var(--text-primary);
	}

	.gancho {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.6;
		color: var(--text-muted);
	}

	.barra {
		height: 3px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.08);
		margin: 2rem 0 2.5rem;
		overflow: hidden;
	}
	.barra span {
		display: block;
		height: 100%;
		background: var(--accent-blue);
	}

	/*
	 * Los dos bloques que se repiten en las 34 lecciones.
	 *
	 * ⚠️ Sin ellos, una lección es un muro de texto con dos títulos indistinguibles del
	 * resto: el lector no ve dónde está la advertencia ni dónde el resumen, que son
	 * justamente las dos partes que más se releen. El envoltorio se pone en el markdown
	 * (`<div class="bloque aviso">`) porque el CSS no puede seleccionar por el texto de un
	 * encabezado, y `:global` porque el contenido lo inyecta mdsvex.
	 */
	.leccion :global(.bloque) {
		margin: 2.5rem 0;
		padding: 1.4rem 1.5rem;
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	.leccion :global(.bloque h2) {
		margin: 0 0 0.9rem;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}
	.leccion :global(.bloque > :last-child) {
		margin-bottom: 0;
	}
	/*
	 * ⚠️ El espaciado se declara aquí y no se hereda del cuerpo del artículo: el `div`
	 * envolvente rompe la cadena de selectores del markdown, y sin esto los párrafos del
	 * aviso salen pegados unos a otros y la lista del resumen pierde las viñetas. Se vio
	 * mirando la captura, no leyendo el CSS.
	 */
	.leccion :global(.bloque p) {
		margin: 0 0 1rem;
		line-height: 1.7;
	}
	.leccion :global(.bloque ul) {
		margin: 0;
		padding-left: 1.2rem;
		list-style: disc;
	}
	.leccion :global(.bloque li) {
		margin-bottom: 0.45rem;
		line-height: 1.65;
	}
	.leccion :global(.bloque li::marker) {
		color: rgba(255, 255, 255, 0.35);
	}

	/* La advertencia: ámbar, que es el color de «ojo con esto» en el resto de la app. */
	.leccion :global(.bloque.aviso) {
		background: rgba(245, 158, 11, 0.05);
		border-color: rgba(245, 158, 11, 0.22);
	}
	.leccion :global(.bloque.aviso h2) {
		color: var(--accent-orange);
	}

	/* El resumen: cierra la lección, así que se lee como una ficha y no como más texto. */
	.leccion :global(.bloque.retener) {
		background: rgba(255, 255, 255, 0.03);
	}
	.leccion :global(.bloque.retener h2) {
		color: var(--accent-green);
	}
	.leccion :global(.bloque.retener ul) {
		margin: 0;
		padding-left: 1.15rem;
		line-height: 1.85;
	}

	/* Pie de las calculadoras embebidas. */
	.leccion :global(.pie-calc) {
		margin: -1rem 0 2rem;
		font-size: 0.78rem;
		text-align: center;
		color: var(--text-muted);
	}

	/*
	 * Ritmo de lectura. Una lección de 900 palabras a una sola columna necesita que los
	 * encabezados respiren y que la medida no pase de unos 70 caracteres, o se lee como
	 * un documento y no como una lección.
	 */
	.leccion :global(.markdown-body) {
		font-size: 1.02rem;
		line-height: 1.75;
	}
	.leccion :global(.markdown-body h2) {
		margin: 2.75rem 0 1rem;
		font-size: 1.3rem;
		line-height: 1.3;
		letter-spacing: -0.01em;
	}
	.leccion :global(.markdown-body p),
	.leccion :global(.markdown-body li) {
		max-width: 68ch;
	}
	.leccion :global(.markdown-body table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.75rem 0;
		font-size: 0.9rem;
	}
	.leccion :global(.markdown-body th),
	.leccion :global(.markdown-body td) {
		padding: 0.6rem 0.7rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		text-align: left;
	}
	.leccion :global(.markdown-body thead th) {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}
	.leccion :global(.markdown-body blockquote) {
		margin: 1.75rem 0;
		padding: 0.2rem 0 0.2rem 1.2rem;
		border-left: 3px solid var(--accent-blue);
		font-size: 1.08rem;
		line-height: 1.6;
		color: var(--text-primary);
	}

	.accion {
		margin: 3rem 0 2rem;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		background: var(--bg-card);
	}
	.accion-eyebrow {
		margin: 0 0 0.6rem;
		font-size: var(--text-micro);
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-green);
	}
	.accion-texto {
		margin: 0 0 1.1rem;
		line-height: 1.6;
		color: var(--text-primary);
	}
	.accion-cta {
		display: inline-block;
		padding: 0.7rem 1.15rem;
		border-radius: 12px;
		background: var(--accent-blue);
		color: #fff;
		font-weight: 700;
		font-size: 0.9rem;
		text-decoration: none;
	}

	.extras {
		margin: 2.5rem 0;
	}
	.extras h2 {
		font-size: 0.95rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin: 0 0 0.75rem;
	}
	.extras ul {
		margin: 0;
		padding-left: 1.1rem;
		line-height: 1.9;
	}
	.fuentes {
		font-size: 0.85rem;
	}

	.vecinas {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin: 3rem 0 2rem;
	}
	.vecina {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 1rem 1.15rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 14px;
		text-decoration: none;
		color: var(--text-primary);
	}
	.vecina:hover {
		border-color: rgba(255, 255, 255, 0.24);
	}
	.vecina.siguiente {
		text-align: right;
	}
	.vecina-eyebrow {
		font-size: var(--text-micro);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}
	.vecina-titulo {
		font-weight: 700;
		font-size: 0.9rem;
		line-height: 1.35;
	}

	.gratis {
		padding: 1.25rem 1.4rem;
		border: 1px dashed rgba(255, 255, 255, 0.16);
		border-radius: 14px;
		color: var(--text-muted);
		font-size: 0.85rem;
	}
	.gratis h2 {
		margin: 0 0 0.6rem;
		font-size: 0.9rem;
		color: var(--text-primary);
	}
	.gratis ul {
		margin: 0 0 0.7rem;
		padding-left: 1.1rem;
		line-height: 1.7;
	}
	.gratis p {
		margin: 0;
	}

	@media (max-width: 640px) {
		.vecinas {
			grid-template-columns: 1fr;
		}
		.vecina.siguiente {
			text-align: left;
		}
	}
</style>
