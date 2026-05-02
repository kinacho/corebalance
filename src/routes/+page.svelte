<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import AssetCard from '$lib/components/AssetCard.svelte';
	import DonutChart from '$lib/components/DonutChart.svelte';
	import HistoryChart from '$lib/components/HistoryChart.svelte';
	import RebalancePanel from '$lib/components/RebalancePanel.svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { PORTFOLIO_ASSETS, SATELLITE_ASSETS } from '$lib/constants';
	import { formatEUR, formatPercent } from '$lib/utils';

	// --- Constants & Config ---
	const TABS = [
		{ id: 'assets', label: 'Activos', icon: '📊' },
		{ id: 'rebalance', label: 'Rebalanceo', icon: '💰' },
		{ id: 'charts', label: 'Gráficos', icon: '🍩' }
	] as const;

	type TabId = (typeof TABS)[number]['id'];

	// --- State ---
	let activeTab = $state<TabId>('assets');

	// --- Derived Data for Charts ---
	const actualChartData = $derived({
		labels: PORTFOLIO_ASSETS.map(a => a.name),
		values: portfolio.portfolioState.positions.map(p => parseFloat((p.currentWeight * 100).toFixed(2))),
		colors: PORTFOLIO_ASSETS.map(a => a.color)
	});

	const targetChartData = $derived({
		labels: PORTFOLIO_ASSETS.map(a => a.name),
		values: PORTFOLIO_ASSETS.map(a => a.targetWeight * 100),
		colors: PORTFOLIO_ASSETS.map(a => a.color)
	});

	// --- Lifecycle ---
	onMount(() => {
		portfolio.fetchPrices();
	});
</script>

<svelte:head>
	<title>Balanceador 90/5/5 — Dashboard</title>
	<meta name="description" content="Dashboard de inversión para el Balanceador 90/5/5" />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
</svelte:head>

<div class="app-container" class:privacy-mode={portfolio.isPrivate}>
	<Header 
		timestamp={portfolio.timestamp} 
		loading={portfolio.loading} 
		isPrivate={portfolio.isPrivate}
		onRefresh={() => portfolio.fetchPrices()} 
		onTogglePrivacy={() => portfolio.togglePrivacy()} 
	/>

	<main class="main-content">
		<!-- Notifications Area -->
		{#if portfolio.error}
			<div class="error-banner" role="alert">
				<span class="error-icon">⚠️</span>
				<div class="error-text">
					<strong>Error de conexión</strong>
					<p>{portfolio.error}</p>
				</div>
				<button class="error-retry" onclick={() => portfolio.fetchPrices()}>Reintentar</button>
			</div>
		{/if}

		<!-- Hero Stats Section -->
		{#if !portfolio.loading || Object.keys(portfolio.prices).length > 0}
			<section class="hero-summary glass" aria-label="Resumen de capital">
				<div class="hero-primary">
					<span class="summary-label">Capital Global</span>
					<div class="summary-value privacy-blur">{formatEUR(portfolio.globalCapital)}</div>
					{#if portfolio.satelliteState.totalCapital > 0}
						<div class="capital-breakdown privacy-blur">
							<span>90/5/5: <strong style="color: #fff">{formatEUR(portfolio.portfolioState.totalCapital)}</strong></span>
							<span class="breakdown-divider">•</span>
							<span>Cons: <strong style="color: #fff">{formatEUR(portfolio.satelliteState.totalCapital)}</strong></span>
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
						<button class="reset-action-btn" onclick={() => portfolio.reset()} title="Borrar Cartera">
							<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
								<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
							</svg>
						</button>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Navigation (Mobile Only) -->
		<nav class="mobile-tabs">
			{#each TABS as tab}
				<button 
					class="tab-btn" 
					class:active={activeTab === tab.id} 
					onclick={() => activeTab = tab.id}
				>
					<span class="tab-icon">{tab.icon}</span>
					<span class="tab-label">{tab.label}</span>
				</button>
			{/each}
		</nav>

		<!-- History Chart Section -->
		<section class="history-section card" class:tab-hidden={activeTab !== 'charts'}>
			<div class="section-header">
				<h3 class="section-title">Evolución del Patrimonio</h3>
			</div>
			<HistoryChart />
		</section>

		<!-- Content Grid -->
		<div class="dashboard-grid">
			<!-- Assets Column -->
			<section class="assets-section" class:tab-hidden={activeTab !== 'assets'}>
				<div class="section-header">
					<h3 class="section-title">Cartera Principal (90/5/5)</h3>
				</div>
				{#if portfolio.loading && Object.keys(portfolio.prices).length === 0}
					<div class="cards-grid">
						{#each Array(3) as _}
							<div class="skeleton-card"></div>
						{/each}
					</div>
				{:else}
					<div class="cards-grid">
						{#each portfolio.portfolioState.positions as position (position.asset.ticker)}
							<AssetCard 
								{position} 
								onUpdateHolding={(ticker, data) => portfolio.updateHolding(ticker, data)} 
								onUpdatePrice={(ticker, price) => {
									portfolio.prices = {
										...portfolio.prices,
										[ticker]: { ...portfolio.prices[ticker], price }
									};
								}} 
							/>
						{/each}
					</div>
				{/if}

				<div class="section-header" style="margin-top: 1rem;">
					<h3 class="section-title">Cartera Conservadora</h3>
				</div>
				{#if portfolio.loading && Object.keys(portfolio.prices).length === 0}
					<div class="cards-grid">
						{#each Array(2) as _}
							<div class="skeleton-card"></div>
						{/each}
					</div>
				{:else}
					<div class="cards-grid">
						{#each portfolio.satelliteState.positions as position (position.asset.ticker)}
							<AssetCard 
								{position} 
								onUpdateHolding={(ticker, data) => portfolio.updateHolding(ticker, data)} 
								onUpdatePrice={(ticker, price) => {
									portfolio.prices = {
										...portfolio.prices,
										[ticker]: { ...portfolio.prices[ticker], price }
									};
								}} 
							/>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Side Column: Tools & Charts -->
			<aside class="sidebar">
				<div class="sidebar-item" class:tab-hidden={activeTab !== 'rebalance'}>
					<RebalancePanel 
						result={portfolio.rebalanceResult} 
						contribution={portfolio.contribution} 
						onContributionChange={(val) => portfolio.updateContribution(val)} 
					/>
				</div>

				<div class="sidebar-item" class:tab-hidden={activeTab !== 'charts'}>
					<div class="charts-card card">
						<div class="charts-header">
							<h3 class="sidebar-title">Distribución de Cartera</h3>
						</div>
						<div class="charts-grid">
							<div class="chart-box">
								<h4 class="chart-label">Estado Actual</h4>
								<DonutChart data={actualChartData} />
							</div>
							<div class="chart-box">
								<h4 class="chart-label">Objetivo 90/5/5</h4>
								<DonutChart data={targetChartData} />
							</div>
						</div>
					</div>
				</div>
			</aside>
		</div>

		<footer class="app-footer">
			<p>Balanceador 90/5/5 · {new Date().getFullYear()}</p>
		</footer>
	</main>
</div>

<style>
	:global(body) {
		background: #0a0a16;
		color: #f0f0ff;
	}

	.app-container {
		min-height: 100dvh;
	}

	.main-content {
		max-width: 1140px;
		margin: 0 auto;
		padding: 1rem;
		padding-bottom: 6rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	/* --- Error Banner --- */
	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 14px;
		color: #fca5a5;
	}

	.error-text strong { display: block; font-size: 0.85rem; }
	.error-text p { margin: 0; font-size: 0.75rem; opacity: 0.7; }

	.error-retry {
		margin-left: auto;
		padding: 0.5rem 0.85rem;
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 10px;
		color: inherit;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
	}

	/* --- 🚀 Premium Redesign: Hero Summary --- */
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

	.reset-action-btn {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
		background: rgba(244, 63, 94, 0.1);
		border: 1px solid rgba(244, 63, 94, 0.2);
		color: #f43f5e;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.reset-action-btn:hover {
		background: rgba(244, 63, 94, 0.2);
		transform: scale(1.05) rotate(-5deg);
	}

	/* --- Navigation (Mobile) --- */
	.mobile-tabs {
		display: flex;
		gap: 0.5rem;
		background: rgba(10, 10, 20, 0.8);
		backdrop-filter: blur(20px);
		padding: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 18px;
		position: sticky;
		top: 64px;
		z-index: 40;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		margin-bottom: 1.5rem;
	}

	.tab-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		border: none;
		border-radius: 14px;
		background: transparent;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.tab-btn.active { 
		background: rgba(59, 130, 246, 0.15); 
		color: #3b82f6; 
	}

	/* --- Layout Grid --- */
	.dashboard-grid { display: flex; flex-direction: column; gap: 1rem; }
	.assets-section { display: flex; flex-direction: column; gap: 1rem; }
	.cards-grid { display: flex; flex-direction: column; gap: 1rem; }
	.sidebar { display: flex; flex-direction: column; gap: 1rem; }
	.tab-hidden { display: none; }

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

	.history-section {
		padding: 1.5rem;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
		backdrop-filter: blur(24px) saturate(180%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		margin-bottom: 2rem;
	}

	.section-title { font-size: 0.9rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem; }

	.charts-card { 
		padding: 1.5rem; 
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
		backdrop-filter: blur(24px) saturate(180%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
	}
	.sidebar-title { font-size: 0.9rem; font-weight: 700; color: #fff; margin-bottom: 1.5rem; }
	.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
	.chart-box { display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }
	.chart-label { font-size: 0.7rem; color: rgba(255, 255, 255, 0.4); text-transform: uppercase; margin: 0; font-weight: 700; letter-spacing: 0.05em; }

	/* --- Footer --- */
	.app-footer { padding: 3rem 0; text-align: center; opacity: 0.4; }
	.app-footer p { font-size: 0.75rem; font-weight: 600; }

	/* --- Responsive Magic --- */
	
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
		.main-content { 
			padding: 2rem; 
			max-width: 1600px;
			margin: 0 auto;
		}

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

		/* Hide mobile tabs, show desktop layout */
		.mobile-tabs { display: none; }
		.tab-hidden { display: flex !important; }
		
		.dashboard-grid { 
			display: grid; 
			grid-template-columns: minmax(0, 1.5fr) minmax(350px, 1fr); 
			gap: 2.5rem; 
			align-items: start; 
		}
		
		.assets-section { 
			display: flex; 
			flex-direction: column;
		}

		.cards-grid {
			display: grid; 
			grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); 
			gap: 1.5rem; 
		}
	}

	/* --- Skeletons --- */
	.skeleton-card { background: rgba(255, 255, 255, 0.03); border-radius: 20px; min-height: 200px; animation: pulse 2s infinite; }
	@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }
</style>
