<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { squarify } from '$lib/treemap';
	import { formatEUR, formatPercent } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { DEVIATION_BAND } from '$lib/traspaso';

	/**
	 * Mapa de cartera al estilo de los mapas de mercado, con una diferencia
	 * deliberada: **colorea por desviación respecto al objetivo, no por el cambio
	 * del día**. El color diario enseña a mirar la cartera todos los días y a
	 * reaccionar, que es justo el hábito que esta app existe para evitar. La
	 * desviación, en cambio, es la única pregunta que el rebalanceo responde.
	 *
	 * El lienzo es un viewBox de 100×60, así que escala solo y no necesita medir
	 * el contenedor ni redibujarse al cambiar de pestaña.
	 */

	const VIEW_W = 100;
	const VIEW_H = 60;

	/** Por debajo de este área no cabe ni el nombre: se deja el rectángulo desnudo. */
	const MIN_AREA_FOR_LABEL = 90;
	const MIN_AREA_FOR_FIGURES = 200;

	const positions = $derived(
		[
			...portfolio.portfolioState.positions,
			...portfolio.satelliteState.positions,
			...portfolio.stockState.positions
		].filter((p) => p.totalValue > 0)
	);

	const totalValue = $derived(positions.reduce((sum, p) => sum + p.totalValue, 0));

	const cells = $derived.by(() => {
		const rects = squarify(
			positions.map((p) => ({ key: p.asset.ticker, value: p.totalValue })),
			VIEW_W,
			VIEW_H
		);

		return rects.map((rect) => {
			const position = positions.find((p) => p.asset.ticker === rect.key)!;
			// El peso se recalcula sobre el total de las tres categorías: el
			// `currentWeight` de la posición es relativo a su categoría y aquí
			// estamos comparando toda la cartera junta.
			const weight = totalValue > 0 ? position.totalValue / totalValue : 0;
			return {
				rect,
				position,
				weight,
				deviation: position.deviation,
				fill: fillFor(position.deviation, position.asset.targetWeight),
				area: rect.w * rect.h
			};
		});
	});

	/**
	 * Verde dentro de la banda, ámbar por encima del objetivo y azul por debajo.
	 *
	 * La intensidad crece con la desviación pero se satura a los diez puntos: sin
	 * el tope, una posición muy desviada aplasta visualmente al resto y el mapa
	 * deja de distinguir entre «algo desviado» y «bastante desviado».
	 */
	function fillFor(deviation: number, targetWeight: number): string {
		if (targetWeight <= 0) return 'rgba(255, 255, 255, 0.07)';
		if (Math.abs(deviation) <= DEVIATION_BAND) return 'rgba(16, 185, 129, 0.55)';

		const intensity = Math.min(1, Math.abs(deviation) / 0.1);
		const alpha = 0.25 + intensity * 0.45;
		return deviation > 0
			? `rgba(245, 158, 11, ${alpha.toFixed(2)})`
			: `rgba(59, 130, 246, ${alpha.toFixed(2)})`;
	}

	function tooltipFor(weight: number, targetWeight: number, name: string): string {
		return $LL.treemap.tooltip({
			name,
			weight: formatPercent(weight, 1),
			target: targetWeight > 0 ? formatPercent(targetWeight, 1) : $LL.treemap.no_target()
		});
	}
</script>

<div class="treemap-block">
	<div class="treemap-head">
		<h4 class="treemap-title">{$LL.treemap.title()}</h4>
		<p class="treemap-subtitle">{$LL.treemap.subtitle()}</p>
	</div>

	{#if cells.length === 0}
		<p class="empty">{$LL.treemap.empty()}</p>
	{:else}
		<svg
			class="treemap"
			viewBox="0 0 {VIEW_W} {VIEW_H}"
			preserveAspectRatio="none"
			role="img"
			aria-label={$LL.treemap.title()}
		>
			{#each cells as cell (cell.position.asset.ticker)}
				<g>
					<title>
						{tooltipFor(cell.weight, cell.position.asset.targetWeight, cell.position.asset.name)}
					</title>
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
					{#if cell.area >= MIN_AREA_FOR_LABEL}
						<text
							class="cell-ticker"
							x={cell.rect.x + 1.4}
							y={cell.rect.y + 4}
							font-size="2.6"
						>
							{cell.position.asset.ticker}
						</text>
					{/if}
					{#if cell.area >= MIN_AREA_FOR_FIGURES}
						<text
							class="cell-weight"
							x={cell.rect.x + 1.4}
							y={cell.rect.y + 7.6}
							font-size="2.2"
						>
							{formatPercent(cell.weight, 1)}
						</text>
						<text
							class="cell-deviation"
							x={cell.rect.x + 1.4}
							y={cell.rect.y + 11}
							font-size="2"
						>
							{cell.deviation >= 0 ? '+' : ''}{formatPercent(cell.deviation, 1)}
						</text>
					{/if}
				</g>
			{/each}
		</svg>

		<div class="legend">
			<span class="legend-item"><i class="swatch on"></i>{$LL.treemap.legend_on()}</span>
			<span class="legend-item"><i class="swatch over"></i>{$LL.treemap.legend_over()}</span>
			<span class="legend-item"><i class="swatch under"></i>{$LL.treemap.legend_under()}</span>
			<span class="legend-total privacy-blur">{formatEUR(totalValue)}</span>
		</div>
	{/if}
</div>

<style>
	.treemap-block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	.treemap-head {
		display: flex;
		flex-direction: column;
	}

	.treemap-title {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.treemap-subtitle {
		font-size: 0.7rem;
		color: rgba(160, 160, 200, 0.6);
		margin: 0.15rem 0 0 0;
	}

	.treemap {
		width: 100%;
		height: auto;
		aspect-ratio: 100 / 60;
		border-radius: 12px;
		overflow: hidden;
		display: block;
	}

	/*
	 * Las etiquetas no se pueden seleccionar ni capturar el puntero: el `<title>`
	 * del grupo es el que tiene que atender el hover, y un `<text>` por encima lo
	 * robaría en los rectángulos con texto.
	 */
	.treemap :global(text) {
		pointer-events: none;
		user-select: none;
		font-variant-numeric: tabular-nums;
	}

	.cell-ticker {
		fill: rgba(255, 255, 255, 0.95);
		font-weight: 700;
	}

	.cell-weight {
		fill: rgba(255, 255, 255, 0.75);
	}

	.cell-deviation {
		fill: rgba(255, 255, 255, 0.5);
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		flex-wrap: wrap;
		font-size: 0.65rem;
		color: var(--text-muted);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.swatch {
		width: 9px;
		height: 9px;
		border-radius: 3px;
		display: inline-block;
	}

	.swatch.on {
		background: rgba(16, 185, 129, 0.55);
	}

	.swatch.over {
		background: rgba(245, 158, 11, 0.6);
	}

	.swatch.under {
		background: rgba(59, 130, 246, 0.6);
	}

	.legend-total {
		margin-left: auto;
		font-weight: 700;
		color: var(--text-primary);
	}
</style>
