<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import type { PortfolioPosition } from '$lib/types';
	import { formatCurrency, formatPercent } from '$lib/utils';

	interface Props {
		position: PortfolioPosition;
		onUpdateHolding: (ticker: string, data: { shares?: number; avgCost?: number }) => void;
		onUpdatePrice: (ticker: string, price: number) => void;
	}

	let { position, onUpdateHolding, onUpdatePrice }: Props = $props();

	let isEditingHoldings = $state(false);
	let editHoldingsValue = $state('');
	
	let isEditingAvgCost = $state(false);
	let editAvgCostValue = $state('');

	const displayHoldings = $derived(position.holdings.toString());
	const displayAvgCost = $derived(position.avgCost.toString());

	// Identificar si esta es la tarjeta de Bitcoin
	const isBitcoin = $derived(position.asset.ticker.includes('XS2940466316'));

	// Determinar el nivel de desviación para el color de estado
	const deviationLevel = $derived(
		Math.abs(position.deviation) < 0.0001 
			? 'ok' 
			: (position.deviation > 0 ? 'above' : 'below')
	);

	const deviationSign = $derived(
		position.deviation > 0.001 ? '+' : ''
	);

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

<div class="asset-card" style="--accent: {position.asset.color}">
	<div class="card-header">
		<div class="asset-identity">
			<div class="asset-icon-wrapper">
				<span class="asset-icon">{position.asset.icon}</span>
			</div>
			<div class="asset-info">
				<h3 class="asset-name">{position.asset.name}</h3>
				<div class="asset-meta">
					<span class="asset-isin">{position.asset.isin}</span>
					<span class="asset-divider">•</span>
					<span class="asset-ter" title="Total Expense Ratio">{formatPercent(position.asset.ter)} TER</span>
				</div>
			</div>
		</div>
		<div class="header-right-info">
			{#if isBitcoin && portfolio.btcPrice > 0}
				<div class="btc-spot-price">
					<span class="live-dot"></span>
					<span class="btc-label">BTC Spot:</span>
					<span class="btc-value">{formatCurrency(portfolio.btcPrice, 'EUR')}</span>
				</div>
			{/if}
			<div class="target-badge">
				{formatPercent(position.asset.targetWeight, 0)}
			</div>
		</div>
	</div>

	<div class="card-body">
		<div class="inputs-grid">
			<div class="input-field">
				<label class="field-label" for="holdings-{position.asset.ticker}">Participaciones</label>
				<div class="input-wrapper">
					<input
						id="holdings-{position.asset.ticker}"
						type="number"
						class="modern-input"
						value={isEditingHoldings ? editHoldingsValue : displayHoldings}
						oninput={handleHoldingsInput}
						onblur={() => (isEditingHoldings = false)}
						onfocus={handleHoldingsFocus}
						min="0"
						step="0.001"
						placeholder="0"
						inputmode="decimal"
					/>
				</div>
			</div>
			
			<div class="input-field">
				<label class="field-label" for="avgcost-{position.asset.ticker}">Coste Medio</label>
				<div class="input-wrapper">
					<input
						id="avgcost-{position.asset.ticker}"
						type="number"
						class="modern-input"
						value={isEditingAvgCost ? editAvgCostValue : displayAvgCost}
						oninput={handleAvgCostInput}
						onblur={() => (isEditingAvgCost = false)}
						onfocus={handleAvgCostFocus}
						min="0"
						step="0.01"
						placeholder="0.00"
						inputmode="decimal"
					/>
					<span class="input-suffix">{currencySymbol}</span>
				</div>
			</div>
		</div>

		<!-- Compact stats -->
		<div class="metrics-row">
			<div class="metric">
				<span class="metric-label">Precio</span>
				<div class="metric-content">
					{#if position.unitPrice > 0}
						<span class="metric-value">{formatCurrency(portfolio.prices[position.asset.ticker]?.price || 0, assetCurrency)}</span>
					{:else}
						<input 
							type="number" 
							class="price-ghost-input" 
							placeholder={`0.00 ${currencySymbol}`} 
							oninput={(e) => {
								const val = parseFloat((e.target as HTMLInputElement).value);
								if (!isNaN(val)) onUpdatePrice(position.asset.ticker, val);
							}}
						/>
					{/if}
				</div>
			</div>
			<div class="metric">
				<span class="metric-label">Valor Total</span>
				<div class="metric-content">
					<span class="metric-value highlight privacy-blur">{formatCurrency(position.totalValue, 'EUR')}</span>
				</div>
			</div>
			<div class="metric pnl-metric" class:positive={position.profit > 0} class:negative={position.profit < 0}>
				<span class="metric-label">Beneficio</span>
				<div class="metric-content">
					<span class="metric-value privacy-blur">
						{position.profit > 0 ? '+' : ''}{formatCurrency(position.profit, 'EUR')}
					</span>
					<span class="profit-tag">
						{position.profit > 0 ? '+' : ''}{formatPercent(position.profitPercent)}
					</span>
				</div>
			</div>
			<div class="metric cost-metric">
				<span class="metric-label">Coste Est.</span>
				<div class="metric-content">
					<span class="metric-value privacy-blur">{formatCurrency(position.totalValue * position.asset.ter, 'EUR')}</span>
					<span class="cost-period">/año</span>
				</div>
			</div>
		</div>

		<!-- Weight progress -->
		<div class="weight-track-wrapper">
			<div class="weight-info">
				<span class="current-weight" data-level={deviationLevel}>
					{formatPercent(position.currentWeight)}
				</span>
				{#if position.asset.targetWeight > 0}
					<span class="deviation-tag" data-level={deviationLevel}>
						{position.deviation > 0.001 ? '▴' : position.deviation < -0.001 ? '▾' : ''}
						{deviationSign}{formatPercent(position.deviation)}
					</span>
				{/if}
			</div>
			<div class="progress-container">
				<div class="progress-bg">
					<div
						class="progress-fill"
						style="width: {Math.min(position.currentWeight * 100, 100)}%"
					></div>
					<div
						class="target-marker"
						style="left: {(position.asset.targetWeight > 0 ? position.asset.targetWeight : position.currentWeight) * 100}%"
						title={position.asset.targetWeight > 0 ? `Objetivo: ${formatPercent(position.asset.targetWeight)}` : 'Sin objetivo'}
					></div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.asset-card {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
		backdrop-filter: blur(24px) saturate(180%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		padding: 1.25rem;
		transition: transform 0.2s cubic-bezier(0.2, 0, 0.2, 1), background 0.3s ease;
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
	}

	.asset-card:hover {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-4px);
	}

	.asset-card:active {
		transform: scale(0.98) !important;
	}

	.asset-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		border-radius: 24px;
		padding: 1px;
		background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent 40%, transparent 60%, rgba(255,255,255,0.1));
		-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
		mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		pointer-events: none;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.asset-identity {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}

	.asset-icon-wrapper {
		width: 44px;
		height: 44px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);
	}

	.asset-name {
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.asset-isin, .asset-ter {
		font-size: 0.65rem;
		color: rgba(160, 160, 200, 0.5);
		font-family: 'Monaco', 'Menlo', monospace;
	}

	.asset-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.asset-divider {
		color: rgba(160, 160, 200, 0.2);
		font-size: 0.7rem;
	}

	.asset-ter {
		font-weight: 600;
	}

	.header-right-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.4rem;
	}

	.btc-spot-price {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0.5rem;
		background: rgba(245, 158, 11, 0.1);
		border-radius: 6px;
		border: 1px solid rgba(245, 158, 11, 0.2);
	}

	.live-dot {
		width: 6px;
		height: 6px;
		background: #f59e0b;
		border-radius: 50%;
		animation: pulse-orange 2s infinite;
	}

	@keyframes pulse-orange {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.5; transform: scale(1.2); }
	}

	.btc-label {
		font-size: 0.6rem;
		font-weight: 700;
		color: rgba(245, 158, 11, 0.8);
		text-transform: uppercase;
	}

	.btc-value {
		font-size: 0.75rem;
		font-weight: 800;
		color: #f59e0b;
		font-family: 'Monaco', monospace;
	}

	.target-badge {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		padding: 0.3rem 0.7rem;
		border-radius: 8px;
		font-size: 0.75rem;
		font-weight: 800;
		border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.inputs-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.input-field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field-label {
		font-size: 0.65rem;
		font-weight: 600;
		color: rgba(160, 160, 200, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.modern-input {
		width: 100%;
		background: rgba(0, 0, 0, 0.4);
		border: 1.5px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 0.65rem 0.85rem;
		color: #fff;
		font-size: 0.95rem;
		font-weight: 600;
		transition: all 0.2s;
		outline: none;
	}

	.modern-input:focus {
		background: rgba(0, 0, 0, 0.5);
		border-color: var(--accent);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 15%, transparent);
	}

	.input-suffix {
		position: absolute;
		right: 0.85rem;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.2);
		font-weight: 700;
		pointer-events: none;
	}

	.metrics-row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		grid-template-rows: auto auto;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.15);
		border-radius: 14px;
	}

	.metric {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.metric-content {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
	}

	.metric-label {
		font-size: 0.6rem;
		color: rgba(160, 160, 200, 0.5);
		text-transform: uppercase;
		font-weight: 600;
	}

	.metric-value {
		font-size: 0.85rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.9);
	}

	.metric-value.highlight {
		color: #fff;
	}

	.pnl-metric.positive .metric-value { color: #10b981; }
	.pnl-metric.negative .metric-value { color: #fca5a5; }

	.profit-tag {
		font-size: 0.65rem;
		font-weight: 800;
		padding: 0.15rem 0.4rem;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.05);
		margin-left: 0.4rem;
	}

	.pnl-metric.positive .profit-tag { 
		background: rgba(16, 185, 129, 0.15); 
		color: #10b981;
	}

	.pnl-metric.negative .profit-tag { 
		background: rgba(239, 68, 68, 0.15); 
		color: #fca5a5;
	}

	.cost-metric .metric-value {
		color: rgba(160, 160, 200, 0.8);
	}

	.cost-period {
		font-size: 0.6rem;
		color: rgba(160, 160, 200, 0.4);
		margin-left: 0.2rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.price-ghost-input {
		background: transparent;
		border: none;
		border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
		width: 100%;
		color: #10b981;
		font-size: 0.85rem;
		padding: 0;
		outline: none;
	}

	.weight-track-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.weight-info {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}

	.current-weight {
		font-size: 0.9rem;
		font-weight: 800;
	}

	.deviation-tag {
		font-size: 0.7rem;
		font-weight: 800;
		padding: 0.15rem 0.5rem;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.25);
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

	[data-level='ok'] { color: rgba(160, 160, 200, 0.6); }
	[data-level='above'] { color: #10b981; }
	[data-level='below'] { color: #ef4444; }

	.progress-container {
		height: 8px;
		position: relative;
	}

	.progress-bg {
		width: 100%;
		height: 100%;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		position: relative;
		overflow: visible;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 80%, white));
		border-radius: 4px;
		transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
		box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.target-marker {
		position: absolute;
		top: -4px;
		width: 3px;
		height: 16px;
		background: #fff;
		border-radius: 2px;
		transform: translateX(-50%);
		box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
		z-index: 2;
	}

	@media (min-width: 1024px) {
		.asset-card {
			padding: 1.5rem;
		}
	}
</style>
