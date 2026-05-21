<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR, formatPercent } from '$lib/utils';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	// Parámetros de simulación
	let expectedReturn = $state(7); // 7% anual por defecto
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

	const projections = $derived.by(() => {
		const annualReturn = expectedReturn / 100;
		const monthlyContribution = monthlySavings;
		const initialCapital = useCustomBase ? customBase : portfolio.globalCapital;
		const months = years * 12;
		
		let finalValue = initialCapital;
		const history: { month: number, value: number, invested: number }[] = [];

		if (annualReturn === 0) {
			finalValue = initialCapital + (monthlyContribution * months);
			for (let m = 0; m <= months; m++) {
				if (m % 12 === 0 || m === months) {
					history.push({
						month: m,
						value: initialCapital + (monthlyContribution * m),
						invested: initialCapital + (monthlyContribution * m)
					});
				}
			}
		} else {
			const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;
			
			// Fórmula de interés compuesto:
			// Capital Final = Capital Inicial * (1+r)^n + Aportación * [((1+r)^n - 1) / r]
			finalValue = initialCapital * Math.pow(1 + monthlyReturn, months) + 
						 monthlyContribution * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn);

			for (let m = 0; m <= months; m++) {
				if (m % 12 === 0 || m === months) {
					const val = initialCapital * Math.pow(1 + monthlyReturn, m) + 
								(m > 0 ? monthlyContribution * ((Math.pow(1 + monthlyReturn, m) - 1) / monthlyReturn) : 0);
					history.push({ 
						month: m, 
						value: val, 
						invested: initialCapital + (monthlyContribution * m) 
					});
				}
			}
		}

		return {
			finalValue,
			totalInvested: initialCapital + (monthlyContribution * months),
			totalProfit: finalValue - (initialCapital + (monthlyContribution * months)),
			history
		};
	});

	const tweenedValue = tweened(0, { duration: 800, easing: cubicOut });
	$effect(() => {
		tweenedValue.set(projections.finalValue);
	});
</script>

<div id="tour-projections" class="panel" class:open={isOpen}>
	<button class="panel-header" onclick={() => isOpen = !isOpen} aria-expanded={isOpen}>
		<div class="panel-info">
			<div class="panel-icon">🚀</div>
			<div class="panel-text">
				<h2 class="panel-title">Proyección de Futuro</h2>
				<p class="panel-subtitle">Libertad financiera estimada</p>
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
							<span class="control-label">Capital Base de Simulación</span>
							<span class="control-value highlight">{formatEUR(useCustomBase ? customBase : portfolio.globalCapital)}</span>
						</div>
						<div class="capital-selector-pills">
							<button 
								class="pill-btn" 
								class:active={!useCustomBase} 
								onclick={() => useCustomBase = false}
							>
								📊 Cartera Real
							</button>
							<button 
								class="pill-btn" 
								class:active={useCustomBase} 
								onclick={() => useCustomBase = true}
							>
								✏️ Personalizado
							</button>
							
							{#if useCustomBase}
								<div class="custom-capital-input-wrapper">
									<input 
										type="number" 
										class="custom-capital-input" 
										min="0" 
										step="1000"
										bind:value={customBase}
									/>
									<span class="currency-symbol">€</span>
								</div>
							{/if}
						</div>
					</div>

					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="savings-range">Aportación</label>
							<span class="control-value">{formatEUR(monthlySavings)}</span>
						</div>
						<input id="savings-range" type="range" min="0" max="5000" step="50" bind:value={monthlySavings} />
					</div>
					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="return-range">Interés Anual</label>
							<span class="control-value">{expectedReturn}%</span>
						</div>
						<input id="return-range" type="range" min="1" max="15" step="0.5" bind:value={expectedReturn} />
					</div>
					<div class="control-item">
						<div class="control-header">
							<label class="control-label" for="years-range">Horizonte</label>
							<span class="control-value">{years} años</span>
						</div>
						<input id="years-range" type="range" min="1" max="50" bind:value={years} />
					</div>
				</div>

				<div class="results-card">
					<div class="main-metric">
						<span class="metric-label">Capital estimado en {years} años</span>
						<span class="metric-value privacy-blur">{formatEUR($tweenedValue)}</span>
					</div>
					
					<div class="sub-metrics">
						<div class="metric-box">
							<span class="sub-label">Inversión Total</span>
							<span class="sub-value privacy-blur">{formatEUR(projections.totalInvested)}</span>
						</div>
						<div class="metric-box success">
							<span class="sub-label">Intereses Generados</span>
							<span class="sub-value privacy-blur">+{formatEUR(projections.totalProfit)}</span>
						</div>
					</div>
				</div>

				<div class="chart-container">
					<div class="chart-bars">
						{#each projections.history as point}
							<div class="bar-group" style="height: {(point.value / projections.finalValue) * 100}%">
								<div class="bar-fill invested" style="height: {(point.invested / point.value) * 100}%"></div>
								<div class="bar-fill profit"></div>
								<span class="bar-label">{point.month / 12}y</span>
							</div>
						{/each}
					</div>
				</div>
				
				<footer class="legal-footer">
					<p>Rendimientos pasados no garantizan resultados futuros. Estimación basada en aportación constante.</p>
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
		width: 16px;
		height: 16px;
		background: #3b82f6;
		border-radius: 50%;
		cursor: pointer;
		border: 2px solid #05050a;
		box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
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
		color: rgba(255, 255, 255, 0.4);
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
		color: rgba(255, 255, 255, 0.3);
	}

	.sub-value {
		font-size: 0.95rem;
		font-weight: 700;
		color: #ffffff;
	}

	.metric-box.success .sub-value {
		color: #10b981;
	}

	.chart-container {
		height: 100px;
		display: flex;
		align-items: flex-end;
		padding-top: 1rem;
		margin-bottom: 0.5rem;
	}

	.chart-bars {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 100%;
		width: 100%;
	}

	.bar-group {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		position: relative;
		min-width: 2px;
	}

	.bar-fill {
		width: 100%;
		border-radius: 1px;
	}

	.bar-fill.invested {
		background: #3b82f6;
		opacity: 0.7;
	}

	.bar-fill.profit {
		background: #10b981;
		flex: 1;
		opacity: 0.5;
	}

	.bar-label {
		position: absolute;
		bottom: -1.25rem;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.55rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.2);
		white-space: nowrap;
		display: none;
	}

	.bar-group:nth-child(5n) .bar-label {
		display: block;
	}

	.legal-footer {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.25);
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
		background: rgba(59, 130, 246, 0.15);
		border-color: rgba(59, 130, 246, 0.4);
		color: #60a5fa;
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
