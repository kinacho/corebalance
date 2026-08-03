<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { squarify } from '$lib/treemap';
	import { formatEUR, formatPercent } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { INDICES } from '$lib/lookthrough';

	/**
	 * Lo que hay dentro de los fondos: exposición real por región y por sector, y
	 * los pares de posiciones que apuntan a las mismas empresas.
	 *
	 * Es el mapa que sí justifica el formato de rectángulos, porque aquí hay
	 * densidad: una cartera de tres fondos se convierte en nueve regiones y once
	 * sectores. Los porcentajes son **sobre lo analizado**, nunca sobre el
	 * patrimonio total, y lo que se queda fuera se dice en voz alta.
	 */

	const VIEW_W = 100;
	const VIEW_H = 55;

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
			VIEW_H
		);
		return rects.map((rect) => {
			const index = slices.findIndex((slice) => slice.key === rect.key);
			const slice = slices[index];
			return {
				rect,
				slice,
				label: labelFor(slice.key),
				fill: PALETTE[index % PALETTE.length],
				area: rect.w * rect.h
			};
		});
	});

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
			<h4 class="title">{$LL.lookthrough.title()}</h4>
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
				viewBox="0 0 {VIEW_W} {VIEW_H}"
				preserveAspectRatio="none"
				role="img"
				aria-label={mode === 'regions'
					? $LL.lookthrough.tab_regions()
					: $LL.lookthrough.tab_sectors()}
			>
				{#each cells as cell (cell.slice.key)}
					<g>
						<title>{cell.label}: {formatPercent(cell.slice.weight, 1)}</title>
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
						{#if cell.area >= 70}
							<text class="cell-label" x={cell.rect.x + 1.4} y={cell.rect.y + 4} font-size="2.4">
								{cell.label}
							</text>
						{/if}
						{#if cell.area >= 150}
							<text class="cell-pct" x={cell.rect.x + 1.4} y={cell.rect.y + 7.4} font-size="2.6">
								{formatPercent(cell.slice.weight, 0)}
							</text>
						{/if}
					</g>
				{/each}
			</svg>
		{/if}

		<ol class="ranking">
			{#each slices.slice(0, 5) as slice (slice.key)}
				<li class="rank-row">
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
				{#each data.overlaps.slice(0, 4) as overlap (overlap.tickerA + overlap.tickerB)}
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

		<div class="notes">
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
			{#if data.estimatedIndices.length > 0}
				<p class="note estimated">
					{$LL.lookthrough.estimated_warning({ indices: data.estimatedIndices.join(', ') })}
				</p>
			{/if}
			<p class="note">{$LL.lookthrough.disclaimer()}</p>
		</div>
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
		aspect-ratio: 100 / 55;
		border-radius: 12px;
		display: block;
	}

	.map :global(text) {
		pointer-events: none;
		user-select: none;
		font-variant-numeric: tabular-nums;
	}

	.cell-label {
		fill: rgba(255, 255, 255, 0.95);
		font-weight: 700;
	}

	.cell-pct {
		fill: rgba(255, 255, 255, 0.8);
		font-weight: 700;
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
		grid-template-columns: minmax(90px, 1fr) 2fr auto;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.7rem;
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
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
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
</style>
