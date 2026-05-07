<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import { portfolio } from '$lib/stores/portfolio.svelte';

	let canvas: HTMLCanvasElement;
	let chart: Chart;

	// Sincronizar el gráfico con los datos de la historia
	$effect(() => {
		const history = portfolio.reconstructedHistory;
		if (chart && history.length > 0) {
			chart.data.labels = history.map((p, i) => {
				if (p.date) {
					const date = new Date(p.date);
					// Formato: "07 may"
					return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).replace('.', '');
				}
				return `Día ${i + 1}`;
			});
			chart.data.datasets[0].data = history.map(p => p.value);
			chart.update('none'); // Update sin animación para suavidad
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
				animation: {
					duration: 750,
					easing: 'easeInOutQuart'
				},
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
						ticks: { 
							color: 'rgba(255, 255, 255, 0.5)', 
							font: { size: 11, weight: 500 },
							maxRotation: 0,
							autoSkip: true,
							maxTicksLimit: 7
						}
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

<div class="chart-wrapper">
	<div class="chart-container">
		{#if portfolio.reconstructedHistory.length < 2 && !portfolio.loading}
			<div class="empty-chart">
				<div class="empty-icon">⏳</div>
				<p>Obteniendo datos históricos para generar la gráfica...</p>
			</div>
		{/if}
		<canvas bind:this={canvas}></canvas>
	</div>
</div>

<style>
	.chart-wrapper {
		width: 100%;
		padding: 0.5rem 0;
	}

	.chart-container {
		width: 100%;
		height: 240px;
		position: relative;
	}

	.empty-chart {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(10, 10, 20, 0.4);
		backdrop-filter: blur(8px);
		border-radius: 20px;
		z-index: 10;
		gap: 0.75rem;
	}

	.empty-icon {
		font-size: 2rem;
		animation: pulse-slow 2s infinite ease-in-out;
	}

	@keyframes pulse-slow {
		0%, 100% { opacity: 0.5; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.1); }
	}

	.empty-chart p {
		font-size: 0.85rem;
		color: rgba(160, 160, 200, 0.8);
		max-width: 250px;
		text-align: center;
		margin: 0;
		font-weight: 500;
	}

	canvas {
		width: 100% !important;
		height: 100% !important;
	}
</style>
