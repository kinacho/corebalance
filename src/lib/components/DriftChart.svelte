<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Filler,
		Tooltip
	} from 'chart.js';

	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { buildDriftSeries, driftAxisMax, type DriftAsset } from '$lib/drift';
	import { tickerLabel } from '$lib/asset-label';
	import { TOLERANCE_BAND_PP } from '$lib/composition';
	import {
		applyChartDefaults,
		tooltipStyle,
		categoryAxis,
		valueAxis,
		motionAllowed,
		CHART_AXIS_INK
	} from '$lib/chart-theme';
	import { LL, locale } from '$lib/i18n/i18n-svelte';

	/**
	 * **Cuánto tiempo llevas fuera de banda.**
	 *
	 * El mapa de desviación contesta esa pregunta para hoy; esto la contesta para
	 * los últimos meses, y de paso deja ver si los rebalanceos que hiciste
	 * sirvieron de algo. Es el gráfico que ningún competidor tiene porque ninguno
	 * se define como herramienta de rebalanceo: Ghostfolio y Portfolio Performance
	 * enseñan cuánto tienes y cuánto ha rendido, no cuánto llevas descuadrado.
	 *
	 * La aritmética vive en `$lib/drift`; aquí solo se dibuja.
	 */

	interface Props {
		bandPp?: number;
	}

	let { bandPp = TOLERANCE_BAND_PP }: Props = $props();

	let canvas = $state<HTMLCanvasElement | undefined>();
	// Sin anotar el genérico: los tipos de Chart.js para una configuración con
	// escalas y callbacks propios no cuadran con `Chart` a secas. Mismo apaño que
	// en `HistoryChart.svelte`.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let chart: any;

	/**
	 * Los activos con objetivo, cada uno con los tickers de su bloque.
	 *
	 * Se recorren los tres bloques y no solo el core: el objetivo es un dato del
	 * activo, así que ponerle pesos a los satélites enciende sus líneas sin tocar
	 * código —la misma regla que el mapa de desviación y el panel de composición.
	 */
	const driftAssets = $derived.by(() => {
		const blocks = [portfolio.coreAssets, portfolio.stockAssets, portfolio.satelliteAssets];
		const out: DriftAsset[] = [];

		for (const block of blocks) {
			const tickers = block.map((a) => a.ticker);
			for (const asset of block) {
				if (asset.targetWeight > 0) {
					out.push({
						ticker: asset.ticker,
						name: asset.name,
						color: asset.color,
						target: asset.targetWeight,
						block: tickers
					});
				}
			}
		}
		return out;
	});

	const drift = $derived(
		buildDriftSeries(portfolio.performanceSeries.points, driftAssets, bandPp)
	);

	/** Sin desglose por activo en ningún día no hay nada que dibujar. */
	const hasData = $derived(
		drift.series.some((s) => s.values.some((v) => v !== null))
	);

	const axisMax = $derived(driftAxisMax(drift.maxAbsPp, bandPp));

	const statusText = $derived.by(() => {
		if (drift.currentStreakOutOfBand > 1)
			return $LL.db.drift_out_streak({ days: drift.currentStreakOutOfBand });
		if (drift.currentStreakOutOfBand === 1) return $LL.db.drift_out_today();
		return $LL.db.drift_all_in_band();
	});

	const isCalm = $derived(drift.currentStreakOutOfBand === 0);

	function axisDate(iso: string, span: number): string {
		const loc = $locale === 'es' ? 'es-ES' : 'en-US';
		const opts: Intl.DateTimeFormatOptions =
			span > 120 ? { month: 'short', year: '2-digit' } : { day: '2-digit', month: 'short' };
		return new Date(iso).toLocaleDateString(loc, opts).replace('.', '');
	}

	function sync() {
		if (!chart) return;

		chart.data.labels = drift.dates.map((d) => axisDate(d, drift.dates.length));

		/**
		 * La banda va como dataset relleno hasta `-bandPp` en lugar de como línea:
		 * lo que se quiere leer es **una zona**, no dos fronteras. Es el único
		 * relleno translúcido que se permite aquí, y se permite porque no es un
		 * dato, es el fondo contra el que se lee el dato.
		 */
		chart.data.datasets = [
			{
				label: $LL.db.band_legend({ pp: bandPp }),
				data: drift.dates.map(() => bandPp),
				// El relleno da la zona y el borde punteado da el límite. Solo con
				// relleno el canto de la banda no se lee, y el canto es justo lo que
				// se está mirando cuando una línea se acerca.
				borderColor: 'rgba(255, 255, 255, 0.22)',
				borderDash: [3, 3],
				borderWidth: 1,
				backgroundColor: 'rgba(255, 255, 255, 0.07)',
				fill: { value: -bandPp },
				pointRadius: 0,
				order: 10
			},
			{
				label: '',
				data: drift.dates.map(() => -bandPp),
				borderColor: 'rgba(255, 255, 255, 0.22)',
				borderDash: [3, 3],
				borderWidth: 1,
				fill: false,
				pointRadius: 0,
				order: 10
			},
			...drift.series.map((s) => ({
				label: s.name,
				data: s.values,
				borderColor: s.color,
				backgroundColor: 'transparent',
				fill: false,
				tension: 0,
				borderWidth: 2,
				pointRadius: 0,
				pointHoverRadius: 4,
				spanGaps: false,
				borderCapStyle: 'round' as const,
				order: 1
			}))
		] as never;

		const yAxis = chart.options.scales?.y as { min?: number; max?: number } | undefined;
		if (yAxis) {
			yAxis.min = -axisMax;
			yAxis.max = axisMax;
		}

		chart.update();
	}

	$effect(() => {
		// Leer antes de la guarda para que el efecto quede suscrito.
		void drift;
		void axisMax;
		if (chart) sync();
	});

	onMount(() => {
		if (!canvas) return;
		applyChartDefaults();

		chart = new Chart(canvas, {
			type: 'line',
			data: { labels: [], datasets: [] },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				animation: motionAllowed() ? { duration: 320 } : false,
				plugins: {
					legend: { display: false },
					tooltip: {
						...tooltipStyle,
						// Los dos primeros datasets son los cantos de la banda, no datos.
						// ⚠️ Este índice y el orden de `chart.data.datasets` en `sync()`
						// tienen que moverse juntos: si se añade otro dataset de adorno
						// delante, el tooltip empieza a listar «Banda de tolerancia ±5 pp»
						// como si fuera una posición de la cartera.
						filter: (item: { datasetIndex: number }) => item.datasetIndex > 1,
						callbacks: {
							label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
								const v = ctx.parsed.y;
								if (v === null) return '';
								const signo = v > 0 ? '+' : v < 0 ? '−' : '';
								return ` ${ctx.dataset.label}: ${signo}${Math.abs(v).toFixed(1)} pp`;
							}
						}
					}
				},
				scales: {
					x: { ...categoryAxis },
					y: {
						...valueAxis,
						grid: {
							/**
							 * El cero es la referencia de todo el gráfico, así que su línea
							 * pesa más que el resto de la rejilla. Es más barato y más
							 * fiable que un dataset de ceros, que aparecería en el tooltip.
							 */
							color: (ctx: { tick: { value: number } }) =>
								ctx.tick.value === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.05)',
							drawTicks: false
						},
						ticks: {
							...valueAxis.ticks,
							color: CHART_AXIS_INK,
							/**
							 * Las marcas caen en múltiplos de la banda, así que el eje dice
							 * −5 / 0 / +5 y no −6 / −5 / 0 / +5 / +6. Los números que
							 * importan en este gráfico son exactamente los bordes de la
							 * banda y el cero; el resto es ruido de rejilla.
							 */
							stepSize: bandPp,
							includeBounds: false,
							callback: (value: number | string) => {
								const v = Number(value);
								return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(0)}`;
							}
						}
					}
				}
			} as never
		});

		sync();
	});

	onDestroy(() => chart?.destroy());
</script>

<div class="drift">
	{#if driftAssets.length === 0}
		<p class="empty">{$LL.db.drift_empty_no_targets()}</p>
	{:else if !hasData}
		<p class="empty">{$LL.db.drift_empty_no_history()}</p>
	{:else}
		<div class="head">
			<span class="status" class:calm={isCalm}>
				<i class="dot"></i>{statusText}
			</span>
			<div class="legend">
				<span class="legend-item">
					<i class="sw band"></i>{$LL.db.band_legend({ pp: bandPp })}
				</span>
				{#each drift.series as s (s.ticker)}
					<!-- El nombre completo en el `title`: el rótulo es corto a propósito, y el
					     tooltip del gráfico ya usa `s.name`, así que la leyenda no debe ser el
					     único sitio donde no haya forma de saber qué posición es. -->
					<span class="legend-item" title={s.name}>
						<i class="sw" style="background: {s.color}"></i>{tickerLabel(s)}
					</span>
				{/each}
			</div>
		</div>

		<div class="canvas-wrapper">
			<!-- Sin `role="img"`: un `<canvas>` no lo admite. El estado en palabras
			     va arriba, en `.status`, que es texto de verdad. -->
			<canvas bind:this={canvas} aria-label={$LL.db.drift_title()}></canvas>
		</div>

		<p class="axis-caption">{$LL.db.drift_axis()}</p>
	{/if}
</div>

<style>
	.drift {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		width: 100%;
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem 1rem;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--state-negative);
	}

	.status.calm {
		color: var(--text-muted);
		font-weight: 600;
	}

	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: currentColor;
		flex-shrink: 0;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.9rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.66rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.sw {
		width: 9px;
		height: 9px;
		border-radius: 3px;
		flex-shrink: 0;
	}

	.sw.band {
		width: 14px;
		background: rgba(255, 255, 255, 0.16);
	}

	.canvas-wrapper {
		position: relative;
		height: 240px;
		min-height: 240px;
	}

	.axis-caption {
		margin: 0;
		font-size: var(--text-micro);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.3);
		text-align: center;
	}

	.empty {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--text-muted);
	}

	@media (max-width: 640px) {
		.canvas-wrapper {
			height: 200px;
			min-height: 200px;
		}
	}
</style>
