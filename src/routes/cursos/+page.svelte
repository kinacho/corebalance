<script lang="ts">
	import LandingNavBar from '$lib/components/landing/LandingNavBar.svelte';
	import LandingFooter from '$lib/components/landing/LandingFooter.svelte';
	import SeoHead from '$lib/components/seo/SeoHead.svelte';
	import { absoluteUrl } from '$lib/i18n/routing';
	import { pageOgImage } from '$lib/seo/og';
	import { PROMESA_GRATIS } from '$lib/cursos';

	let { data } = $props();

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: 'Cursos gratuitos de inversión indexada',
		itemListElement: data.cursos.map((c: { slug: string; titulo: string }, i: number) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: c.titulo,
			url: absoluteUrl(`/cursos/${c.slug}`)
		}))
	});
</script>

<SeoHead
	title="Cursos gratis de inversión indexada | CoreBalance"
	description="Cursos gratuitos de inversión en fondos indexados y ETFs para el inversor español. Sin registro, sin correo y sin nada que venderte después."
	path="/cursos"
	lang="es"
	bilingual={false}
	image={pageOgImage('cursos', 'es')}
	{jsonLd}
/>

<LandingNavBar />

<main class="cursos">
	<header>
		<p class="eyebrow">Cursos · gratis</p>
		<h1>Aprende a invertir en indexados sin que nadie te venda nada</h1>
		<p class="intro">
			Cada lección termina con un ejercicio en la herramienta, no con un resumen. Al acabar tienes
			una cartera montada, no unos apuntes.
		</p>
	</header>

	<ul class="lista">
		{#each data.cursos as c}
			<li>
				<a href={`/cursos/${c.slug}`}>
					<span class="nivel">{c.nivel}</span>
					<h2>{c.titulo}</h2>
					<p>{c.gancho}</p>
					<span class="ir">Ver el curso →</span>
				</a>
			</li>
		{/each}
	</ul>

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
	.cursos {
		max-width: 900px;
		margin: 0 auto;
		padding: 5.5rem 1.25rem 4rem;
	}
	.eyebrow {
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
	.intro {
		margin: 0 0 3rem;
		max-width: 60ch;
		font-size: 1.05rem;
		line-height: 1.65;
		color: var(--text-muted);
	}
	.lista {
		list-style: none;
		margin: 0 0 3rem;
		padding: 0;
		display: grid;
		gap: 1rem;
	}
	.lista a {
		display: block;
		padding: 1.5rem;
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		background: var(--bg-card);
		text-decoration: none;
		color: var(--text-primary);
	}
	.lista a:hover {
		border-color: var(--border-strong);
	}
	.nivel {
		font-size: var(--text-micro);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-blue-ink);
	}
	.lista h2 {
		margin: 0.5rem 0 0.6rem;
		font-size: 1.35rem;
		line-height: 1.25;
	}
	.lista p {
		margin: 0 0 1rem;
		color: var(--text-muted);
		line-height: 1.6;
	}
	.ir {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--accent-blue-ink);
	}
	.gratis {
		padding: 1.25rem 1.4rem;
		border: 1px dashed var(--border-subtle);
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
</style>
