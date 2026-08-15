<script lang="ts">
	import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { absoluteUrl } from '$lib/i18n/routing';
	import { cursoOgImage } from '$lib/seo/og';
	import { PROMESA_GRATIS } from '$lib/cursos';

	let { data } = $props();
	const c = $derived(data.curso);
	const minutos = $derived(data.lecciones.reduce((n: number, l: { minutos: number }) => n + l.minutos, 0));

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'Course',
		name: c.titulo,
		description: c.descripcion,
		url: absoluteUrl(`/cursos/${c.slug}`),
		inLanguage: 'es',
		isAccessibleForFree: true,
		provider: { '@type': 'Organization', name: 'CoreBalance', url: absoluteUrl('/') },
		hasCourseInstance: {
			'@type': 'CourseInstance',
			courseMode: 'online',
			courseWorkload: `PT${minutos}M`
		},
		offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR', category: 'Free' },
		syllabusSections: data.lecciones.map((l: { titulo: string; orden: number }) => ({
			'@type': 'Syllabus',
			name: l.titulo,
			position: l.orden
		}))
	});
</script>

<SeoHead
	title={`${c.titulo} · curso gratis`}
	description={c.descripcion}
	path={`/cursos/${c.slug}`}
	lang="es"
	bilingual={false}
	image={cursoOgImage(c.slug)}
	{jsonLd}
/>

<LandingNavBar />

<main class="curso">
	<nav class="miga" aria-label="Ruta"><a href="/cursos">Cursos</a></nav>

	<header class="portada">
		<p class="nivel">{c.nivel} · {data.lecciones.length} lecciones · {minutos} min · gratis</p>
		<h1>{c.titulo}</h1>
		<p class="gancho">{c.gancho}</p>
		<p class="para-quien">{c.paraQuien}</p>
		<a class="empezar" href={`/cursos/${c.slug}/${data.lecciones[0]?.slug}`}>
			Empezar por la lección 1
		</a>
	</header>

	<section class="llevas">
		<h2>Al terminar te llevas</h2>
		<ul>
			{#each c.teLlevas as item}
				<li>{item}</li>
			{/each}
		</ul>
	</section>

	<section class="temario">
		<h2>Las {data.lecciones.length} lecciones</h2>
		<ol>
			{#each data.lecciones as l}
				<li>
					<a href={`/cursos/${c.slug}/${l.slug}`}>
						<span class="n">{String(l.orden).padStart(2, '0')}</span>
						<span class="cuerpo">
							<span class="t">{l.titulo}</span>
							<span class="g">{l.gancho}</span>
							<span class="m">{l.minutos} min</span>
						</span>
					</a>
				</li>
			{/each}
		</ol>
	</section>

	<aside class="gratis">
		<h2>{PROMESA_GRATIS.titulo}</h2>
		<ul>
			{#each PROMESA_GRATIS.puntos as punto}
				<li>{punto}</li>
			{/each}
		</ul>
		<p>{PROMESA_GRATIS.pie}</p>
	</aside>
</main>

<LandingFooter />

<style>
	.curso {
		max-width: 820px;
		margin: 0 auto;
		padding: 5.5rem 1.25rem 4rem;
	}
	.miga {
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
	.nivel {
		margin: 0 0 0.8rem;
		font-size: var(--text-micro);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-green-ink);
	}
	h1 {
		margin: 0 0 1rem;
		font-size: clamp(2rem, 5.5vw, 3rem);
		line-height: 1.1;
		color: var(--text-primary);
	}
	.gancho {
		margin: 0 0 0.6rem;
		font-size: 1.15rem;
		line-height: 1.55;
		color: var(--text-primary);
	}
	.para-quien {
		margin: 0 0 1.75rem;
		color: var(--text-muted);
	}
	.empezar {
		display: inline-block;
		padding: 0.85rem 1.4rem;
		border-radius: 12px;
		background: var(--accent-blue);
		color: var(--text-on-accent);
		font-weight: 700;
		text-decoration: none;
	}
	section {
		margin: 3rem 0;
	}
	section h2 {
		font-size: 0.95rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin: 0 0 1rem;
	}
	.llevas ul {
		margin: 0;
		padding-left: 1.15rem;
		line-height: 1.9;
		color: var(--text-primary);
	}
	.temario ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.temario a {
		display: flex;
		gap: 1rem;
		padding: 1rem 1.15rem;
		border: 1px solid var(--border-subtle);
		border-radius: 14px;
		text-decoration: none;
		color: var(--text-primary);
	}
	.temario a:hover {
		border-color: rgba(255, 255, 255, 0.24);
	}
	.n {
		font-weight: 800;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
	.cuerpo {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.t {
		font-weight: 700;
		line-height: 1.35;
	}
	.g {
		font-size: 0.85rem;
		color: var(--text-muted);
		line-height: 1.5;
	}
	.m {
		font-size: var(--text-micro);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
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
		text-transform: none;
		letter-spacing: 0;
	}
	.gratis ul {
		margin: 0 0 0.7rem;
		padding-left: 1.1rem;
		line-height: 1.7;
	}
	.gratis p {
		margin: 0;
	}
</style>
