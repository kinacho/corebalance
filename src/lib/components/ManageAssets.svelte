<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import type { Asset, AssetCategory } from '$lib/types';
	import { formatPercent } from '$lib/utils';
	import { focusTrap } from '$lib/actions/focusTrap';
	import { onMount } from 'svelte';
	import AssetSearch from './AssetSearch.svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let showSearch = $state(false);
	let searchCategory = $state<AssetCategory>('core');
	let editingAsset = $state<string | null>(null);
	let editTer = $state('');

	let originalState: any;

	onMount(() => {
		originalState = {
			core: JSON.parse(JSON.stringify(portfolio.coreAssets)),
			satellite: JSON.parse(JSON.stringify(portfolio.satelliteAssets)),
			stock: JSON.parse(JSON.stringify(portfolio.stockAssets)),
			holdings: JSON.parse(JSON.stringify(portfolio.holdings))
		};
	});

	function handleCancel() {
		if (originalState) portfolio.restoreState(originalState);
		onClose();
	}

	function handleSave() {
		ui.addToast('Cartera guardada correctamente', 'success');
		ui.hapticFeedback('heavy');
		onClose();
	}

	const sections = $derived([
		{ id: 'core' as AssetCategory, label: 'Cartera Principal', assets: portfolio.coreAssets, description: 'Activos con peso objetivo para rebalanceo', showWeights: true },
		{ id: 'satellite' as AssetCategory, label: 'Cartera Conservadora', assets: portfolio.satelliteAssets, description: 'Renta fija, monetarios, mixtos', showWeights: false },
		{ id: 'stocks' as AssetCategory, label: 'Acciones Individuales', assets: portfolio.stockAssets, description: 'Acciones y posiciones especulativas', showWeights: false }
	]);

	/** Peso total del Core (debe sumar 100%) */
	const coreWeightTotal = $derived(
		portfolio.coreAssets.reduce((sum, a) => sum + a.targetWeight, 0)
	);

	const coreWeightValid = $derived(
		Math.abs(coreWeightTotal - 1) < 0.005
	);

	function openSearch(cat: AssetCategory) {
		searchCategory = cat;
		showSearch = true;
	}

	function handleWeightChange(ticker: string, newPercent: number) {
		const clamped = Math.max(0, Math.min(100, newPercent));
		portfolio.updateAsset(ticker, { targetWeight: clamped / 100 });
		ui.hapticFeedback('light');
	}

	function startEditTer(asset: Asset) {
		editingAsset = asset.ticker;
		editTer = (asset.ter * 100).toFixed(2);
	}

	function saveTerEdit(ticker: string) {
		const ter = parseFloat(editTer);
		if (!isNaN(ter) && ter >= 0) {
			portfolio.updateAsset(ticker, { ter: ter / 100 });
		}
		editingAsset = null;
	}

	function confirmRemove(asset: Asset) {
		if (confirm(`¿Eliminar "${asset.name}" (${asset.ticker}) de tu cartera?`)) {
			portfolio.removeAsset(asset.ticker);
			ui.addToast('Activo eliminado', 'info');
			ui.hapticFeedback('medium');
		}
	}

	/** Distribuir pesos equitativamente entre activos del core */
	function equalizeWeights() {
		const count = portfolio.coreAssets.length;
		if (count === 0) return;
		const baseWeight = Math.floor(100 / count);
		const remainder = 100 - (baseWeight * count);
		portfolio.coreAssets.forEach((asset, i) => {
			const w = i === 0 ? baseWeight + remainder : baseWeight;
			portfolio.updateAsset(asset.ticker, { targetWeight: w / 100 });
		});
		ui.hapticFeedback('medium');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !showSearch) handleCancel();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if showSearch}
	<AssetSearch category={searchCategory} onClose={() => showSearch = false} />
{/if}

<div class="manage-overlay" role="dialog" aria-modal="true" aria-label="Gestionar activos">
	<button class="manage-backdrop" onclick={handleCancel} aria-label="Cerrar"></button>
	<div class="manage-panel" use:focusTrap>
		<div class="manage-header">
			<div>
				<h2 class="manage-title">⚙️ Gestionar Cartera</h2>
				<p class="manage-subtitle">Añade, elimina y configura los activos de tu portfolio</p>
			</div>
			<button class="close-btn" onclick={handleCancel} aria-label="Cancelar">
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div class="manage-body">
			{#each sections as section (section.id)}
				<div class="section-block">
					<div class="section-head">
						<div>
							<h3 class="section-label">{section.label}</h3>
							<p class="section-desc">{section.description}</p>
						</div>
						{#if section.showWeights}
							<div class="weight-controls">
								<button class="equalize-btn" onclick={equalizeWeights} title="Repartir equitativamente">
									<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
										<line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
									</svg>
									Igualar
								</button>
								<div class="weight-indicator" class:valid={coreWeightValid} class:invalid={!coreWeightValid && coreWeightTotal > 0}>
									<span class="weight-sum">{Math.round(coreWeightTotal * 100)}%</span>
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
									{@const pct = Math.round(asset.targetWeight * 100)}
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
							<div class="asset-item" style="--accent: {asset.color}">
								<div class="asset-view">
									<div class="asset-left">
										<span class="asset-icon">{asset.icon}</span>
										<div class="asset-info">
											<span class="asset-name">{asset.name}</span>
											<span class="asset-ticker-meta">
												{asset.ticker}
												{#if asset.ter > 0}
													<span class="asset-ter-badge">{formatPercent(asset.ter)} TER</span>
												{/if}
											</span>
										</div>
									</div>
									<div class="asset-actions-mini">
										{#if editingAsset === asset.ticker}
											<div class="ter-edit-inline">
												<label class="ter-label" for="ter-{asset.ticker}">TER %</label>
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
												<button class="ter-save" onclick={() => saveTerEdit(asset.ticker)}>✓</button>
												<button class="ter-cancel" onclick={() => editingAsset = null}>✕</button>
											</div>
										{:else}
											<button class="action-ter" onclick={() => startEditTer(asset)} title="Editar TER">
												TER
											</button>
										{/if}
										<button class="action-delete" onclick={() => confirmRemove(asset)} title="Eliminar">
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
										<input
											type="range"
											class="weight-slider"
											style="--slider-color: {asset.color};"
											min="0"
											max="100"
											step="1"
											value={Math.round(asset.targetWeight * 100)}
											oninput={(e) => handleWeightChange(asset.ticker, parseInt((e.target as HTMLInputElement).value))}
										/>
										<div class="weight-value-box">
											<input
												type="number"
												class="weight-number-input"
												min="0"
												max="100"
												step="1"
												value={Math.round(asset.targetWeight * 100)}
												onwheel={(e) => e.preventDefault()}
												oninput={(e) => handleWeightChange(asset.ticker, parseInt((e.target as HTMLInputElement).value) || 0)}
											/>
											<span class="weight-percent-sign">%</span>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>

					<button class="add-asset-btn" onclick={() => openSearch(section.id)}>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
							<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						Añadir activo
					</button>
				</div>
			{/each}
		</div>

		<div class="manage-footer">
			<button class="btn-save" onclick={handleSave}>
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
					<polyline points="17 21 17 13 7 13 7 21"></polyline>
					<polyline points="7 3 7 8 15 8"></polyline>
				</svg>
				Guardar Cartera y Volver
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
		background: rgba(0, 0, 0, 0.7);
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
		background: rgba(18, 18, 35, 0.98);
		backdrop-filter: blur(40px) saturate(200%);
		-webkit-backdrop-filter: blur(40px) saturate(200%);
		border: 1px solid rgba(255, 255, 255, 0.12);
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
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.manage-title {
		font-size: 1.15rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
	}

	.manage-subtitle {
		font-size: 0.72rem;
		color: rgba(160, 160, 200, 0.5);
		margin: 0;
	}

	.close-btn {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(160, 160, 200, 0.6);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
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
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
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
		color: #fff;
		margin: 0;
	}

	.section-desc {
		font-size: 0.65rem;
		color: rgba(160, 160, 200, 0.4);
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
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 6px;
		color: rgba(160, 160, 200, 0.6);
		font-size: 0.62rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		white-space: nowrap;
	}

	.equalize-btn:hover {
		background: rgba(59, 130, 246, 0.1);
		color: #60a5fa;
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
		color: #10b981;
	}

	.weight-indicator.invalid {
		background: rgba(245, 158, 11, 0.1);
		color: #f59e0b;
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
		background: rgba(255, 255, 255, 0.05);
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
		color: rgba(255, 255, 255, 0.9);
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
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-left: 3px solid var(--accent);
		border-radius: 12px;
		overflow: hidden;
		transition: all 0.15s;
	}

	.asset-item:hover {
		background: rgba(0, 0, 0, 0.3);
		border-color: rgba(255, 255, 255, 0.08);
		border-left-color: var(--accent);
	}

	.asset-view {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 0.85rem;
	}

	.asset-left {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
		flex: 1;
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
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.asset-ticker-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.6rem;
		color: rgba(160, 160, 200, 0.4);
		font-family: 'Monaco', 'Menlo', monospace;
		margin-top: 0.1rem;
	}

	.asset-ter-badge {
		padding: 0.05rem 0.3rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		color: rgba(160, 160, 200, 0.6);
		font-weight: 600;
	}

	.asset-actions-mini {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.action-ter {
		padding: 0.2rem 0.45rem;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.03);
		color: rgba(160, 160, 200, 0.5);
		font-size: 0.58rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.action-ter:hover {
		background: rgba(59, 130, 246, 0.1);
		color: #60a5fa;
		border-color: rgba(59, 130, 246, 0.2);
	}

	.action-delete {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		border: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.03);
		color: rgba(160, 160, 200, 0.4);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}

	.action-delete:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #fca5a5;
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
		color: rgba(160, 160, 200, 0.5);
		font-weight: 600;
		text-transform: uppercase;
	}

	.ter-input {
		width: 55px;
		padding: 0.2rem 0.35rem;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 6px;
		color: #fff;
		font-size: 0.75rem;
		font-weight: 600;
		outline: none;
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
		color: #10b981;
	}

	.ter-cancel {
		background: rgba(239, 68, 68, 0.1);
		color: #fca5a5;
	}

	/* ====== Weight Slider Row ====== */
	.weight-slider-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.3rem 0.85rem 0.65rem;
	}

	.slider-color-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 6px currentColor;
	}

	.weight-slider {
		flex: 1;
		height: 6px;
		-webkit-appearance: none;
		appearance: none;
		background: rgba(255, 255, 255, 0.08);
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
		background: var(--slider-color, #3b82f6);
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
		background: var(--slider-color, #3b82f6);
		border: 2px solid rgba(255, 255, 255, 0.3);
		cursor: grab;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}

	.weight-value-box {
		display: flex;
		align-items: center;
		gap: 0.1rem;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 0.25rem 0.15rem 0.25rem 0.35rem;
		min-width: 52px;
	}

	.weight-number-input {
		width: 28px;
		background: transparent;
		border: none;
		color: #fff;
		font-size: 0.82rem;
		font-weight: 700;
		outline: none;
		text-align: right;
		-moz-appearance: textfield;
		appearance: textfield;
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
		color: rgba(160, 160, 200, 0.5);
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
		color: rgba(59, 130, 246, 0.7);
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}

	.add-asset-btn:hover {
		background: rgba(59, 130, 246, 0.1);
		border-color: rgba(59, 130, 246, 0.4);
		color: #60a5fa;
	}

	.manage-footer {
		padding: 1.25rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(18, 18, 35, 0.95);
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
		background: linear-gradient(135deg, #10b981, #059669);
		border: none;
		border-radius: 14px;
		color: white;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
	}

	.btn-save:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 25px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
		background: linear-gradient(135deg, #059669, #10b981);
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
</style>
