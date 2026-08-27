<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import type { PortfolioPosition, HoldingData } from '$lib/types';
	import { formatCurrency, formatPrice, formatPercent, isMarketOpen } from '$lib/utils';
	import { tickerLabel } from '$lib/asset-label';
	import LedgerModal from './LedgerModal.svelte';
	import EditReasonPrompt from './EditReasonPrompt.svelte';
	import { LL } from '$lib/i18n/i18n-svelte';

	interface Props {
		position: PortfolioPosition;
		onUpdateHolding: (ticker: string, data: Partial<HoldingData>) => void;
	}

	let { position, onUpdateHolding }: Props = $props();

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

	const displayHoldings = $derived((Math.round(position.holdings * 1000) / 1000).toString());
	const displayAvgCost = $derived((Math.round(position.avgCost * 1000) / 1000).toString());

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

<div class="compact-row" class:ledger-active={useLedger}>
	<div class="cell-identity">
		<button class="asset-icon" onclick={() => showLedger = true} title={useLedger ? $LL.ledger.active() : $LL.ledger.title_open_ledger()}>
			{position.asset.icon || '📈'}
			<span class="market-dot" class:open={isMarketOpen(position.asset.ticker, position.marketState)} class:closed={!isMarketOpen(position.asset.ticker, position.marketState)} title={position.marketState || $LL.dashboard.market_state_unknown()}></span>

			{#if useLedger}
				<span class="ledger-indicator">📜</span>
			{/if}
		</button>
		<div class="asset-names">
		<!--
				⚠️ `tickerLabel()`, no el ticker partido por el punto. Ese `split` dejaba
				`0P0001XF40` —el código de Yahoo **sin** su sufijo— como rótulo de un fondo.
				Para un ETF sigue quitando el mercado (`IWDA.AS` → `IWDA`), que es lo que se
				quería; para un fondo cae al nombre, que es lo que informa.
			-->
			<span class="asset-ticker" title={position.asset.ticker}>
				{tickerLabel(position.asset).split('.')[0]}
			</span>
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
				onblur={handleHoldingsBlur}
				onfocus={handleHoldingsFocus}
				onwheel={(e) => e.preventDefault()}
				min="0" step="0.001" placeholder="0" inputmode="decimal"
				readonly={useLedger}
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
					onwheel={(e) => e.preventDefault()}
					min="0" step="0.01" placeholder="0.00" inputmode="decimal"
					readonly={useLedger}
				/>
			</div>
		</div>
	</div>

	<div class="cell-metrics">
		<div class="metric-pair">
			<span class="m-label">Precio</span>
			<span class="m-value">{formatPrice(portfolio.prices[position.asset.ticker]?.price || 0, assetCurrency)}</span>
		</div>
		<div class="metric-pair">
			<span class="m-label">Total</span>
			<span class="m-value highlight privacy-blur">{formatCurrency(position.totalValue, 'EUR')}</span>
		</div>
	</div>

	<div class="cell-performance">
		<div class="perf-row daily" class:positive={position.dailyChangePercent > 0} class:negative={position.dailyChangePercent < 0}>
			<span class="perf-label">Hoy</span>
			<div class="perf-values">
				<span class="perf-val privacy-blur">{position.dailyChangeValue > 0 ? '+' : ''}{formatCurrency(position.dailyChangeValue, 'EUR')}</span>
				<span class="perf-pct">({position.dailyChangePercent > 0 ? '+' : ''}{formatPercent(position.dailyChangePercent)})</span>
			</div>
		</div>
		<button 
			class="perf-row clickable-perf" 
			class:positive={((perfFilter === 'YTD' ? position.ytdChangePercent : perfFilter === 'MTD' ? position.mtdChangePercent : position.oneMonthChangePercent) ?? 0) > 0} 
			class:negative={((perfFilter === 'YTD' ? position.ytdChangePercent : perfFilter === 'MTD' ? position.mtdChangePercent : position.oneMonthChangePercent) ?? 0) < 0}
			onclick={() => {
				if (position.asset.manualInterestRate !== undefined) return;
				if (perfFilter === 'YTD') perfFilter = 'MTD';
				else if (perfFilter === 'MTD') perfFilter = '1M';
				else perfFilter = 'YTD';
			}}
			style={position.asset.manualInterestRate !== undefined ? 'cursor: default' : ''}
		>
			<span class="perf-label">
				{position.asset.manualInterestRate !== undefined ? 'TIN' : perfFilter}
				{#if position.asset.manualInterestRate === undefined}
					<svg class="perf-icon" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3">
						<path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
					</svg>
				{/if}
			</span>
			<div class="perf-values">
				<span class="perf-pct">
					{#if position.asset.manualInterestRate !== undefined}
						{formatPercent(position.asset.manualInterestRate)}
					{:else}
						{((perfFilter === 'YTD' ? position.ytdChangePercent : perfFilter === 'MTD' ? position.mtdChangePercent : position.oneMonthChangePercent) !== undefined) 
							? (((perfFilter === 'YTD' ? position.ytdChangePercent : perfFilter === 'MTD' ? position.mtdChangePercent : position.oneMonthChangePercent) ?? 0) > 0 ? '+' : '') + formatPercent((perfFilter === 'YTD' ? position.ytdChangePercent : perfFilter === 'MTD' ? position.mtdChangePercent : position.oneMonthChangePercent) ?? 0) 
							: '--'}
					{/if}
				</span>
			</div>
		</button>
		<div class="perf-row total" class:positive={position.profit > 0} class:negative={position.profit < 0}>
			<span class="perf-label">Total</span>
			<div class="perf-values">
				<span class="perf-val privacy-blur">{position.profit > 0 ? '+' : ''}{formatCurrency(position.profit, 'EUR')}</span>
				<span class="perf-pct">({position.profit > 0 ? '+' : ''}{formatPercent(position.profitPercent)})</span>
			</div>
		</div>
		<!--
			⚠️ **Lo que te cuesta el activo al año, que aquí no estaba.** La tarjeta
			grande lo lleva desde siempre y esta fila no, así que cambiar de vista hacía
			desaparecer una cifra sin que nada lo dijera — y la vista compacta es
			precisamente la que se usa para comparar posiciones entre sí, que es cuando
			el coste importa. Misma condición y mismas claves que la tarjeta, para que
			las dos vistas no puedan divergir en cuándo lo enseñan.
		-->
		{#if position.asset.ter > 0 && position.asset.manualInterestRate === undefined}
			<div class="perf-row coste">
				<span class="perf-label">{$LL.dashboard.estimated_cost()}</span>
				<div class="perf-values">
					<span class="perf-val privacy-blur">
						{$LL.dashboard.currency(position.totalValue * position.asset.ter)}
					</span>
					<span class="perf-pct">{$LL.dashboard.per_year()}</span>
				</div>
			</div>
		{/if}
	</div>

	<div class="cell-weight">
		<span class="w-current">{formatPercent(position.currentWeight)}</span>
		{#if position.asset.targetWeight > 0}
			<span class="w-target">/ {position.asset.targetWeight * 100 % 1 === 0 ? formatPercent(position.asset.targetWeight, 0) : formatPercent(position.asset.targetWeight, 1)}</span>
		{/if}
	</div>

	{#if pendingEdit}
		<div class="cell-prompt">
			<EditReasonPrompt edit={pendingEdit} compact />
		</div>
	{/if}
</div>

<style>
	.cell-prompt {
		grid-column: 1 / -1;
	}

	.compact-row {
		display: grid;
		grid-template-columns: 2fr 1.8fr 1.2fr 1.8fr 1fr;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--bg-card);
		border-bottom: 1px solid var(--border-subtle);
		align-items: center;
		transition: background 0.2s;
	}

	.compact-row:hover {
		background: var(--bg-card-hover);
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
		font-size: 1.25rem;
		width: 36px;
		height: 36px;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		position: relative;
		cursor: pointer;
		padding: 0;
		color: inherit;
		line-height: 1;
	}

	.asset-icon:hover {
		background: var(--bg-card-hover);
		border-color: rgba(255,255,255,0.2);
	}

	.ledger-indicator {
		position: absolute;
		top: -6px;
		right: -6px;
		font-size: 0.7rem;
		filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));
	}

	.ledger-active .input-mini input {
		opacity: 0.5;
		background: rgba(167, 139, 250, 0.05);
		color: var(--accent-violet-ink);
		border-color: rgba(167, 139, 250, 0.1);
	}

	.asset-icon :global(.market-dot) {
		position: absolute;
		bottom: -2px;
		right: -2px;
		margin: 0;
		border: 1.5px solid #0f0f19; /* Fondo de la fila aproximado */
		width: 10px;
		height: 10px;
	}

	.asset-names {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.asset-ticker {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.asset-name {
		font-size: 0.65rem;
		color: var(--text-muted);
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
		color: var(--text-faint);
		text-transform: uppercase;
	}

	.input-mini input {
		width: 100%;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		padding: 0.3rem 0.4rem;
		color: var(--text-primary);
		font-size: 0.8rem;
		outline: none;
	}

	.input-mini input:focus {
		border-color: var(--accent-blue);
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
		color: var(--text-faint);
		margin-right: 0.5rem;
	}

	.m-value {
		font-weight: 600;
	}

	.m-value.highlight {
		color: var(--text-primary);
	}

	.cell-performance {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		align-items: flex-end;
	}

	.perf-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		font-size: 0.75rem;
		font-weight: 700;
	}

	/*
	 * El coste va en tono apagado: es un dato de contexto, no un resultado. Si
	 * llevara el mismo peso que el «Total» competiría con la cifra que se viene a
	 * mirar, y el proyecto ya tiene esa distinción hecha en la columna de
	 * herramientas entre una cifra de la cartera y un supuesto.
	 */
	.perf-row.coste .perf-label,
	.perf-row.coste .perf-val,
	.perf-row.coste .perf-pct {
		color: var(--text-muted);
		font-weight: 600;
	}

	.perf-label {
		font-size: 0.6rem;
		text-transform: uppercase;
		opacity: 0.5;
		margin-right: 0.5rem;
	}

	.perf-values {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.perf-row.positive { color: var(--state-positive); }
	.perf-row.negative { color: var(--state-negative); }
	.perf-row:not(.positive):not(.negative) { color: var(--text-muted); }

	.clickable-perf {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		text-align: right;
		transition: opacity 0.2s;
		color: inherit;
		font-family: inherit;
	}

	.clickable-perf:hover .perf-icon {
		transform: rotate(180deg);
		color: var(--text-primary);
	}

	.perf-icon {
		margin-left: 0.25rem;
		opacity: 0.4;
		transition: all 0.4s ease;
		vertical-align: middle;
	}

	.perf-pct {
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
		color: var(--text-primary);
	}

	.w-target {
		font-size: 0.65rem;
		color: var(--text-faint);
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

		.cell-metrics, .cell-performance, .cell-weight {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}

		.cell-performance {
			flex-direction: column;
			gap: 0.3rem;
			align-items: stretch;
		}

		.cell-weight {
			flex-direction: row;
			gap: 0.5rem;
		}
	}
</style>
