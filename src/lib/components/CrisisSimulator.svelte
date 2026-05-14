<script lang="ts">
	import { onMount } from 'svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR, formatCurrency } from '$lib/utils';
	import { Chart, type ChartConfiguration } from 'chart.js/auto';

	import { fade, fly } from 'svelte/transition';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	// --- State (Runes) ---
	let initialCapital = $state(portfolio.globalCapital || 10000);
	let dropPercent = $state(40);
	let monthlyDca = $state(portfolio.contribution || 500);
	let expectedReturn = $state(7);
	let isOpen = $state(false);

	// Sincronizar con el store si cambia el capital global, pero solo si el usuario no ha editado manualmente aún
	let hasManuallyEdited = $state(false);

	let hasManuallyEditedDca = $state(false);
	$effect(() => {
		if (portfolio.globalCapital > 0 && !hasManuallyEdited) {
			initialCapital = Number(portfolio.globalCapital.toFixed(2));
		}
		if (portfolio.contribution > 0 && !hasManuallyEditedDca) {
			monthlyDca = portfolio.contribution;
		}
	});


	// --- Calculations ---
	const monthlyRate = $derived(expectedReturn / 100 / 12);
	const capitalAfterDrop = $derived(initialCapital * (1 - dropPercent / 100));

	const projectionData = $derived.by(() => {
		const pointsWithoutDca: { x: number; y: number }[] = [];
		const pointsWithDca: { x: number; y: number }[] = [];
		
		let months = 0;
		let recoveredWithout = false;
		let recoveredWith = false;
		
		const maxMonths = 360; // Límite de 30 años para evitar loops infinitos
		
		while ((!recoveredWithout || !recoveredWith) && months < maxMonths) {
			// Sin DCA
			const valNoDca = capitalAfterDrop * Math.pow(1 + monthlyRate, months);
			pointsWithoutDca.push({ x: months, y: valNoDca });
			if (valNoDca >= initialCapital) recoveredWithout = true;
			
			// Con DCA
			let valWithDca;
			if (monthlyRate === 0) {
				valWithDca = capitalAfterDrop + (monthlyDca * months);
			} else {
				valWithDca = capitalAfterDrop * Math.pow(1 + monthlyRate, months) + 
							 monthlyDca * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
			}
			pointsWithDca.push({ x: months, y: valWithDca });
			if (valWithDca >= initialCapital) recoveredWith = true;
			
			months++;
			
			// Si ya se recuperaron ambos, añadimos unos meses extra para el gráfico
			if (recoveredWithout && recoveredWith && months % 12 === 0) break;
		}
		
		return { pointsWithoutDca, pointsWithDca, totalMonths: months };
	});

	const stats = $derived.by(() => {
		const { pointsWithoutDca, pointsWithDca } = projectionData;
		
		const monthsToRecoverNoDca = pointsWithoutDca.findIndex(p => p.y >= initialCapital);
		const monthsToRecoverWithDca = pointsWithDca.findIndex(p => p.y >= initialCapital);
		
		const totalDca = (monthsToRecoverWithDca > 0 ? monthsToRecoverWithDca : 0) * monthlyDca;
		const timeSaved = (monthsToRecoverNoDca > 0 && monthsToRecoverWithDca > 0) 
			? monthsToRecoverNoDca - monthsToRecoverWithDca 
			: 0;

		return {
			valueAfterDrop: capitalAfterDrop,
			monthsNoDca: monthsToRecoverNoDca,
			monthsWithDca: monthsToRecoverWithDca,
			totalDca,
			timeSaved
		};
	});

	// --- Animated Stats (Tweened) ---
	const tValueAfterDrop = tweened(0, { duration: 600, easing: cubicOut });
	const tMonthsNoDca = tweened(0, { duration: 600, easing: cubicOut });
	const tMonthsWithDca = tweened(0, { duration: 600, easing: cubicOut });
	const tTotalDca = tweened(0, { duration: 600, easing: cubicOut });
	const tTimeSaved = tweened(0, { duration: 600, easing: cubicOut });

	$effect(() => {
		tValueAfterDrop.set(stats.valueAfterDrop);
		tMonthsNoDca.set(stats.monthsNoDca);
		tMonthsWithDca.set(stats.monthsWithDca);
		tTotalDca.set(stats.totalDca);
		tTimeSaved.set(stats.timeSaved);
	});


	function getEstimatedDate(months: number) {
		if (months < 0) return 'Nunca';
		const d = new Date();
		d.setMonth(d.getMonth() + months);
		return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
	}

	// --- Chart Logic ---
	let chartCanvas: HTMLCanvasElement;
	let chart: Chart;

	$effect(() => {
		if (!chartCanvas || !isOpen) return;
		
		const { pointsWithoutDca, pointsWithDca } = projectionData;
		
		const data = {
			labels: pointsWithDca.map(p => `Mes ${p.x}`),
			datasets: [
				{
					label: 'Original',
					data: Array(pointsWithDca.length).fill(initialCapital),
					borderColor: 'rgba(255, 255, 255, 0.3)',
					borderDash: [5, 5],
					borderWidth: 1,
					pointRadius: 0,
					fill: false
				},
				{
					label: 'Con DCA',
					data: pointsWithDca.map(p => p.y),
					borderColor: '#10b981',
					backgroundColor: 'rgba(16, 185, 129, 0.1)',
					borderWidth: 3,
					pointRadius: 0,
					fill: true,
					tension: 0.4
				},
				{
					label: 'Sin DCA',
					data: pointsWithoutDca.map(p => p.y),
					borderColor: '#f59e0b',
					borderWidth: 2,
					pointRadius: 0,
					fill: false,
					tension: 0.4
				}
			]
		};

		if (chart) {
			chart.data = data;
			chart.update('none');
		} else {
			const config: ChartConfiguration = {
				type: 'line',
				data,
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { display: false },
						tooltip: {
							mode: 'index',
							intersect: false,
							callbacks: {
								label: (context) => {
									const val = context.parsed.y;
									return `${context.dataset.label}: ${formatEUR(val ?? 0)}`;
								}
							}
						}
					},
					scales: {
						y: {
							min: 0,
							grid: { color: 'rgba(255, 255, 255, 0.05)' },
							ticks: { 
								color: 'rgba(255, 255, 255, 0.5)',
								callback: (val) => formatCurrency(Number(val), 'EUR', 0)

							}
						},
						x: {
							grid: { display: false },
							ticks: { 
								color: 'rgba(255, 255, 255, 0.3)',
								maxRotation: 0,
								autoSkip: true,
								maxTicksLimit: 10
							}
						}
					}
				}
			};
			chart = new Chart(chartCanvas, config);
		}
	});

	onMount(() => {
		return () => {
			if (chart) chart.destroy();
		};
	});
</script>

<div class="panel" class:open={isOpen}>
	<button class="panel-header" onclick={() => isOpen = !isOpen} aria-expanded={isOpen}>
		<div class="panel-info">
			<div class="panel-icon">📉</div>
			<div class="panel-text">
				<h2 class="panel-title">Simulador de Crisis</h2>
				<p class="panel-subtitle">¿Qué pasa si el mercado cae?</p>
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
					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="capital-range">Capital Inicial</label>
							<span class="control-value">{formatEUR(initialCapital)}</span>
						</div>
						<input id="capital-range" type="range" min="0" max={Math.max(1000000, initialCapital * 2)} step="100" bind:value={initialCapital} oninput={() => hasManuallyEdited = true} />
					</div>


					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="drop">Caída del Mercado</label>
							<span class="control-value highlight">-{dropPercent}%</span>
						</div>
						<input id="drop" type="range" min="5" max="90" step="5" bind:value={dropPercent} />
						<div class="presets">
							{#each [20, 40, 60, 80] as p}
								<button class="preset-btn" class:active={dropPercent === p} onclick={() => dropPercent = p}>
									-{p}%
								</button>
							{/each}
						</div>
					</div>

					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="dca">Aportación DCA</label>
							<span class="control-value">{formatEUR(monthlyDca)}</span>
						</div>
						<input id="dca" type="range" min="0" max="10000" step="50" bind:value={monthlyDca} oninput={() => hasManuallyEditedDca = true} />
					</div>

					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="return">Interés Esperado</label>
							<span class="control-value">{expectedReturn}%</span>
						</div>
						<input id="return" type="range" min="0" max="20" step="0.5" bind:value={expectedReturn} />
					</div>
				</div>

				<div class="chart-container">
					<canvas bind:this={chartCanvas}></canvas>
				</div>

				<div class="stats-grid">
					<div class="stat-card highlight-red">
						<span class="stat-label">Tras caída</span>
						<span class="stat-value">{formatEUR($tValueAfterDrop)}</span>
					</div>

					<div class="stat-card">
						<span class="stat-label">Sin DCA</span>
						<span class="stat-value">{$tMonthsNoDca.toFixed(0)} <small>meses</small></span>
						<span class="stat-sub">{getEstimatedDate(Math.round($tMonthsNoDca))}</span>
					</div>

					<div class="stat-card highlight-green">
						<span class="stat-label">Con DCA</span>
						<span class="stat-value">{$tMonthsWithDca.toFixed(0)} <small>meses</small></span>
						<span class="stat-sub">{getEstimatedDate(Math.round($tMonthsWithDca))}</span>
					</div>

					<div class="stat-card">
						<span class="stat-label">Tiempo ahorrado</span>
						<span class="stat-value text-green">{$tTimeSaved.toFixed(0)} <small>meses</small></span>
						<span class="stat-sub">Menos de espera</span>
					</div>
				</div>


				<footer class="legal-footer">
					<p>Total aportado vía DCA: {formatEUR($tTotalDca)}</p>
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
		font-size: 1.25rem;
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
		transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
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
		color: rgba(255, 255, 255, 0.3);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.control-value {
		font-size: 0.85rem;
		font-weight: 700;
		color: #3b82f6;
	}

	.control-value.highlight {
		color: #fca5a5;
	}

	input[type="range"] {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		outline: none;
		touch-action: pan-y pinch-zoom;
	}

	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		background: #3b82f6;
		border-radius: 50%;
		cursor: pointer;
		border: 2px solid #05050a;
		box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
	}

	.presets {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}

	.preset-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 0.4rem;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.7rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}

	.preset-btn:hover { background: rgba(255, 255, 255, 0.1); }
	.preset-btn.active {
		background: rgba(59, 130, 246, 0.2);
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.chart-container {
		height: 160px;
		position: relative;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.stat-card {
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.6rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.3);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.1rem;
		font-weight: 800;
		color: white;
	}

	.stat-value small {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.stat-sub {
		font-size: 0.65rem;
		color: rgba(160, 160, 200, 0.5);
	}

	.highlight-red { border-left: 3px solid #ef4444; }
	.highlight-green { border-left: 3px solid #10b981; }
	.text-green { color: #10b981; }

	.legal-footer {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.2);
		text-align: center;
	}
</style>
