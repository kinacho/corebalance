<script lang="ts">
	import AssetCard from './AssetCard.svelte';
	import CompactAssetRow from './CompactAssetRow.svelte';
	import Sparkline from './Sparkline.svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import type { PortfolioState } from '$lib/types';
	import { formatEUR, formatPercent } from '$lib/utils';

	interface Props {
		title: string;
		portfolioState: PortfolioState;
		defaultOpen?: boolean;
		loading?: boolean;
		skeletonCount?: number;
		marginTop?: boolean;
	}

	let { 
		title, 
		portfolioState, 
		defaultOpen = false, 
		loading = false, 
		skeletonCount = 3,
		marginTop = false
	}: Props = $props();

	let isOpen = $state(false);
	let isCompactView = $state(false);

	$effect.pre(() => {
		isOpen = defaultOpen;
	});
</script>

<button 
	class="section-header-btn" 
	class:mt-1rem={marginTop}
	onclick={() => isOpen = !isOpen} 
	aria-expanded={isOpen}
>
	<div class="header-left-group">
		<h3 class="section-title">{title}</h3>
		{#if portfolioState.sparkline}
			<div class="header-sparkline" title="Tendencia últimos 7 días">
				<Sparkline data={portfolioState.sparkline} />
			</div>
		{/if}
		{#if portfolioState.totalCapital > 0}
			<div class="header-badges">
				<div class="header-badge daily" class:positive={portfolioState.dailyChangeValue > 0} class:negative={portfolioState.dailyChangeValue < 0} title="Cambio Hoy">
					<span class="badge-label">Hoy</span>
					<span class="daily-arrow">
						{portfolioState.dailyChangeValue > 0 ? '▲' : portfolioState.dailyChangeValue < 0 ? '▼' : '•'}
					</span>
					<span class="daily-percent">{formatPercent(Math.abs(portfolioState.dailyChangePercent))}</span>
					<span class="daily-value privacy-blur">({formatEUR(portfolioState.dailyChangeValue)})</span>
				</div>
				<div class="header-badge total" class:positive={portfolioState.totalProfit > 0} class:negative={portfolioState.totalProfit < 0} title="Rentabilidad Total">
					<span class="badge-label">Total</span>
					<span class="daily-percent">{portfolioState.totalProfit > 0 ? '+' : ''}{formatPercent(portfolioState.totalProfitPercent)}</span>
					<span class="daily-value privacy-blur">({portfolioState.totalProfit > 0 ? '+' : ''}{formatEUR(portfolioState.totalProfit)})</span>
				</div>
			</div>
		{/if}
	</div>
	<span class="chevron-icon" class:rotated={!isOpen}>
		<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
			<path d="M6 9l6 6 6-6" />
		</svg>
	</span>
</button>

<div class="collapsible-wrapper" class:collapsed={!isOpen}>
	<div class="collapsible-inner">
		{#if loading && Object.keys(portfolio.prices).length === 0}
			<div class="cards-grid">
				{#each Array(skeletonCount) as _}
					<div class="skeleton-card"></div>
				{/each}
			</div>
		{:else}
			<div class="section-controls">
				<button class="view-toggle-btn" onclick={(e) => { e.stopPropagation(); isCompactView = !isCompactView; }} title="Cambiar vista">
					{#if isCompactView}
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
						</svg>
						Vista Tarjetas
					{:else}
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
						</svg>
						Vista Compacta
					{/if}
				</button>
			</div>
			
			{#if isCompactView}
				<div class="compact-list">
					<div class="compact-list-inner">
						{#each portfolioState.positions as position (position.asset.ticker)}
							<CompactAssetRow 
								{position} 
								onUpdateHolding={(ticker, data) => portfolio.updateHolding(ticker, data)} 
							/>
						{/each}
					</div>
				</div>
			{:else}
				<div class="cards-grid">
					{#each portfolioState.positions as position (position.asset.ticker)}
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
		{/if}
	</div>
</div>

<style>
	.section-header-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 1.25rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		text-align: left;
	}

	@media (max-width: 768px) {
		.section-header-btn {
			padding: 1rem 1.25rem;
			border-radius: 18px;
		}
	}

	.section-header-btn.mt-1rem {
		margin-top: 1rem;
	}

	.section-header-btn:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.section-title { 
		font-size: 0.95rem; 
		font-weight: 700; 
		color: #fff; 
		margin: 0; 
		white-space: nowrap;
	}

	.header-left-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		overflow: hidden;
	}

	.header-badges {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.header-badge {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.5rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
		font-size: 0.75rem;
		font-weight: 700;
		color: rgba(160, 160, 200, 0.6);
	}

	.badge-label {
		font-size: 0.6rem;
		text-transform: uppercase;
		opacity: 0.5;
		margin-right: 0.2rem;
	}

	.header-badge.positive {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
	}

	.header-badge.negative {
		background: rgba(239, 68, 68, 0.1);
		color: #fca5a5;
	}

	.header-badge.total {
		background: rgba(255, 255, 255, 0.05);
		color: #fff;
	}

	.header-badge.total.positive {
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.2);
	}

	.header-badge.total.negative {
		color: #fca5a5;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.daily-arrow {
		font-size: 0.6rem;
	}

	.daily-value {
		font-size: 0.65rem;
		opacity: 0.7;
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.section-title {
			font-size: 1.05rem;
		}
		
		.header-left-group {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.header-badges {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.2rem;
		}

		.header-badge {
			padding: 0;
			background: transparent !important;
			border: none !important;
		}

		.header-sparkline {
			display: none; /* Hide on small screens to save space */
		}
	}

	.header-sparkline {
		display: flex;
		align-items: center;
		padding: 0 0.5rem;
		opacity: 0.8;
	}

	.chevron-icon {
		display: flex;
		color: rgba(255, 255, 255, 0.4);
		transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		margin-left: 0.5rem;
	}

	.chevron-icon.rotated {
		transform: rotate(-90deg);
	}

	.collapsible-wrapper {
		display: grid;
		grid-template-rows: 1fr;
		transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, margin 0.4s ease;
		opacity: 1;
		margin-top: 1rem;
	}

	.collapsible-wrapper.collapsed {
		grid-template-rows: 0fr;
		opacity: 0;
		margin-top: 0;
		pointer-events: none;
	}

	.collapsible-inner {
		overflow: hidden;
	}

	.section-controls {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 1rem;
	}

	.view-toggle-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.8rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.view-toggle-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.compact-list {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		overflow: hidden;
	}

	.compact-list-inner {
		display: flex;
		flex-direction: column;
	}

	.cards-grid {
		display: grid;
		gap: 1rem;
	}

	.skeleton-card { 
		background: rgba(255, 255, 255, 0.03); 
		border-radius: 20px; 
		min-height: 200px; 
		animation: pulse 2s infinite; 
	}

	@keyframes pulse { 
		0%, 100% { opacity: 0.5; } 
		50% { opacity: 0.8; } 
	}

	@media (min-width: 1024px) {
		.cards-grid {
			grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); 
			gap: 1.5rem; 
		}
	}
</style>
