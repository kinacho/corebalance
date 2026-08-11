<script lang="ts">
	import { getCursos, getLecciones, PROMESA_GRATIS } from '$lib/cursos';

	/**
	 * Los cursos, ofrecidos desde la landing.
	 *
	 * ⚠️ La lista sale de `getCursos()` y no de un array copiado aquí. Un bloque de
	 * marketing con los títulos escritos a mano es un bloque que se queda viejo el día que
	 * se renombre un curso, y nadie lo nota porque sigue enlazando bien.
	 *
	 * Solo se pinta en español: los cursos existen solo en ese idioma a propósito, y
	 * ofrecer desde `/en` algo que lleva a páginas en español es peor que no ofrecerlo.
	 * Quien decide es el componente padre, que es el que conoce el idioma de la página.
	 */
	const cursos = getCursos();
	// Contado, no escrito: el día que se añada un curso este número tiene que moverse solo.
	const lecciones = cursos.reduce((n, c) => n + getLecciones(c.slug).length, 0);
</script>

<section id="cursos" class="cursos-section" aria-labelledby="cursos-heading">
	<div class="wrap">
		<p class="eyebrow">Cursos · gratis</p>
		<h2 id="cursos-heading">Aprende a invertir en indexados sin que nadie te venda nada</h2>
		<p class="intro">
			{cursos.length} cursos, {lecciones} lecciones y un ejercicio en la herramienta al final de cada
			una. Al acabar tienes una cartera montada, no unos apuntes.
		</p>

		<ul class="grid">
			{#each cursos as c, i}
				<li>
					<a href={`/cursos/${c.slug}`}>
						<span class="num">{String(i + 1).padStart(2, '0')}</span>
						<span class="nivel">{c.nivel}</span>
						<h3>{c.titulo}</h3>
						<p>{c.gancho}</p>
					</a>
				</li>
			{/each}
		</ul>

		<div class="pie">
			<p class="gratis">
				<strong>{PROMESA_GRATIS.titulo}:</strong>
				{PROMESA_GRATIS.puntos.join(' ')}
			</p>
			<a class="todos" href="/cursos">Ver todos los cursos →</a>
		</div>
	</div>
</section>

<style>
	.cursos-section {
		padding: 6rem 1.5rem;
		background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.02), transparent);
	}
	.wrap {
		max-width: 1150px;
		margin: 0 auto;
	}
	.eyebrow {
		margin: 0 0 0.9rem;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent-green, #10b981);
	}
	h2 {
		margin: 0 0 1rem;
		font-size: clamp(1.9rem, 4.5vw, 2.9rem);
		line-height: 1.12;
		letter-spacing: -0.02em;
		color: #fff;
		max-width: 20ch;
	}
	.intro {
		margin: 0 0 3rem;
		max-width: 58ch;
		font-size: 1.05rem;
		line-height: 1.65;
		color: rgba(255, 255, 255, 0.62);
	}
	.grid {
		list-style: none;
		margin: 0 0 2.5rem;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}
	.grid a {
		display: block;
		height: 100%;
		padding: 1.5rem;
		border: 1px solid rgba(255, 255, 255, 0.09);
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.02);
		text-decoration: none;
		transition:
			border-color 0.2s ease,
			transform 0.2s ease;
	}
	.grid a:hover {
		border-color: rgba(255, 255, 255, 0.22);
		transform: translateY(-2px);
	}
	.num {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.28);
		font-variant-numeric: tabular-nums;
	}
	.nivel {
		display: block;
		margin-top: 0.35rem;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-blue, #3b82f6);
	}
	.grid h3 {
		margin: 0.55rem 0 0.6rem;
		font-size: 1.12rem;
		line-height: 1.3;
		color: #fff;
	}
	.grid p {
		margin: 0;
		font-size: 0.88rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.55);
	}
	.pie {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
	}
	.gratis {
		margin: 0;
		max-width: 62ch;
		font-size: 0.82rem;
		line-height: 1.65;
		color: rgba(255, 255, 255, 0.5);
	}
	.gratis strong {
		color: rgba(255, 255, 255, 0.8);
	}
	.todos {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--accent-blue, #3b82f6);
		text-decoration: none;
		white-space: nowrap;
	}

	@media (max-width: 640px) {
		.cursos-section {
			padding: 4rem 1.25rem;
		}
	}
</style>
