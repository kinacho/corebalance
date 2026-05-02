<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import type { PortfolioPosition } from '$lib/types';
	import { formatCurrency, formatPercent } from '$lib/utils';

	interface Props {
		position: PortfolioPosition;
		onUpdateHolding: (ticker: string, data: { shares?: number; avgCost?: number }) => void;
	}

	let { position, onUpdateHolding }: Props = $props();

	let isEditingHoldings = $state(false);
	let editHoldingsValue = $state('');
	
	let isEditingAvgCost = $state(false);
	let editAvgCostValue = $state('');

	const displayHoldings = $derived(position.holdings.toString());
	const displayAvgCost = $derived(position.avgCost.toString());

	const assetCurrency = $derived(portfolio.prices[position.asset.ticker]?.currency || 'EUR');
	const currencySymbol = $derived(assetCurrency === 'USD' ? '$' : '€');

	function handleHoldingsInput(e: Event) {
		const target = e.target as HTMLInputElement;
		editHoldingsValue = target.value;
		isEditingHoldings = true;
		const parsed = parseFloat(target.value);
		if (!isNaN(parsed) && parsed >= 0) {
			onUpdateHolding(position.asset.ticker, { shares: parsed });
		} else if (target.value === '' || target.value === '0') {
			onUpdateHolding(position.asset.ticker, { shares: 0 });
		}
	}

	function handleAvgCostInput(e: Event) {
		const target = e.target as HTMLInputElement;
		editAvgCostValue = target.value;
		isEditingAvgCost = true;
		const parsed = parseFloat(target.value);
		if (!isNaN(parsed) && parsed >= 0) {
			onUpdateHolding(position.asset.ticker, { avgCost: parsed });
		} else if (target.value === '' || target.value === '0') {
			onUpdateHolding(position.asset.ticker, { avgCost: 0 });
		}
	}

	function handleHoldingsFocus(e: Event) {
		const target = e.target as HTMLInputElement;
		editHoldingsValue = target.value;
		isEditingHoldings = true;
	}

	function handleAvgCostFocus(e: Event) {
		const target = e.target as HTMLInputElement;
		editAvgCostValue = target.value;
		isEditingAvgCost = true;
	}
</script>

<div class="compact-row">
	<div class="cell-identity">
		<span class="asset-icon">{position.asset.icon}</span>
		<div class="asset-names">
			<span class="asset-ticker">{position.asset.ticker.split('.')[0]}</span>
			<span class="asset-name" title={position.asset.name}>{position.asset.name}</span>
		</div>
	</div>

	<div class="cell-inputs">
		<div class="input-mini">
			<label for="c-holdings-{position.asset.ticker}">Part.</label>
			<input
				id="c-holdings-{position.asset.ticker}"
				type="number"
				value={isEditingHoldings ? editHoldingsValue : displayHoldings}
				oninput={handleHoldingsInput}
				onblur={() => (isEditingHoldings = false)}
				onfocus={handleHoldingsFocus}
				min="0" step="0.001" placeholder="0" inputmode="decimal"
			/>
		</div>
		<div class="input-mini">
			<label for="c-avgcost-{position.asset.ticker}">Coste</label>
			<div class="input-with-symbol">
				<input
					id="c-avgcost-{position.asset.ticker}"
					type="number"
					value={isEditingAvgCost ? editAvgCostValue : displayAvgCost}
					oninput={handleAvgCostInput}
					onblur={() => (isEditingAvgCost = false)}
					onfocus={handleAvgCostFocus}
					min="0" step="0.01" placeholder="0.00" inputmode="decimal"
				/>
			</div>
		</div>
	</div>

	<div class="cell-metrics">
		<div class="metric-pair">
			<span class="m-label">Precio</span>
			<span class="m-value">{formatCurrency(portfolio.prices[position.asset.ticker]?.price || 0, assetCurrency)}</span>
		</div>
		<div class="metric-pair">
			<span class="m-label">Total</span>
			<span class="m-value highlight privacy-blur">{formatCurrency(position.totalValue, 'EUR')}</span>
		</div>
	</div>

	<div class="cell-profit" class:positive={position.profit > 0} class:negative={position.profit < 0}>
		<span class="profit-val privacy-blur">{position.profit > 0 ? '+' : ''}{formatCurrency(position.profit, 'EUR')}</span>
		<span class="profit-pct">{position.profit > 0 ? '+' : ''}{formatPercent(position.profitPercent)}</span>
	</div>

	<div class="cell-weight">
		<span class="w-current">{formatPercent(position.currentWeight)}</span>
		{#if position.asset.targetWeight > 0}
			<span class="w-target">/ {formatPercent(position.asset.targetWeight, 0)}</span>
		{/if}
	</div>
</div>

<style>
	.compact-row {
		display: grid;
		grid-template-columns: 2fr 2fr 1.5fr 1fr 1fr;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.02);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		align-items: center;
		transition: background 0.2s;
	}

	.compact-row:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.compact-row:last-child {
		border-bottom: none;
	}

	.cell-identity {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.asset-icon {
		font-size: 1.2rem;
		width: 32px;
		height: 32px;
		background: rgba(0,0,0,0.3);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.asset-names {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.asset-ticker {
		font-size: 0.85rem;
		font-weight: 700;
		color: #fff;
	}

	.asset-name {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.5);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.cell-inputs {
		display: flex;
		gap: 0.5rem;
	}

	.input-mini {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		flex: 1;
	}

	.input-mini label {
		font-size: 0.6rem;
		color: rgba(255, 255, 255, 0.4);
		text-transform: uppercase;
	}

	.input-mini input {
		width: 100%;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		padding: 0.3rem 0.4rem;
		color: #fff;
		font-size: 0.8rem;
		outline: none;
	}

	.input-mini input:focus {
		border-color: #3b82f6;
	}

	.cell-metrics {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.metric-pair {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
	}

	.m-label {
		color: rgba(255, 255, 255, 0.4);
		margin-right: 0.5rem;
	}

	.m-value {
		font-weight: 600;
	}

	.m-value.highlight {
		color: #fff;
	}

	.cell-profit {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.cell-profit.positive { color: #10b981; }
	.cell-profit.negative { color: #fca5a5; }

	.profit-pct {
		font-size: 0.65rem;
		opacity: 0.8;
	}

	.cell-weight {
		text-align: right;
		display: flex;
		flex-direction: column;
	}

	.w-current {
		font-size: 0.9rem;
		font-weight: 800;
		color: #fff;
	}

	.w-target {
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.4);
	}

	@media (max-width: 1024px) {
		.compact-row {
			grid-template-columns: 1fr;
			grid-template-rows: auto;
			gap: 0.5rem;
		}

		.cell-identity {
			margin-bottom: 0.5rem;
		}

		.cell-metrics, .cell-profit, .cell-weight {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}

		.cell-profit {
			flex-direction: row;
			gap: 0.5rem;
		}

		.cell-weight {
			flex-direction: row;
			gap: 0.5rem;
		}
	}
</style>
