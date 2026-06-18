<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import type { Asset, Transaction, TransactionType } from '$lib/types';
	import { formatEUR, formatCurrency, formatDate } from '$lib/utils';
	import { fade, slide, fly } from 'svelte/transition';
	import { onMount, onDestroy, untrack } from 'svelte';
	import { LL, locale } from '$lib/i18n/i18n-svelte';

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
	
	let showDatePicker = $state(false);
	let pickerStep = $state<'day' | 'month' | 'year'>('day');
	let pickerViewDate = $state(new Date());

	function openDatePicker() {
		pickerViewDate = new Date(newTx.date || Date.now());
		pickerStep = 'day';
		showDatePicker = true;
	}

	function selectYear(y: number) {
		pickerViewDate = new Date(y, pickerViewDate.getMonth(), 1);
		pickerStep = 'month';
	}

	function selectMonth(m: number) {
		pickerViewDate = new Date(pickerViewDate.getFullYear(), m, 1);
		pickerStep = 'day';
	}

	function selectDay(d: number) {
		newTx.date = new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth(), d).getTime();
		showDatePicker = false;
	}

	function getDaysInMonth(year: number, month: number) {
		return new Date(year, month + 1, 0).getDate();
	}

	function getFirstDayOfWeek(year: number, month: number) {
		return (new Date(year, month, 1).getDay() + 6) % 7;
	}
	
	// Usar $derived para que los valores por defecto del formulario reaccionen al cambio de activo
	const defaultPrice = $derived(portfolio.prices[asset.ticker]?.price || 0);
	const defaultCurrency = $derived(portfolio.prices[asset.ticker]?.currency || ui.baseCurrency);

	let editingTxId = $state<string | null>(null);

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

	// Inicializar valores cuando cambia el activo o se abre el formulario.
	// Se usa untrack() para leer defaultPrice/defaultCurrency sin crear dependencia
	// reactiva en ellos: así el polling de precios (cada 30s) NO re-dispara este
	// efecto y no borra el historial ni resetea el formulario mientras está abierto.
	$effect(() => {
		if (asset.ticker) {
			editingTxId = null;
			showAddForm = false;
			newTx = {
				type: 'buy',
				date: Date.now(),
				shares: 0,
				price: untrack(() => defaultPrice),
				currency: untrack(() => defaultCurrency),
				fees: 0,
				fxRate: 1,
				notes: ''
			};
		}
	});

	$effect(() => {
		if (showAddForm && !editingTxId) {
			newTx.price = untrack(() => defaultPrice);
			newTx.currency = untrack(() => defaultCurrency);
		}
	});

	const ledgerSummary = $derived(portfolio.ledgerHoldings[asset.ticker] || { shares: 0, avgCost: 0 });

	function toggleMode() {
		useLedger = !useLedger;
		portfolio.toggleLedger(asset.ticker, useLedger);
		ui.hapticFeedback('medium');
	}

	function cancelForm() {
		showAddForm = false;
		editingTxId = null;
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

	function submitTransaction() {
		if (!newTx.shares || newTx.shares <= 0) {
			ui.addToast($LL.toasts.shares_greater_than_zero(), 'error');
			return;
		}

		if (editingTxId) {
			portfolio.updateTransaction(editingTxId, {
				type: newTx.type as TransactionType,
				date: newTx.date || Date.now(),
				shares: newTx.shares || 0,
				price: newTx.price || 0,
				currency: newTx.currency || 'EUR',
				fees: newTx.fees || 0,
				fxRate: newTx.fxRate || 1,
				notes: newTx.notes
			});
			ui.addToast('Transacción modificada con éxito', 'success');
		} else {
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
			ui.addToast($LL.toasts.transaction_added(), 'success');
		}

		showAddForm = false;
		editingTxId = null;
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

	function startEdit(tx: Transaction) {
		editingTxId = tx.id;
		newTx = {
			type: tx.type,
			date: tx.date,
			shares: tx.shares,
			price: tx.price,
			currency: tx.currency,
			fees: tx.fees,
			fxRate: tx.fxRate,
			notes: tx.notes || ''
		};
		showAddForm = true;
		ui.hapticFeedback('light');
	}

	function removeTx(id: string) {
		if (confirm($LL.ledger.confirm_delete())) {
			portfolio.removeTransaction(id);
			if (editingTxId === id) {
				cancelForm();
			}
			ui.addToast($LL.toasts.transaction_deleted(), 'info');
		}
	}

	const typeLabels = $derived<Record<TransactionType, string>>({
		buy: $LL.ledger.type_buy(),
		sell: $LL.ledger.type_sell(),
		dividend: $LL.ledger.type_dividend(),
		transfer: $LL.ledger.type_transfer(),
		initial_balance: $LL.ledger.type_initial_balance()
	});

	const typeColors: Record<TransactionType, string> = {
		buy: '#10b981',
		sell: '#ef4444',
		dividend: '#f59e0b',
		transfer: '#3b82f6',
		initial_balance: '#a78bfa'
	};
</script>

<div class="ledger-overlay" transition:fade={{ duration: 150 }}>
	<button class="ledger-backdrop" onclick={onClose} aria-label={$LL.common.close()}></button>
	
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
					<span class="mode-title">{useLedger ? '✅ ' + $LL.ledger.active() : '⚪ ' + $LL.ledger.manual()}</span>
					<p class="mode-desc">
						{#if useLedger}
							{$LL.ledger.desc_active()}
						{:else}
							{$LL.ledger.desc_manual()}
						{/if}
					</p>
				</div>
				<button class="toggle-btn" onclick={toggleMode}>
					{useLedger ? $LL.ledger.btn_deactivate() : $LL.ledger.btn_activate()}
				</button>
			</div>

			{#if useLedger}
				<div class="stats-grid" in:slide>
					<div class="stat-card">
						<span class="stat-label">{$LL.ledger.label_shares()}</span>
						<span class="stat-value">{ledgerSummary.shares.toLocaleString()}</span>
					</div>
					<div class="stat-card">
						<span class="stat-label">{$LL.dashboard.avg_cost()}</span>
						<span class="stat-value">{formatCurrency(ledgerSummary.avgCost, defaultCurrency)}</span>
					</div>
					<div class="stat-card">
						<span class="stat-label">{$LL.dashboard.value_total()}</span>
						<span class="stat-value">{formatCurrency(ledgerSummary.shares * defaultPrice, defaultCurrency)}</span>
					</div>
				</div>

				<div class="transactions-section">
					<div class="section-header">
						<h3>{$LL.ledger.title_history()}</h3>
						<button class="add-tx-btn" onclick={() => { if (showAddForm) { cancelForm(); } else { showAddForm = true; } }}>
							{showAddForm ? $LL.common.cancel() : $LL.ledger.btn_add_tx()}
						</button>
					</div>

					{#if showAddForm}
						<div class="add-tx-form" transition:slide>
							{#if editingTxId}
								<h4 class="form-title">Editar Transacción</h4>
							{/if}
							<div class="form-row">
								<div class="form-group">
									<label for="tx-type">{$LL.ledger.label_type()}</label>
									<select id="tx-type" bind:value={newTx.type}>
										<option value="buy">{$LL.ledger.type_buy()}</option>
										<option value="sell">{$LL.ledger.type_sell()}</option>
										<option value="dividend">{$LL.ledger.type_dividend()}</option>
										<option value="initial_balance">{$LL.ledger.type_initial_balance()}</option>
										<option value="transfer">{$LL.ledger.type_transfer()}</option>
									</select>
								</div>
								<div class="form-group" style="position: relative;">
									<label for="tx-date">{$LL.ledger.label_date()}</label>
									<input
										id="tx-date"
										type="text"
										readonly
										value={new Date(newTx.date || Date.now()).toLocaleDateString($locale === 'es' ? 'es-ES' : 'en-US')}
										onclick={openDatePicker}
										style="cursor: pointer;"
									/>

									{#if showDatePicker}
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div 
											class="date-picker-backdrop" 
											onclick={() => showDatePicker = false}
											onkeydown={(e) => e.key === 'Escape' && (showDatePicker = false)}
											role="presentation"
										></div>
										<div class="date-picker">

											{#if pickerStep === 'day'}
												<div class="picker-header">
													<button onclick={() => { pickerViewDate = new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth() - 1, 1); }}>‹</button>
													<button class="picker-title" onclick={() => pickerStep = 'month'}>
														{pickerViewDate.toLocaleDateString($locale === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
													</button>
													<button onclick={() => { pickerViewDate = new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth() + 1, 1); }}>›</button>
												</div>
												<div class="picker-weekdays">
													{#each ($locale === 'es' ? ['L','M','X','J','V','S','D'] : ['M','T','W','T','F','S','S']) as d}<span>{d}</span>{/each}
												</div>
												<div class="picker-days">
													{#each Array(getFirstDayOfWeek(pickerViewDate.getFullYear(), pickerViewDate.getMonth())).fill(null) as _}
														<span></span>
													{/each}
													{#each Array(getDaysInMonth(pickerViewDate.getFullYear(), pickerViewDate.getMonth())).fill(0).map((_, i) => i + 1) as day}
														<button
															class="day-btn"
															class:selected={new Date(newTx.date || 0).toDateString() === new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth(), day).toDateString()}
															onclick={() => selectDay(day)}
														>{day}</button>
													{/each}
												</div>

											{:else if pickerStep === 'month'}
												<div class="picker-header">
													<button onclick={() => { pickerViewDate = new Date(pickerViewDate.getFullYear() - 1, pickerViewDate.getMonth(), 1); }}>‹</button>
													<button class="picker-title" onclick={() => pickerStep = 'year'}>{pickerViewDate.getFullYear()}</button>
													<button onclick={() => { pickerViewDate = new Date(pickerViewDate.getFullYear() + 1, pickerViewDate.getMonth(), 1); }}>›</button>
												</div>
												<div class="picker-months">
													{#each ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'] as m, i}
														<button
															class="month-btn"
															class:selected={pickerViewDate.getMonth() === i}
															onclick={() => selectMonth(i)}
														>{m}</button>
													{/each}
												</div>

											{:else if pickerStep === 'year'}
												<div class="picker-header">
													<span class="picker-title">Selecciona año</span>
												</div>
												<div class="picker-years">
													{#each Array(12).fill(0).map((_, i) => new Date().getFullYear() - 5 + i) as year}
														<button
															class="year-btn"
															class:selected={pickerViewDate.getFullYear() === year}
															onclick={() => selectYear(year)}
														>{year}</button>
													{/each}
												</div>
											{/if}

										</div>
									{/if}
								</div>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label for="tx-shares">{$LL.ledger.label_shares()}</label>
									<input id="tx-shares" type="number" step="0.001" bind:value={newTx.shares} />
								</div>
								<div class="form-group">
									<label for="tx-price">{$LL.ledger.label_price()}</label>
									<input id="tx-price" type="number" step="0.0001" bind:value={newTx.price} />
								</div>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label for="tx-fees">{$LL.ledger.label_fees()}</label>
									<input id="tx-fees" type="number" step="0.01" bind:value={newTx.fees} />
								</div>
								<div class="form-group">
									<label for="tx-currency">{$LL.ledger.label_currency()}</label>
									<div class="fx-group">
										<input id="tx-currency" type="text" class="currency-input" bind:value={newTx.currency} maxlength="3" disabled title="La divisa está determinada por el activo" />
										<input type="number" step="0.0001" class="fx-input" bind:value={newTx.fxRate} title={$LL.ledger.title_fx_rate()} />
									</div>
								</div>
							</div>

							<button class="submit-tx-btn" onclick={submitTransaction}>
								{editingTxId ? 'Guardar Cambios' : $LL.ledger.btn_save_tx()}
							</button>
						</div>
					{/if}

					<div class="tx-list">
						{#if transactions.length === 0}
							<div class="empty-state">{$LL.ledger.empty_history()}</div>
						{:else}
							{#each transactions as tx (tx.id)}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="tx-item" class:tx-item-editing={editingTxId === tx.id} onclick={() => startEdit(tx)} in:slide>
									<div class="tx-type-dot" style="background: {typeColors[tx.type]}"></div>
									<div class="tx-main">
										<span class="tx-type-label">{typeLabels[tx.type]}</span>
										<span class="tx-date">{new Date(tx.date).toLocaleDateString()}</span>
									</div>
									<div class="tx-details">
										<span class="tx-shares">{tx.shares > 0 ? '+' : ''}{tx.shares}</span>
										<span class="tx-price">{formatCurrency(tx.price, tx.currency)}</span>
									</div>
									<button class="tx-delete" onclick={(e) => { e.stopPropagation(); removeTx(tx.id); }}>✕</button>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{:else}
				<div class="manual-notice">
					<div class="notice-icon">ℹ️</div>
					<p>{@html $LL.ledger.notice_manual({ bold: `<b>${$LL.ledger.notice_manual_bold()}</b>` })}</p>
					<p class="notice-sub">{@html $LL.ledger.notice_manual_sub({ bold: `<b>${$LL.ledger.notice_manual_sub_bold()}</b>` })}</p>
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

	.form-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: #3b82f6;
		margin: 0 0 0.25rem 0;
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
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tx-item:hover {
		background: rgba(255,255,255,0.06);
		border-color: rgba(255,255,255,0.15);
	}

	.tx-item.tx-item-editing {
		background: rgba(59, 130, 246, 0.15);
		border-color: rgba(59, 130, 246, 0.4);
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

	.date-picker-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10;
	}
	.date-picker {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 11;
		background: #0a0a18;
		border: 1px solid rgba(255,255,255,0.15);
		border-radius: 12px;
		padding: 0.75rem;
		width: 240px;
		box-shadow: 0 8px 32px rgba(0,0,0,0.6);
	}
	.picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}
	.picker-header button {
		background: none;
		border: none;
		color: #fff;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		font-size: 1rem;
	}
	.picker-header button:hover { background: rgba(255,255,255,0.08); }
	.picker-title { font-weight: 600; font-size: 0.85rem; text-transform: capitalize; flex: 1; text-align: center; }
	.picker-weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		font-size: 0.65rem;
		color: rgba(255,255,255,0.3);
		margin-bottom: 0.25rem;
	}
	.picker-days {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}
	.day-btn {
		aspect-ratio: 1;
		border-radius: 6px;
		font-size: 0.75rem;
		color: rgba(255,255,255,0.8);
		background: none;
		border: none;
		cursor: pointer;
	}
	.day-btn:hover { background: rgba(255,255,255,0.1); }
	.day-btn.selected { background: #3b82f6; color: #fff; font-weight: 700; }
	.picker-months, .picker-years {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
	}
	.month-btn, .year-btn {
		padding: 0.4rem;
		border-radius: 6px;
		font-size: 0.8rem;
		color: rgba(255,255,255,0.8);
		background: none;
		border: none;
		cursor: pointer;
		text-align: center;
	}
	.month-btn:hover, .year-btn:hover { background: rgba(255,255,255,0.1); }
	.month-btn.selected, .year-btn.selected { background: #3b82f6; color: #fff; font-weight: 700; }
</style>