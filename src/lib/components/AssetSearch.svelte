<script lang="ts">
	import { onMount } from 'svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { focusTrap } from '$lib/actions/focusTrap';
	import { ASSET_COLORS, ASSET_ICONS } from '$lib/constants';
	import type { Asset, AssetCategory, SearchResult } from '$lib/types';

	interface Props {
		category: AssetCategory;
		onClose: () => void;
	}

	let { category, onClose }: Props = $props();

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let searching = $state(false);
	let searchError = $state<string | null>(null);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let searchInputEl: HTMLInputElement;

	onMount(() => {
		if (searchInputEl) searchInputEl.focus();
	});

	const categoryLabels: Record<AssetCategory, string> = {
		core: 'Cartera Principal',
		satellite: 'Cartera Conservadora',
		stocks: 'Acciones'
	};

	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		query = value;
		searchError = null;

		if (debounceTimer) clearTimeout(debounceTimer);

		if (value.trim().length < 2) {
			results = [];
			searching = false;
			return;
		}

		searching = true;
		debounceTimer = setTimeout(() => searchAssets(value), 350);
	}

	async function searchAssets(q: string) {
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
			const data = await res.json();
			if (data.error) {
				searchError = data.error;
				results = [];
			} else {
				results = data.results || [];
			}
		} catch (e) {
			searchError = 'Error de conexión';
			results = [];
		} finally {
			searching = false;
		}
	}

	function getNextColor(): string {
		const usedColors = new Set([
			...portfolio.coreAssets.map(a => a.color),
			...portfolio.satelliteAssets.map(a => a.color),
			...portfolio.stockAssets.map(a => a.color)
		]);
		return ASSET_COLORS.find(c => !usedColors.has(c)) || ASSET_COLORS[Math.floor(Math.random() * ASSET_COLORS.length)];
	}

	function addResult(result: SearchResult) {
		if (portfolio.hasAsset(result.ticker)) return;

		const asset: Asset = {
			ticker: result.ticker,
			name: result.name,
			isin: '', // Yahoo no suele devolver ISIN directamente
			targetWeight: category === 'core' ? 0 : 0,
			color: getNextColor(),
			icon: ASSET_ICONS[result.type] || ASSET_ICONS['Otro'],
			ter: 0,
			category
		};

		portfolio.addAsset(asset);
		ui.addToast(`"${result.name}" añadido correctamente`, 'success');
		ui.hapticFeedback('medium');
		// Eliminado el onClose() para permitir añadir varios
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="search-overlay" role="dialog" aria-modal="true" aria-label="Buscar activo">
	<button class="search-backdrop" onclick={onClose} aria-label="Cerrar"></button>
	<div class="search-panel" use:focusTrap>
		<div class="search-header">
			<div class="search-title-row">
				<span class="search-icon">🔍</span>
				<div>
					<h2 class="search-title">Añadir Activo</h2>
					<p class="search-subtitle">Busca en Yahoo Finance → {categoryLabels[category]}</p>
				</div>
			</div>
			<button class="close-btn" onclick={onClose} aria-label="Cerrar">
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div class="search-input-wrapper">
			<svg class="input-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
			</svg>
			<input
				type="text"
				class="search-input"
				placeholder="Buscar por nombre, ticker o ISIN..."
				value={query}
				oninput={handleInput}
				bind:this={searchInputEl}
			/>
			{#if searching}
				<div class="search-spinner"></div>
			{/if}
		</div>

		<div class="search-results">
			{#if searchError}
				<div class="search-error">
					<span>⚠️</span> {searchError}
				</div>
			{:else if results.length > 0}
				{#each results as result (result.ticker)}
					{@const alreadyAdded = portfolio.hasAsset(result.ticker)}
					<button
						class="result-row"
						class:disabled={alreadyAdded}
						onclick={() => !alreadyAdded && addResult(result)}
						disabled={alreadyAdded}
					>
						<div class="result-icon">
							{ASSET_ICONS[result.type] || '💎'}
						</div>
						<div class="result-info">
							<span class="result-name">{result.name}</span>
							<span class="result-meta">
								<span class="result-ticker">{result.ticker}</span>
								<span class="result-dot">•</span>
								<span class="result-type">{result.type}</span>
								<span class="result-dot">•</span>
								<span class="result-exchange">{result.exchange}</span>
								{#if result.currency}
									<span class="result-dot">•</span>
									<span class="result-currency">{result.currency}</span>
								{/if}
							</span>
						</div>
						<div class="result-action">
							{#if alreadyAdded}
								<span class="already-badge">✓ Añadido</span>
							{:else}
								<span class="add-badge">+ Añadir</span>
							{/if}
						</div>
					</button>
				{/each}
			{:else if query.length >= 2 && !searching}
				<div class="search-empty">
					<span class="empty-icon">📭</span>
					<p>No se encontraron resultados para "{query}"</p>
					<p class="empty-hint">Prueba con otro nombre, ticker o ISIN</p>
				</div>
			{:else}
				<div class="search-hint">
					<span class="hint-icon">💡</span>
					<p>Escribe al menos 2 caracteres para buscar</p>
					<p class="hint-examples">Ej: "MSCI World", "AAPL", "IE00B4L5Y983"</p>

					<button class="btn-manual-add" onclick={() => {
						const name = query.trim() || 'Cuenta Remunerada';
						const ticker = 'CASH-' + Math.random().toString(36).substring(2, 7).toUpperCase();
						addResult({
							ticker,
							name,
							type: 'CASH',
							exchange: 'Manual'
						});
					}}>
						<span class="plus">➕</span> Crear "{query || 'Cuenta Manual'}" como saldo en efectivo
					</button>
				</div>
			{/if}
		</div>

		<div class="search-footer">
			<button class="btn-done" onclick={onClose}>
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
				Listo, volver a la cartera
			</button>
		</div>
	</div>
</div>

<style>
	.search-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 8vh;
		animation: fadeIn 0.15s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.search-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: none;
		cursor: default;
	}

	.search-panel {
		position: relative;
		width: 90%;
		max-width: 560px;
		max-height: 75vh;
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

	.search-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.search-title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.search-icon {
		font-size: 1.5rem;
	}

	.search-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
	}

	.search-subtitle {
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

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.input-icon {
		position: absolute;
		left: 1.75rem;
		color: rgba(160, 160, 200, 0.4);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 2.5rem 0.75rem 2.25rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1.5px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		color: #fff;
		font-size: 1rem;
		font-weight: 500;
		outline: none;
		transition: all 0.2s;
	}

	.search-input:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	.search-input::placeholder {
		color: rgba(160, 160, 200, 0.35);
	}

	.search-spinner {
		position: absolute;
		right: 2rem;
		width: 18px;
		height: 18px;
		border: 2px solid rgba(59, 130, 246, 0.2);
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.search-results {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
		max-height: 45vh;
	}

	.result-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.85rem 1rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 14px;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
		color: inherit;
	}

	.result-row:hover:not(.disabled) {
		background: rgba(59, 130, 246, 0.08);
		border-color: rgba(59, 130, 246, 0.15);
	}

	.result-row:active:not(.disabled) {
		transform: scale(0.98);
	}

	.result-row.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.result-icon {
		width: 40px;
		height: 40px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.result-info {
		flex: 1;
		min-width: 0;
	}

	.result-name {
		display: block;
		font-size: 0.9rem;
		font-weight: 600;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-meta {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.68rem;
		color: rgba(160, 160, 200, 0.5);
		margin-top: 0.15rem;
		flex-wrap: wrap;
	}

	.result-ticker {
		font-family: 'Monaco', 'Menlo', monospace;
		font-weight: 600;
		color: rgba(160, 160, 200, 0.7);
	}

	.result-dot {
		color: rgba(160, 160, 200, 0.2);
	}

	.result-type {
		padding: 0.1rem 0.35rem;
		background: rgba(99, 102, 241, 0.15);
		border-radius: 4px;
		color: #818cf8;
		font-weight: 600;
	}

	.result-action {
		flex-shrink: 0;
	}

	.add-badge {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.4rem 0.8rem;
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05));
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 10px;
		font-size: 0.72rem;
		font-weight: 700;
		color: #60a5fa;
		white-space: nowrap;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
	}

	.result-row:hover:not(.disabled) .add-badge {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(59, 130, 246, 0.1));
		border-color: rgba(59, 130, 246, 0.5);
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(59, 130, 246, 0.2);
	}

	.already-badge {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.4rem 0.8rem;
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
		border: 1px solid rgba(16, 185, 129, 0.3);
		border-radius: 10px;
		font-size: 0.72rem;
		font-weight: 700;
		color: #10b981;
		white-space: nowrap;
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
		animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	@keyframes scaleIn {
		0% { transform: scale(0.8); opacity: 0; }
		100% { transform: scale(1); opacity: 1; }
	}

	.search-footer {
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(18, 18, 35, 0.95);
		display: flex;
		justify-content: center;
	}

	.btn-done {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.85rem;
		background: linear-gradient(135deg, #3b82f6, #2563eb);
		border: none;
		border-radius: 14px;
		color: white;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
	}

	.btn-done:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 25px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
		background: linear-gradient(135deg, #4f46e5, #3b82f6);
	}

	.btn-done:active {
		transform: translateY(0);
		box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
	}

	.search-empty, .search-hint {
		text-align: center;
		padding: 2.5rem 1rem;
		color: rgba(160, 160, 200, 0.5);
	}

	.empty-icon, .hint-icon {
		font-size: 2rem;
		display: block;
		margin-bottom: 0.75rem;
	}

	.search-empty p, .search-hint p {
		margin: 0;
		font-size: 0.85rem;
	}

	.empty-hint, .hint-examples {
		font-size: 0.72rem !important;
		margin-top: 0.35rem !important;
		opacity: 0.6;
	}

	.btn-manual-add {
		margin-top: 1.5rem;
		width: 100%;
		padding: 0.75rem;
		background: rgba(59, 130, 246, 0.05);
		border: 1px dashed rgba(59, 130, 246, 0.3);
		border-radius: 12px;
		color: #60a5fa;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.btn-manual-add:hover {
		background: rgba(59, 130, 246, 0.1);
		border-color: #3b82f6;
		color: #fff;
	}

	.btn-manual-add .plus {
		font-size: 1rem;
	}

	.search-error {
		text-align: center;
		padding: 1.5rem;
		color: #fca5a5;
		font-size: 0.85rem;
	}

	/* Scrollbar */
	.search-results::-webkit-scrollbar {
		width: 6px;
	}
	.search-results::-webkit-scrollbar-track {
		background: transparent;
	}
	.search-results::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}
</style>
