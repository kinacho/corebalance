<script lang="ts">
	import AssetCard from './AssetCard.svelte';
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
		{#if portfolioState.totalCapital > 0}
			<div class="header-daily-badge" class:positive={portfolioState.dailyChangeValue > 0} class:negative={portfolioState.dailyChangeValue < 0}>
				<span class="daily-arrow">
					{portfolioState.dailyChangeValue > 0 ? '▲' : portfolioState.dailyChangeValue < 0 ? '▼' : '•'}
				</span>
				<span class="daily-percent">{formatPercent(Math.abs(portfolioState.dailyChangePercent))}</span>
				<span class="daily-value privacy-blur">({formatEUR(portfolioState.dailyChangeValue)})</span>
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

	.header-daily-badge {
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

	.header-daily-badge.positive {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
	}

	.header-daily-badge.negative {
		background: rgba(239, 68, 68, 0.1);
		color: #fca5a5;
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

		.header-daily-badge {
			padding: 0;
			background: transparent !important;
		}
	}

	.chevron-icon {
		display: flex;
		color: rgba(255, 255, 255, 0.4);
		transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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
