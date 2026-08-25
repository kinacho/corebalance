<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import type { Asset, Transaction, TransactionType } from '$lib/types';
	import { formatEUR, formatCurrency, formatDate } from '$lib/utils';
	import { fade, slide, fly } from 'svelte/transition';
	import { onMount, onDestroy, untrack } from 'svelte';
	import { bloquearScroll, desbloquearScroll } from '$lib/modal-lock';
	import { focusTrap } from '$lib/actions/focusTrap';
	import FichaDelActivo from './FichaDelActivo.svelte';
	import { LL, locale } from '$lib/i18n/i18n-svelte';

	interface Props {
		asset: Asset;
		onClose: () => void;
	}

	let { asset, onClose }: Props = $props();

	/**
	 * ⚠️ Aquí había un `onDestroy` **vacío**, con un comentario explicando que no
	 * había que soltar el bloqueo porque `ManageAssets` sigue detrás. Cierto solo
	 * en uno de los tres sitios desde los que se abre este modal: desde
	 * `AssetCard` y `CompactAssetRow` no hay nada detrás, así que al cerrarlo el
	 * `body` se quedaba con `overflow: hidden; height: 100vh` y el dashboard sin
	 * scroll y recortado. Ahora se cuenta, ver `modal-lock.ts`.
	 */
	onMount(() => bloquearScroll());
	onDestroy(() => desbloquearScroll());

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

	/**
	 * ⚠️ **El calendario se cierra con un listener en `window`, no con una capa.**
	 *
	 * Antes había un `.date-picker-backdrop` con `position: fixed; inset: 0` y
	 * `z-index: 10` viviendo *dentro* del panel. No hay ningún ancestro con
	 * `transform`/`filter` que lo acote, así que eran los 100vw × 100vh de verdad,
	 * por encima de todo el modal: con el calendario abierto lo **único** clicable
	 * de la pantalla era el propio calendario. El primer clic en «Guardar
	 * Transacción», en cualquier campo o en el fondo del modal no hacía más que
	 * cerrar el calendario, y hacía falta un segundo clic para todo lo demás.
	 *
	 * Es el patrón que este repo ya resuelve bien en `Header.svelte` con el menú de
	 * usuario, y en `Toast.svelte` con `pointer-events: none`. `pointerdown` va
	 * antes que `click`, así que el calendario se cierra **y** el clic llega a su
	 * destino. La guarda de `#tx-date` evita que el propio campo lo cierre y lo
	 * vuelva a abrir en el mismo gesto.
	 */
	function cerrarCalendarioFuera(e: PointerEvent) {
		if (!showDatePicker) return;
		const destino = e.target as HTMLElement | null;
		if (destino?.closest('.date-picker') || destino?.closest('#tx-date')) return;
		showDatePicker = false;
	}

	/**
	 * Escape, que este modal era el único de los cinco en no tener.
	 *
	 * ⚠️ Con precedencia: primero el calendario y **solo** el calendario. Los
	 * handlers de `window` no se consumen entre sí, así que sin este `return` un
	 * único Escape cerraría los tres niveles apilados (`ManageAssets` → este modal
	 * → el calendario). Por el otro lado, la guarda `!showLedger` de
	 * `ManageAssets` —que hasta ahora era inerte, porque aquí no había Escape— es
	 * la que evita que este cierre arrastre también al panel de gestión.
	 */
	function alPulsarTecla(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		if (showDatePicker) {
			showDatePicker = false;
			return;
		}
		onClose();
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

	/**
	 * ⚠️ **Este efecto reinicia el formulario, así que solo puede dispararse cuando
	 * de verdad cambia el activo — y durante meses se disparó en cada sondeo de
	 * precios, cerrando el formulario y borrando lo que estabas escribiendo.**
	 *
	 * El comentario anterior decía que el `untrack()` de abajo impedía justo eso.
	 * Es falso, y en la dirección peor: `untrack()` protege los *valores* que se
	 * leen dentro (`defaultPrice`, `defaultCurrency`), no la dependencia del prop
	 * `asset`. Y `asset` no es un objeto suelto, es el final de esta cadena:
	 *
	 *   asset  ←  AssetCard position.asset  ←  {#each portfolioState.positions}
	 *
	 * O sea que la dependencia real del efecto es la fuente del `{#each}`, no el
	 * objeto `Asset`. Cada recálculo de `portfolioState` escribe un `position`
	 * nuevo ahí y el efecto vuelve a correr, aunque `position.asset` sea
	 * exactamente el mismo objeto. `fetchPrices()` lo recalcula cada 30 s.
	 *
	 * La guarda es por **valor**, entonces: solo se reinicia si el ticker cambió.
	 * Con eso el formulario queda inmune a cualquier recálculo del store, no solo
	 * al que se identificó. `tickerMostrado` no es `$state` a propósito — nadie lo
	 * pinta, y como estado reactivo leerlo y escribirlo aquí sería un ciclo.
	 *
	 * Sigue haciendo falta reiniciar de verdad: desde `ManageAssets` este modal
	 * cambia de activo sin remontarse (allí el prop es un `$state` local), que es
	 * también la razón de que el fallo solo se viera desde la tarjeta y la fila.
	 */
	let tickerMostrado = untrack(() => asset.ticker);

	/**
	 * Dos pestañas, y **«ficha» por defecto**: entender qué tienes sirve a
	 * cualquiera que abra esto, mientras que el libro solo lo usa quien lleva
	 * registro de sus compras. Antes lo primero que veías al abrir un activo era el
	 * interruptor de modo libro, que para la mayoría no significa nada.
	 */
	type Pestana = 'ficha' | 'libro';
	let pestana = $state<Pestana>('ficha');

	$effect(() => {
		const ticker = asset.ticker;
		if (ticker === tickerMostrado) return;
		tickerMostrado = ticker;
		// ⚠️ La pestaña se reinicia aquí por el mismo motivo que el formulario: desde
		// `ManageAssets` este modal cambia de activo sin remontarse, así que un
		// estado que no entre en este bloque se queda con lo del activo anterior.
		pestana = 'ficha';
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
			ui.addToast($LL.toasts.transaction_updated(), 'success');
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

<svelte:window onkeydown={alPulsarTecla} onpointerdown={cerrarCalendarioFuera} />

<div class="ledger-overlay" transition:fade={{ duration: 150 }}>
	<button class="ledger-backdrop" onclick={onClose} aria-label={$LL.common.close()}></button>

	<!--
		⚠️ `use:focusTrap` va en el **panel**, no en el overlay, igual que en
		`ImportModal`: el fondo de cierre es un `<button>` y en el overlay sería el
		primer elemento enfocable, o sea que abrir el modal dejaría el foco sobre
		«cerrar». Limitación conocida de la acción, común a los cinco modales:
		fotografía los elementos enfocables al montar, así que el formulario de alta
		—que aparece después— queda fuera del ciclo de tabulación.
	-->
	<div
		class="ledger-panel"
		transition:fly={{ y: 20, duration: 200 }}
		use:focusTrap
		role="dialog"
		aria-modal="true"
		aria-labelledby="ledger-title"
	>
		<div class="ledger-header" style="--accent: {asset.color}">
			<div class="asset-brand">
				<span class="asset-icon">{asset.icon}</span>
				<div>
					<h2 class="asset-name" id="ledger-title">{asset.name}</h2>
					<p class="asset-ticker">{asset.ticker}</p>
				</div>
			</div>
			<button class="close-btn" onclick={onClose}>✕</button>
		</div>

		<div class="pestanas" role="tablist">
			<button
				class="pestana"
				class:activa={pestana === 'ficha'}
				role="tab"
				aria-selected={pestana === 'ficha'}
				onclick={() => (pestana = 'ficha')}
			>
				{$LL.ficha.tab_ficha()}
			</button>
			<button
				class="pestana"
				class:activa={pestana === 'libro'}
				role="tab"
				aria-selected={pestana === 'libro'}
				onclick={() => (pestana = 'libro')}
			>
				{$LL.ficha.tab_libro()}
			</button>
		</div>

		<div class="ledger-body">
			{#if pestana === 'ficha'}
				<FichaDelActivo {asset} onVerLibro={() => (pestana = 'libro')} />
			{:else}
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
								<h4 class="form-title">{$LL.ledger.title_edit_tx()}</h4>
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
										<input id="tx-currency" type="text" class="currency-input" bind:value={newTx.currency} maxlength="3" disabled title={$LL.ledger.title_currency_from_asset()} />
										<input type="number" step="0.0001" class="fx-input" bind:value={newTx.fxRate} title={$LL.ledger.title_fx_rate()} />
									</div>
								</div>
							</div>

							<button class="submit-tx-btn" onclick={submitTransaction}>
								{editingTxId ? $LL.ledger.btn_save_changes() : $LL.ledger.btn_save_tx()}
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
		background: var(--bg-scrim);
		backdrop-filter: blur(4px);
		border: none;
		width: 100%;
		height: 100%;
	}

	.ledger-panel {
		position: relative;
		width: 100%;
		max-width: 500px;
		background: var(--bg-overlay);
		border: 1px solid var(--border-subtle);
		border-radius: 24px;
		overflow: hidden;
		box-shadow: 0 30px 60px rgba(0,0,0,0.8);
		display: flex;
		flex-direction: column;
		max-height: 90vh;
	}

	.ledger-header {
		padding: 1.5rem;
		border-bottom: 1px solid var(--border-subtle);
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
		color: var(--text-primary);
		margin: 0;
	}

	.asset-ticker {
		font-size: 0.8rem;
		color: var(--text-faint);
		margin: 0;
		font-family: monospace;
	}

	.close-btn {
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		width: 32px;
		height: 32px;
		border-radius: 8px;
		cursor: pointer;
	}

	.pestanas {
		display: flex;
		gap: 0.25rem;
		padding: 0 1.5rem;
		border-bottom: 1px solid var(--border-subtle);
		/* No se encoge: es el control que decide qué se ve debajo. */
		flex-shrink: 0;
	}

	.pestana {
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		padding: 0.7rem 0.9rem;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-muted);
		cursor: pointer;
		transition: color 0.2s, border-color 0.2s;
	}

	.pestana:hover {
		color: var(--text-secondary);
	}

	/*
	 * La pestaña activa se marca con el subrayado **y** con el color del texto: dos
	 * canales, porque solo con el color quedaría a merced de la discriminación de
	 * tono, que es la regla que este proyecto aplica en los gráficos.
	 */
	.pestana.activa {
		color: var(--text-primary);
		border-bottom-color: var(--accent-blue);
	}

	.ledger-body {
		padding: 1.5rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.mode-selector {
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
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
		color: var(--text-primary);
		display: block;
	}

	.mode-desc {
		font-size: 0.75rem;
		color: var(--text-faint);
		margin: 0.2rem 0 0;
	}

	.toggle-btn {
		background: var(--accent-blue);
		color: var(--text-on-accent);
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
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		padding: 0.75rem;
		border-radius: 12px;
		text-align: center;
	}

	.stat-label {
		display: block;
		font-size: 0.65rem;
		color: var(--text-faint);
		text-transform: uppercase;
		margin-bottom: 0.2rem;
	}

	.stat-value {
		font-weight: 700;
		font-size: 0.9rem;
		color: var(--text-primary);
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
		color: var(--text-primary);
	}

	.add-tx-btn {
		background: var(--bg-card-hover);
		border: 1px dashed rgba(255,255,255,0.2);
		color: var(--text-primary);
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.add-tx-form {
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-title {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--accent-blue-ink);
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
		color: var(--text-faint);
		font-weight: 600;
	}

	.form-group input, .form-group select {
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 0.5rem;
		color: var(--text-primary);
		font-size: 0.85rem;
	}

	.fx-group {
		display: flex;
		gap: 0.25rem;
	}

	.currency-input { width: 45px !important; text-align: center; }
	.fx-input { flex: 1; }

	.submit-tx-btn {
		background: var(--surface-green);
		color: var(--text-on-accent);
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
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tx-item:hover {
		background: var(--bg-card-hover);
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
		color: var(--text-primary);
	}

	.tx-date {
		font-size: 0.65rem;
		color: var(--text-faint);
	}

	.tx-details {
		text-align: right;
		display: flex;
		flex-direction: column;
	}

	.tx-shares {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.tx-price {
		font-size: 0.7rem;
		color: var(--text-faint);
	}

	.tx-delete {
		background: transparent;
		border: none;
		color: var(--state-negative);
		cursor: pointer;
		padding: 0.5rem;
	}

	.tx-delete:hover { color: var(--state-negative); }

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--text-faint);
		font-size: 0.85rem;
		font-style: italic;
	}

	.manual-notice {
		text-align: center;
		padding: 2rem 1rem;
		background: var(--bg-card);
		border-radius: 20px;
		border: 1px dashed rgba(255,255,255,0.1);
	}

	.notice-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.manual-notice p {
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.notice-sub {
		font-size: 0.75rem !important;
		color: var(--text-faint) !important;
		margin-top: 1rem;
	}

	.date-picker {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 11;
		background: var(--bg-overlay);
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
		color: var(--text-primary);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		font-size: 1rem;
	}
	.picker-header button:hover { background: var(--bg-card-hover); }
	.picker-title { font-weight: 600; font-size: 0.85rem; text-transform: capitalize; flex: 1; text-align: center; }
	.picker-weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		font-size: 0.65rem;
		color: var(--text-faint);
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
		color: var(--text-secondary);
		background: none;
		border: none;
		cursor: pointer;
	}
	.day-btn:hover { background: rgba(255,255,255,0.1); }
	.day-btn.selected { background: var(--accent-blue); color: var(--text-on-accent); font-weight: 700; }
	.picker-months, .picker-years {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
	}
	.month-btn, .year-btn {
		padding: 0.4rem;
		border-radius: 6px;
		font-size: 0.8rem;
		color: var(--text-secondary);
		background: none;
		border: none;
		cursor: pointer;
		text-align: center;
	}
	.month-btn:hover, .year-btn:hover { background: rgba(255,255,255,0.1); }
	.month-btn.selected, .year-btn.selected { background: var(--accent-blue); color: var(--text-on-accent); font-weight: 700; }
</style>