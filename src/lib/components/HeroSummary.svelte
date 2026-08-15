<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { LL } from '$lib/i18n/i18n-svelte';
	import Sparkline from './Sparkline.svelte';

	/**
	 * ⚠️ **Aquí había cuatro contadores animados y se han ido.** El *count-up*
	 * sobre una cifra de dinero es cliché de fintech de 2020 y aquí costaba dos
	 * cosas concretas: la cifra tardaba un segundo en ser cierta —arrancaba en 0,
	 * así que lo primero que veías de tu patrimonio era un número falso— y el
	 * baile de dígitos peleaba con el `tabular-nums` que `layout.css` aplica
	 * justo a estas clases para que no bailen.
	 */

	/**
	 * Las dos cajas que tienen una serie detrás la enseñan. Las otras dos no:
	 * «Cambio hoy» y el TER son cifras de un instante, y dibujarles una línea
	 * sería inventar una historia que no existe.
	 */
	const series = $derived(portfolio.performanceSeries);
	const SPARK_WINDOW = 30;

	const investedSpark = $derived(series.invested.slice(-SPARK_WINDOW));
	const gainSpark = $derived(series.gain.slice(-SPARK_WINDOW));

	/** Una sparkline necesita variación: una recta plana no informa, decora. */
	function worthDrawing(points: number[]): boolean {
		if (points.length < 3) return false;
		const min = Math.min(...points);
		const max = Math.max(...points);
		return max - min > Math.abs(max) * 1e-4;
	}
</script>

{#if !portfolio.loading || Object.keys(portfolio.prices).length > 0}
	<section id="tour-global-summary" class="hero-summary glass" aria-label="Resumen de capital">
		<div class="hero-primary">

			<span class="summary-label">{$LL.dashboard.total_value_label()}</span>
			<div class="summary-value privacy-blur">{$LL.dashboard.currency(portfolio.globalCapital)}</div>
			{#if portfolio.satelliteState.totalCapital > 0 || portfolio.stockState.totalCapital > 0}
				<div class="capital-breakdown">
					<div class="breakdown-item">
						<span>{portfolio.targetLabel}:</span>
						<strong style="color: #fff" class="privacy-blur">{$LL.dashboard.currency(portfolio.portfolioState.totalCapital)}</strong>
					</div>
					{#if portfolio.stockState.totalCapital > 0}
						<span class="breakdown-divider">|</span>
						<div class="breakdown-item">
							<span>{$LL.db.cat_stocks_short()}:</span>
							<strong style="color: #fff" class="privacy-blur">{$LL.dashboard.currency(portfolio.stockState.totalCapital)}</strong>
						</div>
					{/if}
					{#if portfolio.satelliteState.totalCapital > 0}
						<span class="breakdown-divider">|</span>
						<div class="breakdown-item">
							<span>{$LL.db.cat_satellite_short()}:</span>
							<strong style="color: #fff" class="privacy-blur">{$LL.dashboard.currency(portfolio.satelliteState.totalCapital)}</strong>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<div class="hero-metrics">
			<div class="metric-card">
				<span class="metric-label">{$LL.dashboard.invested_label()}</span>
				<span class="metric-value privacy-blur">{$LL.dashboard.currency(portfolio.globalInvested)}</span>
				{#if worthDrawing(investedSpark)}
					<div class="metric-spark privacy-blur" aria-hidden="true">
						<Sparkline data={investedSpark} color="rgba(255,255,255,0.35)" width={90} height={22} />
					</div>
				{/if}
			</div>

			<div class="metric-card" class:positive={portfolio.globalProfit > 0} class:negative={portfolio.globalProfit < 0}>
				<span class="metric-label">{$LL.dashboard.returns_label()}</span>
				<div class="metric-row">
					<span class="metric-value privacy-blur">{$LL.dashboard.currency(portfolio.globalProfit)}</span>
					<span class="metric-badge">{$LL.dashboard.percent(portfolio.globalProfitPercent)}</span>
				</div>
				{#if worthDrawing(gainSpark)}
					<div class="metric-spark privacy-blur" aria-hidden="true">
						<Sparkline data={gainSpark} width={90} height={22} filled />
					</div>
				{/if}
			</div>

			<div class="metric-card" class:positive={portfolio.globalDailyChangeValue > 0} class:negative={portfolio.globalDailyChangeValue < 0}>
				<span class="metric-label">{$LL.dashboard.daily_change_label()}</span>
				<div class="metric-row">
					<span class="metric-value privacy-blur">{portfolio.globalDailyChangeValue > 0 ? '+' : ''}{$LL.dashboard.currency(portfolio.globalDailyChangeValue)}</span>
					<span class="metric-badge">{portfolio.globalDailyChangeValue > 0 ? '+' : ''}{$LL.dashboard.percent(portfolio.globalDailyChangePercent)}</span>
				</div>
			</div>

			<div class="metric-card efficiency">
				<span class="metric-label">{$LL.dashboard.efficiency_label()}</span>
				<div class="metric-row">
					<span class="metric-value">{$LL.dashboard.percent(portfolio.globalWeightedAverageTer)}</span>
					<span class="metric-badge neutral privacy-blur">{$LL.dashboard.currency(portfolio.globalAnnualCost)}{$LL.dashboard.per_year()}</span>
				</div>
			</div>
		</div>

		<div class="hero-actions">
			{#if portfolio.hasAnyHoldings}
				<div class="asset-pills">
					{#each portfolio.portfolioState.positions as pos}
						<div class="asset-pill" style="--accent: {pos.asset.color}">
							<span class="pill-dot"></span>
							<span class="pill-text">{$LL.dashboard.percent(pos.currentWeight)}</span>
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
		border: 1px solid var(--border-subtle);
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
		background: radial-gradient(circle, rgba(37, 99, 235, 0.16) 0%, transparent 70%);
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
		color: var(--text-faint);
	}

	.summary-value {
		font-size: clamp(2rem, 9vw, 2.75rem);
		font-weight: 900;
		color: var(--text-primary);
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
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 18px;
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		transition: all 0.2s ease;
		min-width: 0;
	}

	.metric-card:hover {
		background: var(--bg-card-hover);
		border-color: var(--border-subtle);
	}

	.metric-label {
		font-size: var(--text-micro);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.metric-spark {
		margin-top: 0.35rem;
		opacity: 0.9;
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
		color: var(--text-primary);
		white-space: nowrap;
	}

	.metric-badge {
		font-size: 0.65rem;
		font-weight: 800;
		padding: 0.1rem 0.35rem;
		border-radius: 6px;
		background: var(--bg-card-hover);
		white-space: nowrap;
	}

	.metric-card.positive .metric-value { color: var(--state-positive); }
	.metric-card.positive .metric-badge { color: var(--state-positive); background: var(--state-positive-soft); }
	
	.metric-card.negative .metric-value { color: var(--state-negative); }
	.metric-card.negative .metric-badge { color: var(--state-negative); background: var(--state-negative-soft); }

	.metric-card.efficiency .metric-badge.neutral {
		color: var(--text-muted);
		background: var(--bg-card-hover);
		font-weight: 600;
	}

	.hero-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: 1rem;
		border-top: 1px solid var(--border-subtle);
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
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
	}

	.pill-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
		/* Sin halo. El resplandor de neón alrededor de cada punto de color es lo
		   que más envejece un tablero oscuro: es el look de app cripto de 2021. */
	}

	.pill-text {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.capital-breakdown {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.5rem 0.8rem;
		margin-top: 0.5rem;
		font-size: 0.7rem;
		color: var(--text-faint);
		padding: 0.35rem 0.6rem;
		background: var(--bg-card);
		border-radius: 12px;
		width: auto;
		max-width: 100%;
		border: 1px solid var(--border-subtle);
	}

	.breakdown-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		white-space: nowrap;
	}

	.breakdown-divider {
		color: var(--text-faint);
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
			border-left: 1px solid var(--border-subtle);
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
