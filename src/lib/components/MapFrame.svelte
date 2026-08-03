<script lang="ts">
	import type { Snippet } from 'svelte';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { focusTrap } from '$lib/actions/focusTrap';

	/**
	 * Marco común de los dos mapas: cabecera, botón de ampliar y vista ampliada.
	 *
	 * Los mapas viven en un carril del carrusel de gráficos, que es estrecho — unos
	 * 340 px, también en escritorio. Ahí caben pocos rótulos, así que hace falta
	 * poder verlos en grande, y esto es ese mecanismo.
	 *
	 * ⚠️ **La ampliación no monta un segundo mapa.** Se aplica una clase al mismo
	 * contenedor y el contenido se recoloca por CSS. Duplicar el componente daría
	 * dos instancias con estado propio, y el selector región/sector del mapa del
	 * subyacente aparecería descoordinado entre la vista pequeña y la grande.
	 *
	 * `contentWidth` sale hacia fuera con `bind:` porque el tamaño de letra de los
	 * mapas se deriva del ancho real en píxeles, no de una media query: es el ancho
	 * del contenedor lo que decide cuántos rótulos caben.
	 */

	interface Props {
		title: string;
		subtitle: string;
		showTitle?: boolean;
		/** Sin datos no hay nada que ampliar, así que el botón se oculta. */
		canExpand?: boolean;
		expanded?: boolean;
		contentWidth?: number;
		children: Snippet;
	}

	let {
		title,
		subtitle,
		showTitle = true,
		canExpand = true,
		expanded = $bindable(false),
		contentWidth = $bindable(0),
		children
	}: Props = $props();

	/**
	 * Bloqueo de scroll del cuerpo mientras está ampliado, con la clase que ya usa
	 * el resto de los modales de la app.
	 */
	$effect(() => {
		if (!expanded) return;
		document.body.classList.add('modal-open');
		return () => document.body.classList.remove('modal-open');
	});

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && expanded) expanded = false;
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if expanded}
	<!-- Fondo que cierra al pulsar fuera. El diálogo de dentro detiene la
	     propagación para que un clic en el mapa no lo cierre. -->
	<div
		class="backdrop"
		onclick={() => (expanded = false)}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') expanded = false;
		}}
		role="presentation"
	></div>
{/if}

<div class="frame" class:is-expanded={expanded}>
	<div
		class="panel"
		class:is-expanded={expanded}
		role={expanded ? 'dialog' : undefined}
		aria-modal={expanded ? 'true' : undefined}
		aria-label={expanded ? $LL.charts.expanded_aria({ name: title }) : undefined}
		onclick={(e) => expanded && e.stopPropagation()}
		onkeydown={(e) => expanded && e.stopPropagation()}
		use:focusTrap
	>
		<div class="head">
			<div class="head-text">
				{#if showTitle || expanded}
					<h4 class="title">{title}</h4>
				{/if}
				<p class="subtitle">{subtitle}</p>
			</div>

			{#if canExpand}
				<button
					type="button"
					class="toggle"
					onclick={() => (expanded = !expanded)}
					aria-label={expanded ? $LL.charts.collapse() : $LL.charts.expand()}
					title={expanded ? $LL.charts.collapse() : $LL.charts.expand()}
				>
					{#if expanded}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<path d="M6 6l12 12M18 6L6 18" />
						</svg>
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
							<path d="M9 3H3v6M15 21h6v-6M3 3l7 7M21 21l-7-7" />
						</svg>
					{/if}
				</button>
			{/if}
		</div>

		<div class="content" bind:clientWidth={contentWidth}>
			{@render children()}
		</div>
	</div>
</div>

<style>
	.frame {
		width: 100%;
		min-width: 0;
	}

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

	.title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.subtitle {
		font-size: 0.72rem;
		color: rgba(160, 160, 200, 0.6);
		margin: 0.15rem 0 0 0;
		line-height: 1.4;
	}

	.toggle {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 7px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 9px;
		color: rgba(255, 255, 255, 0.55);
		cursor: pointer;
		transition: all 0.18s ease;
	}

	.toggle:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
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

	/* --- Vista ampliada --- */

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 900;
		background: rgba(3, 3, 8, 0.82);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}

	.panel.is-expanded {
		position: fixed;
		z-index: 901;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(1100px, 94vw);
		max-height: 92vh;
		overflow-y: auto;
		padding: 1.25rem 1.35rem 1.5rem;
		background: #0d0d16;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 24px;
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
	}

	.panel.is-expanded .title {
		font-size: 1.05rem;
	}

	.panel.is-expanded .subtitle {
		font-size: 0.8rem;
	}

	@media (max-width: 640px) {
		.panel.is-expanded {
			width: 96vw;
			max-height: 94vh;
			padding: 1rem 1rem 1.25rem;
			border-radius: 20px;
		}
	}
</style>
