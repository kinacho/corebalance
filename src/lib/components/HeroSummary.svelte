<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR, formatPercent } from '$lib/utils';
</script>

{#if !portfolio.loading || Object.keys(portfolio.prices).length > 0}
	<section class="hero-summary glass" aria-label="Resumen de capital">
		<div class="hero-primary">
			<span class="summary-label">Capital Global</span>
			<div class="summary-value privacy-blur">{formatEUR(portfolio.globalCapital)}</div>
			{#if portfolio.satelliteState.totalCapital > 0 || portfolio.stockState.totalCapital > 0}
				<div class="capital-breakdown privacy-blur">
					<span>90/5/5: <strong style="color: #fff">{formatEUR(portfolio.portfolioState.totalCapital)}</strong></span>
					{#if portfolio.stockState.totalCapital > 0}
						<span class="breakdown-divider">•</span>
						<span>Acc: <strong style="color: #fff">{formatEUR(portfolio.stockState.totalCapital)}</strong></span>
					{/if}
					{#if portfolio.satelliteState.totalCapital > 0}
						<span class="breakdown-divider">•</span>
						<span>Cons: <strong style="color: #fff">{formatEUR(portfolio.satelliteState.totalCapital)}</strong></span>
					{/if}
				</div>
			{/if}
		</div>

		<div class="hero-metrics">
			<div class="metric-card">
				<span class="metric-label">Invertido</span>
				<span class="metric-value privacy-blur">{formatEUR(portfolio.globalInvested)}</span>
			</div>
			
			<div class="metric-card" class:positive={portfolio.globalProfit > 0} class:negative={portfolio.globalProfit < 0}>
				<span class="metric-label">Rentabilidad</span>
				<div class="metric-row">
					<span class="metric-value privacy-blur">{formatEUR(portfolio.globalProfit)}</span>
					<span class="metric-badge">{formatPercent(portfolio.globalProfitPercent)}</span>
				</div>
			</div>

			<div class="metric-card" class:positive={portfolio.dailyChange.value > 0} class:negative={portfolio.dailyChange.value < 0}>
				<span class="metric-label">Cambio Hoy</span>
				<div class="metric-row">
					<span class="metric-value privacy-blur">{formatEUR(portfolio.dailyChange.value)}</span>
					<span class="metric-badge">{formatPercent(portfolio.dailyChange.percent)}</span>
				</div>
			</div>

			<div class="metric-card efficiency">
				<span class="metric-label">Eficiencia (TER)</span>
				<div class="metric-row">
					<span class="metric-value">{formatPercent(portfolio.globalWeightedAverageTer)}</span>
					<span class="metric-badge neutral">{formatEUR(portfolio.globalAnnualCost)}/año</span>
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
		gap: 1.5rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
		border-radius: 24px;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
		backdrop-filter: blur(40px) saturate(200%);
		-webkit-backdrop-filter: blur(40px) saturate(200%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
		overflow: hidden;
	}

	.hero-primary {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 0;
	}

	.summary-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: rgba(255, 255, 255, 0.5);
	}

	.summary-value {
		font-size: 2.5rem;
		font-weight: 800;
		color: #ffffff;
		line-height: 1;
		letter-spacing: -0.03em;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
	}

	.hero-metrics {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.metric-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 16px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		transition: transform 0.2s ease, background 0.2s ease;
	}

	.metric-card:hover {
		background: rgba(255, 255, 255, 0.04);
		transform: translateY(-2px);
	}

	.metric-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.5);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.metric-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.metric-value {
		font-size: 1.15rem;
		font-weight: 700;
		color: #ffffff;
	}

	.metric-badge {
		font-size: 0.7rem;
		font-weight: 800;
		padding: 0.2rem 0.5rem;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.05);
	}

	.metric-card.positive .metric-value { color: #10b981; }
	.metric-card.positive .metric-badge { color: #10b981; background: rgba(16, 185, 129, 0.15); }
	
	.metric-card.negative .metric-value { color: #f43f5e; }
	.metric-card.negative .metric-badge { color: #f43f5e; background: rgba(244, 63, 94, 0.15); }

	.metric-card.efficiency .metric-badge.neutral {
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.hero-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.asset-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.asset-pill {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.75rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
	}

	.pill-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 8px var(--accent);
	}

	.pill-text {
		font-size: 0.75rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.9);
	}

	.capital-breakdown {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(0, 0, 0, 0.2);
		padding: 0.4rem 0.8rem;
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.breakdown-divider {
		color: rgba(255, 255, 255, 0.2);
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
