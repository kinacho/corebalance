<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * La concha de los cinco paneles de la columna de herramientas.
	 *
	 * ⚠️ **Existe porque su CSS estaba escrito cinco veces y las divergencias no eran
	 * cosméticas: eran exactamente las reglas que hacen falta para que quepa una cifra.**
	 * `gap` en la cabecera, `min-width: 0` en el texto y `flex-shrink: 0` en icono y
	 * chevron solo estaban en los dos paneles que ya mostraban un dato en cerrado
	 * (Hacienda y Solapamiento). Añadir cifra a los otros tres sin portarlas reproduce
	 * el defecto que este repo ya pagó en `MapFrame`: un hermano que no encoge deja la
	 * columna de texto en 117 px. Mismo movimiento que `MapFrame` hizo con los mapas.
	 *
	 * ⚠️ **El panel no es dueño de si está abierto.** `abierto` y `onAlternar` vienen del
	 * padre porque la columna abre **una sola herramienta a la vez**, y eso no se puede
	 * decidir dentro de un panel que no sabe de sus hermanos. Además es lo que acota el
	 * alto de la columna, que es lo que hace que el `position: sticky` que ya existía
	 * pase de decorativo a comportamiento.
	 */
	interface Props {
		/** Id del elemento raíz. Lo usan el tutorial y los guards de contraste. */
		id: string;
		titulo: string;
		subtitulo: string;
		abierto: boolean;
		onAlternar: (abrir: boolean) => void;
		/**
		 * Objetivo del evento `tour-step` que abre este panel desde fuera (por ejemplo
		 * `abrir-rebalance`). Es la vía que usan `OnboardingTour`, `e2e/tema.spec.ts` y
		 * `scripts/contraste-vivo.mjs` — un mecanismo que la app ya tiene, no un
		 * enganche de test — y la única forma de medir el contenido de un panel plegado,
		 * porque su cabecera es un `<button>` cuyo estado no se fuerza desde fuera.
		 */
		objetivoTour?: string;
		icono: Snippet;
		/** La cifra o el supuesto que se ve con el panel cerrado. Opcional. */
		cifra?: Snippet;
		children: Snippet;
	}

	const { id, titulo, subtitulo, abierto, onAlternar, objetivoTour, icono, cifra, children }: Props =
		$props();

	$effect(() => {
		if (!objetivoTour) return;
		const abrir = (e: Event) => {
			if ((e as CustomEvent).detail?.target === objetivoTour) onAlternar(true);
		};
		window.addEventListener('tour-step', abrir);
		return () => window.removeEventListener('tour-step', abrir);
	});
</script>

<!--
	`data-abierta` además de la clase, y las dos hacen falta. La clase la lee la guarda de
	`scripts/contraste-vivo.mjs`; el atributo lo lee `prepararDestino()` del tutorial.
	⚠️ **Con una herramienta abierta a la vez, la espera del tutorial se queda vacua**: hoy
	espera a que el destino tenga `height > 0`, y una cabecera plegada siempre la tiene, así
	que driver.js mediría los 64 px de la fila mientras el cuerpo se abre debajo — el mismo
	defecto que ese código dice haber arreglado.
-->
<div {id} class="panel" class:open={abierto} data-abierta={abierto}>
	<button
		class="panel-header"
		onclick={() => onAlternar(!abierto)}
		aria-expanded={abierto}
		aria-controls="{id}-contenido"
	>
		<div class="panel-icon">{@render icono()}</div>
		<div class="panel-text">
			<h2 class="panel-title">{titulo}</h2>
			<p class="panel-subtitle">{subtitulo}</p>
		</div>
		{#if cifra}
			<div class="panel-cifra">{@render cifra()}</div>
		{/if}
		<span class="chevron" class:rotated={!abierto}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<path d="M6 9l6 6 6-6" />
			</svg>
		</span>
	</button>

	<div class="collapsible" class:collapsed={!abierto} id="{id}-contenido">
		<div class="wrapper">
			<div class="content">{@render children()}</div>
		</div>
	</div>
</div>

<style>
	.panel {
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 20px;
		overflow: hidden;
		transition: border-color 0.3s ease;
		/*
		 * Para cuando algo lo abre desde fuera (el tutorial, los guards): que su
		 * cabecera no acabe debajo del header pegajoso, que mide ~81 px y 65 al hacer
		 * scroll. ⚠️ El `top: 6rem` de `.sidebar` **no** es el número equivocado —96
		 * despeja los dos—; lo que le faltaba era esto, no otro `top`.
		 */
		scroll-margin-top: 6.5rem;
	}

	.panel:hover {
		border-color: var(--border-strong);
	}

	/*
	 * Rejilla con áreas y no una fila flex, y el motivo es el móvil: a 390 px la cifra
	 * y el título se pelean por el ancho, que es el defecto de `MapFrame` otra vez. Con
	 * áreas, por debajo de 640 px la cifra baja a una segunda línea sin tocar el DOM.
	 */
	.panel-header {
		width: 100%;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		grid-template-areas: 'icono texto cifra chevron';
		align-items: center;
		gap: 0.35rem 1rem;
		padding: 1.25rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.panel-icon {
		grid-area: icono;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-card-hover);
		border-radius: 12px;
		color: var(--accent-blue-ink);
	}

	/* Un icono sin tamaño propio se estira a la caja que le toque. Ya pasó una vez. */
	.panel-icon :global(svg) {
		width: 20px;
		height: 20px;
	}

	.panel-text {
		grid-area: texto;
		min-width: 0;
	}

	.panel-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		letter-spacing: -0.01em;
	}

	.panel-subtitle {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0.1rem 0 0 0;
	}

	.panel-cifra {
		grid-area: cifra;
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.chevron {
		grid-area: chevron;
		color: var(--text-faint);
		transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		width: 20px;
		height: 20px;
	}

	.chevron.rotated {
		transform: rotate(-90deg);
	}

	.collapsible {
		display: grid;
		grid-template-rows: 1fr;
		transition:
			grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1),
			opacity 0.3s ease;
		opacity: 1;
	}

	.collapsible.collapsed {
		grid-template-rows: 0fr;
		opacity: 0;
		pointer-events: none;
	}

	.wrapper {
		overflow: hidden;
	}

	.content {
		padding: 0 1.25rem 1.25rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	@media (max-width: 639px) {
		.panel-header {
			grid-template-columns: auto minmax(0, 1fr) auto;
			grid-template-areas:
				'icono texto chevron'
				'.     cifra .';
		}

		/* Sin cifra no hay segunda fila que rellenar. */
		.panel-header:not(:has(.panel-cifra)) {
			grid-template-areas: 'icono texto chevron';
		}
	}
</style>
