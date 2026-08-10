<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR } from '$lib/utils';
	import { formatCompactCurrency, formatEstimate, niceTicks } from '$lib/chart-format';
	import { simulateScenarios } from '$lib/montecarlo';
	import { ui } from '$lib/stores/ui.svelte';
	import { LL } from '$lib/i18n/i18n-svelte';

	/**
	 * ⚠️ **Esto era un gráfico de 21 barras apiladas hechas con `div`s, y estaba
	 * mal de tres maneras a la vez.** La pila iba del revés —`invested` primero en
	 * un `flex-direction: column`, o sea *arriba*, con el beneficio debajo
	 * sosteniéndolo—, no tenía eje, ni leyenda, ni tooltip, y los rellenos eran
	 * translúcidos sobre una malla con degradado, que es justo lo que el test de
	 * `DeviationTreemap` prohíbe en el otro mapa. Y de fondo: **una exponencial
	 * determinista dibujada como 21 barras no añade nada** sobre las tres cifras
	 * que hay encima.
	 *
	 * Pasó a ser un área apilada en SVG, y de ahí a lo que es ahora: **un cono de
	 * escenarios**, porque dibujar bonita una única línea determinista seguía
	 * siendo dibujar bonita una única línea determinista. En SVG y no en Chart.js
	 * por lo mismo que los dos mapas: hereda `.privacy-blur` y los tokens sin
	 * puente, y el eje se controla entero.
	 */

	// Parámetros de simulación
	let expectedReturn = $state(7); // 7% anual por defecto
	/**
	 * Volatilidad anual, en porcentaje. El 15 % por defecto es el orden de
	 * magnitud de una cartera de renta variable global; se deja como control y
	 * no como constante escondida a propósito: **el ancho del cono es una
	 * suposición del usuario, igual que el rendimiento**, y esconderla sería
	 * volver a vender una cifra inventada como si fuera un dato.
	 */
	let volatility = $state(15);
	let years = $state(20);
	let monthlySavings = $state(500); // Aportación mensual proyectada
	let isOpen = $state(false);

	let useCustomBase = $state(false);
	let customBase = $state(portfolio.globalCapital || 10000);

	$effect(() => {
		if (portfolio.globalCapital > 0 && !useCustomBase) {
			customBase = Number(portfolio.globalCapital.toFixed(2));
		}
	});

	/**
	 * ⚠️ **Esto era una única línea determinista, y era la mentira más educada
	 * del panel.** Decía «en veinte años tendrás 702.854,19 €» cuando lo que
	 * quería decir es «si aciertas el 7 % los 240 meses seguidos, saldría esto».
	 * Ningún año rinde su media. Ahora es un cono de escenarios: la aritmética
	 * está en `$lib/montecarlo`, con semilla fija para que el gráfico no cambie
	 * de forma al mover un deslizador que no le afecta.
	 */
	const PATHS = 600;

	const bands = $derived(
		simulateScenarios({
			initial: useCustomBase ? customBase : portfolio.globalCapital,
			monthlyContribution: monthlySavings,
			years,
			annualReturn: expectedReturn / 100,
			annualVolatility: volatility / 100,
			paths: PATHS
		})
	);

	const last = $derived(bands.at(-1)!);
	const projections = $derived({
		finalValue: last.p50,
		totalInvested: last.contributed,
		totalProfit: last.p50 - last.contributed
	});

	/**
	 * Los dos tonos son **dos pasos del mismo azul**, no dos colores distintos, y
	 * eso es deliberado: lo aportado y la revalorización no son dos categorías
	 * sin relación, son las dos partes de un mismo total. Una rampa secuencial lo
	 * dice; dos tonos categóricos dirían que compiten. De paso esquiva el
	 * problema de fondo del tablero — el verde ya significa «positivo» y no puede
	 * significar además «revalorización».
	 *
	 * Medidos con el validador de `dataviz` contra `#0d0d12`: ΔE 34,5 en visión
	 * normal y 32,2 con protanopia. El azul oscuro se queda a 2,89:1 de contraste
	 * con el fondo, por debajo de 3:1, y por eso el gráfico lleva leyenda con
	 * rótulos y las tres cifras completas encima — que es el relieve que la guía
	 * exige cuando el contraste avisa.
	 */
	const INVESTED_FILL = '#1d4ed8';
	const GROWTH_FILL = '#93c5fd';

	let chartWidth = $state(0);
	const CHART_H = 160;
	const PAD = { top: 10, right: 6, bottom: 20, left: 46 };

	const geometry = $derived.by(() => {
		const w = chartWidth || 320;
		const plotW = Math.max(10, w - PAD.left - PAD.right);
		const plotH = CHART_H - PAD.top - PAD.bottom;
		const pts = bands;
		if (pts.length === 0) return null;

		// El eje llega hasta el percentil 90, que es el techo de lo dibujado.
		const axis = niceTicks(Math.max(...pts.map((b) => b.p90)), 4);

		const x = (i: number) => PAD.left + (pts.length < 2 ? plotW : (i / (pts.length - 1)) * plotW);
		const y = (v: number) => PAD.top + plotH * (1 - v / axis.max);

		/** Cinta entre dos series: ida por arriba, vuelta por abajo. */
		const ribbon = (hi: (b: (typeof pts)[number]) => number, lo: (b: (typeof pts)[number]) => number) =>
			'M ' +
			pts.map((b, i) => `${x(i)} ${y(hi(b))}`).join(' L ') +
			' L ' +
			pts
				.map((_, i) => {
					const j = pts.length - 1 - i;
					return `${x(j)} ${y(lo(pts[j]))}`;
				})
				.join(' L ') +
			' Z';

		const line = (get: (b: (typeof pts)[number]) => number) =>
			'M ' + pts.map((b, i) => `${x(i)} ${y(get(b))}`).join(' L ');

		/** Una etiqueta cada cinco años, y siempre la última. */
		const xLabels = pts
			.map((b, i) => ({ i, year: b.year }))
			.filter(({ year, i }) => year % 5 === 0 || i === pts.length - 1);

		return {
			x,
			y,
			plotW,
			plotH,
			axis,
			xLabels,
			pts,
			p80: ribbon((b) => b.p90, (b) => b.p10),
			p50: ribbon((b) => b.p75, (b) => b.p25),
			median: line((b) => b.p50),
			contributed: line((b) => b.contributed)
		};
	});

	/** Índice bajo el puntero, para la guía vertical y el tooltip. */
	let hovered = $state<number | null>(null);

	function trackPointer(event: PointerEvent) {
		const g = geometry;
		if (!g) return;
		const rect = (event.currentTarget as SVGRectElement).getBoundingClientRect();
		const ratio = (event.clientX - rect.left) / rect.width;
		const i = Math.round(ratio * (g.pts.length - 1));
		hovered = Math.min(g.pts.length - 1, Math.max(0, i));
	}
</script>

<div id="tour-projections" class="panel" class:open={isOpen}>
	<button class="panel-header" onclick={() => (isOpen = !isOpen)} aria-expanded={isOpen}>
		<div class="panel-info">
			<!-- Icono de trazo en lugar del emoji 🚀: un emoji se dibuja con la fuente
			     del sistema, cambia de estilo en cada plataforma y es el detalle que
			     más abarata una interfaz financiera. -->
			<div class="panel-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 17l6-6 4 4 7-7" />
					<path d="M14 7h6v6" />
				</svg>
			</div>
			<div class="panel-text">
				<h2 class="panel-title">{$LL.projections.title()}</h2>
				<p class="panel-subtitle">{$LL.projections.subtitle()}</p>
			</div>
		</div>
		<span class="chevron" class:rotated={!isOpen}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<path d="M6 9l6 6 6-6" />
			</svg>
		</span>
	</button>

	<div class="collapsible" class:collapsed={!isOpen}>
		<div class="wrapper">
			<div class="content">
				<div class="controls-grid">
					<div class="control-item full-width-capital">
						<div class="control-header">
							<span class="control-label">{$LL.projections.simulation_base()}</span>
							<span class="control-value highlight"
								>{formatEUR(useCustomBase ? customBase : portfolio.globalCapital)}</span
							>
						</div>
						<div class="capital-selector-pills">
							<button class="pill-btn" class:active={!useCustomBase} onclick={() => (useCustomBase = false)}>
								{$LL.projections.real_portfolio()}
							</button>
							<button class="pill-btn" class:active={useCustomBase} onclick={() => (useCustomBase = true)}>
								{$LL.projections.custom_capital()}
							</button>

							{#if useCustomBase}
								<div class="custom-capital-input-wrapper">
									<input type="number" class="custom-capital-input" min="0" step="1000" bind:value={customBase} />
									<span class="currency-symbol">€</span>
								</div>
							{/if}
						</div>
					</div>

					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="savings-range">{$LL.projections.savings()}</label>
							<span class="control-value">{formatEUR(monthlySavings)}</span>
						</div>
						<input id="savings-range" type="range" min="0" max="5000" step="50" bind:value={monthlySavings} />
					</div>
					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="return-range">{$LL.projections.annual_interest()}</label>
							<span class="control-value">{expectedReturn}%</span>
						</div>
						<input id="return-range" type="range" min="1" max="15" step="0.5" bind:value={expectedReturn} />
					</div>
					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="vol-range">{$LL.projections.volatility()}</label>
							<span class="control-value">{volatility}%</span>
						</div>
						<input id="vol-range" type="range" min="0" max="30" step="1" bind:value={volatility} />
					</div>
					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="years-range">{$LL.projections.horizon()}</label>
							<span class="control-value">{$LL.projections.years({ years })}</span>
						</div>
						<input id="years-range" type="range" min="1" max="50" bind:value={years} />
					</div>
				</div>

				<div class="results-card">
					<div class="main-metric">
						<span class="metric-label">{$LL.projections.scenario_median({ years })}</span>
						<!--
							⚠️ Sin céntimos, y sin contador animado. `702.854,19 €` en una
							proyección que depende de acertar el 7 % anual es precisión
							inventada, y el usuario la lee como una promesa. El contador
							además iba en contra del control: la cifra llegaba 800 ms
							después de soltar el deslizador.
						-->
						<span class="metric-value privacy-blur">{formatEstimate(projections.finalValue, ui.baseCurrency)}</span>
						<!--
							El rango va debajo de la cifra y no en una nota al pie: es lo que
							convierte «tendrás X» en «podrías acabar entre A y B», que es la
							diferencia entre una estimación y una promesa.
						-->
						<p class="metric-range privacy-blur">
							{$LL.projections.scenario_range({
								low: formatEstimate(last.p10, ui.baseCurrency),
								high: formatEstimate(last.p90, ui.baseCurrency)
							})}
						</p>
					</div>

					<div class="sub-metrics">
						<div class="metric-box">
							<span class="sub-label">{$LL.projections.total_investment()}</span>
							<span class="sub-value privacy-blur">{formatEstimate(projections.totalInvested, ui.baseCurrency)}</span>
						</div>
						<div class="metric-box success">
							<span class="sub-label">{$LL.projections.generated_interest()}</span>
							<span class="sub-value privacy-blur"
								>+{formatEstimate(projections.totalProfit, ui.baseCurrency)}</span
							>
						</div>
					</div>
				</div>

				<div class="chart-block">
					<div class="chart-legend">
						<span class="legend-entry">
							<span class="legend-swatch is-line"></span>
							{$LL.projections.legend_median()}
						</span>
						<span class="legend-entry">
							<span class="legend-swatch" style="--swatch: {GROWTH_FILL}; opacity: .55"></span>
							{$LL.projections.legend_p50()}
						</span>
						<span class="legend-entry">
							<span class="legend-swatch" style="--swatch: {INVESTED_FILL}; opacity: .55"></span>
							{$LL.projections.legend_p80()}
						</span>
						<span class="legend-entry">
							<span class="legend-swatch is-dashed"></span>
							{$LL.projections.legend_contributed()}
						</span>
					</div>

					<div class="chart-canvas privacy-blur" bind:clientWidth={chartWidth}>
						{#if geometry}
							<svg viewBox="0 0 {chartWidth || 320} {CHART_H}" width="100%" height={CHART_H} role="img"
								aria-label={$LL.projections.estimated_capital({ years })}>
								<!-- Rejilla y marcas del eje de valores -->
								{#each geometry.axis.ticks as tick (tick)}
									<line
										x1={PAD.left}
										x2={(chartWidth || 320) - PAD.right}
										y1={geometry.y(tick)}
										y2={geometry.y(tick)}
										stroke="var(--chart-grid)"
										stroke-width="1"
									/>
									<text
										x={PAD.left - 8}
										y={geometry.y(tick)}
										text-anchor="end"
										dominant-baseline="middle"
										class="axis-label"
									>
										{formatCompactCurrency(tick, ui.baseCurrency, geometry.axis.step)}
									</text>
								{/each}

								<!--
									Dos cintas del mismo azul en dos pasos, no dos tonos distintos:
									están anidadas, no compiten. La de fuera es 8 de cada 10
									escenarios y la de dentro 5 de cada 10. ⚠️ Sobre fondo oscuro
									**la más probable es la más clara**, no la más oscura: aquí
									claro es lo que destaca. La interior se dibuja encima de la
									exterior, así que el alfa no es decoración —es lo que hace que
									se lean como anidadas y no como dos manchas sueltas—, y deja
									pasar la rejilla, que si no quedaría tapada justo donde hay que
									leer cifras.

									La línea blanca es la mediana. La punteada es lo que habrás
									aportado, que no es una estimación sino aritmética, y por eso
									va en tinta neutra y no en un tono de la escala.
								-->
								<path d={geometry.p80} fill={INVESTED_FILL} opacity="0.34" />
								<path d={geometry.p50} fill={GROWTH_FILL} opacity="0.30" />
								<path d={geometry.median} fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" />
								<path
									d={geometry.contributed}
									fill="none"
									stroke="rgba(255,255,255,0.45)"
									stroke-width="1.3"
									stroke-dasharray="5 4"
									stroke-linejoin="round"
								/>

								{#each geometry.xLabels as label (label.i)}
									<text x={geometry.x(label.i)} y={CHART_H - 6} text-anchor="middle" class="axis-label">
										{label.year}
									</text>
								{/each}

								{#if hovered !== null && geometry.pts[hovered]}
									{@const b = geometry.pts[hovered]}
									<!-- El tramo vertical del cono en el año señalado. -->
									<line
										x1={geometry.x(hovered)}
										x2={geometry.x(hovered)}
										y1={geometry.y(b.p90)}
										y2={geometry.y(b.p10)}
										stroke="rgba(255,255,255,0.55)"
										stroke-width="1"
									/>
								{/if}

								{#if hovered !== null && geometry.pts[hovered]}
									<circle
										cx={geometry.x(hovered)}
										cy={geometry.y(geometry.pts[hovered].p50)}
										r="3.5"
										fill="#ffffff"
									/>
								{/if}

								<!--
									Zona de captura del puntero, por encima de todo lo demás. Lleva
									`role="presentation"`: el gráfico ya se anuncia entero por el
									`aria-label` del `<svg>`, así que este rectángulo no es un
									objetivo con significado propio para un lector de pantalla —solo
									existe para que el ratón tenga dónde moverse—, y las cifras que
									enseña al pasar por encima están todas escritas arriba.
								-->
								<rect
									role="presentation"
									x={PAD.left}
									y={PAD.top}
									width={geometry.plotW}
									height={geometry.plotH}
									fill="transparent"
									onpointermove={trackPointer}
									onpointerleave={() => (hovered = null)}
								/>
							</svg>

							{#if hovered !== null && geometry.pts[hovered]}
								{@const p = geometry.pts[hovered]}
								<div
									class="chart-tooltip"
									style="left: {Math.min(
										Math.max(geometry.x(hovered), 70),
										(chartWidth || 320) - 70
									)}px"
								>
									<strong>{$LL.projections.years({ years: p.year })}</strong>
									<span>{formatEstimate(p.p50, ui.baseCurrency)}</span>
									<span class="tooltip-part">
										{$LL.projections.legend_p80()}: {formatEstimate(p.p10, ui.baseCurrency)} –
										{formatEstimate(p.p90, ui.baseCurrency)}
									</span>
									<span class="tooltip-part"
										>{$LL.projections.legend_contributed()}: {formatEstimate(
											p.contributed,
											ui.baseCurrency
										)}</span
									>
								</div>
							{/if}
						{/if}
					</div>
					<p class="axis-caption">{$LL.projections.axis_years()}</p>
				</div>

				<footer class="legal-footer">
					<p>{$LL.projections.sim_note({ paths: PATHS })} {$LL.projections.disclaimer()}</p>
				</footer>
			</div>
		</div>
	</div>
</div>

<style>
	.panel {
		width: 100%;
		background: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(24px) saturate(200%);
		-webkit-backdrop-filter: blur(24px) saturate(200%);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 24px;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.panel:hover {
		border-color: rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.05);
	}

	.panel-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 0.2s ease;
	}

	.panel-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.panel-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		color: var(--accent-blue);
	}

	.panel-icon svg {
		width: 20px;
		height: 20px;
	}

	.panel-title {
		font-size: 1rem;
		font-weight: 700;
		color: #ffffff;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.panel-subtitle {
		font-size: 0.75rem;
		color: rgba(160, 160, 200, 0.6);
		margin: 0.1rem 0 0 0;
	}

	.chevron {
		color: rgba(255, 255, 255, 0.3);
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
		gap: 1.5rem;
	}

	.controls-grid {
		display: grid;
		gap: 1.5rem;
		padding: 1.25rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.control-item {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.control-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.control-label {
		font-size: 0.65rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.35);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.control-value {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--accent-blue);
	}

	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		outline: none;
		touch-action: pan-y pinch-zoom;
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px;
		height: 16px;
		background: var(--accent-blue);
		border-radius: 50%;
		cursor: pointer;
		border: 2px solid #05050a;
	}

	.results-card {
		padding: 1.25rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.main-metric {
		text-align: center;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		margin-bottom: 1rem;
	}

	.metric-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.45);
		display: block;
		margin-bottom: 0.5rem;
	}

	.metric-value {
		font-size: 1.75rem;
		font-weight: 800;
		color: #ffffff;
		letter-spacing: -0.02em;
	}

	.sub-metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.metric-box {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.sub-label {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.35);
	}

	.sub-value {
		font-size: 0.95rem;
		font-weight: 700;
		color: #ffffff;
	}

	.metric-box.success .sub-value {
		color: var(--state-positive);
	}

	.chart-block {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.chart-legend {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.legend-entry {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.55);
	}

	.legend-swatch {
		width: 9px;
		height: 9px;
		border-radius: 3px;
		background: var(--swatch);
	}

	.legend-swatch.is-line {
		width: 13px;
		height: 2px;
		border-radius: 1px;
		background: #ffffff;
	}

	.legend-swatch.is-dashed {
		width: 13px;
		height: 0;
		border-radius: 0;
		background: none;
		border-top: 2px dashed rgba(255, 255, 255, 0.45);
	}

	.metric-range {
		margin: 0.5rem 0 0;
		font-size: 0.72rem;
		line-height: 1.45;
		color: var(--text-muted);
	}

	.chart-canvas {
		position: relative;
		width: 100%;
	}

	.chart-canvas :global(svg) {
		display: block;
		overflow: visible;
	}

	.axis-label {
		fill: var(--chart-axis);
		font-size: 10px;
		font-weight: 600;
		font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
	}

	.axis-caption {
		margin: 0;
		text-align: center;
		font-size: var(--text-micro);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.3);
	}

	.chart-tooltip {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.5rem 0.7rem;
		background: rgba(13, 13, 18, 0.96);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		pointer-events: none;
		white-space: nowrap;
		font-size: 0.7rem;
		color: #ffffff;
		z-index: 2;
	}

	.chart-tooltip strong {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.5);
		font-weight: 700;
	}

	.tooltip-part {
		color: rgba(255, 255, 255, 0.65);
		font-size: 0.65rem;
	}

	.legal-footer {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.28);
		text-align: center;
		font-style: italic;
		line-height: 1.4;
	}

	.full-width-capital {
		grid-column: 1 / -1;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		padding-bottom: 1rem;
		margin-bottom: 0.25rem;
	}

	.capital-selector-pills {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.pill-btn {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.7);
		border-radius: 99px;
		padding: 0.4rem 0.8rem;
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.pill-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: white;
	}

	.pill-btn.active {
		background: rgba(37, 99, 235, 0.18);
		border-color: rgba(37, 99, 235, 0.45);
		color: #bfdbfe;
	}

	.custom-capital-input-wrapper {
		display: flex;
		align-items: center;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
		padding: 0.25rem 0.5rem 0.25rem 0.75rem;
		margin-left: 0.5rem;
		height: 28px;
	}

	.custom-capital-input {
		width: 80px;
		background: transparent;
		border: none;
		color: #fff;
		font-size: 0.78rem;
		font-weight: 700;
		outline: none;
		text-align: right;
		-moz-appearance: textfield;
		appearance: textfield;
	}

	.custom-capital-input::-webkit-outer-spin-button,
	.custom-capital-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		appearance: none;
		margin: 0;
	}

	.currency-symbol {
		font-size: 0.72rem;
		font-weight: 700;
		color: rgba(160, 160, 200, 0.5);
		margin-left: 0.2rem;
	}
</style>
