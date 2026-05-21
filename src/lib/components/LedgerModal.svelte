<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import type { Asset, Transaction, TransactionType } from '$lib/types';
	import { formatEUR, formatCurrency, formatDate } from '$lib/utils';
	import { fade, slide, fly } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		asset: Asset;
		onClose: () => void;
	}

	let { asset, onClose }: Props = $props();

	// Bloquear scroll del body
	onMount(() => {
		document.body.classList.add('modal-open');
	});

	onDestroy(() => {
		// Solo quitar si no hay otros modales abiertos (en este caso ManageAssets sigue detrás)
		// Pero como este modal está encima de ManageAssets, al cerrar este NO debemos quitar el lock
		// porque ManageAssets todavía necesita que el body esté bloqueado.
		// El lock se quitará cuando se cierre ManageAssets.
	});

	// --- State ---
	let useLedger = $state(false);
	
	// Sincronizar useLedger con el prop asset de forma reactiva
	$effect(() => {
		useLedger = portfolio.holdings[asset.ticker]?.useLedger ?? false;
	});

	let transactions = $derived(portfolio.transactions.filter(t => t.ticker === asset.ticker).sort((a, b) => b.date - a.date));
	
	let showAddForm = $state(false);
	
	// Usar $derived para que los valores por defecto del formulario reaccionen al cambio de activo
	const defaultPrice = $derived(portfolio.prices[asset.ticker]?.price || 0);
	const defaultCurrency = $derived(portfolio.prices[asset.ticker]?.currency || ui.baseCurrency);

	let newTx = $state<Partial<Transaction>>({
		type: 'buy',
		date: Date.now(),
		shares: 0,
		price: 0,
		currency: '',
		fees: 0,
		fxRate: 1,
		notes: ''
	});

	// Inicializar valores cuando cambia el activo o se abre el formulario
	$effect(() => {
		if (showAddForm || asset.ticker) {
			newTx.price = defaultPrice;
			newTx.currency = defaultCurrency;
		}
	});

	const ledgerSummary = $derived(portfolio.ledgerHoldings[asset.ticker] || { shares: 0, avgCost: 0 });

	function toggleMode() {
		useLedger = !useLedger;
		portfolio.toggleLedger(asset.ticker, useLedger);
		ui.hapticFeedback('medium');
	}

	function addTransaction() {
		if (!newTx.shares || newTx.shares <= 0) {
			ui.addToast('Las participaciones deben ser mayores a 0', 'error');
			return;
		}

		const tx: Transaction = {
			id: crypto.randomUUID(),
			ticker: asset.ticker,
			type: newTx.type as TransactionType,
			date: newTx.date || Date.now(),
			shares: newTx.shares || 0,
			price: newTx.price || 0,
			currency: newTx.currency || 'EUR',
			fees: newTx.fees || 0,
			fxRate: newTx.fxRate || 1,
			notes: newTx.notes
		};

		portfolio.addTransaction(tx);
		showAddForm = false;
		ui.addToast('Transacción añadida', 'success');
		ui.hapticFeedback('medium');
		
		// Reset form a valores por defecto reactivos
		newTx = {
			type: 'buy',
			date: Date.now(),
			shares: 0,
			price: defaultPrice,
			currency: defaultCurrency,
			fees: 0,
			fxRate: 1,
			notes: ''
		};
	}

	function removeTx(id: string) {
		if (confirm('¿Eliminar esta transacción?')) {
			portfolio.removeTransaction(id);
			ui.addToast('Transacción eliminada', 'info');
		}
	}

	const typeLabels: Record<TransactionType, string> = {
		buy: 'Compra',
		sell: 'Venta',
		dividend: 'Dividendo',
		transfer: 'Traspaso',
		initial_balance: 'Saldo Inicial'
	};

	const typeColors: Record<TransactionType, string> = {
		buy: '#10b981',
		sell: '#ef4444',
		dividend: '#f59e0b',
		transfer: '#3b82f6',
		initial_balance: '#a78bfa'
	};
</script>

<div class="ledger-overlay" transition:fade={{ duration: 150 }}>
	<button class="ledger-backdrop" onclick={onClose} aria-label="Cerrar modal"></button>
	
	<div class="ledger-panel" transition:fly={{ y: 20, duration: 200 }}>
		<div class="ledger-header" style="--accent: {asset.color}">
			<div class="asset-brand">
				<span class="asset-icon">{asset.icon}</span>
				<div>
					<h2 class="asset-name">{asset.name}</h2>
					<p class="asset-ticker">{asset.ticker}</p>
				</div>
			</div>
			<button class="close-btn" onclick={onClose}>✕</button>
		</div>

		<div class="ledger-body">
			<!-- Ledger Toggle -->
			<div class="mode-selector" class:active={useLedger}>
				<div class="mode-info">
					<span class="mode-title">{useLedger ? '✅ Modo Ledger Activo' : '⚪ Modo Manual'}</span>
					<p class="mode-desc">
						{#if useLedger}
							Las participaciones se calculan sumando las transacciones.
						{:else}
							Usando participaciones y precio medio introducidos a mano.
						{/if}
					</p>
				</div>
				<button class="toggle-btn" onclick={toggleMode}>
					{useLedger ? 'Desactivar' : 'Activar Ledger'}
				</button>
			</div>

			{#if useLedger}
				<div class="stats-grid" in:slide>
					<div class="stat-card">
						<span class="stat-label">Participaciones</span>
						<span class="stat-value">{ledgerSummary.shares.toLocaleString()}</span>
					</div>
					<div class="stat-card">
						<span class="stat-label">Precio Medio</span>
						<span class="stat-value">{formatEUR(ledgerSummary.avgCost)}</span>
					</div>
					<div class="stat-card">
						<span class="stat-label">Capital Total</span>
						<span class="stat-value">{formatEUR(ledgerSummary.shares * (portfolio.prices[asset.ticker]?.price || 0))}</span>
					</div>
				</div>

				<div class="transactions-section">
					<div class="section-header">
						<h3>Historial de Operaciones</h3>
						<button class="add-tx-btn" onclick={() => showAddForm = !showAddForm}>
							{showAddForm ? 'Cancelar' : '+ Añadir'}
						</button>
					</div>

					{#if showAddForm}
						<div class="add-tx-form" transition:slide>
							<div class="form-row">
								<div class="form-group">
									<label for="tx-type">Tipo</label>
									<select id="tx-type" bind:value={newTx.type}>
										<option value="buy">Compra</option>
										<option value="sell">Venta</option>
										<option value="dividend">Dividendo</option>
										<option value="initial_balance">Saldo Inicial</option>
										<option value="transfer">Traspaso</option>
									</select>
								</div>
								<div class="form-group">
									<label for="tx-date">Fecha</label>
									<input id="tx-date" type="date" value={new Date(newTx.date || 0).toISOString().split('T')[0]} onchange={(e) => newTx.date = new Date(e.currentTarget.value).getTime()} />
								</div>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label for="tx-shares">Participaciones</label>
									<input id="tx-shares" type="number" step="0.001" bind:value={newTx.shares} />
								</div>
								<div class="form-group">
									<label for="tx-price">Precio Unit.</label>
									<input id="tx-price" type="number" step="0.0001" bind:value={newTx.price} />
								</div>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label for="tx-fees">Comisiones</label>
									<input id="tx-fees" type="number" step="0.01" bind:value={newTx.fees} />
								</div>
								<div class="form-group">
									<label for="tx-currency">Divisa / FX</label>
									<div class="fx-group">
										<input id="tx-currency" type="text" class="currency-input" bind:value={newTx.currency} maxlength="3" />
										<input type="number" step="0.0001" class="fx-input" bind:value={newTx.fxRate} title="Tipo de cambio a EUR" />
									</div>
								</div>
							</div>

							<button class="submit-tx-btn" onclick={addTransaction}>Guardar Transacción</button>
						</div>
					{/if}

					<div class="tx-list">
						{#if transactions.length === 0}
							<div class="empty-state">No hay transacciones registradas</div>
						{:else}
							{#each transactions as tx (tx.id)}
								<div class="tx-item" in:slide>
									<div class="tx-type-dot" style="background: {typeColors[tx.type]}"></div>
									<div class="tx-main">
										<span class="tx-type-label">{typeLabels[tx.type]}</span>
										<span class="tx-date">{new Date(tx.date).toLocaleDateString()}</span>
									</div>
									<div class="tx-details">
										<span class="tx-shares">{tx.shares > 0 ? '+' : ''}{tx.shares}</span>
										<span class="tx-price">{formatCurrency(tx.price, tx.currency)}</span>
									</div>
									<button class="tx-delete" onclick={() => removeTx(tx.id)}>✕</button>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{:else}
				<div class="manual-notice">
					<div class="notice-icon">ℹ️</div>
					<p>Estás usando el <b>Modo Manual</b>. Los datos de este activo se gestionan desde la pantalla anterior.</p>
					<p class="notice-sub">Activa el <b>Modo Ledger</b> si quieres llevar un registro detallado de tus compras y ventas para calcular automáticamente el coste medio y las plusvalías.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.ledger-overlay {
		position: fixed;
		inset: 0;
		z-index: 300;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.ledger-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0,0,0,0.8);
		backdrop-filter: blur(4px);
		border: none;
		width: 100%;
		height: 100%;
	}

	.ledger-panel {
		position: relative;
		width: 100%;
		max-width: 500px;
		background: #0a0a18;
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 24px;
		overflow: hidden;
		box-shadow: 0 30px 60px rgba(0,0,0,0.8);
		display: flex;
		flex-direction: column;
		max-height: 90vh;
	}

	.ledger-header {
		padding: 1.5rem;
		border-bottom: 1px solid rgba(255,255,255,0.05);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: linear-gradient(to bottom right, rgba(255,255,255,0.02), transparent);
		border-top: 4px solid var(--accent);
	}

	.asset-brand {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.asset-icon {
		font-size: 2rem;
	}

	.asset-name {
		font-size: 1.1rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
	}

	.asset-ticker {
		font-size: 0.8rem;
		color: rgba(255,255,255,0.4);
		margin: 0;
		font-family: monospace;
	}

	.close-btn {
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.1);
		color: #fff;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		cursor: pointer;
	}

	.ledger-body {
		padding: 1.5rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.mode-selector {
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.06);
		border-radius: 16px;
		padding: 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		transition: all 0.3s;
	}

	.mode-selector.active {
		background: rgba(16, 185, 129, 0.05);
		border-color: rgba(16, 185, 129, 0.2);
	}

	.mode-title {
		font-weight: 700;
		font-size: 0.9rem;
		color: #fff;
		display: block;
	}

	.mode-desc {
		font-size: 0.75rem;
		color: rgba(255,255,255,0.4);
		margin: 0.2rem 0 0;
	}

	.toggle-btn {
		background: #3b82f6;
		color: #fff;
		border: none;
		padding: 0.5rem 0.8rem;
		border-radius: 10px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.stat-card {
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.05);
		padding: 0.75rem;
		border-radius: 12px;
		text-align: center;
	}

	.stat-label {
		display: block;
		font-size: 0.65rem;
		color: rgba(255,255,255,0.4);
		text-transform: uppercase;
		margin-bottom: 0.2rem;
	}

	.stat-value {
		font-weight: 700;
		font-size: 0.9rem;
		color: #fff;
	}

	.transactions-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-header h3 {
		font-size: 0.9rem;
		margin: 0;
		color: #fff;
	}

	.add-tx-btn {
		background: rgba(255,255,255,0.05);
		border: 1px dashed rgba(255,255,255,0.2);
		color: #fff;
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.add-tx-form {
		background: rgba(255,255,255,0.02);
		border: 1px solid rgba(255,255,255,0.05);
		border-radius: 16px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.form-group label {
		font-size: 0.7rem;
		color: rgba(255,255,255,0.4);
		font-weight: 600;
	}

	.form-group input, .form-group select {
		background: #000;
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 8px;
		padding: 0.5rem;
		color: #fff;
		font-size: 0.85rem;
	}

	.fx-group {
		display: flex;
		gap: 0.25rem;
	}

	.currency-input { width: 45px !important; text-align: center; }
	.fx-input { flex: 1; }

	.submit-tx-btn {
		background: #10b981;
		color: #fff;
		border: none;
		padding: 0.75rem;
		border-radius: 10px;
		font-weight: 700;
		cursor: pointer;
		margin-top: 0.5rem;
	}

	.tx-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.tx-item {
		background: rgba(255,255,255,0.02);
		border: 1px solid rgba(255,255,255,0.05);
		border-radius: 12px;
		padding: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.tx-type-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.tx-main {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.tx-type-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #fff;
	}

	.tx-date {
		font-size: 0.65rem;
		color: rgba(255,255,255,0.3);
	}

	.tx-details {
		text-align: right;
		display: flex;
		flex-direction: column;
	}

	.tx-shares {
		font-size: 0.85rem;
		font-weight: 700;
		color: #fff;
	}

	.tx-price {
		font-size: 0.7rem;
		color: rgba(255,255,255,0.4);
	}

	.tx-delete {
		background: transparent;
		border: none;
		color: rgba(239, 68, 68, 0.4);
		cursor: pointer;
		padding: 0.5rem;
	}

	.tx-delete:hover { color: #ef4444; }

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: rgba(255,255,255,0.2);
		font-size: 0.85rem;
		font-style: italic;
	}

	.manual-notice {
		text-align: center;
		padding: 2rem 1rem;
		background: rgba(255,255,255,0.02);
		border-radius: 20px;
		border: 1px dashed rgba(255,255,255,0.1);
	}

	.notice-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.manual-notice p {
		font-size: 0.9rem;
		color: rgba(255,255,255,0.7);
		line-height: 1.5;
	}

	.notice-sub {
		font-size: 0.75rem !important;
		color: rgba(255,255,255,0.4) !important;
		margin-top: 1rem;
	}
</style>