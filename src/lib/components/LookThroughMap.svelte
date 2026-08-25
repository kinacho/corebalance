<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { squarify, labelFits, truncateToWidth } from '$lib/treemap';
	import { formatEUR, formatPercent } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { etiquetasDeRegion, etiquetasDeSector } from '$lib/etiquetas-indice';
	import { ASSET_COLORS, CHART_NEUTRAL, MAX_CHART_SLICES } from '$lib/constants';
	import MapFrame from './MapFrame.svelte';

	/**
	 * Lo que hay dentro de los fondos: exposición real por región y por sector, y
	 * los pares de posiciones que apuntan a las mismas empresas.
	 *
	 * Es el mapa que sí justifica el formato de rectángulos, porque aquí hay
	 * densidad: una cartera de tres fondos se convierte en nueve regiones y once
	 * sectores. Los porcentajes son **sobre lo analizado**, nunca sobre el
	 * patrimonio total, y lo que se queda fuera se dice en voz alta.
	 */

	interface Props {
		/** Ver las notas de los mismos `props` en `DeviationTreemap.svelte`. */
		showTitle?: boolean;
		expanded?: boolean;
	}

	let { showTitle = true, expanded = $bindable(false) }: Props = $props();

	/**
	 * El ancho real del contenedor manda sobre el de la ventana: en su carril del
	 * carrusel este mapa mide unos 340 px también en escritorio, y ampliado pasa a
	 * más de mil. Ver la nota más larga en `DeviationTreemap.svelte`.
	 */
	let containerWidth = $state(0);

	const VIEW_W = 100;
	const pxPerUnit = $derived(containerWidth > 0 ? containerWidth / VIEW_W : 3.4);
	const isNarrow = $derived(containerWidth > 0 && containerWidth < 460);

	/** Apaisado solo cuando hay ancho; si no, casi cuadrado. */
	const viewH = $derived(containerWidth >= 560 ? 52 : 84);

	function unitsFor(targetPx: number): number {
		return targetPx / pxPerUnit;
	}

	const fontPct = $derived(unitsFor(13));
	const fontLabel = $derived(unitsFor(10));
	const pad = $derived(unitsFor(6));

	let mode = $state<'regions' | 'sectors'>('regions');

	const data = $derived(portfolio.lookThrough);
	const rawSlices = $derived(mode === 'regions' ? data.regions : data.sectors);

	/**
	 * Se muestran las franjas grandes y el resto se agrupa en una sola.
	 *
	 * Con nueve regiones y una paleta de seis tonos validados, las tres últimas
	 * acababan en gris cada una: tres celdas apagadas y sin identidad propia,
	 * cuando además eran astillas ilegibles. Una única franja «Otros» dice lo
	 * mismo con un solo rectángulo, y los nombres exactos siguen en el ranking.
	 *
	 * Ampliado no se agrupa: hay sitio de sobra para todas.
	 */
	/**
	 * Cuántas franjas se dibujan por separado antes de agrupar el resto.
	 *
	 * Va fuera de `slices` porque el rótulo «Otros (N)» necesita el mismo número:
	 * cuando estaba escrito dos veces, el rótulo se quedó con la constante del
	 * carril estrecho y ampliado prometía cuatro regiones agrupando tres.
	 */
	const sliceLimit = $derived(expanded ? ASSET_COLORS.length : MAX_CHART_SLICES - 1);

	const slices = $derived.by(() => {
		if (rawSlices.length <= sliceLimit + 1) return rawSlices;

		const head = rawSlices.slice(0, sliceLimit);
		const tail = rawSlices.slice(sliceLimit);
		return [
			...head,
			{
				key: OTHER_KEY,
				value: tail.reduce((sum, slice) => sum + slice.value, 0),
				weight: tail.reduce((sum, slice) => sum + slice.weight, 0)
			}
		];
	});

	/** Clave sintética de la franja agrupada; no existe en el dataset. */
	const OTHER_KEY = '__other__';

	/**
	 * La misma paleta categórica validada que el resto de la app, asignada **por
	 * posición en el orden** y no por clave: así la región mayor siempre lleva el
	 * primer tono y el mapa se lee igual sea cual sea la cartera.
	 *
	 * Pasado el cupo de tonos validados, el resto va al gris neutro en lugar de
	 * inventar tonos nuevos, que es lo que hacía la paleta anterior de once
	 * `rgba()` a mano con opacidades decrecientes: bajar el alfa sobre fondo
	 * oscuro le quita chroma al tono y acerca los últimos entre sí.
	 */
	function fillFor(index: number, key: string): string {
		if (key === OTHER_KEY) return CHART_NEUTRAL;
		return index < ASSET_COLORS.length ? ASSET_COLORS[index] : CHART_NEUTRAL;
	}

	/**
	 * Color de la muestra de una fila del ranking.
	 *
	 * Tiene que coincidir con lo que se ve en el mapa: las franjas que allí están
	 * dentro de «Otros» llevan aquí el mismo neutro, o la muestra prometería un
	 * rectángulo de color que no existe.
	 */
	function rankFill(index: number): string {
		const drawnIndividually = slices.length > index && slices[index]?.key !== OTHER_KEY;
		return drawnIndividually ? fillFor(index, slices[index].key) : CHART_NEUTRAL;
	}

	const cells = $derived.by(() => {
		const rects = squarify(
			slices.map((slice) => ({ key: slice.key, value: slice.value })),
			VIEW_W,
			viewH
		);
		return rects.map((rect) => {
			const index = slices.findIndex((slice) => slice.key === rect.key);
			const slice = slices[index];
			const full = labelFor(slice.key);

			// El porcentaje manda: es lo que se lee de un vistazo y siempre es corto.
			const pctText = formatPercent(slice.weight, 0);
			const showPct = labelFits(pctText, fontPct, rect.w, pad * 2) && rect.h >= fontPct * 1.5;

			// El nombre solo si hay ancho de sobra, y solo si cabe entero o recortado
			// con sentido. En el carril estrecho se deja al ranking de abajo, porque
			// un mapa lleno de «Consu…» no informa de nada.
			const label = isNarrow ? '' : truncateToWidth(full, fontLabel, rect.w, pad * 2);
			const showLabel = label !== '' && rect.h >= fontPct * 1.4 + fontLabel * 1.5;

			return {
				rect,
				slice,
				full,
				label,
				showLabel,
				pctText,
				showPct,
				fill: fillFor(index, slice.key)
			};
		});
	});

	/**
	 * El id de recorte va por índice, no por clave: sanear texto a
	 * `[A-Za-z0-9_]` puede colisionar, y dos celdas con el mismo recorte hacen que
	 * una escupa su rótulo fuera de su cuadro.
	 */
	function clipId(index: number): string {
		return `lt-clip-${index}`;
	}

	function labelFor(key: string): string {
		if (key === OTHER_KEY) {
			return $LL.charts.other_slices({ count: rawSlices.length - sliceLimit });
		}
		const table = mode === 'regions' ? regionLabels : sectorLabels;
		return table[key] ?? key;
	}

	// Los dos mapas viven en `$lib/etiquetas-indice` desde que la ficha del activo
	// los necesita también: escritos dos veces, una copia se arregla y la otra no.
	const regionLabels = $derived(etiquetasDeRegion($LL));
	const sectorLabels = $derived(etiquetasDeSector($LL));
</script>

<MapFrame
	title={$LL.lookthrough.title()}
	subtitle={$LL.lookthrough.subtitle()}
	{showTitle}
	canExpand={data.coveredValue > 0}
	leccion="lookthrough"
	bind:expanded
	bind:contentWidth={containerWidth}
>
	{#snippet actions()}
		{#if data.coveredValue > 0}
			<div class="mode-switch" role="tablist">
				<button
					role="tab"
					class="mode-btn"
					class:active={mode === 'regions'}
					aria-selected={mode === 'regions'}
					onclick={() => (mode = 'regions')}
				>
					{$LL.lookthrough.tab_regions()}
				</button>
				<button
					role="tab"
					class="mode-btn"
					class:active={mode === 'sectors'}
					aria-selected={mode === 'sectors'}
					onclick={() => (mode = 'sectors')}
				>
					{$LL.lookthrough.tab_sectors()}
				</button>
			</div>
		{/if}
	{/snippet}

	{#if data.coveredValue <= 0}
		<p class="empty">{$LL.lookthrough.empty()}</p>
	{:else}
		{#if cells.length > 0}
			<svg
				class="map"
				viewBox="0 0 {VIEW_W} {viewH}"
				style="aspect-ratio: {VIEW_W} / {viewH}"
				preserveAspectRatio="none"
				role="img"
				aria-label={mode === 'regions'
					? $LL.lookthrough.tab_regions()
					: $LL.lookthrough.tab_sectors()}
			>
				<defs>
					<!-- Recorte por celda: la garantía dura de que ningún rótulo se
					     pinte encima de la celda vecina. -->
					{#each cells as cell, i (cell.slice.key)}
						<clipPath id={clipId(i)}>
							<rect
								x={cell.rect.x}
								y={cell.rect.y}
								width={cell.rect.w}
								height={cell.rect.h}
							/>
						</clipPath>
					{/each}
				</defs>

				{#each cells as cell, i (cell.slice.key)}
					<g>
						<title>{cell.full}: {formatPercent(cell.slice.weight, 1)}</title>
						<rect
							x={cell.rect.x}
							y={cell.rect.y}
							width={cell.rect.w}
							height={cell.rect.h}
							fill={cell.fill}
							stroke="rgba(5, 5, 10, 0.9)"
							stroke-width={unitsFor(2)}
							rx={unitsFor(3)}
						/>
						<g clip-path="url(#{clipId(i)})">
							{#if cell.showPct}
								<text
									class="cell-pct"
									x={cell.rect.x + pad}
									y={cell.rect.y + pad + fontPct * 0.85}
									font-size={fontPct}
								>
									{cell.pctText}
								</text>
							{/if}
							{#if cell.showLabel}
								<text
									class="cell-label"
									x={cell.rect.x + pad}
									y={cell.rect.y + pad + fontPct * 0.85 + fontLabel * 1.3}
									font-size={fontLabel}
								>
									{cell.label}
								</text>
							{/if}
						</g>
					</g>
				{/each}
			</svg>
		{/if}

		<!-- En el carril estrecho el mapa no lleva nombres, así que el ranking es
		     donde el usuario lee de qué es cada rectángulo: va una fila más largo.
		     Ampliado caben todas las franjas, que es media razón para ampliar. -->
		<!-- El ranking va sobre las franjas **sin agrupar**: el mapa junta la cola en
		     «Otros» para no llenarse de grises, pero aquí es donde el usuario lee los
		     nombres exactos, así que agruparlos otra vez sería perder el dato. -->
		<ol class="ranking">
			{#each rawSlices.slice(0, expanded ? rawSlices.length : isNarrow ? 6 : 5) as slice, i (slice.key)}
				<li class="rank-row">
					<span class="rank-swatch" aria-hidden="true" style="background: {rankFill(i)}"></span>
					<span class="rank-label">{labelFor(slice.key)}</span>
					<span class="rank-bar" aria-hidden="true">
						<i style="width: {(slice.weight * 100).toFixed(1)}%"></i>
					</span>
					<span class="rank-pct">{formatPercent(slice.weight, 1)}</span>
				</li>
			{/each}
		</ol>

		<!--
			Las notas van plegadas: son cuatro o cinco líneas de letra pequeña que se
			leen una vez, y desplegadas hacían de este panel el más alto del
			carrusel, lo que estira a todos los demás.

			El aviso de estimación se queda **fuera** del plegado a propósito: dice
			que una cifra del mapa no está contrastada, y eso no puede depender de
			que al usuario le apetezca abrir un desplegable.
		-->
		{#if data.estimatedIndices.length > 0}
			<p class="note estimated">
				{$LL.lookthrough.estimated_warning({ indices: data.estimatedIndices.join(', ') })}
			</p>
		{/if}

		<details class="notes">
			<summary class="notes-summary">{$LL.lookthrough.notes_summary()}</summary>
			<div class="notes-body">
				<p class="note">
					{$LL.lookthrough.coverage_note({ amount: formatEUR(data.coveredValue) })}
				</p>
				{#if data.uncoveredValue > 0}
					<p class="note">
						{$LL.lookthrough.uncovered({
							amount: formatEUR(data.uncoveredValue),
							tickers: data.uncoveredTickers.slice(0, 6).join(', ')
						})}
					</p>
				{/if}
				{#if mode === 'sectors' && data.noSectorValue > 0}
					<p class="note">
						{$LL.lookthrough.no_sector({ amount: formatEUR(data.noSectorValue) })}
					</p>
				{/if}
				<p class="note">{$LL.lookthrough.as_of({ date: data.asOf })}</p>
				<p class="note">{$LL.lookthrough.disclaimer()}</p>
			</div>
		</details>
	{/if}
</MapFrame>

<style>
	/* El título, el subtítulo y el botón de ampliar los pone `MapFrame`. */
	.mode-switch {
		display: flex;
		gap: 0.25rem;
		background: var(--bg-card-hover);
		border-radius: 999px;
		padding: 0.2rem;
		align-self: flex-start;
	}

	.mode-btn {
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0.3rem 0.7rem;
		border-radius: 999px;
		border: none;
		background: none;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.mode-btn.active {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary);
	}

	.map {
		width: 100%;
		height: auto;
		border-radius: 12px;
		display: block;
		/* La proporción la fija el atributo `style` en línea, porque cambia con el
		   ancho de pantalla y el viewBox no se puede tocar desde una media query. */
	}

	.map :global(text) {
		pointer-events: none;
		user-select: none;
		font-variant-numeric: tabular-nums;
	}

	.cell-pct {
		fill: rgba(255, 255, 255, 0.97);
		font-weight: 700;
	}

	.cell-label {
		fill: rgba(255, 255, 255, 0.8);
		font-weight: 600;
	}

	.ranking {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.rank-row {
		display: grid;
		grid-template-columns: 9px minmax(80px, 1fr) 2fr auto;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.72rem;
	}

	/* La muestra de color es lo que ata cada fila a su rectángulo del mapa. Sin
	   ella, en móvil (donde el mapa no lleva nombres) las dos cosas no se
	   relacionan entre sí. */
	.rank-swatch {
		width: 9px;
		height: 9px;
		border-radius: 3px;
		display: inline-block;
	}

	.rank-label {
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rank-bar {
		height: 6px;
		background: var(--bg-card-hover);
		border-radius: 999px;
		overflow: hidden;
	}

	.rank-bar i {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, var(--accent-blue), var(--accent-green));
		border-radius: 999px;
	}

	.rank-pct {
		font-weight: 700;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.notes {
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-subtle);
	}

	.notes-summary {
		font-size: 0.68rem;
		color: var(--text-muted);
		cursor: pointer;
		list-style: none;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0;
	}

	.notes-summary::-webkit-details-marker {
		display: none;
	}

	.notes-summary::before {
		content: '▸';
		font-size: 0.6rem;
		transition: transform 0.2s ease;
	}

	.notes[open] .notes-summary::before {
		transform: rotate(90deg);
	}

	.notes-body {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding-top: 0.35rem;
	}

	.note {
		font-size: 0.65rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.5;
	}

	.note.estimated {
		color: var(--accent-orange-ink);
		opacity: 0.85;
	}

	.empty {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin: 0;
		padding: 1rem;
		background: var(--bg-card-hover);
		border-radius: 12px;
	}

	@media (max-width: 640px) {
		/* El selector región/sector pasa a ocupar todo el ancho: dos objetivos
		   grandes se aciertan con el pulgar, dos pastillas de 70 px no. */
		.mode-switch {
			width: 100%;
		}

		.mode-btn {
			flex: 1;
			padding: 0.55rem 0.5rem;
			font-size: 0.72rem;
		}

		.rank-row {
			/* Sin la barra: en 340 px de ancho robaba sitio al nombre, que es lo
			   que hay que poder leer. */
			grid-template-columns: 9px 1fr auto;
			font-size: 0.78rem;
			gap: 0.55rem;
		}

		.rank-bar {
			display: none;
		}

		.note {
			font-size: 0.68rem;
		}
	}
</style>
