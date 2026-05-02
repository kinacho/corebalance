<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import AssetCard from '$lib/components/AssetCard.svelte';
	import PortfolioSection from '$lib/components/PortfolioSection.svelte';
	import HeroSummary from '$lib/components/HeroSummary.svelte';
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
		<HeroSummary />

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
				<PortfolioSection 
					title="Cartera Principal (90/5/5)" 
					portfolioState={portfolio.portfolioState} 
					loading={portfolio.loading} 
					skeletonCount={3} 
				/>
				
				<PortfolioSection 
					title="Acciones Individuales" 
					portfolioState={portfolio.stockState} 
					loading={portfolio.loading} 
					skeletonCount={2} 
					marginTop={true} 
				/>

				<PortfolioSection 
					title="Cartera Conservadora" 
					portfolioState={portfolio.satelliteState} 
					loading={portfolio.loading} 
					skeletonCount={2} 
					marginTop={true} 
				/>
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
	.sidebar { display: flex; flex-direction: column; gap: 1rem; }
	.tab-hidden { display: none; }



	.history-section {
		padding: 1.5rem;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
		backdrop-filter: blur(24px) saturate(180%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		margin-bottom: 2rem;
	}



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
	


	/* Large Desktop */
	@media (min-width: 1024px) {
		.main-content { 
			padding: 2rem; 
			max-width: 1600px;
			margin: 0 auto;
		}

		/* Hide mobile tabs, show desktop layout */
		.mobile-tabs { display: none; }
		.tab-hidden { display: block !important; }
		
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

		.sidebar-item.tab-hidden {
			display: flex !important;
		}

	}
</style>
