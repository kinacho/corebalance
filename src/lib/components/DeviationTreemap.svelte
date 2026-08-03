<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { squarify, labelFits, truncateToWidth } from '$lib/treemap';
	import { formatEUR, formatPercent } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { DEVIATION_BAND } from '$lib/traspaso';
	import { CHART_NEUTRAL, DEVIATION_OVER, DEVIATION_UNDER, NO_TARGET_FILL } from '$lib/constants';
	import MapFrame from './MapFrame.svelte';

	/**
	 * Mapa de cartera al estilo de los mapas de mercado, con dos diferencias
	 * deliberadas.
	 *
	 * La primera: **colorea por desviación respecto al objetivo, no por el cambio
	 * del día**. El color diario enseña a mirar la cartera todos los días y a
	 * reaccionar, que es el hábito que esta app existe para evitar.
	 *
	 * La segunda: es una escala **divergente**, azul ← gris → ámbar, con el gris
	 * en el centro. Antes el centro era verde, que es un anti-patrón —un tono en
	 * el punto medio compite con los extremos— y además chocaba con el donut de
	 * categorías del panel de al lado, donde el verde significaba otra cosa. Con
	 * el neutro en medio, «en objetivo» es ausencia de señal, que es justo lo que
	 * es, y lo desviado destaca solo.
	 */

	interface Props {
		/**
		 * El carrusel de gráficos pone su propia etiqueta encima de cada panel, así
		 * que ahí el título propio del mapa sobraría. El subtítulo se queda en los
		 * dos casos: explica qué significa el color, que no es evidente.
		 */
		showTitle?: boolean;
		/**
		 * Sube al dashboard, que es quien puede ensanchar el carril de la rejilla.
		 * Aquí no hace falta para nada más: el tamaño de letra y la proporción del
		 * lienzo salen del ancho medido, así que se recalculan solos.
		 */
		expanded?: boolean;
	}

	let { showTitle = true, expanded = $bindable(false) }: Props = $props();

	/**
	 * El ancho real del contenedor, no el de la ventana.
	 *
	 * Es la corrección importante: en su carril del carrusel este mapa mide unos
	 * 340 px **también en escritorio**, igual que en móvil, y con el tamaño de
	 * letra atado a una media query salían rótulos de 9 px en pantalla grande. El
	 * cuerpo de letra tiene que derivarse de los píxeles que hay de verdad.
	 */
	let containerWidth = $state(0);

	const VIEW_W = 100;

	/** Píxeles reales por unidad del viewBox. */
	const pxPerUnit = $derived(containerWidth > 0 ? containerWidth / VIEW_W : 3.4);

	/**
	 * Un lienzo apaisado solo cuando hay ancho para ello; si no, casi cuadrado,
	 * porque con poco ancho una tira apaisada deja celdas de 40 px de alto.
	 */
	const viewH = $derived(containerWidth >= 560 ? 58 : 88);

	/** Cuerpo de letra en unidades del viewBox para un tamaño objetivo en píxeles. */
	function unitsFor(targetPx: number): number {
		return targetPx / pxPerUnit;
	}

	// En píxeles, no en unidades: el objetivo es que el rótulo se lea igual mida el
	// carril 340 px o 1100.
	const fontTicker = $derived(unitsFor(13));
	const fontFigure = $derived(unitsFor(11));
	const pad = $derived(unitsFor(6));

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
			// separado**. Decidirlo por área dejaba pasar celdas altas y estrechas,
			// que escupían el rótulo encima de la vecina.
			const ticker = truncateToWidth(position.asset.ticker, fontTicker, rect.w, pad * 2);
			const showTicker = ticker !== '' && rect.h >= fontTicker * 1.6;
			const weightText = formatPercent(weight, 1);
			const showWeight =
				showTicker &&
				rect.h >= fontTicker * 1.5 + fontFigure * 1.5 &&
				labelFits(weightText, fontFigure, rect.w, pad * 2);
			// Un activo sin peso objetivo **no tiene desviación**: `deviation` es
			// `peso − 0`, o sea el peso otra vez, y pintarlo como «+28,0 %» sugiere
			// un exceso contra un objetivo que nadie ha fijado. Se rotula como lo
			// que es.
			const hasTarget = position.asset.targetWeight > 0;
			const deviationText = hasTarget
				? `${position.deviation >= 0 ? '+' : ''}${formatPercent(position.deviation, 1)}`
				: $LL.treemap.legend_no_target();
			const showDeviation =
				showWeight &&
				rect.h >= fontTicker * 1.5 + fontFigure * 3 &&
				labelFits(deviationText, fontFigure * 0.9, rect.w, pad * 2);

			return {
				rect,
				position,
				weight,
				ticker,
				showTicker,
				weightText,
				showWeight,
				deviationText,
				showDeviation,
				hasTarget,
				fill: fillFor(position.deviation, position.asset.targetWeight)
			};
		});
	});

	/**
	 * Azul por debajo del objetivo, ámbar por encima, neutro dentro de la banda.
	 *
	 * La intensidad crece con la desviación pero se satura a los diez puntos: sin
	 * el tope, una posición muy desviada aplasta visualmente al resto y el mapa
	 * deja de distinguir «algo desviado» de «bastante desviado».
	 */
	function fillFor(deviation: number, targetWeight: number): string {
		if (targetWeight <= 0) return NO_TARGET_FILL;
		if (Math.abs(deviation) <= DEVIATION_BAND) return CHART_NEUTRAL;

		const intensity = Math.min(1, Math.abs(deviation) / 0.1);
		// Se mezcla con el neutro en lugar de bajar la opacidad: con alfa sobre un
		// fondo oscuro el tono pierde chroma y los extremos se acercan entre sí.
		//
		// El suelo de la mezcla es alto —60 %— a propósito: si arranca bajo, una
		// desviación que acaba de salirse de la banda queda casi gris y el mapa
		// entero parece apagado. Fuera de banda significa «hay algo que mirar», y
		// eso tiene que verse de color desde el primer punto porcentual.
		const base = deviation > 0 ? DEVIATION_OVER : DEVIATION_UNDER;
		return mix(CHART_NEUTRAL, base, 0.6 + intensity * 0.4);
	}

	/** Mezcla dos hex en el espacio sRGB. Suficiente para una rampa de dos pasos. */
	function mix(from: string, to: string, amount: number): string {
		const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
		const [r1, g1, b1] = parse(from);
		const [r2, g2, b2] = parse(to);
		const channel = (a: number, b: number) => Math.round(a + (b - a) * amount);
		return `rgb(${channel(r1, r2)}, ${channel(g1, g2)}, ${channel(b1, b2)})`;
	}

	/**
	 * Dos mensajes en lugar de uno con relleno.
	 *
	 * Antes se metía «sin objetivo» en el hueco `{target}` de «…objetivo
	 * {target}», y salía «objetivo sin objetivo». Componer frases inyectando
	 * frases produce eso; una plantilla por caso, no.
	 */
	function tooltipFor(weight: number, targetWeight: number, name: string): string {
		if (targetWeight <= 0) {
			return $LL.treemap.tooltip_no_target({ name, weight: formatPercent(weight, 1) });
		}
		return $LL.treemap.tooltip({
			name,
			weight: formatPercent(weight, 1),
			target: formatPercent(targetWeight, 1)
		});
	}

	/**
	 * El id de recorte se deriva del **índice**, no del ticker.
	 *
	 * Sanear el ticker a `[A-Za-z0-9_]` colisiona: `BRK.B` y `BRK-B` dan el mismo
	 * id, y entonces dos celdas comparten recorte y una de ellas escupe su rótulo
	 * fuera de su cuadro. El índice es único por construcción.
	 */
	function clipId(index: number): string {
		return `dev-clip-${index}`;
	}
</script>

<MapFrame
	title={$LL.treemap.title()}
	subtitle={$LL.treemap.subtitle()}
	{showTitle}
	canExpand={cells.length > 0}
	bind:expanded
	bind:contentWidth={containerWidth}
>
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
				{#each cells as cell, i (cell.position.asset.ticker)}
					<clipPath id={clipId(i)}>
						<rect x={cell.rect.x} y={cell.rect.y} width={cell.rect.w} height={cell.rect.h} />
					</clipPath>
				{/each}
			</defs>

			{#each cells as cell, i (cell.position.asset.ticker)}
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
						stroke="rgba(5, 5, 10, 0.9)"
						stroke-width={unitsFor(2)}
						rx={unitsFor(3)}
					/>
					<g clip-path="url(#{clipId(i)})">
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
								class:is-untargeted={!cell.hasTarget}
								x={cell.rect.x + pad}
								y={cell.rect.y + pad + fontTicker * 0.85 + fontFigure * 2.5}
								font-size={fontFigure * 0.9}
							>
								{cell.deviationText}
							</text>
						{/if}
					</g>
				</g>
			{/each}
		</svg>

		<div class="legend">
			<span class="legend-item">
				<i class="swatch" style="background: {DEVIATION_UNDER}"></i>{$LL.treemap.legend_under()}
			</span>
			<span class="legend-item">
				<i class="swatch" style="background: {CHART_NEUTRAL}"></i>{$LL.treemap.legend_on()}
			</span>
			<span class="legend-item">
				<i class="swatch" style="background: {DEVIATION_OVER}"></i>{$LL.treemap.legend_over()}
			</span>
			{#if cells.some((cell) => !cell.hasTarget)}
				<span class="legend-item">
					<i class="swatch" style="background: {NO_TARGET_FILL}"></i>{$LL.treemap.legend_no_target()}
				</span>
			{/if}
			<span class="legend-total privacy-blur">{formatEUR(totalValue)}</span>
		</div>
	{/if}
</MapFrame>

<style>
	.treemap {
		width: 100%;
		height: auto;
		border-radius: 10px;
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
		fill: #ffffff;
		font-weight: 700;
	}

	.cell-weight {
		fill: rgba(255, 255, 255, 0.85);
		font-weight: 600;
	}

	.cell-deviation {
		fill: rgba(255, 255, 255, 0.6);
	}

	/* «Sin objetivo» es una etiqueta de estado, no una cifra: va más apagada para
	   que no se lea como un dato del mismo rango que el peso de encima. */
	.cell-deviation.is-untargeted {
		fill: rgba(255, 255, 255, 0.45);
		font-style: italic;
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 0.8rem;
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

	.legend-total {
		margin-left: auto;
		font-weight: 700;
		color: var(--text-primary);
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
