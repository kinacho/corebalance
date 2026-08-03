<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { squarify, labelFits, truncateToWidth } from '$lib/treemap';
	import { formatEUR, formatPercent } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { INDICES } from '$lib/lookthrough';
	import { isNarrowViewport } from '$lib/viewport.svelte';

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
		/** Ver la nota del mismo `prop` en `DeviationTreemap.svelte`. */
		showTitle?: boolean;
	}

	let { showTitle = true }: Props = $props();

	const narrow = isNarrowViewport();

	/**
	 * Igual que el treemap de desviación: en móvil el lienzo se acerca al cuadrado
	 * y las letras crecen, porque un rótulo de 8 px no lo lee nadie.
	 *
	 * Aquí además los nombres son largos de verdad («Consumo discrecional»,
	 * «Asia emergente»), así que en pantalla estrecha las celdas muestran **solo
	 * el porcentaje** y los nombres se leen en el ranking de debajo, que ya los
	 * lista completos. Es preferible a un mapa lleno de «Consu…».
	 */
	const VIEW_W = 100;
	// Ver la nota del mismo valor en `DeviationTreemap.svelte`: este panel es el
	// más alto del carrusel y marca el alto de todos los demás.
	const viewH = $derived(narrow.matches ? 88 : 55);
	const fontLabel = $derived(narrow.matches ? 3.6 : 2.5);
	const fontPct = $derived(narrow.matches ? 4.6 : 2.8);
	const pad = $derived(narrow.matches ? 2.2 : 1.5);

	let mode = $state<'regions' | 'sectors'>('regions');

	const data = $derived(portfolio.lookThrough);
	const slices = $derived(mode === 'regions' ? data.regions : data.sectors);

	/**
	 * Paleta por posición en el orden, no por clave. Así la región mayor siempre
	 * es el azul más fuerte y el mapa se lee igual sea cual sea la cartera.
	 */
	const PALETTE = [
		'rgba(59, 130, 246, 0.75)',
		'rgba(16, 185, 129, 0.7)',
		'rgba(139, 92, 246, 0.7)',
		'rgba(245, 158, 11, 0.7)',
		'rgba(6, 182, 212, 0.65)',
		'rgba(236, 72, 153, 0.6)',
		'rgba(132, 204, 22, 0.6)',
		'rgba(249, 115, 22, 0.55)',
		'rgba(168, 85, 247, 0.5)',
		'rgba(14, 165, 233, 0.5)',
		'rgba(244, 63, 94, 0.45)'
	];

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

			// El nombre solo en pantalla ancha, y solo si cabe entero o recortado
			// con sentido. En móvil se deja al ranking de abajo.
			const label = narrow.matches ? '' : truncateToWidth(full, fontLabel, rect.w, pad * 2);
			const showLabel = label !== '' && rect.h >= fontPct * 1.4 + fontLabel * 1.5;

			return {
				rect,
				slice,
				full,
				label,
				showLabel,
				pctText,
				showPct,
				fill: PALETTE[index % PALETTE.length]
			};
		});
	});

	/** Un id de clipPath válido: las claves son seguras, pero por si cambian. */
	function clipId(key: string): string {
		return `lt-clip-${key.replace(/[^a-zA-Z0-9]/g, '_')}`;
	}

	function labelFor(key: string): string {
		const table = mode === 'regions' ? regionLabels : sectorLabels;
		return table[key] ?? key;
	}

	// Se construyen como objetos en lugar de un `switch` para que un día que
	// aparezca una clave nueva en el dataset, el test de integridad la cace antes
	// de que salga en pantalla como texto crudo.
	const regionLabels = $derived<Record<string, string>>({
		us: $LL.lookthrough.region_us(),
		canada: $LL.lookthrough.region_canada(),
		eurozone: $LL.lookthrough.region_eurozone(),
		uk: $LL.lookthrough.region_uk(),
		europe_other: $LL.lookthrough.region_europe_other(),
		japan: $LL.lookthrough.region_japan(),
		pacific_ex_japan: $LL.lookthrough.region_pacific_ex_japan(),
		emerging_asia: $LL.lookthrough.region_emerging_asia(),
		emerging_other: $LL.lookthrough.region_emerging_other()
	});

	const sectorLabels = $derived<Record<string, string>>({
		tech: $LL.lookthrough.sector_tech(),
		financials: $LL.lookthrough.sector_financials(),
		healthcare: $LL.lookthrough.sector_healthcare(),
		consumer_disc: $LL.lookthrough.sector_consumer_disc(),
		industrials: $LL.lookthrough.sector_industrials(),
		communication: $LL.lookthrough.sector_communication(),
		consumer_staples: $LL.lookthrough.sector_consumer_staples(),
		energy: $LL.lookthrough.sector_energy(),
		materials: $LL.lookthrough.sector_materials(),
		utilities: $LL.lookthrough.sector_utilities(),
		real_estate: $LL.lookthrough.sector_real_estate()
	});

	function indexName(key: string): string {
		return INDICES[key]?.name ?? key;
	}
</script>

<div class="lookthrough">
	<div class="head">
		<div>
			{#if showTitle}
				<h4 class="title">{$LL.lookthrough.title()}</h4>
			{/if}
			<p class="subtitle">{$LL.lookthrough.subtitle()}</p>
		</div>
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
	</div>

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
					{#each cells as cell (cell.slice.key)}
						<clipPath id={clipId(cell.slice.key)}>
							<rect
								x={cell.rect.x}
								y={cell.rect.y}
								width={cell.rect.w}
								height={cell.rect.h}
							/>
						</clipPath>
					{/each}
				</defs>

				{#each cells as cell (cell.slice.key)}
					<g>
						<title>{cell.full}: {formatPercent(cell.slice.weight, 1)}</title>
						<rect
							x={cell.rect.x}
							y={cell.rect.y}
							width={cell.rect.w}
							height={cell.rect.h}
							fill={cell.fill}
							stroke="rgba(5, 5, 10, 0.85)"
							stroke-width="0.4"
							rx="0.8"
						/>
						<g clip-path="url(#{clipId(cell.slice.key)})">
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

		<!-- En móvil el mapa no lleva nombres, así que el ranking es donde el
		     usuario lee de qué es cada rectángulo: va una fila más largo que en
		     escritorio, pero sin dispararse, porque este panel marca el alto de
		     todo el carrusel. -->
		<ol class="ranking">
			{#each slices.slice(0, narrow.matches ? 6 : 5) as slice (slice.key)}
				<li class="rank-row">
					<span class="rank-swatch" aria-hidden="true" style="background: {cells.find((c) => c.slice.key === slice.key)?.fill ?? 'transparent'}"></span>
					<span class="rank-label">{labelFor(slice.key)}</span>
					<span class="rank-bar" aria-hidden="true">
						<i style="width: {(slice.weight * 100).toFixed(1)}%"></i>
					</span>
					<span class="rank-pct">{formatPercent(slice.weight, 1)}</span>
				</li>
			{/each}
		</ol>

		{#if data.overlaps.length > 0}
			<section class="overlaps">
				<h5 class="overlap-heading">⚠️ {$LL.lookthrough.overlap_heading()}</h5>
				{#each data.overlaps.slice(0, narrow.matches ? 2 : 4) as overlap (overlap.tickerA + overlap.tickerB)}
					<p class="overlap-row">
						{$LL.lookthrough.overlap_row({
							a: overlap.nameA,
							b: overlap.nameB,
							amount: formatEUR(overlap.duplicatedValue),
							pct: formatPercent(overlap.duplicatedWeight, 1)
						})}
						{#if overlap.note === 'same-index'}
							<span class="overlap-note">{$LL.lookthrough.overlap_same_index()}</span>
						{:else}
							<span class="overlap-note">{overlap.note}</span>
						{/if}
						<span class="overlap-indices">
							{indexName(overlap.indexA)} · {indexName(overlap.indexB)}
						</span>
					</p>
				{/each}
			</section>
		{/if}

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
</div>

<style>
	.lookthrough {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
	}

	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.title {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.subtitle {
		font-size: 0.7rem;
		color: rgba(160, 160, 200, 0.6);
		margin: 0.15rem 0 0 0;
	}

	.mode-switch {
		display: flex;
		gap: 0.25rem;
		background: rgba(0, 0, 0, 0.25);
		border-radius: 999px;
		padding: 0.2rem;
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
		background: rgba(255, 255, 255, 0.06);
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

	.overlaps {
		padding: 0.75rem;
		background: rgba(245, 158, 11, 0.07);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: 14px;
	}

	.overlap-heading {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--accent-orange);
		margin: 0 0 0.5rem 0;
	}

	.overlap-row {
		font-size: 0.72rem;
		color: var(--text-muted);
		margin: 0 0 0.6rem 0;
		line-height: 1.5;
	}

	.overlap-row:last-child {
		margin-bottom: 0;
	}

	.overlap-note {
		display: block;
		color: rgba(160, 160, 200, 0.55);
	}

	.overlap-indices {
		display: block;
		font-size: 0.65rem;
		color: rgba(160, 160, 200, 0.4);
	}

	.notes {
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.notes-summary {
		font-size: 0.68rem;
		color: rgba(160, 160, 200, 0.6);
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
		color: rgba(160, 160, 200, 0.55);
		margin: 0;
		line-height: 1.5;
	}

	.note.estimated {
		color: var(--accent-orange);
		opacity: 0.85;
	}

	.empty {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin: 0;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 12px;
	}

	@media (max-width: 640px) {
		/* El selector región/sector pasa a ocupar todo el ancho: dos objetivos
		   grandes se aciertan con el pulgar, dos pastillas de 70 px no. */
		.head {
			flex-direction: column;
			align-items: stretch;
			gap: 0.6rem;
		}

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

		.overlap-row {
			font-size: 0.75rem;
		}

		.note {
			font-size: 0.68rem;
		}
	}
</style>
