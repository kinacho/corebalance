<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR, formatPercent } from '$lib/utils';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	// Parámetros de simulación
	let expectedReturn = $state(7); // 7% anual por defecto
	let years = $state(20);
	let monthlySavings = $state(500); // Aportación mensual proyectada

	const projections = $derived.by(() => {
		const annualReturn = expectedReturn / 100;
		const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;
		const monthlyContribution = monthlySavings;
		const initialCapital = portfolio.globalCapital;
		
		const months = years * 12;
		let balance = initialCapital;
		const history: { month: number, value: number, invested: number }[] = [];

		for (let m = 0; m <= months; m++) {
			if (m > 0) {
				balance = balance * (1 + monthlyReturn) + monthlyContribution;
			}
			if (m % 12 === 0 || m === months) {
				history.push({ 
					month: m, 
					value: balance, 
					invested: initialCapital + (monthlyContribution * m) 
				});
			}
		}

		return {
			finalValue: balance,
			totalInvested: initialCapital + (monthlyContribution * months),
			totalProfit: balance - (initialCapital + (monthlyContribution * months)),
			history
		};
	});

	const tweenedValue = tweened(0, { duration: 800, easing: cubicOut });
	$effect(() => {
		tweenedValue.set(projections.finalValue);
	});
</script>

<div class="projections-card glass">
	<div class="projections-header">
		<div class="title-group">
			<h3 class="title">Proyección de Futuro</h3>
			<p class="subtitle">Libertad financiera estimada</p>
		</div>
		<div class="params">
			<div class="param-item">
				<span class="param-label">Aportación Mensual</span>
				<div class="param-input-wrapper">
					<input type="range" min="0" max="5000" step="50" bind:value={monthlySavings} />
					<span class="param-value">{formatEUR(monthlySavings)}</span>
				</div>
			</div>
			<div class="param-item">
				<span class="param-label">Interés Estimado</span>
				<div class="param-input-wrapper">
					<input type="range" min="1" max="15" step="0.5" bind:value={expectedReturn} />
					<span class="param-value">{expectedReturn}%</span>
				</div>
			</div>
			<div class="param-item">
				<span class="param-label">Horizonte (Años)</span>
				<div class="param-input-wrapper">
					<input type="range" min="1" max="50" bind:value={years} />
					<span class="param-value">{years}y</span>
				</div>
			</div>
		</div>
	</div>

	<div class="projection-results">
		<div class="main-result">
			<span class="result-label">Capital estimado en {years} años</span>
			<span class="result-value privacy-blur">{formatEUR($tweenedValue)}</span>
		</div>
		
		<div class="results-grid">
			<div class="grid-item">
				<span class="item-label">Inversión Total</span>
				<span class="item-value privacy-blur">{formatEUR(projections.totalInvested)}</span>
			</div>
			<div class="grid-item positive">
				<span class="item-label">Intereses Generados</span>
				<span class="item-value privacy-blur">+{formatEUR(projections.totalProfit)}</span>
			</div>
		</div>
	</div>

	<div class="projection-chart">
		<div class="bars-container">
			{#each projections.history as point}
				<div class="bar-wrapper" style="height: {(point.value / projections.finalValue) * 100}%">
					<div class="bar-invested" style="height: {(point.invested / point.value) * 100}%"></div>
					<div class="bar-profit"></div>
					<span class="bar-label">{point.month / 12}y</span>
				</div>
			{/each}
		</div>
	</div>
	
	<p class="disclaimer">
		Esta es una estimación basada en una aportación constante. Los rendimientos pasados no garantizan resultados futuros.
	</p>
</div>

<style>
	.projections-card {
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.projections-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 1.5rem;
	}

	.title { font-size: 1.1rem; font-weight: 700; margin: 0; color: #fff; }
	.subtitle { font-size: 0.8rem; color: rgba(255, 255, 255, 0.4); margin: 0.2rem 0 0 0; }

	.params {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.param-item { display: flex; flex-direction: column; gap: 0.5rem; }
	.param-label { font-size: 0.65rem; text-transform: uppercase; font-weight: 700; color: rgba(255, 255, 255, 0.3); }
	.param-input-wrapper { display: flex; align-items: center; gap: 0.75rem; }
	.param-value { font-size: 0.85rem; font-weight: 700; min-width: 2.5rem; color: var(--accent-blue); }

	input[type="range"] {
		-webkit-appearance: none;
		appearance: none;
		width: 100px;
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		cursor: pointer;
	}

	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		background: var(--accent-blue);
		border-radius: 50%;
		box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
	}

	.projection-results {
		background: rgba(0, 0, 0, 0.2);
		padding: 1.25rem;
		border-radius: 16px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.main-result { display: flex; flex-direction: column; gap: 0.25rem; }
	.result-label { font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); }
	.result-value { font-size: 1.75rem; font-weight: 800; color: #fff; letter-spacing: -0.02em; }

	.results-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	.grid-item { display: flex; flex-direction: column; gap: 0.2rem; }
	.item-label { font-size: 0.65rem; color: rgba(255, 255, 255, 0.4); }
	.item-value { font-size: 0.9rem; font-weight: 700; }
	.positive .item-value { color: var(--accent-green); }

	.projection-chart {
		height: 120px;
		display: flex;
		align-items: flex-end;
		padding: 0 0.5rem;
		margin-top: 0.5rem;
	}

	.bars-container {
		display: flex;
		width: 100%;
		height: 100%;
		align-items: flex-end;
		gap: 4px;
	}

	.bar-wrapper {
		flex: 1;
		position: relative;
		display: flex;
		flex-direction: column;
		min-width: 2px;
	}

	.bar-invested {
		background: var(--accent-blue);
		opacity: 0.6;
		border-radius: 2px 2px 0 0;
	}

	.bar-profit {
		flex: 1;
		background: var(--accent-green);
		opacity: 0.4;
		border-radius: 2px 2px 0 0;
	}

	.bar-label {
		position: absolute;
		bottom: -1.2rem;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.55rem;
		color: rgba(255, 255, 255, 0.3);
		white-space: nowrap;
	}

	.disclaimer {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.3);
		text-align: center;
		margin: 0;
	}
</style>
