<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import type { PortfolioPosition, HoldingData } from '$lib/types';
	import { formatCurrency, isMarketOpen } from '$lib/utils';
	import LedgerModal from './LedgerModal.svelte';
	import EditReasonPrompt from './EditReasonPrompt.svelte';
	import { LL } from '$lib/i18n/i18n-svelte';

	interface Props {
		position: PortfolioPosition;
		onUpdateHolding: (ticker: string, data: Partial<HoldingData>) => void;
		onUpdatePrice: (ticker: string, price: number) => void;
	}

	let { position, onUpdateHolding, onUpdatePrice }: Props = $props();

	let isEditingHoldings = $state(false);
	let editHoldingsValue = $state('');
	
	let isEditingAvgCost = $state(false);
	let editAvgCostValue = $state('');
	let showLedger = $state(false);

	const useLedger = $derived(portfolio.holdings[position.asset.ticker]?.useLedger ?? false);

	/** Participaciones al entrar en el campo, para calcular el delta al salir. */
	let sharesAtFocus: number | null = null;
	const pendingEdit = $derived(portfolio.pendingEditByTicker[position.asset.ticker]);

	// Filtro de rendimiento seleccionado
	let perfFilter = $state<'YTD' | 'MTD' | '1M'>('YTD');

	const isCash = $derived(position.asset.ticker.startsWith('CASH-'));

	const displayHoldings = $derived((Math.round(position.holdings * 100) / 100).toString());
	const displayAvgCost = $derived((Math.round(position.avgCost * 1000) / 1000).toString());

	const currentPerfValue = $derived(
		isCash ? position.asset.manualInterestRate : (
			perfFilter === 'YTD' ? position.ytdChangePercent 
			: perfFilter === 'MTD' ? position.mtdChangePercent 
			: position.oneMonthChangePercent
		)
	);


	const isCrypto = $derived(
		['btc', 'eth'].some(t => position.asset.ticker.toLowerCase().includes(t)) || 
		['bitcoin', 'ethereum'].some(n => position.asset.name.toLowerCase().includes(n))
	);

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
		if (useLedger) return;
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
		if (useLedger) return;
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
		if (useLedger) return;
		const target = e.target as HTMLInputElement;
		editHoldingsValue = target.value;
		isEditingHoldings = true;
		sharesAtFocus = position.holdings;
	}

	/**
	 * El cambio se registra al salir del campo, nunca en cada tecla: teclear "200"
	 * sobre "500" pasa por los estados 2 y 20, y anotarlos generaría ventas que
	 * nunca ocurrieron.
	 */
	function handleHoldingsBlur() {
		isEditingHoldings = false;
		if (useLedger || sharesAtFocus === null) return;
		portfolio.commitHoldingEdit(position.asset.ticker, sharesAtFocus, position.holdings);
		sharesAtFocus = null;
	}

	function handleAvgCostFocus(e: Event) {
		if (useLedger) return;
		const target = e.target as HTMLInputElement;
		editAvgCostValue = target.value;
		isEditingAvgCost = true;
	}
</script>

{#if showLedger}
	<LedgerModal asset={position.asset} onClose={() => showLedger = false} />
{/if}

<div class="asset-card" style="--accent: {position.asset.color}">
	<div class="card-header" style="display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 1rem;">
		<div class="asset-identity" style="min-width: 0;">
			<div class="asset-icon-wrapper">
				<span class="asset-icon">{position.asset.icon || '📈'}</span>
				{#if !isCash}

					<span class="market-dot" class:open={isMarketOpen(position.asset.ticker, position.marketState)} class:closed={!isMarketOpen(position.asset.ticker, position.marketState)} title={position.marketState || 'Estado desconocido'}></span>
				{/if}
			</div>
			<div class="asset-info" style="min-width: 0; flex: 1;">
				<div class="header-main" style="min-width: 0;">
					<div class="ticker-row" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; width: 100%;">
						<span class="ticker" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 75%;">
							{position.asset.ticker}
						</span>
						<div class="ticker-badges">
							{#if useLedger}
								<button class="ledger-badge active" onclick={() => showLedger = true} title="Modo Ledger activo (haz clic para ver historial)">
									📜
								</button>
							{/if}
						</div>
					</div>
					<h3 class="asset-name" title={position.asset.name}>{position.asset.name}</h3>
				</div>
				<div class="asset-meta">
					{#if isCash}
						<span class="asset-ter" title="Interés Anual Remunerado">{$LL.dashboard.percent(position.asset.manualInterestRate ?? 0)} TIN</span>
					{:else}
						<span class="asset-isin">{position.asset.isin}</span>
						<span class="asset-divider">•</span>
						<span class="asset-ter" title="Total Expense Ratio">{$LL.dashboard.percent(position.asset.ter)} TER</span>
					{/if}
					{#if position.lastUpdate && !isCash}
						<span class="asset-divider">•</span>
						<span class="asset-time">{$LL.dashboard.last_update({ date: new Date(position.lastUpdate) })}</span>
					{/if}
				</div>
			</div>
		</div>
		<div class="header-right-info" style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem;">
			<div class="target-badge">
				{position.asset.targetWeight * 100 % 1 === 0 ? $LL.dashboard.percent(position.asset.targetWeight) : $LL.dashboard.percent(position.asset.targetWeight)}
			</div>
			{#if isCrypto && portfolio.btcPrice > 0}
				<div class="btc-spot-price" class:eth={position.asset.ticker.includes('ETH')}>
					<span class="live-dot"></span>
					<span class="btc-label">{position.asset.ticker.includes('ETH') ? 'ETH' : 'BTC'}:</span>
					<span class="btc-value">
						{$LL.dashboard.currency(position.asset.ticker.includes('ETH') ? portfolio.prices['ETH-EUR']?.price || 0 : portfolio.btcPrice)}
					</span>
				</div>
			{/if}
		</div>
	</div>

	<div class="card-body">
		<div class="inputs-grid" style={isCash ? 'grid-template-columns: 1fr;' : ''}>
			<div class="input-field" style={isCash ? 'grid-column: span 2;' : ''}>
				<label class="field-label" for="holdings-{position.asset.ticker}">
					{isCash ? $LL.dashboard.cash_balance() : $LL.dashboard.holdings()}
				</label>
				<div class="input-wrapper">
					<input
						id="holdings-{position.asset.ticker}"
						type="number"
						class="modern-input"
						value={isEditingHoldings ? editHoldingsValue : displayHoldings}
						oninput={handleHoldingsInput}
						onblur={handleHoldingsBlur}
						onfocus={handleHoldingsFocus}
						onwheel={(e) => e.preventDefault()}
						min="0"
						step={isCash ? "0.01" : "0.001"}
						placeholder="0"
						inputmode="decimal"
						readonly={useLedger}
					/>
					{#if isCash}<span class="input-suffix" style="opacity: 1; color: #fff;">€</span>{/if}
				</div>
			</div>
			
			{#if !isCash}
				<div class="input-field">
					<label class="field-label" for="avgcost-{position.asset.ticker}">{$LL.dashboard.avg_cost()}</label>
					<div class="input-wrapper">
						<input
							id="avgcost-{position.asset.ticker}"
							type="number"
							class="modern-input"
							value={isEditingAvgCost ? editAvgCostValue : displayAvgCost}
							oninput={handleAvgCostInput}
							onblur={() => (isEditingAvgCost = false)}
							onfocus={handleAvgCostFocus}
							onwheel={(e) => e.preventDefault()}
							min="0"
							step="0.01"
							placeholder="0.00"
							inputmode="decimal"
							readonly={useLedger}
						/>
						<span class="input-suffix">{currencySymbol}</span>
					</div>
				</div>
			{/if}
		</div>

		{#if pendingEdit}
			<EditReasonPrompt edit={pendingEdit} />
		{/if}

		<!-- Compact stats -->
		<div class="metrics-row" style={isCash ? 'grid-template-columns: repeat(3, 1fr);' : ''}>
			{#if !isCash}
				<div class="metric">
					<span class="metric-label">{$LL.dashboard.price()}</span>
					<div class="metric-content">
						{#if position.unitPrice > 0}
							<!-- El precio está en la divisa del activo, así que se etiqueta con
							     la suya y no con la base, igual que hace CompactAssetRow. -->
							<span class="metric-value">{formatCurrency(portfolio.prices[position.asset.ticker]?.price || 0, assetCurrency, 2)}</span>
						{:else}
							<input 
								type="number" 
								class="price-ghost-input" 
								placeholder={`0.00 ${currencySymbol}`} 
								onwheel={(e) => e.preventDefault()}
								oninput={(e) => {
									const val = parseFloat((e.target as HTMLInputElement).value);
									if (!isNaN(val)) onUpdatePrice(position.asset.ticker, val);
								}}
							/>
						{/if}
					</div>
				</div>
			{/if}
			<div class="metric">
				<span class="metric-label">{isCash ? $LL.dashboard.value_total() : $LL.dashboard.value_total()}</span>
				<div class="metric-content">
					<span class="metric-value highlight privacy-blur">{$LL.dashboard.currency(position.totalValue)}</span>
				</div>
			</div>
			<div class="metric pnl-metric" class:positive={position.dailyChangePercent > 0} class:negative={position.dailyChangePercent < 0}>
				<span class="metric-label">{$LL.dashboard.today()}</span>
				<div class="metric-content">
					<span class="metric-value privacy-blur">
						{position.dailyChangeValue > 0 ? '+' : ''}{$LL.dashboard.currency(position.dailyChangeValue)}
					</span>
					<span class="profit-tag">
						{position.dailyChangePercent > 0 ? '+' : ''}{$LL.dashboard.percent(position.dailyChangePercent)}
					</span>
				</div>
			</div>
			<button 
				class="metric pnl-metric clickable-metric" 
				class:positive={(currentPerfValue ?? 0) > 0} 
				class:negative={(currentPerfValue ?? 0) < 0}
				onclick={() => {
					if (isCash) return;
					if (perfFilter === 'YTD') perfFilter = 'MTD';
					else if (perfFilter === 'MTD') perfFilter = '1M';
					else perfFilter = 'YTD';
				}}
				style={isCash ? 'cursor: default' : ''}
				title={isCash ? 'Interés Anual' : 'Haz clic para cambiar entre YTD, MTD y 1M'}
			>
				<span class="metric-label">
					{isCash ? 'Rendimiento' : perfFilter}
					{#if !isCash}
						<svg class="perf-icon" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3">
							<path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
						</svg>
					{/if}
				</span>
				<div class="metric-content">
					<span class="profit-tag" style="margin-left: 0;">
						{currentPerfValue !== undefined 
							? ((currentPerfValue ?? 0) > 0 ? '+' : '') + $LL.dashboard.percent(currentPerfValue ?? 0) 
							: '--'}
					</span>
				</div>
			</button>
			{#if !isCash}
				<div class="metric pnl-metric" class:positive={position.profit > 0} class:negative={position.profit < 0}>
					<span class="metric-label">{$LL.dashboard.total()}</span>
					<div class="metric-content">
						<span class="metric-value privacy-blur">
							{position.profit > 0 ? '+' : ''}{$LL.dashboard.currency(position.profit)}
						</span>
						<span class="profit-tag">
							{position.profit > 0 ? '+' : ''}{$LL.dashboard.percent(position.profitPercent)}
						</span>
					</div>
				</div>
			{/if}
			{#if position.asset.ter > 0 && !isCash && position.asset.manualInterestRate === undefined}
				<div class="metric cost-metric">
					<span class="metric-label">{$LL.dashboard.estimated_cost()}</span>
					<div class="metric-content">
						<span class="metric-value privacy-blur">{$LL.dashboard.currency(position.totalValue * position.asset.ter)}</span>
						<span class="cost-period">{$LL.dashboard.per_year()}</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Weight progress -->
		<div class="weight-track-wrapper">
			<div class="weight-info">
				<span class="current-weight" data-level={deviationLevel}>
					{$LL.dashboard.percent(position.currentWeight)}
				</span>
				{#if position.asset.targetWeight > 0}
					<span class="deviation-tag" data-level={deviationLevel}>
						{position.deviation > 0.001 ? '▴' : position.deviation < -0.001 ? '▾' : ''}
						{deviationSign}{$LL.dashboard.percent(position.deviation)}
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
						title={position.asset.targetWeight > 0 ? `Objetivo: ${$LL.dashboard.percent(position.asset.targetWeight)}` : 'Sin objetivo'}
					></div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.asset-card {
		background: rgba(255, 255, 255, 0.025);
		backdrop-filter: blur(20px) saturate(160%);
		-webkit-backdrop-filter: blur(20px) saturate(160%);
		border: 1px solid var(--border-subtle);
		border-radius: 24px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		position: relative;
		overflow: hidden;
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s, box-shadow 0.2s;
	}

	.asset-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 2px;
		background: linear-gradient(90deg, transparent, var(--accent), transparent);
		opacity: 0.4;
	}

	.asset-card:hover {
		border-color: rgba(255, 255, 255, 0.15);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
		background: var(--bg-card);
	}

	.asset-card:active {
		transform: scale(0.985);
	}

	@media (min-width: 768px) {
		.asset-card {
			padding: 1.25rem;
			gap: 1rem;
			border-radius: 28px;
		}
	}

	.asset-card:hover {
		background: var(--bg-card-hover);
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-4px);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	}

	.asset-card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 28px;
		padding: 1px;
		background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent 50%, rgba(255,255,255,0.05));
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
		min-width: 0;
		flex: 1;
	}

	.asset-icon-wrapper {
		width: 44px;
		height: 44px;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);
		position: relative;
		flex-shrink: 0;
	}

	.asset-icon {
		font-size: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.asset-icon-wrapper :global(.market-dot) {
		position: absolute;
		bottom: -2px;
		right: -2px;
		margin: 0;
		border: 2px solid #1a1a2e; /* Fondo de la tarjeta aproximado para contraste */
		width: 12px;
		height: 12px;
	}

	.asset-name {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.asset-isin, .asset-ter, .asset-time {
		/* ⚠️ El `clamp()` tenía el suelo justo donde no hay que tenerlo: a 390 px de
		   ancho, `2.5vw` son 9,75 px y ahí es donde caía siempre. Ver `--text-micro`. */
		font-size: clamp(var(--text-micro), 2.5vw, 0.65rem);
		color: var(--text-muted);
		font-family: 'Monaco', 'Menlo', monospace;
	}

	.asset-time {
		color: color-mix(in srgb, var(--accent) 40%, rgba(160, 160, 200, 0.5));
	}

	.asset-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.asset-divider {
		color: var(--text-faint);
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
		gap: 0.25rem;
		padding: 0.15rem 0.4rem;
		background: rgba(245, 158, 11, 0.1);
		border-radius: 6px;
		border: 1px solid rgba(245, 158, 11, 0.2);
	}

	.live-dot {
		width: 6px;
		height: 6px;
		background: var(--accent-orange);
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
		color: var(--accent-orange-ink);
		text-transform: uppercase;
	}

	.btc-value {
		font-size: 0.75rem;
		font-weight: 800;
		color: var(--accent-orange-ink);
		font-family: 'Monaco', monospace;
	}

	.target-badge {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		padding: 0.15rem 0.5rem;
		border-radius: 6px;
		font-size: 0.68rem;
		font-weight: 800;
		border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
		line-height: 1;
	}

	.ticker-badges {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.ledger-badge {
		background: rgba(167, 139, 250, 0.1);
		color: var(--accent-violet-ink);
		border: 1px solid rgba(167, 139, 250, 0.2);
		padding: 0.15rem 0.35rem;
		border-radius: 6px;
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ledger-badge:hover {
		background: rgba(167, 139, 250, 0.2);
		transform: scale(1.1);
	}

	.ledger-badge.active {
		box-shadow: none;
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
		color: var(--text-muted);
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
		background: var(--bg-card-hover);
		border: 1.5px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 0.65rem 0.85rem;
		color: var(--text-primary);
		font-size: 0.95rem;
		font-weight: 600;
		transition: all 0.2s;
		outline: none;
	}

	:global(.modern-input[readonly]) {
		opacity: 0.5;
		cursor: default;
		background: rgba(167, 139, 250, 0.05) !important;
		border-color: rgba(167, 139, 250, 0.1) !important;
		color: var(--accent-violet-ink) !important;
	}

	.modern-input:focus {
		background: var(--bg-scrim);
		border-color: var(--accent);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 15%, transparent);
	}

	.input-suffix {
		position: absolute;
		right: 0.85rem;
		font-size: 0.85rem;
		color: var(--text-faint);
		font-weight: 700;
		pointer-events: none;
	}

	.metrics-row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.4rem;
		padding: 0.6rem;
		background: var(--bg-card-hover);
		border-radius: 12px;
	}

	@media (max-width: 380px) {
		.metrics-row {
			grid-template-columns: 1fr;
		}
	}

	.metric {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.metric-content {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.metric-label {
		display: block;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		color: var(--text-faint);
		margin-bottom: 0.25rem;
	}

	.clickable-metric {
		background: transparent;
		border: 1px solid transparent;
		cursor: pointer;
		padding: 0.25rem;
		margin: -0.25rem;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		text-align: left;
		width: 100%;
		transition: all 0.2s;
		color: inherit;
		font-family: inherit;
	}

	.clickable-metric:hover .perf-icon {
		transform: rotate(180deg);
		color: var(--text-primary);
	}

	.perf-icon {
		margin-left: 0.25rem;
		opacity: 0.4;
		transition: all 0.4s ease;
		vertical-align: middle;
	}

	.metric-value {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.metric-value.highlight {
		color: var(--text-primary);
	}

	.pnl-metric.positive .metric-value { color: var(--state-positive); }
	.pnl-metric.negative .metric-value { color: var(--state-negative); }

	.profit-tag {
		font-size: 0.65rem;
		font-weight: 800;
		padding: 0.15rem 0.4rem;
		border-radius: 6px;
		background: var(--bg-card-hover);
		margin-left: 0.4rem;
	}

	.pnl-metric.positive .profit-tag { 
		background: rgba(52, 211, 153, 0.15); 
		color: var(--state-positive);
	}

	.pnl-metric.negative .profit-tag { 
		background: rgba(244, 63, 94, 0.15); 
		color: var(--state-negative);
	}

	.cost-metric .metric-value {
		color: var(--text-secondary);
	}

	.cost-period {
		font-size: var(--text-micro);
		color: var(--text-faint);
		margin-left: 0.2rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.price-ghost-input {
		background: transparent;
		border: none;
		border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
		width: 100%;
		color: var(--state-positive);
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
		background: var(--bg-card-hover);
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

	[data-level='ok'] { color: var(--text-muted); }
	[data-level='above'] { color: var(--state-positive); }
	[data-level='below'] { color: var(--state-negative); }

	.progress-container {
		height: 8px;
		position: relative;
	}

	.progress-bg {
		width: 100%;
		height: 100%;
		background: var(--bg-card-hover);
		border-radius: 4px;
		position: relative;
		overflow: visible;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 80%, white));
		border-radius: 4px;
		transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.target-marker {
		position: absolute;
		top: -4px;
		width: 3px;
		height: 16px;
		background: #fff;
		border-radius: 2px;
		transform: translateX(-50%);
		z-index: 2;
	}

	@media (min-width: 1024px) {
		.asset-card {
			padding: 1.5rem;
		}
	}
</style>
