<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import { portfolio } from '$lib/stores/portfolio.svelte';

	let canvas: HTMLCanvasElement;
	let chart: Chart;

	// Sincronizar el gráfico con los datos de la historia
	$effect(() => {
		if (chart && portfolio.history.length > 0) {
			chart.data.labels = portfolio.history.map(p => {
				const date = new Date(p.date);
				return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
			});
			chart.data.datasets[0].data = portfolio.history.map(p => p.value);
			chart.update();
		}
	});

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: [],
				datasets: [{
					label: 'Capital Total',
					data: [],
					borderColor: '#3b82f6',
					backgroundColor: (context) => {
						const chart = context.chart;
						const {ctx, chartArea} = chart;
						if (!chartArea) return 'transparent';
						const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
						gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
						gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
						return gradient;
					},
					fill: true,
					tension: 0.4,
					pointRadius: 4,
					pointBackgroundColor: '#3b82f6',
					pointBorderColor: '#0a0a16',
					pointBorderWidth: 2,
					pointHoverRadius: 6
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						mode: 'index',
						intersect: false,
						backgroundColor: 'rgba(15, 15, 30, 0.9)',
						titleColor: '#fff',
						bodyColor: '#3b82f6',
						borderColor: 'rgba(255, 255, 255, 0.1)',
						borderWidth: 1,
						padding: 10,
						displayColors: false,
						callbacks: {
							label: (context) => {
								return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(context.parsed.y ?? 0);
							}
						}
					}
				},
				scales: {
					x: {
						grid: { display: false },
						ticks: { color: 'rgba(160, 160, 200, 0.5)', font: { size: 10 } }
					},
					y: {
						grid: { color: 'rgba(255, 255, 255, 0.05)' },
						ticks: { 
							color: 'rgba(160, 160, 200, 0.5)', 
							font: { size: 10 },
							callback: (value) => {
								if (typeof value === 'number') {
									return value >= 1000 ? (value / 1000).toFixed(1) + 'k€' : value + '€';
								}
								return value;
							}
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

<div class="chart-container privacy-blur">
	{#if portfolio.history.length < 2}
		<div class="empty-chart">
			<p>Se necesitan al menos 2 días de datos para mostrar la evolución.</p>
		</div>
	{/if}
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 200px;
		position: relative;
	}

	.empty-chart {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 12px;
		z-index: 10;
		backdrop-filter: blur(4px);
	}

	.empty-chart p {
		font-size: 0.75rem;
		color: rgba(160, 160, 200, 0.6);
		max-width: 200px;
		text-align: center;
	}

	canvas {
		width: 100% !important;
		height: 100% !important;
	}
</style>
