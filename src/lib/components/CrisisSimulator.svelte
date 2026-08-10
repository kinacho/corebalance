<script lang="ts">
	import { onMount } from 'svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR } from '$lib/utils';
	/**
	 * ⚠️ Registro selectivo, no `chart.js/auto`. `auto` arrastra **todos** los
	 * controladores, escalas y plugins de la librería —incluidos radar, polar,
	 * burbuja y barras— y tiraba por tierra el registro a mano que hacen los
	 * otros dos lienzos, que para eso lo hacen.
	 */
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Filler,
		Tooltip,
		type ChartConfiguration
	} from 'chart.js';

	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

	import { formatCompactCurrency, stepFromTicks } from '$lib/chart-format';
	import { applyChartDefaults, tooltipStyle, categoryAxis, valueAxis, motionAllowed } from '$lib/chart-theme';
	import { CATEGORY_COLORS } from '$lib/constants';
	import { ui } from '$lib/stores/ui.svelte';
	import { LL, locale } from '$lib/i18n/i18n-svelte';

	import { fade, fly } from 'svelte/transition';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	const HISTORIC_CRISES = $derived([
		{ name: 'DotCom (2000)', drop: 49, recovery: $LL.crisis_simulator.crises.dotcom.recovery(), desc: $LL.crisis_simulator.crises.dotcom.desc() },
		{ name: 'Lehman (2008)', drop: 56, recovery: $LL.crisis_simulator.crises.lehman.recovery(), desc: $LL.crisis_simulator.crises.lehman.desc() },
		{ name: 'COVID-19 (2020)', drop: 34, recovery: $LL.crisis_simulator.crises.covid.recovery(), desc: $LL.crisis_simulator.crises.covid.desc() }
	]);

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
	const maxCapital = $derived(Math.max(1000000, portfolio.globalCapital * 2));
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
		if (months < 0) return $LL.crisis_simulator.never();
		const d = new Date();
		d.setMonth(d.getMonth() + months);
		const loc = $locale === 'es' ? 'es-ES' : 'en-US';
		return d.toLocaleDateString(loc, { month: 'short', year: '2-digit' });
	}

	// --- Chart Logic ---
	let chartCanvas: HTMLCanvasElement;
	let chart: Chart;

	$effect(() => {
		if (!chartCanvas || !isOpen) return;
		
		const { pointsWithoutDca, pointsWithDca } = projectionData;
		
		/**
		 * ⚠️ **Las etiquetas y los nombres de serie estaban en español a fuego**
		 * (`Mes ${p.x}`, `'Original'`, `'Con DCA'`, `'Sin DCA'`) en una app
		 * bilingüe — y como el tooltip imprime `dataset.label`, un usuario inglés
		 * leía los tooltips en español.
		 *
		 * El eje lleva ahora solo el número del mes y el nombre va en un pie: con
		 * «Mes» delante, siete etiquetas de ocho caracteres no caben y salían
		 * pegadas unas a otras (`Mes 18Mes 27Mes 36`).
		 */
		const data = {
			labels: pointsWithDca.map(p => String(p.x)),
			datasets: [
				{
					label: $LL.crisis_simulator.original_capital(),
					data: Array(pointsWithDca.length).fill(initialCapital),
					borderColor: 'rgba(255, 255, 255, 0.32)',
					borderDash: [5, 5],
					borderWidth: 1.5,
					pointRadius: 0,
					fill: false
				},
				{
					// Un acento y el resto neutro: lo que este panel defiende es la
					// línea con DCA, así que es la única que lleva color.
					label: $LL.crisis_simulator.with_dca(),
					data: pointsWithDca.map(p => p.y),
					borderColor: CATEGORY_COLORS.core,
					backgroundColor: 'rgba(37, 99, 235, 0.14)',
					borderWidth: 2,
					pointRadius: 0,
					fill: true,
					tension: 0
				},
				{
					label: $LL.crisis_simulator.without_dca(),
					data: pointsWithoutDca.map(p => p.y),
					borderColor: 'rgba(255, 255, 255, 0.5)',
					borderWidth: 2,
					pointRadius: 0,
					fill: false,
					tension: 0
				}
			]
		};

		if (chart) {
			chart.data = data;
			chart.update('none');
		} else {
			applyChartDefaults();

			const config: ChartConfiguration = {
				type: 'line',
				data,
				options: {
					responsive: true,
					maintainAspectRatio: false,
					interaction: { mode: 'index', intersect: false },
					animation: motionAllowed() ? { duration: 320 } : false,
					plugins: {
						legend: { display: false },
						tooltip: {
							...tooltipStyle,
							callbacks: {
								label: (context) => {
									const val = context.parsed.y;
									return ` ${context.dataset.label}: ${formatEUR(val ?? 0)}`;
								}
							}
						}
					},
					scales: {
						y: {
							...valueAxis,
							min: 0,
							ticks: {
								...valueAxis.ticks,
								callback: (val, _i, ticks) =>
									formatCompactCurrency(Number(val), ui.baseCurrency, stepFromTicks(ticks))
							}
						},
						x: { ...categoryAxis }
					}
				} as ChartConfiguration['options']
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

<div id="tour-crisis" class="panel" class:open={isOpen}>
	<button class="panel-header" onclick={() => isOpen = !isOpen} aria-expanded={isOpen}>
		<div class="panel-info">
			<!-- Icono de trazo en lugar del emoji 📉, por lo mismo que en Proyecciones. -->
			<div class="panel-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 7l6 6 4-4 7 7" />
					<path d="M14 17h6v-6" />
				</svg>
			</div>
			<div class="panel-text">
				<h2 class="panel-title">{$LL.crisis_simulator.title()}</h2>
				<p class="panel-subtitle">{$LL.crisis_simulator.subtitle()}</p>
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
				
				<div class="crisis-edu-card">
					<div class="edu-header">
						<span class="edu-icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="9" />
								<path d="M12 8v4M12 16h.01" />
							</svg>
						</span>
						<div class="edu-content">
							<h4 class="edu-title">{$LL.crisis_simulator.edu_title()}</h4>
							<p class="edu-text">
								{$LL.crisis_simulator.edu_text()}
							</p>
						</div>
					</div>
				</div>

				<div class="controls-grid">
					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="capital-range">{$LL.crisis_simulator.initial_capital()}</label>
							<span class="control-value">{formatEUR(initialCapital)}</span>
						</div>
						<input id="capital-range" type="range" min="0" max={maxCapital} step="100" bind:value={initialCapital} oninput={() => hasManuallyEdited = true} />
					</div>


					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="drop">{$LL.crisis_simulator.market_drop()}</label>
							<span class="control-value highlight">-{dropPercent}%</span>
						</div>
						<input id="drop" type="range" min="5" max="90" step="5" bind:value={dropPercent} />
						<div class="presets">
							{#each HISTORIC_CRISES as crisis}
								<button class="preset-btn" class:active={dropPercent === crisis.drop} onclick={() => dropPercent = crisis.drop}>
									{crisis.name.split(' ')[0]} (-{crisis.drop}%)
								</button>
							{/each}
						</div>
						
						{#each HISTORIC_CRISES as crisis}
							{#if dropPercent === crisis.drop}
								<div class="crisis-detail-toast" transition:fade={{ duration: 150 }}>
									<div class="detail-header">
										<span class="detail-title">{crisis.name}</span>
										<span class="recovery-badge">Recuperación: {crisis.recovery}</span>
									</div>
									<p class="detail-desc">{crisis.desc}</p>
								</div>
							{/if}
						{/each}
					</div>

					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="dca">{$LL.crisis_simulator.dca_contribution()}</label>
							<span class="control-value">{formatEUR(monthlyDca)}</span>
						</div>
						<input id="dca" type="range" min="0" max="10000" step="50" bind:value={monthlyDca} oninput={() => hasManuallyEditedDca = true} />
					</div>

					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="return">{$LL.crisis_simulator.expected_return()}</label>
							<span class="control-value">{expectedReturn}%</span>
						</div>
						<input id="return" type="range" min="0" max="20" step="0.5" bind:value={expectedReturn} />
					</div>
				</div>

				<!--
					⚠️ Tres líneas y `legend: { display: false }` sin leyenda propia: la
					identidad dependía solo del color, en un gráfico cuyo mensaje entero
					es la comparación entre dos de ellas. No había forma de saber cuál
					era cuál salvo pasando el ratón por encima.
				-->
				<div class="chart-legend">
					<span class="legend-entry">
						<span class="legend-swatch" style="--swatch: {CATEGORY_COLORS.core}"></span>
						{$LL.crisis_simulator.with_dca()}
					</span>
					<span class="legend-entry">
						<span class="legend-swatch" style="--swatch: rgba(255,255,255,0.5)"></span>
						{$LL.crisis_simulator.without_dca()}
					</span>
					<span class="legend-entry">
						<span class="legend-swatch is-dashed"></span>
						{$LL.crisis_simulator.original_capital()}
					</span>
				</div>

				<div class="chart-container">
					<canvas bind:this={chartCanvas}></canvas>
				</div>
				<p class="axis-caption">{$LL.crisis_simulator.axis_months()}</p>

				<div class="stats-grid">
					<div class="stat-card highlight-red">
						<span class="stat-label">{$LL.crisis_simulator.after_drop()}</span>
						<span class="stat-value">{formatEUR($tValueAfterDrop)}</span>
					</div>

					<div class="stat-card">
						<span class="stat-label">{$LL.crisis_simulator.without_dca()}</span>
						<span class="stat-value">{$tMonthsNoDca.toFixed(0)} <small>{$LL.crisis_simulator.months({ months: 0 }).replace('0 ', '')}</small></span>
						<span class="stat-sub">{getEstimatedDate(Math.round($tMonthsNoDca))}</span>
					</div>

					<div class="stat-card highlight-green">
						<span class="stat-label">{$LL.crisis_simulator.with_dca()}</span>
						<span class="stat-value">{$tMonthsWithDca.toFixed(0)} <small>{$LL.crisis_simulator.months({ months: 0 }).replace('0 ', '')}</small></span>
						<span class="stat-sub">{getEstimatedDate(Math.round($tMonthsWithDca))}</span>
					</div>

					<div class="stat-card">
						<span class="stat-label">{$LL.crisis_simulator.time_saved()}</span>
						<span class="stat-value text-green">{$tTimeSaved.toFixed(0)} <small>{$LL.crisis_simulator.months({ months: 0 }).replace('0 ', '')}</small></span>
						<span class="stat-sub">{$LL.crisis_simulator.less_wait()}</span>
					</div>
				</div>


				<footer class="legal-footer">
					<p>{$LL.crisis_simulator.total_dca({ total: formatEUR($tTotalDca) })}</p>
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
		color: var(--accent-blue);
	}

	.control-value.highlight {
		color: var(--state-negative);
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
		background: var(--accent-blue);
		border-radius: 50%;
		cursor: pointer;
		border: 2px solid #05050a;
		box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
	}

	.presets {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.4rem;
	}

	.preset-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 0.45rem 0.2rem;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.65rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.preset-btn:hover { background: rgba(255, 255, 255, 0.1); }
	.preset-btn.active {
		background: rgba(59, 130, 246, 0.2);
		border-color: var(--accent-blue);
		color: #bfdbfe;
	}

	/* Educational persistent card */
	.crisis-edu-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 12px;
		padding: 0.75rem 1rem;
		margin-bottom: 1.25rem;
	}

	.edu-header {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.edu-icon {
		margin-top: 0.15rem;
		flex-shrink: 0;
		color: rgba(255, 255, 255, 0.45);
	}

	.edu-icon svg {
		width: 16px;
		height: 16px;
		display: block;
	}

	.chart-legend {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: -0.5rem;
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

	.legend-swatch.is-dashed {
		width: 12px;
		height: 0;
		border-radius: 0;
		border-top: 2px dashed rgba(255, 255, 255, 0.32);
		background: none;
	}

	.axis-caption {
		margin: 0.25rem 0 0 0;
		text-align: center;
		font-size: var(--text-micro);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.3);
	}

	.edu-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.edu-title {
		font-size: 0.82rem;
		font-weight: 700;
		color: #e2e8f0;
		margin: 0;
	}

	.edu-text {
		font-size: 0.72rem;
		line-height: 1.4;
		color: rgba(226, 232, 240, 0.6);
		margin: 0;
	}

	/* Dynamic detailed info toast */
	.crisis-detail-toast {
		background: rgba(59, 130, 246, 0.06);
		border: 1px solid rgba(59, 130, 246, 0.15);
		border-radius: 10px;
		padding: 0.75rem;
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.detail-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.detail-title {
		font-size: 0.76rem;
		font-weight: 700;
		color: #bfdbfe;
	}

	.recovery-badge {
		font-size: 0.65rem;
		font-weight: 700;
		background: rgba(52, 211, 153, 0.1);
		color: var(--state-positive);
		padding: 0.15rem 0.4rem;
		border-radius: 6px;
		border: 1px solid rgba(52, 211, 153, 0.15);
	}

	.detail-desc {
		font-size: 0.68rem;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.75);
		margin: 0;
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

	.highlight-red { border-left: 3px solid var(--state-negative); }
	.highlight-green { border-left: 3px solid var(--state-positive); }
	.text-green { color: var(--state-positive); }

	.legal-footer {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.2);
		text-align: center;
	}
</style>
