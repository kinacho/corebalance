<script lang="ts">
	import type { Snippet } from 'svelte';
	import { LL } from '$lib/i18n/i18n-svelte';
	import LeccionDelPanel from './LeccionDelPanel.svelte';
	import type { PanelConLeccion } from '$lib/cursos-paneles';

	/**
	 * Marco común de los dos mapas: cabecera, subtítulo y botón de ampliar.
	 *
	 * **Ampliar no abre un modal, ensancha el panel en su sitio.** La primera
	 * versión sí era un modal y traía todos los problemas de un modal a cambio de
	 * nada: bloqueaba el scroll de la página con `body.modal-open`, se quedaba
	 * bloqueado si se cerraba con Escape, y en móvil ocultaba su propio botón de
	 * cerrar. Ensanchar en línea no tiene ninguno de esos estados.
	 *
	 * Quién decide el ancho es la rejilla del carrusel, no este componente: un
	 * elemento de rejilla no puede salirse de su carril por sí mismo. Así que
	 * `expanded` sube al dashboard con `bind:`, y allí el carril pasa a ocupar la
	 * fila entera.
	 *
	 * Y no hay que tocar tamaños de letra ni proporciones al ampliar: los mapas los
	 * derivan de `contentWidth`, así que en cuanto el carril se ensancha, el
	 * contenido se recalcula solo.
	 */

	interface Props {
		title: string;
		subtitle: string;
		showTitle?: boolean;
		/** Sin datos no hay nada que ampliar, así que el botón se oculta. */
		canExpand?: boolean;
		expanded?: boolean;
		contentWidth?: number;
		/**
		 * Controles propios del mapa, que van **en la cabecera** y no encima del
		 * lienzo. Así los dos mapas tienen la misma estructura —cabecera, lienzo— y
		 * sus lienzos arrancan a la misma altura cuando están uno al lado del otro.
		 */
		actions?: Snippet;
		/**
		 * Panel del que enlazar su lección, si tiene una.
		 *
		 * Va aquí y no en el dashboard porque el orden importa: el enlace tiene que ir
		 * **debajo del subtítulo**, y el subtítulo lo dibuja este componente. Puesto fuera,
		 * el enlace salía entre el título del carril y el subtítulo del mapa.
		 */
		leccion?: PanelConLeccion;
		children: Snippet;
	}

	let {
		title,
		subtitle,
		showTitle = true,
		canExpand = true,
		expanded = $bindable(false),
		contentWidth = $bindable(0),
		actions,
		leccion,
		children
	}: Props = $props();
</script>

<div class="panel">
	<!--
		`con-acciones` existe para la media query de móvil de abajo, y se decide aquí
		porque es el único sitio que sabe si el hueco `actions` trae algo: el mapa de
		desviación no lo usa, y apilarle la cabecera le añadiría una fila vacía.
	-->
	<div class="head" class:con-acciones={!!actions}>
		<div class="head-text">
			{#if showTitle}
				<h4 class="title">{title}</h4>
			{/if}
			<p class="subtitle">{subtitle}</p>
			{#if leccion}
				<LeccionDelPanel panel={leccion} />
			{/if}
		</div>

		<div class="head-actions">
			{#if actions}{@render actions()}{/if}

			{#if canExpand}
				<button
					type="button"
					class="toggle"
				onclick={() => (expanded = !expanded)}
				aria-expanded={expanded}
				aria-label={expanded ? $LL.charts.collapse() : $LL.charts.expand()}
				title={expanded ? $LL.charts.collapse() : $LL.charts.expand()}
			>
				{#if expanded}
					<!-- Flechas hacia dentro: reducir -->
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
						<path d="M10 4v6H4M14 20v-6h6M4 4l6 6M20 20l-6-6" />
					</svg>
				{:else}
					<!-- Flechas hacia fuera: ampliar -->
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
						<path d="M9 3H3v6M15 21h6v-6M3 3l7 7M21 21l-7-7" />
					</svg>
				{/if}
			</button>
		{/if}
	</div>

	</div>

	<div class="content" bind:clientWidth={contentWidth}>
		{@render children()}
	</div>
</div>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		min-width: 0;
	}

	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.6rem;
	}

	.head-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.head-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.subtitle {
		font-size: 0.72rem;
		color: var(--text-muted);
		margin: 0.15rem 0 0 0;
		line-height: 1.4;
		/* Alto de dos líneas reservado siempre. Los subtítulos de los dos mapas no
		   ocupan lo mismo —uno envuelve en dos líneas y el otro en una— y sin esto
		   sus lienzos arrancaban a alturas distintas cuando van uno al lado del
		   otro. */
		min-height: calc(2 * 0.72rem * 1.4);
	}

	.toggle {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 7px;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 9px;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.18s ease;
	}

	.toggle:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.toggle svg {
		width: 100%;
		height: 100%;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}

	/*
	 * Ampliar solo tiene sentido en escritorio.
	 *
	 * Ahí el mapa vive en un carril de unos 340 px dentro de una tarjeta de 1100,
	 * así que ocupar la fila entera lo triplica. En móvil el carrusel ya da un
	 * carril de pantalla completa: no hay nada que ganar.
	 */
	@media (max-width: 1023px) {
		.toggle {
			display: none;
		}
	}

	/*
	 * ⚠️ **En móvil la cabecera se apila, y eso arregla DOS defectos que tenían una
	 * sola causa.**
	 *
	 * `.head-actions` es `flex-shrink: 0`, así que el conmutador región/sector se
	 * quedaba el ancho que pedía su contenido y `.head-text` se comía el resto:
	 * medido a 390 px, **117,2 px** en el mapa del subyacente. De ahí salían las dos
	 * cosas que se ven mal y que parecían no tener nada que ver:
	 *
	 * - El enlace a la lección medía **305,5 px** dentro de esos 117,2 — se salía
	 *   188,3 px por la derecha.
	 * - Las dos pastillas quedaban a **73,4 px**, con lo que «Por región» partía en
	 *   dos líneas y el botón crecía a 52,1 px de alto. Se leen como demasiado
	 *   grandes justo por ser demasiado estrechos.
	 *
	 * Y el `width: 100%` que `.mode-switch` ya declaraba —con el comentario de que
	 * son «dos objetivos grandes» para el pulgar— no podía cumplirse nunca: era el
	 * 100 % de un hermano estrecho, no del panel. Apilando, el carril de 316 px es
	 * suyo entero y las dos pastillas pasan a ~156 px en una sola línea.
	 */
	@media (max-width: 640px) {
		.head.con-acciones {
			flex-wrap: wrap;
		}

		.head.con-acciones .head-text {
			flex: 1 1 100%;
		}

		.head.con-acciones .head-actions {
			width: 100%;
		}
	}
</style>
