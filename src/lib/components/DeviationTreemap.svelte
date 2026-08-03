<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { squarify, labelFits, truncateToWidth } from '$lib/treemap';
	import { formatEUR, formatPercent } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { DEVIATION_BAND } from '$lib/traspaso';
	import { isNarrowViewport } from '$lib/viewport.svelte';

	/**
	 * Mapa de cartera al estilo de los mapas de mercado, con una diferencia
	 * deliberada: **colorea por desviación respecto al objetivo, no por el cambio
	 * del día**. El color diario enseña a mirar la cartera todos los días y a
	 * reaccionar, que es justo el hábito que esta app existe para evitar.
	 */

	const narrow = isNarrowViewport();

	/**
	 * En móvil el lienzo es casi cuadrado y las letras van más grandes.
	 *
	 * Con la proporción de escritorio (100×60) un móvil de 360 px deja celdas de
	 * 40 px de alto y rótulos de 8 px: técnicamente correcto e ilegible. Subir el
	 * alto del viewBox engorda las celdas sin tocar el tipo de letra en píxeles,
	 * porque el SVG escala con el contenedor.
	 */
	const VIEW_W = 100;
	const viewH = $derived(narrow.matches ? 105 : 60);
	const fontTicker = $derived(narrow.matches ? 4.4 : 2.8);
	const fontFigure = $derived(narrow.matches ? 3.8 : 2.4);
	const pad = $derived(narrow.matches ? 2.2 : 1.5);

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
			viewH
		);

		return rects.map((rect) => {
			const position = positions.find((p) => p.asset.ticker === rect.key)!;
			// El peso se recalcula sobre el total de las tres categorías: el
			// `currentWeight` de la posición es relativo a su categoría y aquí
			// estamos comparando toda la cartera junta.
			const weight = totalValue > 0 ? position.totalValue / totalValue : 0;

			// Qué cabe se decide celda a celda, midiendo **ancho y alto por
			// separado**. La versión anterior lo decidía por área, y una celda alta
			// y estrecha pasaba el filtro para luego escupir el rótulo encima de la
			// vecina.
			const ticker = truncateToWidth(position.asset.ticker, fontTicker, rect.w, pad * 2);
			const showTicker = ticker !== '' && rect.h >= fontTicker * 1.6;
			const weightText = formatPercent(weight, 1);
			const showWeight =
				showTicker &&
				rect.h >= fontTicker * 1.5 + fontFigure * 1.5 &&
				labelFits(weightText, fontFigure, rect.w, pad * 2);
			// La tercera línea solo en escritorio y solo si sobra alto de verdad.
			const showDeviation =
				showWeight && !narrow.matches && rect.h >= fontTicker * 1.5 + fontFigure * 3;

			return {
				rect,
				position,
				weight,
				ticker,
				showTicker,
				weightText,
				showWeight,
				showDeviation,
				deviation: position.deviation,
				fill: fillFor(position.deviation, position.asset.targetWeight)
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

	/** Un id de clipPath válido a partir de un ticker, que puede traer puntos y guiones. */
	function clipId(ticker: string): string {
		return `dev-clip-${ticker.replace(/[^a-zA-Z0-9]/g, '_')}`;
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
			viewBox="0 0 {VIEW_W} {viewH}"
			style="aspect-ratio: {VIEW_W} / {viewH}"
			preserveAspectRatio="none"
			role="img"
			aria-label={$LL.treemap.title()}
		>
			<defs>
				<!-- Un recorte por celda. Es la garantía dura de que ningún rótulo
				     invada a su vecina, independientemente de lo que estime el
				     cálculo de anchos de arriba. -->
				{#each cells as cell (cell.position.asset.ticker)}
					<clipPath id={clipId(cell.position.asset.ticker)}>
						<rect
							x={cell.rect.x}
							y={cell.rect.y}
							width={cell.rect.w}
							height={cell.rect.h}
						/>
					</clipPath>
				{/each}
			</defs>

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
					<g clip-path="url(#{clipId(cell.position.asset.ticker)})">
						{#if cell.showTicker}
							<text
								class="cell-ticker"
								x={cell.rect.x + pad}
								y={cell.rect.y + pad + fontTicker * 0.85}
								font-size={fontTicker}
							>
								{cell.ticker}
							</text>
						{/if}
						{#if cell.showWeight}
							<text
								class="cell-weight"
								x={cell.rect.x + pad}
								y={cell.rect.y + pad + fontTicker * 0.85 + fontFigure * 1.25}
								font-size={fontFigure}
							>
								{cell.weightText}
							</text>
						{/if}
						{#if cell.showDeviation}
							<text
								class="cell-deviation"
								x={cell.rect.x + pad}
								y={cell.rect.y + pad + fontTicker * 0.85 + fontFigure * 2.5}
								font-size={fontFigure * 0.9}
							>
								{cell.deviation >= 0 ? '+' : ''}{formatPercent(cell.deviation, 1)}
							</text>
						{/if}
					</g>
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
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.treemap-subtitle {
		font-size: 0.72rem;
		color: rgba(160, 160, 200, 0.6);
		margin: 0.15rem 0 0 0;
		line-height: 1.4;
	}

	.treemap {
		width: 100%;
		height: auto;
		border-radius: 12px;
		overflow: hidden;
		display: block;
	}

	/*
	 * Las etiquetas no capturan el puntero: el `<title>` del grupo es el que
	 * atiende el hover, y un `<text>` por encima lo robaría.
	 */
	.treemap :global(text) {
		pointer-events: none;
		user-select: none;
		font-variant-numeric: tabular-nums;
	}

	.cell-ticker {
		fill: rgba(255, 255, 255, 0.97);
		font-weight: 700;
	}

	.cell-weight {
		fill: rgba(255, 255, 255, 0.8);
		font-weight: 600;
	}

	.cell-deviation {
		fill: rgba(255, 255, 255, 0.55);
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		flex-wrap: wrap;
		font-size: 0.68rem;
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
		flex-shrink: 0;
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

	@media (max-width: 640px) {
		.legend {
			gap: 0.6rem;
			font-size: 0.65rem;
		}

		.legend-total {
			/* En una sola columna estrecha, el total en su propia línea se lee
			   mejor que apretado contra la leyenda. */
			margin-left: 0;
			width: 100%;
		}
	}
</style>
