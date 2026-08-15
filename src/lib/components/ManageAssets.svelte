<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import type { Asset, AssetCategory, InstrumentType } from '$lib/types';
	import { formatPercent } from '$lib/utils';
	import { instrumentTypeOf } from '$lib/instrument-type';
	import {
		redistributeWeights,
		equalizeWeights as repartirIgual,
		roundWeight
	} from '$lib/weights';
	import { indexKeyOf, INDICES } from '$lib/lookthrough';
	import { focusTrap } from '$lib/actions/focusTrap';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { bloquearScroll, desbloquearScroll } from '$lib/modal-lock';
	import AssetSearch from './AssetSearch.svelte';
	import ImportModal from './ImportModal.svelte';
	import LedgerModal from './LedgerModal.svelte';
	import { createDragDropManager } from '$lib/stores/useDragDrop.svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let showSearch = $state(false);
	let showImport = $state(false);
	let showLedger = $state(false);
	let ledgerAsset = $state<Asset | null>(null);
	let searchCategory = $state<AssetCategory>('core');
	let editingAsset = $state<string | null>(null);
	let editName = $state('');
	let editTer = $state('');
	let editInterest = $state('');
	let editInstrumentType = $state<InstrumentType>('other');
	let editIndexKey = $state('');

	/** Los índices del dataset, ordenados por nombre para el desplegable. */
	const indexOptions = Object.entries(INDICES)
		.map(([key, definition]) => ({ key, name: definition.name }))
		.sort((a, b) => a.name.localeCompare(b.name));

	let originalState: any;

	/**
	 * El reparto de pesos vive en `$lib/weights`, no aquí. No es interfaz: decide los
	 * `targetWeight`, que son la entrada de `calculateRebalance()`. Aquí queda sólo
	 * aplicar el resultado al store y el aviso al usuario.
	 */
	const roundDec = roundWeight;

	const dnd = createDragDropManager({
		onAssetMoved: moveAssetSafely,
		getTranslation: (key) => {
			if (key === 'asset_reclassified') return $LL.toasts.asset_reclassified();
			return '';
		}
	});

	onMount(() => {
		bloquearScroll();
		originalState = {
			core: JSON.parse(JSON.stringify(portfolio.coreAssets)),
			satellite: JSON.parse(JSON.stringify(portfolio.satelliteAssets)),
			stock: JSON.parse(JSON.stringify(portfolio.stockAssets)),
			holdings: JSON.parse(JSON.stringify(portfolio.holdings))
		};
	});

	onDestroy(() => {
		desbloquearScroll();
		dnd.cleanup();
	});

	function handleCancel() {
		if (originalState) portfolio.restoreState(originalState);
		onClose();
	}

	function handleSave() {
		ui.addToast($LL.toasts.portfolio_saved(), 'success');
		ui.hapticFeedback('heavy');
		onClose();
	}

	const sections = $derived([
		{ id: 'core' as AssetCategory, label: $LL.manage.title_core(), assets: portfolio.coreAssets, description: $LL.manage.desc_core(), showWeights: true },
		{ id: 'stocks' as AssetCategory, label: $LL.manage.title_stocks(), assets: portfolio.stockAssets, description: $LL.manage.desc_stocks(), showWeights: false },
		{ id: 'satellite' as AssetCategory, label: $LL.manage.title_satellite(), assets: portfolio.satelliteAssets, description: $LL.manage.desc_satellite(), showWeights: false }
	]);

	/** Peso total del Core (debe sumar 100%) */
	const coreWeightTotal = $derived(
		portfolio.coreAssets.reduce((sum, a) => sum + a.targetWeight, 0)
	);

	const coreWeightValid = $derived(
		Math.abs(coreWeightTotal - 1) < 0.001
	);

	let lockedAssets = $state<Record<string, boolean>>({});

	function toggleLock(ticker: string) {
		lockedAssets[ticker] = !lockedAssets[ticker];
		ui.hapticFeedback('light');
	}

	function openSearch(cat: AssetCategory) {
		searchCategory = cat;
		showSearch = true;
	}

	/** Vuelca al store los pesos que ha calculado el módulo. */
	function aplicarPesos(pesos: Record<string, number>) {
		for (const [ticker, targetWeight] of Object.entries(pesos)) {
			portfolio.updateAsset(ticker, { targetWeight });
		}
	}

	function handleWeightChange(ticker: string, newPercent: number) {
		const { weights, error } = redistributeWeights(
			portfolio.coreAssets,
			ticker,
			newPercent,
			lockedAssets
		);

		if (error === 'no-free-assets') {
			ui.addToast($LL.toasts.no_free_assets(), 'error');
			return;
		}

		aplicarPesos(weights);
		ui.hapticFeedback('light');
	}

	function startEditTer(asset: Asset) {
		editingAsset = asset.ticker;
		editName = asset.name;
		editTer = (asset.ter * 100).toFixed(2);
		editInterest = ((asset.manualInterestRate ?? 0) * 100).toFixed(2);
		// Se muestra el valor deducido, no vacío: así el usuario ve qué ha
		// adivinado la app y solo tiene que intervenir si está mal.
		editInstrumentType = instrumentTypeOf(asset);
		editIndexKey = indexKeyOf(asset) ?? '';
	}

	function saveTerEdit(ticker: string) {
		const ter = parseFloat(editTer);
		const interest = parseFloat(editInterest);
		const updates: Partial<Asset> = {};

		if (editName.trim()) {
			updates.name = editName.trim();
		}

		if (!isNaN(ter) && ter >= 0) {
			updates.ter = ter / 100;
		}

		const isCash = ticker.startsWith('CASH-');
		if (isCash && !isNaN(interest)) {
			updates.manualInterestRate = interest / 100;
		}

		// El tipo de instrumento decide si la app puede proponer un traspaso sin
		// coste fiscal, así que la corrección manual manda sobre la deducción.
		updates.instrumentType = editInstrumentType;
		// Cadena vacía = «ninguno», y hay que guardarlo como `undefined` para que
		// no vuelva a deducirse solo en la siguiente carga.
		updates.indexKey = editIndexKey || undefined;

		if (Object.keys(updates).length > 0) {
			portfolio.updateAsset(ticker, updates);
		}
		editingAsset = null;
	}

	function moveAssetSafely(ticker: string, newCategory: AssetCategory) {
		const isInCore = portfolio.coreAssets.some(a => a.ticker === ticker);
		if (isInCore && newCategory !== 'core') {
			handleWeightChange(ticker, 0);
		}
		portfolio.moveAsset(ticker, newCategory);
	}

	function confirmRemove(asset: Asset) {
		if (confirm($LL.manage.confirm_delete({ name: asset.name, ticker: asset.ticker }))) {
			if (asset.category === 'core') {
				handleWeightChange(asset.ticker, 0);
			}
			portfolio.removeAsset(asset.ticker);
			ui.addToast($LL.toasts.asset_deleted(), 'info');
			ui.hapticFeedback('medium');
		}
	}

	/** Distribuir pesos equitativamente entre activos del core */
	function equalizeWeights() {
		lockedAssets = {}; // Liberar todos los candados al igualar
		if (portfolio.coreAssets.length === 0) return;

		aplicarPesos(repartirIgual(portfolio.coreAssets));
		ui.hapticFeedback('medium');
	}

	function openLedger(asset: Asset) {
		ledgerAsset = asset;
		showLedger = true;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !showSearch && !showLedger) handleCancel();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if showSearch}
	<AssetSearch category={searchCategory} onClose={() => showSearch = false} />
{/if}

{#if showImport}
	<ImportModal onClose={() => showImport = false} />
{/if}

{#if showLedger && ledgerAsset}
	<LedgerModal asset={ledgerAsset} onClose={() => { showLedger = false; ledgerAsset = null; }} />
{/if}

<div class="manage-overlay" role="dialog" aria-modal="true" aria-label={$LL.manage.title()}>
	<button class="manage-backdrop" onclick={handleCancel} aria-label={$LL.common.cancel()}></button>
	<div class="manage-panel" use:focusTrap>
		<div class="manage-header">
			<div>
				<h2 class="manage-title">⚙️ {$LL.manage.title()}</h2>
				<p class="manage-subtitle">{$LL.manage.subtitle()}</p>
			</div>
			<button class="close-btn" onclick={handleCancel} aria-label={$LL.common.cancel()}>
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div 
			class="manage-body"
			role="region"
			aria-label={$LL.manage.title()}
			bind:this={dnd.scrollContainer}
			ondragover={dnd.handleScrollDragOver}
		>
			{#each sections as section (section.id)}
				<div 
					class="section-block"
					data-section-id={section.id}
					role="region"
					aria-label={section.label}
					ondragover={(e) => {
						e.preventDefault();
						if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
					}}
					ondragenter={(e) => {
						e.preventDefault();
						(e.currentTarget as HTMLElement).classList.add('drag-over');
					}}
					ondragleave={(e) => {
						// Only remove if we're actually leaving the container, not just entering a child
						const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
						if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
							(e.currentTarget as HTMLElement).classList.remove('drag-over');
						}
					}}
					ondrop={(e) => {
						e.preventDefault();
						(e.currentTarget as HTMLElement).classList.remove('drag-over');
						if (!e.dataTransfer) return;
						const ticker = e.dataTransfer.getData('text/plain');
						if (ticker) {
							moveAssetSafely(ticker, section.id);
							ui.hapticFeedback('medium');
						}
					}}
				>
					<div class="section-head">
						<div>
							<h3 class="section-label">{section.label}</h3>
							<p class="section-desc">{section.description}</p>
						</div>
						{#if section.showWeights}
							<div class="weight-controls">
								<button class="equalize-btn" onclick={equalizeWeights} title={$LL.manage.btn_equalize_title()}>
									<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
										<line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
									</svg>
									{$LL.manage.btn_equalize()}
								</button>
								<div class="weight-indicator" class:valid={coreWeightValid} class:invalid={!coreWeightValid && coreWeightTotal > 0}>
									<span class="weight-sum">{roundDec(coreWeightTotal * 100, 1)}%</span>
									{#if coreWeightValid}
										<span class="weight-check">✓</span>
									{:else}
										<span class="weight-warn">≠ 100%</span>
									{/if}
								</div>
							</div>
						{/if}
					</div>

					<!-- Visual weight bar for Core -->
					{#if section.showWeights && section.assets.length > 0}
						<div class="weight-bar-container">
							<div class="weight-bar">
								{#each section.assets as asset (asset.ticker)}
									{@const pct = roundDec(asset.targetWeight * 100, 1)}
									{#if pct > 0}
										<div
											class="weight-bar-segment"
											style="width: {pct}%; background: {asset.color};"
											title="{asset.name}: {pct}%"
										>
											{#if pct >= 8}
												<span class="bar-label">{pct}%</span>
											{/if}
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{/if}

					<div class="asset-list">
						{#each section.assets as asset (asset.ticker)}
							<div 
								class="asset-item" 
								style="--accent: {asset.color}"
							>
								<div class="asset-view">
									<div 
										class="asset-left"
										draggable="true"
										role="button"
										tabindex="0"
										aria-label={$LL.manage.tooltip_move()}
										ondragstart={(e) => {
											if (e.dataTransfer) {
												e.dataTransfer.setData('text/plain', asset.ticker);
												e.dataTransfer.effectAllowed = 'move';
											}
											const item = (e.currentTarget as HTMLElement).closest('.asset-item');
											if (item) item.classList.add('dragging');
										}}
										ondragend={(e) => {
											const item = (e.currentTarget as HTMLElement).closest('.asset-item');
											if (item) item.classList.remove('dragging');
											dnd.handleDragEnd();
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
											}
										}}
										ontouchstart={(e) => dnd.handleTouchStart(e, asset.ticker)}
										ontouchmove={dnd.handleTouchMove}
										ontouchend={dnd.handleTouchEnd}
									>
										<div class="drag-handle">
											<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
												<circle cx="9" cy="5" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="9" cy="19" r="1.5" />
												<circle cx="15" cy="5" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="15" cy="19" r="1.5" />
											</svg>
										</div>
										<span class="asset-icon">{asset.icon}</span>
										<div class="asset-info">
											<span class="asset-name">{asset.name}</span>
											<span class="asset-ticker-meta">
												{asset.ticker}
												{#if asset.manualInterestRate !== undefined}
													<span class="asset-ter-badge">{formatPercent(asset.manualInterestRate)} TIN</span>
												{:else if asset.ter > 0}
													<span class="asset-ter-badge">{formatPercent(asset.ter)} TER</span>
												{/if}
											</span>
										</div>
									</div>
									<div class="asset-actions-mini">
										{#if editingAsset === asset.ticker}
											<div class="ter-edit-inline">
												<div class="edit-fields-stack">
													<div class="edit-field-group">
														<label class="ter-label" for="name-{asset.ticker}">{$LL.manage.label_name()}</label>
														<input
															id="name-{asset.ticker}"
															type="text"
															class="ter-input"
															style="width: 120px;"
															bind:value={editName}
															placeholder={$LL.manage.label_name()}
														/>
													</div>
													{#if asset.manualInterestRate === undefined}
														<div class="edit-field-group">
															<label class="ter-label" for="ter-{asset.ticker}">{$LL.manage.label_ter()}</label>
															<input
																id="ter-{asset.ticker}"
																type="number"
																class="ter-input"
																bind:value={editTer}
																onwheel={(e) => e.preventDefault()}
																min="0"
																step="0.01"
																inputmode="decimal"
															/>
														</div>
													{/if}
													{#if asset.ticker.startsWith('CASH-')}
														<div class="edit-field-group">
															<label class="ter-label" for="int-{asset.ticker}">{$LL.manage.label_int()}</label>
															<input
																id="int-{asset.ticker}"
																type="number"
																class="ter-input"
																bind:value={editInterest}
																onwheel={(e) => e.preventDefault()}
																min="0"
																step="0.01"
																inputmode="decimal"
															/>
														</div>
													{/if}
													<div class="edit-field-group">
														<label class="ter-label" for="itype-{asset.ticker}">
															{$LL.manage.label_instrument_type()}
														</label>
														<select
															id="itype-{asset.ticker}"
															class="ter-input"
															style="width: 130px;"
															bind:value={editInstrumentType}
														>
															<option value="fund">{$LL.manage.itype_fund()}</option>
															<option value="etf">{$LL.manage.itype_etf()}</option>
															<option value="equity">{$LL.manage.itype_equity()}</option>
															<option value="cash">{$LL.manage.itype_cash()}</option>
															<option value="other">{$LL.manage.itype_other()}</option>
														</select>
													</div>
													<div class="edit-field-group">
														<label class="ter-label" for="idx-{asset.ticker}">
															{$LL.manage.label_index()}
														</label>
														<select
															id="idx-{asset.ticker}"
															class="ter-input"
															style="width: 160px;"
															bind:value={editIndexKey}
														>
															<option value="">{$LL.manage.index_none()}</option>
															{#each indexOptions as option (option.key)}
																<option value={option.key}>{option.name}</option>
															{/each}
														</select>
													</div>
												</div>
												<div class="edit-actions-stack">
													<button class="ter-save" onclick={() => saveTerEdit(asset.ticker)}>✓</button>
													<button class="ter-cancel" onclick={() => editingAsset = null}>✕</button>
												</div>
											</div>
										{:else}
											<select
												class="action-move"
												value={section.id}
												onchange={(e) => moveAssetSafely(asset.ticker, e.currentTarget.value as any)}
												title={$LL.manage.tooltip_move()}
											>
												<option value="core">{$LL.manage.option_core_short()}</option>
												<option value="satellite">{$LL.manage.option_satellite_short()}</option>
												<option value="stocks">{$LL.manage.option_stocks_short()}</option>
											</select>
											<button class="action-ter" onclick={() => startEditTer(asset)} title={asset.ticker.startsWith('CASH-') ? $LL.manage.tooltip_config() : $LL.manage.tooltip_ter()}>
												{asset.ticker.startsWith('CASH-') ? $LL.manage.btn_config() : $LL.manage.btn_ter()}
											</button>
											<button
												id="tour-ledger"
												class="action-ledger"
												class:active={portfolio.holdings[asset.ticker]?.useLedger}
												onclick={() => openLedger(asset)}
												title={$LL.ledger.title_history()}
											>
												📜 {$LL.manage.btn_ledger()}
											</button>
										{/if}
										<button class="action-delete" onclick={() => confirmRemove(asset)} title={$LL.common.delete()}>
											<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
												<polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
											</svg>
										</button>
									</div>
								</div>

								<!-- Weight slider (only for Core) -->
								{#if section.showWeights}
									<div class="weight-slider-row">
										<div class="slider-color-dot" style="background: {asset.color};"></div>
										<button 
											class="lock-btn" 
											class:is-locked={lockedAssets[asset.ticker]}
											onclick={() => toggleLock(asset.ticker)}
											title={lockedAssets[asset.ticker] ? $LL.manage.unlock_weight() : $LL.manage.lock_weight()}
										>
											{#if lockedAssets[asset.ticker]}
												<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
													<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
												</svg>
											{:else}
												<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
													<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
													<path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
												</svg>
											{/if}
										</button>
										<input
											type="range"
											class="weight-slider"
											style="--slider-color: {asset.color};"
											min="0"
											max="100"
											step="0.5"
											disabled={lockedAssets[asset.ticker]}
											value={roundDec(asset.targetWeight * 100, 1)}
											oninput={(e) => handleWeightChange(asset.ticker, parseFloat((e.target as HTMLInputElement).value))}
										/>
										<div class="weight-value-box">
											<input
												type="number"
												class="weight-number-input"
												min="0"
												max="100"
												step="0.1"
												disabled={lockedAssets[asset.ticker]}
												value={roundDec(asset.targetWeight * 100, 1)}
												onwheel={(e) => e.preventDefault()}
												oninput={(e) => handleWeightChange(asset.ticker, parseFloat((e.target as HTMLInputElement).value) || 0)}
											/>
											<span class="weight-percent-sign">%</span>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>

					<button id="tour-add-asset" class="add-asset-btn" onclick={() => openSearch(section.id)}>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						{$LL.dashboard.add_asset()}
					</button>
				</div>
			{/each}

			<!-- Import CSV Button -->
			<div class="import-section">
				<button id="tour-import-csv" class="import-csv-btn" onclick={() => showImport = true}>
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
					</svg>
					{$LL.import.title()} (Beta)
				</button>
				<p class="import-hint">DEGIRO · Trading 212 · Interactive Brokers · MyInvestor</p>
			</div>
		</div>

		<div class="manage-footer">
			<button class="btn-save" onclick={handleSave}>
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
					<polyline points="17 21 17 13 7 13 7 21"></polyline>
					<polyline points="7 3 7 8 15 8"></polyline>
				</svg>
				{$LL.manage.btn_save()}
			</button>
		</div>
	</div>
</div>

<style>
	.manage-overlay {
		position: fixed;
		inset: 0;
		z-index: 190;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 5vh;
		animation: fadeIn 0.15s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.manage-backdrop {
		position: fixed;
		inset: 0;
		background: var(--bg-scrim);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: none;
		cursor: default;
	}

	.manage-panel {
		position: relative;
		width: 92%;
		max-width: 640px;
		max-height: 85vh;
		background: var(--bg-overlay);
		backdrop-filter: blur(40px) saturate(200%);
		-webkit-backdrop-filter: blur(40px) saturate(200%);
		border: 1px solid var(--border-subtle);
		border-radius: 24px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
		animation: slideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes slideUp {
		from { transform: translateY(20px) scale(0.97); opacity: 0; }
		to { transform: translateY(0) scale(1); opacity: 1; }
	}

	.manage-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.manage-title {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.manage-subtitle {
		font-size: 0.72rem;
		color: var(--text-muted);
		margin: 0;
	}

	.close-btn {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-card);
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: var(--bg-card-hover);
		color: var(--text-primary);
	}

	.manage-body {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.5rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	.section-block {
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		transition: all 0.2s ease;
	}

	:global(.section-block.drag-over) {
		background: rgba(59, 130, 246, 0.05);
		border-color: rgba(59, 130, 246, 0.3);
		box-shadow: 0 0 20px rgba(59, 130, 246, 0.1) inset;
	}

	.section-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.section-label {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.section-desc {
		font-size: 0.65rem;
		color: var(--text-faint);
		margin: 0;
	}

	.weight-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.equalize-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.55rem;
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		color: var(--text-muted);
		font-size: 0.62rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.equalize-btn:hover {
		background: rgba(59, 130, 246, 0.1);
		color: var(--accent-blue-ink);
		border-color: rgba(59, 130, 246, 0.2);
	}

	.weight-indicator {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.55rem;
		border-radius: 8px;
		font-size: 0.72rem;
		font-weight: 700;
	}

	.weight-indicator.valid {
		background: rgba(16, 185, 129, 0.1);
		color: var(--accent-green-ink);
	}

	.weight-indicator.invalid {
		background: rgba(245, 158, 11, 0.1);
		color: var(--accent-orange-ink);
	}

	.weight-check, .weight-warn {
		font-size: 0.65rem;
	}

	/* Weight distribution bar */
	.weight-bar-container {
		padding: 0 0.25rem;
	}

	.weight-bar {
		display: flex;
		height: 10px;
		border-radius: 6px;
		overflow: hidden;
		background: var(--bg-card-hover);
		gap: 2px;
	}

	.weight-bar-segment {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: width 0.3s ease;
		position: relative;
		min-width: 4px;
	}

	.bar-label {
		font-size: 0.5rem;
		font-weight: 800;
		color: var(--text-primary);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
		line-height: 1;
	}

	/* Asset list */
	.asset-list {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.asset-item {
		display: flex;
		flex-direction: column;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-left: 3px solid var(--accent);
		border-radius: 12px;
		padding: 0.75rem;
		gap: 0.75rem;
		position: relative;
		overflow: hidden;
		transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s, background 0.15s, border-color 0.15s;
	}

	.asset-item:hover {
		background: var(--bg-card-hover);
		border-color: var(--border-subtle);
		border-left-color: var(--accent);
	}

	:global(.asset-item.dragging) {
		opacity: 0.4;
		transform: scale(0.98);
		box-shadow: 0 5px 15px rgba(0,0,0,0.3);
	}

	.drag-handle {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.2rem;
		margin-right: -0.2rem;
		color: var(--text-faint);
		cursor: inherit;
		border-radius: 4px;
		transition: all 0.15s;
	}

	.drag-handle:hover {
		color: var(--text-secondary);
		background: var(--bg-card-hover);
	}

	.asset-view {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0;
	}

	.asset-left {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
		flex: 1;
		cursor: grab;
		padding: 0.3rem 0.5rem 0.3rem 0.3rem;
		border-radius: 8px;
		transition: all 0.2s ease;
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
	}

	.asset-left:hover {
		background: var(--bg-card);
	}

	.asset-left:active {
		cursor: grabbing;
	}

	.asset-icon {
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	.asset-info {
		min-width: 0;
	}

	.asset-name {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.asset-ticker-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.6rem;
		color: var(--text-faint);
		font-family: 'Monaco', 'Menlo', monospace;
		margin-top: 0.1rem;
	}

	.asset-ter-badge {
		padding: 0.05rem 0.3rem;
		background: var(--bg-card-hover);
		border-radius: 4px;
		color: var(--text-muted);
		font-weight: 600;
	}

	.asset-actions-mini {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.action-move {
		padding: 0.2rem 0.1rem 0.2rem 0.35rem;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-card);
		color: var(--text-muted);
		font-size: 0.58rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s;
		outline: none;
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		text-align: center;
	}

	.action-move:hover {
		background: rgba(59, 130, 246, 0.1);
		color: var(--accent-blue-ink);
		border-color: rgba(59, 130, 246, 0.2);
	}

	.action-move option {
		background: var(--bg-overlay);
		color: var(--text-primary);
		font-weight: normal;
	}

	.action-ter {
		padding: 0.2rem 0.45rem;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-card);
		color: var(--text-muted);
		font-size: 0.58rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.action-ter:hover {
		background: rgba(59, 130, 246, 0.1);
		color: var(--accent-blue-ink);
		border-color: rgba(59, 130, 246, 0.2);
	}

	.action-ledger {
		padding: 0.2rem 0.45rem;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-card);
		color: var(--text-muted);
		font-size: 0.58rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s;
	}

	.action-ledger:hover {
		background: rgba(59, 130, 246, 0.1);
		color: var(--accent-blue-ink);
		border-color: rgba(59, 130, 246, 0.2);
	}

	.action-ledger.active {
		background: rgba(139, 92, 246, 0.1);
		color: var(--accent-violet-ink);
		border-color: rgba(139, 92, 246, 0.3);
	}

	.action-delete {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-card);
		color: var(--text-faint);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}

	.action-delete:hover {
		background: rgba(239, 68, 68, 0.1);
		color: var(--state-negative);
		border-color: rgba(239, 68, 68, 0.2);
	}

	/* TER inline edit */
	.ter-edit-inline {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.ter-label {
		font-size: 0.58rem;
		color: var(--text-muted);
		font-weight: 600;
		text-transform: uppercase;
	}

	.ter-input {
		width: 55px;
		padding: 0.2rem 0.35rem;
		background: var(--bg-card-hover);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 0.75rem;
		font-weight: 600;
		outline: none;
	}

	.edit-fields-stack {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.edit-field-group {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		justify-content: flex-end;
	}

	.edit-actions-stack {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.edit-field-group {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		justify-content: flex-end;
	}

	.edit-fields-stack {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.ter-save, .ter-cancel {
		width: 24px;
		height: 24px;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: 700;
		transition: all 0.1s;
	}

	.ter-save {
		background: rgba(16, 185, 129, 0.15);
		color: var(--accent-green-ink);
	}

	.ter-cancel {
		background: rgba(239, 68, 68, 0.1);
		color: var(--state-negative);
	}

	/* ====== Weight Slider Row ====== */
	.weight-slider-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0;
	}

	.slider-color-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 6px currentColor;
	}

	.lock-btn {
		background: transparent;
		border: none;
		color: var(--text-faint);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 5px;
		border-radius: 6px;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}
	
	.lock-btn:hover {
		color: var(--text-secondary);
		background: var(--bg-card-hover);
	}
	
	.lock-btn.is-locked {
		color: var(--accent-orange-ink);
		background: rgba(245, 158, 11, 0.1);
	}

	.weight-slider:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.weight-slider {
		flex: 1;
		height: 6px;
		-webkit-appearance: none;
		appearance: none;
		background: var(--bg-card-hover);
		border-radius: 3px;
		outline: none;
		cursor: pointer;
		touch-action: pan-y pinch-zoom;
	}

	.weight-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--slider-color, var(--accent-blue));
		border: 2px solid rgba(255, 255, 255, 0.3);
		cursor: grab;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
		transition: transform 0.15s;
	}

	.weight-slider::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}

	.weight-slider::-webkit-slider-thumb:active {
		cursor: grabbing;
		transform: scale(1.2);
	}

	.weight-slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--slider-color, var(--accent-blue));
		border: 2px solid rgba(255, 255, 255, 0.3);
		cursor: grab;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}

	.weight-value-box {
		display: flex;
		align-items: center;
		gap: 0.1rem;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 0.25rem 0.15rem 0.25rem 0.35rem;
		min-width: 62px;
	}

	.weight-number-input {
		width: 38px;
		background: transparent;
		border: none;
		color: var(--text-primary);
		font-size: 0.82rem;
		font-weight: 700;
		outline: none;
		text-align: right;
		-moz-appearance: textfield;
		appearance: textfield;
	}

	.weight-number-input:disabled {
		opacity: 0.4;
		color: var(--text-faint);
		cursor: not-allowed;
	}

	.weight-number-input::-webkit-outer-spin-button,
	.weight-number-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		appearance: none;
		margin: 0;
	}

	.weight-percent-sign {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	/* Add button */
	.add-asset-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.65rem;
		background: rgba(59, 130, 246, 0.05);
		border: 1.5px dashed rgba(59, 130, 246, 0.2);
		border-radius: 12px;
		color: var(--accent-blue-ink);
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}

	.add-asset-btn:hover {
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.4);
		color: var(--accent-blue-ink);
	}

	.manage-footer {
		padding: 1.25rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-overlay);
		display: flex;
		justify-content: center;
	}

	.btn-save {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: 0.9rem;
		background: linear-gradient(135deg, var(--surface-green), var(--surface-green));
		border: none;
		border-radius: 14px;
		color: var(--text-on-accent);
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
	}

	.btn-save:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 25px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
		background: linear-gradient(135deg, var(--accent-green), var(--accent-green));
	}

	.btn-save:active {
		transform: translateY(0);
		box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
	}

	/* Scrollbar */
	.manage-body::-webkit-scrollbar {
		width: 6px;
	}
	.manage-body::-webkit-scrollbar-track {
		background: transparent;
	}
	.manage-body::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	/* Import CSV section */
	.import-section {
		margin-top: 0.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border-subtle);
		text-align: center;
	}

	.import-csv-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.7rem;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.08));
		border: 1.5px dashed rgba(139, 92, 246, 0.25);
		border-radius: 12px;
		color: var(--accent-violet-ink);
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}

	.import-csv-btn:hover {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.12));
		border-color: rgba(139, 92, 246, 0.45);
		color: var(--accent-violet-ink);
	}

	.import-hint {
		font-size: 0.6rem;
		color: var(--text-faint);
		margin: 0.4rem 0 0;
	}

	@media (max-width: 480px) {
		.asset-view {
			flex-direction: column;
			align-items: stretch;
			gap: 0.6rem;
		}

		.asset-left {
			width: 100%;
			padding: 0;
		}

		.asset-actions-mini {
			justify-content: flex-end;
			border-top: 1px solid var(--border-subtle);
			padding-top: 0.5rem;
			gap: 0.4rem;
			width: 100%;
		}

		.action-move, .action-ter, .action-ledger, .action-delete {
			padding: 0.35rem 0.55rem;
			font-size: 0.68rem;
			height: auto;
			display: inline-flex;
			align-items: center;
		}

		.action-delete {
			width: 32px;
			height: 32px;
			border-radius: 8px;
		}
	}
</style>
