<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR, formatPercent } from '$lib/utils';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	// Tweened values for smooth counting
	const tweenedGlobalCapital = tweened(0, { duration: 1000, easing: cubicOut });
	const tweenedGlobalProfit = tweened(0, { duration: 1000, easing: cubicOut });
	const tweenedGlobalInvested = tweened(0, { duration: 1000, easing: cubicOut });
	const tweenedDailyChange = tweened(0, { duration: 1000, easing: cubicOut });

	$effect(() => {
		tweenedGlobalCapital.set(portfolio.globalCapital);
		tweenedGlobalProfit.set(portfolio.globalProfit);
		tweenedGlobalInvested.set(portfolio.globalInvested);
		tweenedDailyChange.set(portfolio.globalDailyChangeValue);
	});
</script>

{#if !portfolio.loading || Object.keys(portfolio.prices).length > 0}
	<section class="hero-summary glass" aria-label="Resumen de capital">
		<div class="hero-primary">
			<span class="summary-label">Capital Global</span>
			<div class="summary-value privacy-blur">{formatEUR($tweenedGlobalCapital)}</div>
			{#if portfolio.satelliteState.totalCapital > 0 || portfolio.stockState.totalCapital > 0}
				<div class="capital-breakdown">
					<div class="breakdown-item">
						<span>90/5/5:</span>
						<strong style="color: #fff" class="privacy-blur">{formatEUR(portfolio.portfolioState.totalCapital)}</strong>
					</div>
					{#if portfolio.stockState.totalCapital > 0}
						<span class="breakdown-divider">|</span>
						<div class="breakdown-item">
							<span>Acc:</span>
							<strong style="color: #fff" class="privacy-blur">{formatEUR(portfolio.stockState.totalCapital)}</strong>
						</div>
					{/if}
					{#if portfolio.satelliteState.totalCapital > 0}
						<span class="breakdown-divider">|</span>
						<div class="breakdown-item">
							<span>Cons:</span>
							<strong style="color: #fff" class="privacy-blur">{formatEUR(portfolio.satelliteState.totalCapital)}</strong>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<div class="hero-metrics">
			<div class="metric-card">
				<span class="metric-label">Invertido</span>
				<span class="metric-value privacy-blur">{formatEUR($tweenedGlobalInvested)}</span>
			</div>
			
			<div class="metric-card" class:positive={portfolio.globalProfit > 0} class:negative={portfolio.globalProfit < 0}>
				<span class="metric-label">Rentabilidad</span>
				<div class="metric-row">
					<span class="metric-value privacy-blur">{formatEUR($tweenedGlobalProfit)}</span>
					<span class="metric-badge">{formatPercent(portfolio.globalProfitPercent)}</span>
				</div>
			</div>

			<div class="metric-card" class:positive={portfolio.globalDailyChangeValue > 0} class:negative={portfolio.globalDailyChangeValue < 0}>
				<span class="metric-label">Cambio Hoy</span>
				<div class="metric-row">
					<span class="metric-value privacy-blur">{$tweenedDailyChange > 0 ? '+' : ''}{formatEUR($tweenedDailyChange)}</span>
					<span class="metric-badge">{portfolio.globalDailyChangeValue > 0 ? '+' : ''}{formatPercent(portfolio.globalDailyChangePercent)}</span>
				</div>
			</div>

			<div class="metric-card efficiency">
				<span class="metric-label">Eficiencia (TER)</span>
				<div class="metric-row">
					<span class="metric-value">{formatPercent(portfolio.globalWeightedAverageTer)}</span>
					<span class="metric-badge neutral privacy-blur">{formatEUR(portfolio.globalAnnualCost)}/año</span>
				</div>
			</div>
		</div>

		<div class="hero-actions">
			{#if portfolio.hasAnyHoldings}
				<div class="asset-pills">
					{#each portfolio.portfolioState.positions as pos}
						<div class="asset-pill" style="--accent: {pos.asset.color}">
							<span class="pill-dot"></span>
							<span class="pill-text">{formatPercent(pos.currentWeight)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</section>
{/if}

<style>
	.hero-summary {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.5rem 1rem;
		margin-bottom: 1.5rem;
		border-radius: 28px;
		background: linear-gradient(165deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
		backdrop-filter: blur(32px) saturate(200%);
		-webkit-backdrop-filter: blur(32px) saturate(200%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		position: relative;
	}

	.hero-summary::before {
		content: '';
		position: absolute;
		top: -20%;
		right: -10%;
		width: 60%;
		height: 60%;
		background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
		filter: blur(40px);
		pointer-events: none;
	}

	.hero-primary {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0;
		position: relative;
		z-index: 1;
	}

	.summary-label {
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.35);
	}

	.summary-value {
		font-size: clamp(2rem, 9vw, 2.75rem);
		font-weight: 900;
		color: #ffffff;
		line-height: 1.1;
		letter-spacing: -0.03em;
		text-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
	}

	.hero-metrics {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.6rem;
		position: relative;
		z-index: 1;
	}

	.metric-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 18px;
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		transition: all 0.2s ease;
		min-width: 0;
	}

	.metric-card:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.metric-label {
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.metric-row {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.metric-value {
		font-size: 1rem;
		font-weight: 700;
		color: #ffffff;
		white-space: nowrap;
	}

	.metric-badge {
		font-size: 0.65rem;
		font-weight: 800;
		padding: 0.1rem 0.35rem;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.05);
		white-space: nowrap;
	}

	.metric-card.positive .metric-value { color: #34d399; }
	.metric-card.positive .metric-badge { color: #34d399; background: rgba(52, 211, 153, 0.12); }
	
	.metric-card.negative .metric-value { color: #f87171; }
	.metric-card.negative .metric-badge { color: #f87171; background: rgba(248, 113, 113, 0.12); }

	.metric-card.efficiency .metric-badge.neutral {
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.08);
		font-weight: 600;
	}

	.hero-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.asset-pills {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem;
	}

	.asset-pill {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.6rem;
		background: rgba(0, 0, 0, 0.25);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 10px;
	}

	.pill-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 10px var(--accent);
	}

	.pill-text {
		font-size: 0.65rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.8);
	}

	.capital-breakdown {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.5rem 0.8rem;
		margin-top: 0.5rem;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.4);
		padding: 0.35rem 0.6rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 12px;
		width: auto;
		max-width: 100%;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.breakdown-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		white-space: nowrap;
	}

	.breakdown-divider {
		color: rgba(255, 255, 255, 0.1);
		font-weight: 300;
	}

	/* Tablet / Small Desktop */
	@media (min-width: 768px) {
		.hero-summary {
			padding: 2.5rem;
		}
		
		.hero-metrics {
			grid-template-columns: repeat(4, 1fr);
			gap: 1rem;
		}
		
		.metric-card {
			padding: 1.25rem;
		}
	}

	/* Large Desktop */
	@media (min-width: 1024px) {
		.hero-summary {
			/* Transform to a robust grid on desktop */
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) auto;
			align-items: center;
			gap: 3rem;
			padding: 3rem 3.5rem;
			border-radius: 32px;
		}

		.hero-primary {
			align-items: flex-start;
			padding: 0;
			min-width: 280px;
		}

		.summary-value {
			font-size: 3.5rem;
		}

		.hero-metrics {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 1.5rem;
		}

		.hero-actions {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
			border-top: none;
			border-left: 1px solid rgba(255, 255, 255, 0.1);
			padding-top: 0;
			padding-left: 3rem;
			justify-content: center;
			min-width: max-content;
		}

		.asset-pills {
			flex-direction: column;
			gap: 0.6rem;
		}
	}
</style>
