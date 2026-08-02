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
		Tooltip,
		Legend
	} from 'chart.js';

	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);

	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR } from '$lib/utils';
	import { LL, locale } from '$lib/i18n/i18n-svelte';

	/**
	 * Tres modos, tres preguntas distintas, nunca en el mismo eje:
	 *
	 * - `value`  — ¿cuánto tengo? Vender **debe** hacerla bajar.
	 * - `twr`    — ¿cómo se han comportado mis activos? Ni vender ni aportar la mueven.
	 * - `gain`   — ¿cuánto he ganado sobre lo aportado?
	 *
	 * Mezclar la primera con la segunda es lo que convertía una venta en una
	 * pérdida aparente del 40 %.
	 */
	type ViewMode = 'value' | 'twr' | 'gain';

	let canvas: HTMLCanvasElement;
	let chart: Chart;
	let currentRange = $state(30);
	let viewMode = $state<ViewMode>('value');

	const prefersReducedMotion = typeof window !== 'undefined'
		&& window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const ranges = [
		{ label: '7D', days: 7 },
		{ label: '14D', days: 14 },
		{ label: '30D', days: 30 }
	];

	// Por defecto solo la línea principal; las categorías se activan a mano.
	let hiddenDatasets = $state<string[]>(['Principal', 'Acciones', 'Conservadora', 'Invertido']);

	onMount(() => {
		const saved = localStorage.getItem('corebalance_hidden_history_lines');
		if (saved) {
			try {
				hiddenDatasets = JSON.parse(saved);
			} catch (e) {
				console.error('Error loading hidden lines', e);
			}
		}
	});

	$effect(() => {
		localStorage.setItem('corebalance_hidden_history_lines', JSON.stringify(hiddenDatasets));
	});

	function toggleDataset(label: string) {
		if (hiddenDatasets.includes(label)) {
			hiddenDatasets = hiddenDatasets.filter(l => l !== label);
		} else {
			hiddenDatasets = [...hiddenDatasets, label];
		}
	}

	const series = $derived(portfolio.performanceSeries);

	/** La ventana visible, con el índice TWR rebasado a su primer día. */
	const view = $derived.by(() => {
		const all = series.points;
		const start = Math.max(0, all.length - currentRange);
		const points = all.slice(start);
		const rawTwr = series.twr.slice(start);
		const twrBase = rawTwr[0] > 0 ? rawTwr[0] : 100;

		return {
			points,
			twrPct: rawTwr.map((v) => (v / twrBase - 1) * 100),
			invested: series.invested.slice(start),
			gain: series.gain.slice(start),
			estimated: points.map((p) => p.estimated),
			hasEstimated: points.some((p) => p.estimated),
			hasGaps: points.some((p) => !p.hasBreakdown),
			flows: points.map((p) => p.netFlow)
		};
	});

	const isPercentMode = $derived(viewMode === 'twr');

	/**
	 * En los días sin desglose por categoría se devuelve `null` para que el
	 * gráfico deje un hueco. Los snapshots de versiones anteriores solo guardaban
	 * el total, y dibujar una categoría inventada sería peor que no dibujarla.
	 */
	function categorySeries(key: 'core' | 'stocks' | 'satellite'): (number | null)[] {
		return view.points.map((p) => (p.hasBreakdown ? p[key] : null));
	}

	function flowLabel(amount: number): string {
		return amount > 0 ? $LL.db.chart_flow_in() : $LL.db.chart_flow_out();
	}

	/** Volcado de la serie al gráfico. */
	function syncChart() {
		if (!chart) return;

		const loc = $locale === 'es' ? 'es-ES' : 'en-US';
		chart.data.labels = view.points.map((p) =>
			new Date(p.date).toLocaleDateString(loc, { day: '2-digit', month: 'short' }).replace('.', '')
		);

		chart.data.datasets[0].label =
			viewMode === 'twr' ? $LL.db.chart_label_return()
			: viewMode === 'gain' ? $LL.db.chart_label_gain()
			: $LL.db.chart_label_total();
		chart.data.datasets[1].label = $LL.db.chart_label_core();
		chart.data.datasets[2].label = $LL.db.chart_label_stocks();
		chart.data.datasets[3].label = $LL.db.chart_label_satellite();
		chart.data.datasets[4].label = $LL.db.chart_label_invested();

		chart.data.datasets[0].data =
			viewMode === 'twr' ? view.twrPct : viewMode === 'gain' ? view.gain : view.points.map((p) => p.total);
		chart.data.datasets[0].hidden = hiddenDatasets.includes('Total');

		// Las categorías solo tienen sentido en euros: el desglose por categoría de
		// la rentabilidad exigiría repartir los flujos por categoría, que es
		// precisión que ahora mismo no se tiene.
		const showCategories = viewMode === 'value';
		chart.data.datasets[1].data = categorySeries('core');
		chart.data.datasets[1].hidden = !showCategories || hiddenDatasets.includes('Principal');
		chart.data.datasets[2].data = categorySeries('stocks');
		chart.data.datasets[2].hidden = !showCategories || hiddenDatasets.includes('Acciones');
		chart.data.datasets[3].data = categorySeries('satellite');
		chart.data.datasets[3].hidden = !showCategories || hiddenDatasets.includes('Conservadora');

		// El capital aportado es una escalera real, no el invertido de hoy repetido
		// hacia atrás como si nunca hubieras aportado nada.
		chart.data.datasets[4].data = view.invested;
		chart.data.datasets[4].hidden = !showCategories || hiddenDatasets.includes('Invertido');

		if (chart.options.scales?.y) {
			const yAxis = chart.options.scales.y as any;
			if (isPercentMode) {
				yAxis.ticks.callback = (value: number) => portfolio.isPrivate ? '****' : value.toFixed(1) + '%';
				yAxis.title = { display: true, text: $LL.db.chart_performance_pct(), color: 'rgba(255,255,255,0.3)', font: { size: 10 } };
			} else {
				yAxis.ticks.callback = (value: number) => portfolio.isPrivate ? '****' : formatEUR(value);
				yAxis.title = { display: false };
			}
		}

		chart.update();
	}

	$effect(() => {
		// `view` se lee antes de cualquier guarda para que el efecto quede suscrito
		// a ella aunque el gráfico todavía no exista. Comprobar `chart` primero
		// cortocircuitaba la lectura, el efecto no registraba la dependencia y el
		// lienzo se quedaba en blanco hasta el siguiente tick de precios.
		const hasData = view.points.length > 0;
		// Modo y visibilidad también son dependencias del volcado.
		void viewMode;
		void hiddenDatasets;
		if (hasData) syncChart();
	});

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const createGradient = (color: string, opacity: number) => {
			const gradient = ctx.createLinearGradient(0, 0, 0, 400);
			gradient.addColorStop(0, color.replace('1)', `${opacity})`));
			gradient.addColorStop(1, color.replace('1)', '0)'));
			return gradient;
		};

		/** Discontinuo en los tramos que la app no observó, solo reconstruyó. */
		const dashEstimated = (ctx: any) =>
			view.estimated[ctx.p1DataIndex] ? [4, 4] : undefined;

		// @ts-ignore - Chart.js types are too strict for this configuration
		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: [],
				datasets: [
					{
						label: 'Total',
						data: [],
						borderColor: '#ffffff',
						backgroundColor: createGradient('rgba(255, 255, 255, 1)', 0.1),
						fill: true,
						tension: 0.45,
						borderWidth: 3,
						borderCapStyle: 'round',
						borderJoinStyle: 'round',
						segment: { borderDash: dashEstimated },
						// Un punto visible solo donde hubo movimiento de dinero.
						pointRadius: (ctx: any) => (view.flows[ctx.dataIndex] ? 5 : 0),
						pointHoverRadius: (ctx: any) => (view.flows[ctx.dataIndex] ? 7 : 4),
						pointBackgroundColor: (ctx: any) =>
							view.flows[ctx.dataIndex] > 0 ? '#10b981' : '#f59e0b',
						pointBorderColor: '#05050a',
						pointBorderWidth: 2
					},
					{
						label: 'Principal',
						data: [],
						borderColor: '#3b82f6',
						fill: false,
						tension: 0.45,
						pointRadius: 0,
						borderWidth: 2,
						borderCapStyle: 'round',
						borderJoinStyle: 'round',
						segment: { borderDash: dashEstimated },
						spanGaps: false
					},
					{
						label: 'Acciones',
						data: [],
						borderColor: '#10b981',
						fill: false,
						tension: 0.45,
						pointRadius: 0,
						borderWidth: 2,
						borderCapStyle: 'round',
						borderJoinStyle: 'round',
						segment: { borderDash: dashEstimated },
						spanGaps: false
					},
					{
						label: 'Conservadora',
						data: [],
						borderColor: '#f59e0b',
						fill: false,
						tension: 0.45,
						pointRadius: 0,
						borderWidth: 2,
						borderCapStyle: 'round',
						borderJoinStyle: 'round',
						segment: { borderDash: dashEstimated },
						spanGaps: false
					},
					{
						label: 'Invertido',
						data: [],
						borderColor: 'rgba(255, 255, 255, 0.3)',
						borderDash: [6, 4],
						borderWidth: 1.5,
						pointRadius: 0,
						fill: false,
						stepped: true,
						borderCapStyle: 'round',
						borderJoinStyle: 'round'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false,
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: 'rgba(15, 15, 30, 0.95)',
						titleFont: { size: 13, weight: 800 },
						bodyFont: { size: 12, weight: 600 },
						footerFont: { size: 11, weight: 600 },
						padding: 14,
						cornerRadius: 16,
						borderColor: 'rgba(255, 255, 255, 0.1)',
						borderWidth: 1,
						usePointStyle: true,
						itemSort: (a: any, b: any) => (b.raw as number) - (a.raw as number),
						callbacks: {
							label: (context: any) => {
								const label = context.dataset.label || '';
								if (portfolio.isPrivate) return ` ${label}: ****`;
								const yValue = context.parsed.y ?? 0;
								const value = isPercentMode
									? yValue.toFixed(2) + '%'
									: formatEUR(yValue);
								return ` ${label}: ${value}`;
							},
							/**
							 * La pieza que evita el susto: cuando el patrimonio baja por
							 * una venta, el tooltip lo dice con palabras en lugar de
							 * dejar que el usuario lo lea como una pérdida.
							 */
							footer: (items: any[]) => {
								const index = items[0]?.dataIndex ?? -1;
								const flow = view.flows[index] ?? 0;
								const lines: string[] = [];
								if (flow && !portfolio.isPrivate) {
									lines.push(
										`${flowLabel(flow)}: ${formatEUR(flow)} — ${$LL.db.chart_flow_not_loss()}`
									);
								}
								if (view.estimated[index]) lines.push($LL.db.chart_estimated_short());
								return lines;
							}
						}
					}
				},
				animation: prefersReducedMotion ? false : {
					// Efecto de dibujo a mano alzada (progresivo)
					x: {
						type: 'number',
						easing: 'easeInOutQuart',
						duration: 20, // Duración por punto
						from: NaN,
						delay(ctx: any) {
							if (ctx.type !== 'data' || ctx.xStarted) return 0;
							ctx.xStarted = true;
							return ctx.index * 20;
						}
					},
					y: {
						type: 'number',
						easing: 'easeInOutQuart',
						duration: 20,
						from: (ctx: any) => ctx.chart.scales.y.getPixelForValue(ctx.chart.scales.y.min),
						delay(ctx: any) {
							if (ctx.type !== 'data' || ctx.yStarted) return 0;
							ctx.yStarted = true;
							return ctx.index * 20;
						}
					}
				},
				scales: {
					x: {
						grid: { display: false },
						ticks: {
							color: 'rgba(255, 255, 255, 0.5)',
							font: { size: 11, weight: 600 },
							maxRotation: 0,
							autoSkip: true,
							maxTicksLimit: 6
						}
					},
					y: {
						beginAtZero: false,
						position: 'right',
						grid: {
							color: 'rgba(255, 255, 255, 0.05)',
						},
						border: { display: false },
						ticks: {
							color: 'rgba(255, 255, 255, 0.5)',
							font: { size: 11, weight: 600 },
							padding: 10,
						}
					}
				}
			} as any
		});

		// Primer pintado sin esperar al siguiente tick de precios.
		syncChart();
	});

	onDestroy(() => {
		if (chart) chart.destroy();
	});
</script>

<div class="chart-container">
	<div class="chart-header">
		<div class="legend">
			<button
				class="legend-item"
				class:is-hidden={hiddenDatasets.includes('Total')}
				onclick={() => toggleDataset('Total')}
			>
				<span class="dot total"></span>
				<span class="label">
					{viewMode === 'twr' ? $LL.db.chart_label_return()
						: viewMode === 'gain' ? $LL.db.chart_label_gain()
						: $LL.db.chart_label_total()}
				</span>
			</button>
			{#if viewMode === 'value'}
				<button
					class="legend-item"
					class:is-hidden={hiddenDatasets.includes('Principal')}
					onclick={() => toggleDataset('Principal')}
				>
					<span class="dot core"></span>
					<span class="label">{$LL.db.chart_label_core()}</span>
				</button>
				<button
					class="legend-item"
					class:is-hidden={hiddenDatasets.includes('Acciones')}
					onclick={() => toggleDataset('Acciones')}
				>
					<span class="dot stocks"></span>
					<span class="label">{$LL.db.chart_label_stocks()}</span>
				</button>
				<button
					class="legend-item"
					class:is-hidden={hiddenDatasets.includes('Conservadora')}
					onclick={() => toggleDataset('Conservadora')}
				>
					<span class="dot satellite"></span>
					<span class="label">{$LL.db.chart_label_satellite()}</span>
				</button>
				<button
					class="legend-item"
					class:is-hidden={hiddenDatasets.includes('Invertido')}
					onclick={() => toggleDataset('Invertido')}
				>
					<span class="line invested"></span>
					<span class="label">{$LL.db.chart_label_invested()}</span>
				</button>
			{/if}
		</div>

		<div class="controls-group">
			<div class="view-toggle">
				<button
					class="toggle-btn"
					class:active={viewMode === 'value'}
					onclick={() => viewMode = 'value'}
					title={$LL.db.chart_mode_value_title()}
				>
					€
				</button>
				<button
					class="toggle-btn"
					class:active={viewMode === 'twr'}
					onclick={() => viewMode = 'twr'}
					title={$LL.db.chart_mode_twr_title()}
				>
					%
				</button>
				<button
					class="toggle-btn"
					class:active={viewMode === 'gain'}
					onclick={() => viewMode = 'gain'}
					title={$LL.db.chart_mode_gain_title()}
				>
					±
				</button>
			</div>

			<div class="range-selector">
				{#each ranges as range}
					<button
						class="range-btn"
						class:active={currentRange === range.days}
						onclick={() => currentRange = range.days}
					>
						{range.label}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="canvas-wrapper">
		<canvas bind:this={canvas}></canvas>
	</div>

	<div class="chart-notes">
		{#if viewMode === 'twr'}
			<p class="note accent">{$LL.db.chart_twr_hint()}</p>
		{/if}
		{#if view.hasEstimated}
			<p class="note">{$LL.db.chart_estimated_note()}</p>
		{/if}
		{#if view.hasGaps && viewMode === 'value'}
			<p class="note">{$LL.db.chart_gaps_note()}</p>
		{/if}
	</div>
</div>

<style>
	.chart-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		height: 100%;
		padding: 0.5rem;
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.controls-group {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.view-toggle {
		display: flex;
		background: rgba(255, 255, 255, 0.05);
		padding: 3px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.toggle-btn {
		padding: 0.4rem 0.7rem;
		border-radius: 8px;
		font-size: 0.75rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.4);
		transition: all 0.2s ease;
		background: transparent;
		border: none;
		cursor: pointer;
		min-width: 32px;
	}

	.toggle-btn.active {
		background: #ffffff;
		color: #05050a;
	}

	.legend {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.legend-item:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.legend-item.is-hidden {
		opacity: 0.3;
		filter: grayscale(1);
	}

	.legend-item.is-hidden .label {
		text-decoration: line-through;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.dot.total { background: #ffffff; box-shadow: 0 0 8px rgba(255, 255, 255, 0.4); }
	.dot.core { background: #3b82f6; box-shadow: 0 0 8px rgba(59, 130, 246, 0.5); }
	.dot.stocks { background: #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); }
	.dot.satellite { background: #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.5); }

	.line.invested {
		width: 12px;
		height: 2px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 1px;
	}

	.label {
		font-size: 0.7rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.range-selector {
		display: flex;
		background: rgba(255, 255, 255, 0.05);
		padding: 3px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.range-btn {
		padding: 0.4rem 0.8rem;
		border-radius: 8px;
		font-size: 0.7rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.4);
		transition: all 0.2s ease;
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.range-btn:hover {
		color: #ffffff;
	}

	.range-btn.active {
		background: rgba(255, 255, 255, 0.1);
		color: #ffffff;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.canvas-wrapper {
		flex: 1;
		min-height: 280px;
		height: 280px;
		position: relative;
	}

	.chart-notes {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: -0.75rem;
	}

	.note {
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--text-muted);
		margin: 0;
	}

	.note.accent {
		color: rgba(255, 255, 255, 0.65);
	}

	@media (max-width: 640px) {
		.chart-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.controls-group {
			width: 100%;
			justify-content: space-between;
		}

		.canvas-wrapper {
			min-height: 220px;
			height: 220px;
		}
	}
</style>
