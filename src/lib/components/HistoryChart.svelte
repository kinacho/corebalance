<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR } from '$lib/utils';

	let canvas: HTMLCanvasElement;
	let chart: Chart;
	let currentRange = $state(30);
	let viewMode = $state<'value' | 'percent'>('value');

	const ranges = [
		{ label: '7D', days: 7 },
		{ label: '14D', days: 14 },
		{ label: '30D', days: 30 }
	];

	// Sincronizar el gráfico con los datos de la historia
	$effect(() => {
		const fullHistory = portfolio.reconstructedHistory;
		const history = fullHistory.slice(-currentRange);
		
		if (chart && history.length > 0) {
			const first = history[0];
			
			chart.data.labels = history.map((p, i) => {
				const date = new Date(p.date);
				return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).replace('.', '');
			});

			const transform = (val: number, firstVal: number) => {
				if (viewMode === 'percent') {
					return firstVal > 0 ? ((val - firstVal) / firstVal) * 100 : 0;
				}
				return val;
			};

			// Dataset 0: Total
			chart.data.datasets[0].data = history.map(p => transform(p.total, first.total));
			// Dataset 1: Principal
			chart.data.datasets[1].data = history.map(p => transform(p.core, first.core));
			// Dataset 2: Acciones
			chart.data.datasets[2].data = history.map(p => transform(p.stocks, first.stocks));
			// Dataset 3: Conservadora
			chart.data.datasets[3].data = history.map(p => transform(p.satellite, first.satellite));
			// Dataset 4: Invertido
			if (viewMode === 'value') {
				chart.data.datasets[4].data = history.map(() => portfolio.globalInvested);
				chart.data.datasets[4].hidden = false;
			} else {
				chart.data.datasets[4].hidden = true;
			}

			// Ajustar escalas según el modo
			if (chart.options.scales?.y) {
				const yAxis = chart.options.scales.y as any;
				if (viewMode === 'percent') {
					yAxis.ticks.callback = (value: number) => value.toFixed(1) + '%';
					yAxis.title = { display: true, text: 'Rendimiento (%)', color: 'rgba(255,255,255,0.3)', font: { size: 10 } };
				} else {
					yAxis.ticks.callback = (value: number) => formatEUR(value);
					yAxis.title = { display: false };
				}
			}

			chart.update('none');
		}
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
						tension: 0.4,
						pointRadius: 0,
						borderWidth: 3,
					},
					{
						label: 'Principal',
						data: [],
						borderColor: '#3b82f6',
						fill: false,
						tension: 0.4,
						pointRadius: 0,
						borderWidth: 2,
					},
					{
						label: 'Acciones',
						data: [],
						borderColor: '#10b981',
						fill: false,
						tension: 0.4,
						pointRadius: 0,
						borderWidth: 2,
					},
					{
						label: 'Conservadora',
						data: [],
						borderColor: '#f59e0b',
						fill: false,
						tension: 0.4,
						pointRadius: 0,
						borderWidth: 2,
					},
					{
						label: 'Invertido',
						data: [],
						borderColor: 'rgba(255, 255, 255, 0.3)',
						borderDash: [6, 4],
						borderWidth: 1.5,
						pointRadius: 0,
						fill: false,
						tension: 0,
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
						padding: 14,
						cornerRadius: 16,
						borderColor: 'rgba(255, 255, 255, 0.1)',
						borderWidth: 1,
						usePointStyle: true,
						itemSort: (a: any, b: any) => (b.raw as number) - (a.raw as number),
						callbacks: {
							label: (context) => {
								const label = context.dataset.label || '';
								const yValue = context.parsed.y ?? 0;
								const value = viewMode === 'percent' 
									? yValue.toFixed(2) + '%' 
									: formatEUR(yValue);
								return ` ${label}: ${value}`;
							}
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
			}
		});
	});

	onDestroy(() => {
		if (chart) chart.destroy();
	});
</script>

<div class="chart-container">
	<div class="chart-header">
		<div class="legend">
			<div class="legend-item">
				<span class="dot total"></span>
				<span class="label">Total</span>
			</div>
			<div class="legend-item">
				<span class="dot core"></span>
				<span class="label">Principal</span>
			</div>
			<div class="legend-item">
				<span class="dot stocks"></span>
				<span class="label">Acciones</span>
			</div>
			<div class="legend-item">
				<span class="dot satellite"></span>
				<span class="label">Conservadora</span>
			</div>
			{#if viewMode === 'value'}
				<div class="legend-item">
					<span class="line invested"></span>
					<span class="label">Invertido</span>
				</div>
			{/if}
		</div>

		<div class="controls-group">
			<div class="view-toggle">
				<button 
					class="toggle-btn" 
					class:active={viewMode === 'value'}
					onclick={() => viewMode = 'value'}
				>
					€
				</button>
				<button 
					class="toggle-btn" 
					class:active={viewMode === 'percent'}
					onclick={() => viewMode = 'percent'}
				>
					%
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
		position: relative;
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
	}
</style>
