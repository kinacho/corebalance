<script lang="ts">
	import { leccionDePanel, type PanelConLeccion } from '$lib/cursos-paneles';

	/**
	 * Enlace a la lección que explica este panel.
	 *
	 * Lleva el **título de la lección** y no un genérico «saber más»: un genérico no dice
	 * qué vas a leer, y por eso no se pulsa. El prefijo «Lección» da el contexto de que es
	 * parte de un curso, que sin él parecería un enlace cualquiera.
	 *
	 * Va en su propia línea y no en la fila del título del panel: el carril de la deriva
	 * mide unos 430 px en escritorio, así que el título del panel más el de la lección no
	 * caben en una línea — medido, no supuesto.
	 *
	 * ⚠️ **`target="_blank"` es obligatorio.** `dashboard/+page.svelte` tiene un
	 * `beforeNavigate` que llama a `exitDemo()` al salir, así que un enlace en la misma
	 * pestaña destruye la sesión demo de quien entró por la cartera de ejemplo. El porqué
	 * completo está en `cursos-paneles.ts`.
	 *
	 * No lleva texto de «se abre en una pestaña nueva» porque el icono lo dice y el
	 * `aria-label` lo declara.
	 */
	interface Props {
		panel: PanelConLeccion;
	}

	let { panel }: Props = $props();

	const leccion = $derived(leccionDePanel(panel));
</script>

<a
	class="leccion-link"
	href={leccion.ruta}
	target="_blank"
	rel="noopener"
	aria-label={`Lección: ${leccion.titulo} (se abre en una pestaña nueva)`}
>
	<span class="etiqueta">Lección</span>
	<span class="titulo">{leccion.titulo}</span>
	<svg
		class="flecha"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M7 17L17 7" />
		<path d="M9 7h8v8" />
	</svg>
</a>

<style>
	.leccion-link {
		display: inline-flex;
		/*
		 * ⚠️ `inline-flex` no basta: dentro de un contenedor flex en columna —que es lo que
		 * es `.timing-card`— el hijo se estira, y el enlace medía 1216 px de ancho. Su área
		 * pulsable era toda la tarjeta, invisible y a lo ancho. Medido, no deducido.
		 */
		align-self: flex-start;
		/*
		 * ⚠️ **Sin esto el recorte de `.titulo` no se aplicaba nunca.** `inline-flex`
		 * más `align-self: flex-start` dimensionan el enlace por su contenido, así que
		 * `.titulo` jamás recibía un ancho que lo obligara a encoger y los puntos
		 * suspensivos que declara más abajo eran código muerto: en la cabecera del
		 * mapa del subyacente en móvil el enlace medía **305,5 px dentro de 117,2** y
		 * simplemente se salía. El comentario describía un comportamiento que no
		 * existía, que es la forma de fallo que este repo ya tiene fichada.
		 */
		max-width: 100%;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.85rem;
		color: var(--text-muted);
		font-size: var(--text-micro);
		text-decoration: none;
		line-height: 1.3;
		/* Área táctil: el texto es pequeño a propósito, el objetivo no puede serlo. */
		padding: 0.35rem 0;
		min-height: 32px;
		transition: color 0.2s ease;
	}

	.etiqueta {
		flex: none;
		padding: 0.1rem 0.35rem;
		border-radius: 5px;
		background: var(--bg-card-hover);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 700;
	}

	.titulo {
		/* En un carril estrecho el título se recorta en vez de empujar el panel. */
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		/*
		 * La otra mitad de lo mismo: un hijo flex nace con `min-width: auto`, o sea
		 * que se niega a bajar del ancho de su texto. Sin bajarlo a 0 el `overflow`
		 * de arriba no tiene nada que recortar.
		 */
		min-width: 0;
	}

	.flecha {
		flex: none;
		/* A 0,75em con `--text-micro` la flecha medía 9 px y no se leía como flecha. */
		width: 1em;
		height: 1em;
		opacity: 0.8;
	}

	.leccion-link:hover,
	.leccion-link:focus-visible {
		color: var(--accent-blue-ink);
	}

	.leccion-link:hover .flecha,
	.leccion-link:focus-visible .flecha {
		opacity: 1;
	}
</style>
