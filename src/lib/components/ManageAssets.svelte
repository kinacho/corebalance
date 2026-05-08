<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import type { Asset, AssetCategory } from '$lib/types';
	import { formatPercent } from '$lib/utils';
	import AssetSearch from './AssetSearch.svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let showSearch = $state(false);
	let searchCategory = $state<AssetCategory>('core');
	let editingAsset = $state<string | null>(null);
	let editWeight = $state('');
	let editTer = $state('');

	const sections = $derived([
		{ id: 'core' as AssetCategory, label: 'Cartera Principal', assets: portfolio.coreAssets, description: 'Activos con peso objetivo para rebalanceo' },
		{ id: 'satellite' as AssetCategory, label: 'Cartera Conservadora', assets: portfolio.satelliteAssets, description: 'Renta fija, monetarios, mixtos' },
		{ id: 'stocks' as AssetCategory, label: 'Acciones Individuales', assets: portfolio.stockAssets, description: 'Acciones y posiciones especulativas' }
	]);

	/** Peso total del Core (debe sumar 100%) */
	const coreWeightTotal = $derived(
		portfolio.coreAssets.reduce((sum, a) => sum + a.targetWeight, 0)
	);

	const coreWeightValid = $derived(
		Math.abs(coreWeightTotal - 1) < 0.001
	);

	function openSearch(cat: AssetCategory) {
		searchCategory = cat;
		showSearch = true;
	}

	function startEditAsset(asset: Asset) {
		editingAsset = asset.ticker;
		editWeight = (asset.targetWeight * 100).toString();
		editTer = (asset.ter * 100).toString();
	}

	function saveAssetEdit(ticker: string) {
		const weight = parseFloat(editWeight);
		const ter = parseFloat(editTer);
		const updates: Partial<Asset> = {};

		if (!isNaN(weight) && weight >= 0 && weight <= 100) {
			updates.targetWeight = weight / 100;
		}
		if (!isNaN(ter) && ter >= 0) {
			updates.ter = ter / 100;
		}

		portfolio.updateAsset(ticker, updates);
		editingAsset = null;
	}

	function confirmRemove(asset: Asset) {
		if (confirm(`¿Eliminar "${asset.name}" (${asset.ticker}) de tu cartera?`)) {
			portfolio.removeAsset(asset.ticker);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !showSearch) onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if showSearch}
	<AssetSearch category={searchCategory} onClose={() => showSearch = false} />
{/if}

<div class="manage-overlay" role="dialog" aria-modal="true" aria-label="Gestionar activos">
	<button class="manage-backdrop" onclick={onClose} aria-label="Cerrar"></button>
	<div class="manage-panel">
		<div class="manage-header">
			<div>
				<h2 class="manage-title">⚙️ Gestionar Cartera</h2>
				<p class="manage-subtitle">Añade, elimina y configura los activos de tu portfolio</p>
			</div>
			<button class="close-btn" onclick={onClose} aria-label="Cerrar">
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
						{#if section.id === 'core'}
							<div class="weight-indicator" class:valid={coreWeightValid} class:invalid={!coreWeightValid && coreWeightTotal > 0}>
								<span class="weight-sum">{formatPercent(coreWeightTotal, 0)}</span>
								{#if coreWeightValid}
									<span class="weight-check">✓</span>
								{:else}
									<span class="weight-warn">≠ 100%</span>
								{/if}
							</div>
						{/if}
					</div>

					<div class="asset-list">
						{#each section.assets as asset (asset.ticker)}
							<div class="asset-item" style="--accent: {asset.color}">
								{#if editingAsset === asset.ticker}
									<!-- Edit Mode -->
									<div class="asset-edit">
										<div class="edit-header">
											<span class="edit-icon">{asset.icon}</span>
											<span class="edit-name">{asset.name}</span>
											<span class="edit-ticker">{asset.ticker}</span>
										</div>
										<div class="edit-fields">
											{#if section.id === 'core'}
												<div class="edit-field">
													<label class="edit-label" for="weight-{asset.ticker}">Peso Objetivo (%)</label>
													<input
														id="weight-{asset.ticker}"
														type="number"
														class="edit-input"
														bind:value={editWeight}
														min="0"
														max="100"
														step="1"
														inputmode="decimal"
													/>
												</div>
											{/if}
											<div class="edit-field">
												<label class="edit-label" for="ter-{asset.ticker}">TER (%)</label>
												<input
													id="ter-{asset.ticker}"
													type="number"
													class="edit-input"
													bind:value={editTer}
													min="0"
													step="0.01"
													inputmode="decimal"
												/>
											</div>
										</div>
										<div class="edit-actions">
											<button class="edit-save" onclick={() => saveAssetEdit(asset.ticker)}>Guardar</button>
											<button class="edit-cancel" onclick={() => editingAsset = null}>Cancelar</button>
										</div>
									</div>
								{:else}
									<!-- View Mode -->
									<div class="asset-view">
										<div class="asset-left">
											<span class="asset-icon">{asset.icon}</span>
											<div class="asset-info">
												<span class="asset-name">{asset.name}</span>
												<span class="asset-ticker-meta">
													{asset.ticker}
													{#if asset.targetWeight > 0}
														<span class="asset-weight-badge">{formatPercent(asset.targetWeight, 0)}</span>
													{/if}
													{#if asset.ter > 0}
														<span class="asset-ter-badge">{formatPercent(asset.ter)} TER</span>
													{/if}
												</span>
											</div>
										</div>
										<div class="asset-actions">
											<button class="action-edit" onclick={() => startEditAsset(asset)} title="Editar">
												<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
													<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
													<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
												</svg>
											</button>
											<button class="action-delete" onclick={() => confirmRemove(asset)} title="Eliminar">
												<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
													<polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
												</svg>
											</button>
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
		gap: 1.5rem;
	}

	.section-block {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
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

	.weight-indicator {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.6rem;
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
		padding: 0.65rem 0.85rem;
	}

	.asset-left {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-width: 0;
	}

	.asset-icon {
		font-size: 1.15rem;
		flex-shrink: 0;
	}

	.asset-info {
		min-width: 0;
	}

	.asset-name {
		display: block;
		font-size: 0.82rem;
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
		font-size: 0.62rem;
		color: rgba(160, 160, 200, 0.4);
		font-family: 'Monaco', 'Menlo', monospace;
		margin-top: 0.1rem;
	}

	.asset-weight-badge {
		padding: 0.05rem 0.3rem;
		background: rgba(59, 130, 246, 0.15);
		border-radius: 4px;
		color: #60a5fa;
		font-weight: 700;
		font-family: inherit;
	}

	.asset-ter-badge {
		padding: 0.05rem 0.3rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		color: rgba(160, 160, 200, 0.6);
		font-weight: 600;
	}

	.asset-actions {
		display: flex;
		gap: 0.25rem;
	}

	.action-edit, .action-delete {
		width: 30px;
		height: 30px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.03);
		color: rgba(160, 160, 200, 0.5);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
	}

	.action-edit:hover {
		background: rgba(59, 130, 246, 0.1);
		color: #60a5fa;
		border-color: rgba(59, 130, 246, 0.2);
	}

	.action-delete:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #fca5a5;
		border-color: rgba(239, 68, 68, 0.2);
	}

	/* Edit mode */
	.asset-edit {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.edit-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.edit-icon { font-size: 1.1rem; }

	.edit-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: #fff;
	}

	.edit-ticker {
		font-size: 0.65rem;
		color: rgba(160, 160, 200, 0.4);
		font-family: 'Monaco', monospace;
	}

	.edit-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.edit-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.edit-label {
		font-size: 0.62rem;
		font-weight: 600;
		color: rgba(160, 160, 200, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.edit-input {
		padding: 0.5rem 0.65rem;
		background: rgba(0, 0, 0, 0.4);
		border: 1.5px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		outline: none;
		transition: all 0.2s;
	}

	.edit-input:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	.edit-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.edit-save, .edit-cancel {
		padding: 0.4rem 1rem;
		border-radius: 8px;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		border: none;
		transition: all 0.15s;
	}

	.edit-save {
		background: rgba(59, 130, 246, 0.2);
		color: #60a5fa;
	}

	.edit-save:hover {
		background: rgba(59, 130, 246, 0.3);
	}

	.edit-cancel {
		background: rgba(255, 255, 255, 0.05);
		color: rgba(160, 160, 200, 0.6);
	}

	.edit-cancel:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
	}

	/* Add button */
	.add-asset-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.7rem;
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
