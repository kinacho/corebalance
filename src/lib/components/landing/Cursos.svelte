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
	const porCurso = (slug: string) => getLecciones(slug).length;
</script>

<section id="cursos" class="cursos-section" aria-labelledby="cursos-heading">
	<div class="wrap">
		<p class="eyebrow"><span class="badge">Nuevo</span> Cursos · gratis</p>
		<h2 id="cursos-heading">Aprende a invertir en indexados sin que nadie te venda nada</h2>
		<p class="intro">
			{cursos.length} cursos, {lecciones} lecciones y un ejercicio en la herramienta al final de cada
			una. Al acabar tienes una cartera montada, no unos apuntes.
		</p>

		<!--
			⚠️ El primero ocupa dos columnas. No es decoración: en una rejilla de cinco
			tarjetas iguales no hay ninguna entrada evidente, y el curso 1 es el único que
			sirve a quien todavía no tiene cartera — que es justo quien llega desde una
			búsqueda informativa. Que la jerarquía se vea evita que el lector tenga que
			elegir entre cinco cosas que no conoce.
		-->
		<ul class="grid">
			{#each cursos as c, i}
				<li class:destacado={i === 0}>
					<a href={`/cursos/${c.slug}`}>
						<span class="cabeza">
							<span class="num">{String(i + 1).padStart(2, '0')}</span>
							<span class="lecciones">{porCurso(c.slug)} lecciones</span>
						</span>
						<span class="nivel">{c.nivel}</span>
						<h3>{c.titulo}</h3>
						<p>{c.gancho}</p>
						{#if i === 0}<span class="empezar">Empieza por aquí →</span>{/if}
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
	/*
	 * ⚠️ Esta sección se dibuja como un panel con borde y no como una franja más de la
	 * landing, que es lo que era. El resto de bloques comparten fondo y se leen como un
	 * continuo; sacar este a una superficie propia es lo que hace que se lea como algo
	 * aparte y reciente, sin subir el tamaño de la tipografía ni gritar en ningún sitio.
	 */
	.cursos-section {
		padding: 4rem 1.5rem;
		/*
		 * La barra de navegación es fija, así que al saltar a `#cursos` la cabecera del
		 * bloque —el distintivo «Nuevo» incluido— queda debajo de ella. Se ve al hacer la
		 * captura, no leyendo el CSS.
		 */
		scroll-margin-top: 5.5rem;
	}
	.wrap {
		position: relative;
		max-width: 1150px;
		margin: 0 auto;
		padding: 3rem 2.5rem 2.5rem;
		/* Mismo par que el kit de las lecciones: es el mismo azul y el mismo problema de
		   alfa calibrada para fondo oscuro. El blanco al 2 % del segundo plano no era
		   superficie ninguna sobre una página clara. */
		border: 1px solid var(--tint-info-line);
		border-radius: 28px;
		background:
			radial-gradient(120% 90% at 0% 0%, var(--tint-info), transparent 60%),
			var(--bg-card);
		overflow: hidden;
	}
	/* La línea de acento del borde superior: marca el bloque sin añadir ningún texto. */
	.wrap::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 0;
		height: 2px;
		background: linear-gradient(90deg, var(--accent-blue), var(--accent-green), transparent);
	}
	.eyebrow {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0 0 0.9rem;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent-green-ink);
	}
	.badge {
		padding: 0.2rem 0.55rem;
		border-radius: 9999px;
		background: var(--accent-blue);
		color: var(--text-on-accent);
		font-size: 0.62rem;
		letter-spacing: 0.09em;
	}
	h2 {
		margin: 0 0 1rem;
		font-size: clamp(1.9rem, 4.5vw, 2.9rem);
		line-height: 1.12;
		letter-spacing: -0.02em;
		color: var(--text-primary);
		max-width: 20ch;
	}
	.intro {
		margin: 0 0 3rem;
		max-width: 58ch;
		font-size: 1.05rem;
		line-height: 1.65;
		color: var(--text-muted);
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
		border: 1px solid var(--border-subtle);
		border-radius: 18px;
		background: var(--bg-card);
		text-decoration: none;
		transition:
			border-color 0.2s ease,
			transform 0.2s ease;
	}
	.grid a:hover {
		border-color: var(--border-strong);
		transform: translateY(-2px);
	}
	.grid li.destacado {
		grid-column: span 2;
	}
	.destacado a {
		border-color: var(--tint-info-line);
		background: var(--tint-info);
	}
	.destacado h3 {
		font-size: 1.35rem;
	}
	.empezar {
		display: inline-block;
		margin-top: 0.9rem;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--accent-blue-ink);
	}
	.cabeza {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.8rem;
	}
	.num {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		color: var(--text-faint);
		font-variant-numeric: tabular-nums;
	}
	.lecciones {
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-faint);
		font-variant-numeric: tabular-nums;
	}
	.nivel {
		display: block;
		margin-top: 0.35rem;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-blue-ink);
	}
	.grid h3 {
		margin: 0.55rem 0 0.6rem;
		font-size: 1.12rem;
		line-height: 1.3;
		color: var(--text-primary);
	}
	.grid p {
		margin: 0;
		font-size: 0.88rem;
		line-height: 1.6;
		color: var(--text-muted);
	}
	.pie {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-subtle);
	}
	.gratis {
		margin: 0;
		max-width: 62ch;
		font-size: 0.82rem;
		line-height: 1.65;
		color: var(--text-muted);
	}
	.gratis strong {
		color: var(--text-secondary);
	}
	.todos {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--accent-blue-ink);
		text-decoration: none;
		white-space: nowrap;
	}

	/*
	 * Por debajo de dos columnas, «ocupar dos» no significa nada y dejaría un hueco.
	 * El destacado se sigue distinguiendo por el color del borde y por su enlace.
	 */
	@media (max-width: 719px) {
		.grid li.destacado {
			grid-column: auto;
		}
	}

	@media (max-width: 640px) {
		.cursos-section {
			padding: 2.5rem 0.9rem;
		}
		.wrap {
			padding: 2.25rem 1.35rem 1.75rem;
			border-radius: 22px;
		}
	}
</style>
