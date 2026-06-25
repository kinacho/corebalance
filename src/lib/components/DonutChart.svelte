<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';

	Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

	interface ChartData {
		labels: string[];
		values: number[];
		colors: string[];
	}

	interface Props {
		data: ChartData;
	}

	let { data }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart<'doughnut'> | null = null;

	const prefersReducedMotion = typeof window !== 'undefined' 
		&& window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function createChartConfig(chartData: ChartData) {
		return {
			type: 'doughnut' as const,
			data: {
				labels: chartData.labels,
				datasets: [
					{
						data: chartData.values,
						backgroundColor: chartData.colors.map((c) => c + 'CC'), // 0.8 alpha
						borderColor: '#0a0a16',
						borderWidth: 3,
						hoverBorderWidth: 4,
						hoverOffset: 12,
						spacing: 4,
						borderRadius: 6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				cutout: '72%',
				layout: {
					padding: 15
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: 'rgba(10, 10, 25, 0.95)',
						titleColor: '#fff',
						bodyColor: 'rgba(255, 255, 255, 0.8)',
						borderColor: 'rgba(255, 255, 255, 0.1)',
						borderWidth: 1,
						cornerRadius: 12,
						padding: 12,
						titleFont: { family: 'Inter', weight: 'bold' as const, size: 13 },
						bodyFont: { family: 'Inter', size: 12 },
						displayColors: true,
						boxWidth: 8,
						boxHeight: 8,
						boxPadding: 6,
						callbacks: {
							label: function (ctx: any) {
								return ` ${ctx.parsed.toFixed(2)}%`;
							}
						}
					}
				},
				animation: prefersReducedMotion ? false : {
					animateRotate: true,
					duration: 1200,
					easing: 'easeOutQuart' as const
				}
			}
		};
	}

	onMount(() => {
		chart = new Chart(canvas, createChartConfig(data));
		return () => chart?.destroy();
	});

	$effect(() => {
		if (chart && data) {
			chart.data.labels = data.labels;
			chart.data.datasets[0].data = data.values;
			chart.data.datasets[0].backgroundColor = data.colors.map((c) => c + 'CC');
			chart.update();
		}
	});
</script>

<div class="donut-wrapper">
	<div class="chart-container">
		<canvas bind:this={canvas}></canvas>
	</div>

	<div class="chart-legend">
		{#each data.labels as label, i}
			<div class="legend-item">
				<span class="legend-dot" style="background: {data.colors[i]}"></span>
				<span class="legend-label">{label}</span>
				<span class="legend-value">{data.values[i].toFixed(2)}%</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.donut-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
	}

	@media (min-width: 1024px) {
		.donut-wrapper {
			flex-direction: row;
			justify-content: center;
			gap: 1.5rem;
			align-items: flex-start; /* Alinear arriba para que todos los donuts empiecen a la misma altura */
		}
	}

	.chart-container {
		position: relative;
		width: 100%;
		max-width: 180px;
		aspect-ratio: 1;
		filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
	}

	.chart-legend {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		max-width: 180px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem 0.6rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 8px currentColor;
	}

	.legend-label {
		font-size: 0.7rem;
		color: rgba(160, 160, 200, 0.7);
		font-weight: 600;
		flex: 1;
	}

	.legend-value {
		font-size: 0.7rem;
		color: #fff;
		font-weight: 800;
		font-family: 'Monaco', monospace;
	}
</style>
