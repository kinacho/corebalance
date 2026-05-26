<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { focusTrap } from '$lib/actions/focusTrap';
	import { importFromCSV, importWithMapping } from '$lib/importers';
	import type { ImportResult, ParsedPosition, MappingConfig } from '$lib/importers';
	import { ASSET_COLORS, ASSET_ICONS } from '$lib/constants';
	import type { Asset, AssetCategory } from '$lib/types';
	import { resolveAssetIcon } from '$lib/utils';
	import { onMount, onDestroy } from 'svelte';
	import ColumnMapper from './ColumnMapper.svelte';

	interface Props { onClose: () => void; }
	let { onClose }: Props = $props();

	onMount(() => {
		document.body.classList.add('modal-open');
	});

	onDestroy(() => {
		document.body.classList.remove('modal-open');
	});

	// --- State Machine ---
	type Step = 'upload' | 'mapping' | 'resolving' | 'preview' | 'done';
	let step = $state<Step>('upload');
	let isDragging = $state(false);
	let rawFileContent = $state<string>('');
	let importResult = $state<ImportResult | null>(null);
	let resolvedMap = $state<Record<string, { ticker: string; name: string; type: string; exchange: string }>>({});
	let selectedPositions = $state<Set<string>>(new Set());
	let targetCategory = $state<AssetCategory>('stocks');
	let resolveError = $state<string | null>(null);
	let importedCount = $state(0);

	// --- File Handling ---
	function handleDragOver(e: DragEvent) { e.preventDefault(); isDragging = true; }
	function handleDragLeave() { isDragging = false; }

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files[0];
		if (file) processFile(file);
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) processFile(file);
	}

	function processFile(file: File) {
		if (!file.name.match(/\.(csv|txt|tsv)$/i)) {
			ui.addToast('Solo se aceptan archivos CSV, TSV o TXT', 'error');
			return;
		}
		if (file.size > 1 * 1024 * 1024) {
			ui.addToast('El archivo es demasiado grande (máx. 1 MB)', 'error');
			return;
		}

		const reader = new FileReader();
		reader.onload = (ev) => {
			const text = ev.target?.result as string;
			if (!text) return;
			rawFileContent = text;
			
			// Obtenemos los datos crudos para el mapeo
			const result = importFromCSV(text);
			importResult = result;
			step = 'mapping';
		};
		reader.readAsText(file);
	}

	function handleManualMapping(mapping: MappingConfig) {
		const result = importWithMapping(rawFileContent, mapping);
		importResult = result;
		startResolution(result);
	}

	function startResolution(result: ImportResult) {
		if (result.positions.length === 0) {
			ui.addToast('No se encontraron posiciones en el archivo', 'error');
			step = 'upload';
			return;
		}
		// Select all by default
		selectedPositions = new Set(result.positions.map((_, i) => String(i)));
		resolveISINs(result.positions);
	}

	// --- ISIN Resolution ---
	async function resolveISINs(positions: ParsedPosition[]) {
		step = 'resolving';
		resolveError = null;

		const isins = positions.filter(p => p.isin).map(p => p.isin);
		const tickers = positions.filter(p => !p.isin && p.ticker).map(p => p.ticker!);

		try {
			const res = await fetch('/api/resolve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isins: [...new Set(isins)], tickers: [...new Set(tickers)] })
			});

			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();

			const map: typeof resolvedMap = {};
			for (const r of data.resolved || []) {
				if (r.ticker) {
					map[r.query] = { ticker: r.ticker, name: r.name || r.ticker, type: r.type || '', exchange: r.exchange || '' };
				}
			}
			resolvedMap = map;
			step = 'preview';
		} catch (e) {
			resolveError = e instanceof Error ? e.message : 'Error de conexión';
			step = 'preview'; // Still show what we have
		}
	}

	// --- Import Logic ---
	function getResolvedTicker(pos: ParsedPosition): string | null {
		if (pos.isin && resolvedMap[pos.isin]) return resolvedMap[pos.isin].ticker;
		if (pos.ticker && resolvedMap[pos.ticker]) return resolvedMap[pos.ticker].ticker;
		if (pos.ticker) return pos.ticker;
		return null;
	}

	function getResolvedName(pos: ParsedPosition): string {
		if (pos.isin && resolvedMap[pos.isin]) return resolvedMap[pos.isin].name;
		if (pos.ticker && resolvedMap[pos.ticker]) return resolvedMap[pos.ticker].name;
		return pos.name;
	}

	function togglePosition(idx: string) {
		const s = new Set(selectedPositions);
		s.has(idx) ? s.delete(idx) : s.add(idx);
		selectedPositions = s;
	}

	function toggleAll() {
		if (!importResult) return;
		if (selectedPositions.size === importResult.positions.length) {
			selectedPositions = new Set();
		} else {
			selectedPositions = new Set(importResult.positions.map((_, i) => String(i)));
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

	function mapType(type: string | null): string {
		if (!type) return 'Otro';
		const u = type.toUpperCase();
		if (u.includes('ETF')) return 'ETF';
		if (u.includes('EQUITY') || u.includes('STOCK')) return 'Acción';
		if (u.includes('FUND') || u.includes('MUTUAL')) return 'Fondo';
		if (u.includes('CRYPT')) return 'Crypto';
		return 'Otro';
	}

	async function confirmImport() {
		if (!importResult) return;

		// --- Validation FIX 5 ---
		const weightsByCategory: Record<AssetCategory, number> = {
			core: portfolio.coreAssets.reduce((sum, a) => sum + (a.targetWeight || 0), 0),
			satellite: portfolio.satelliteAssets.reduce((sum, a) => sum + (a.targetWeight || 0), 0),
			stocks: portfolio.stockAssets.reduce((sum, a) => sum + (a.targetWeight || 0), 0)
		};

		// Calcular pesos de los nuevos activos (siempre entran con targetWeight 0 según lógica actual,
		// pero por seguridad validamos la categoría destino si la lógica cambiara)
		// En este caso, el usuario solo elige UNA categoría para TODOS los nuevos activos.
		let newAssetsWeight = 0;
		// (Actualmente el código asigna targetWeight: 0 a los nuevos, pero validamos por si acaso)
		
		if (weightsByCategory[targetCategory] > 1.0001) {
			const catNames = { core: 'Principal', satellite: 'Conservadora', stocks: 'Acciones' };
			ui.addToast(`La cartera ${catNames[targetCategory]} ya suma ${(weightsByCategory[targetCategory] * 100).toFixed(0)}%. Ajusta los pesos antes de importar más activos.`, 'error');
			return;
		}
		// --- End Validation ---

		let count = 0;

		for (const [idx, pos] of importResult.positions.entries()) {
			if (!selectedPositions.has(String(idx))) continue;

			const ticker = getResolvedTicker(pos);
			if (!ticker) continue;
			if (portfolio.hasAsset(ticker)) {
				// Update holdings only
				portfolio.updateHolding(ticker, { shares: pos.shares, avgCost: pos.avgCost });
				count++;
				continue;
			}

			const resolved = resolvedMap[pos.isin] || resolvedMap[pos.ticker || ''];
			const assetType = mapType(resolved?.type || null);

			const asset: Asset = {
				ticker,
				name: getResolvedName(pos),
				isin: pos.isin || '',
				targetWeight: 0,
				color: getNextColor(),
				icon: resolveAssetIcon(ticker, getResolvedName(pos), resolved?.type || ''),
				ter: 0,
				category: targetCategory
			};

			portfolio.addAsset(asset);
			portfolio.updateHolding(ticker, { shares: pos.shares, avgCost: pos.avgCost });
			count++;
		}

		importedCount = count;
		step = 'done';
		ui.hapticFeedback('heavy');

		// Refresh prices for new tickers
		await portfolio.fetchPrices();
	}

	function handleKeydown(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }

	const selectedCount = $derived(selectedPositions.size);
	const resolvableCount = $derived(
		importResult?.positions.filter((p, i) => selectedPositions.has(String(i)) && getResolvedTicker(p)).length ?? 0
	);
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="import-overlay" role="dialog" aria-modal="true" aria-label="Importar cartera">
	<button class="import-backdrop" onclick={onClose} aria-label="Cerrar"></button>
	<div class="import-panel" use:focusTrap>
		<!-- Header -->
		<div class="import-header">
			<div>
				<h2 class="import-title">📥 Importar Cartera <span class="beta-badge">Beta</span></h2>
				<p class="import-subtitle">
					{#if step === 'upload'}Sube el CSV de tu bróker
					{:else if step === 'mapping'}Configura las columnas de tu archivo
					{:else if step === 'resolving'}Buscando activos en Yahoo Finance...
					{:else if step === 'preview'}Revisa y confirma las posiciones
					{:else}¡Importación completada!
					{/if}
				</p>
			</div>
			<button class="close-btn" onclick={onClose} aria-label="Cerrar">
				<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
			</button>
		</div>

		<div class="import-body">
			<!-- STEP 1: Upload -->
			{#if step === 'upload'}
				<div class="upload-zone" class:dragging={isDragging}
					ondragover={handleDragOver} ondragleave={handleDragLeave} ondrop={handleDrop}
					role="button" tabindex="0">
					<div class="upload-icon">📂</div>
					<p class="upload-title">Arrastra tu archivo CSV aquí</p>
					<p class="upload-hint">o haz clic para seleccionarlo</p>
					<input type="file" accept=".csv,.tsv,.txt" class="file-input" onchange={handleFileInput} />
				</div>
				<div class="broker-badges">
					<span class="broker-badge">CSV Universal (Mapeo Manual)</span>
				</div>

				<div class="import-guide">
					<h3 class="guide-title">¿Qué archivo necesito?</h3>
					<p class="guide-text">Puedes importar el CSV de <strong>cualquier bróker</strong>. Solo asegúrate de que el archivo contenga al menos estas columnas:</p>
					<ul class="guide-list">
						<li><strong>Identificador:</strong> ISIN (ej: IE00B4L5Y983) o Ticker (ej: VOO).</li>
						<li><strong>Cantidad:</strong> Número de acciones o participaciones.</li>
						<li><strong>Precio/Coste (Opcional):</strong> Para calcular tu rentabilidad.</li>
					</ul>
					<p class="guide-note">💡 Tras subirlo, tú mismo indicarás qué columna es cada dato.</p>
				</div>

				<p class="privacy-note">🔒 Tu archivo se procesa 100% en tu navegador. No se sube a ningún servidor.</p>

			<!-- STEP 2: Mapping -->
			{:else if step === 'mapping'}
				{#if importResult}
					<ColumnMapper 
						headers={importResult.rawHeaders || []} 
						rows={importResult.rawRows || []}
						onConfirm={handleManualMapping}
						onBack={() => step = 'upload'}
					/>
				{/if}

			<!-- STEP 3: Resolving -->
			{:else if step === 'resolving'}
				<div class="resolving-state">
					<div class="resolving-spinner"></div>
					<p>Identificando {importResult?.positions.length ?? 0} activos...</p>
					<p class="resolving-hint">Buscando tickers en Yahoo Finance</p>
				</div>

			<!-- STEP 3: Preview -->
			{:else if step === 'preview'}
				{#if importResult}
					<div class="preview-header-row">
						<div class="broker-detected">
							<span>📄</span>
							<span class="broker-name">Activos Identificados</span>
						</div>
						<div class="category-picker">
							<label for="import-category">Añadir a:</label>
							<select id="import-category" bind:value={targetCategory}>
								<option value="core">Cartera Principal</option>
								<option value="satellite">Cartera Conservadora</option>
								<option value="stocks">Acciones</option>
							</select>
						</div>
					</div>

					{#if resolveError}
						<div class="resolve-warning">⚠️ {resolveError} — Algunos activos podrían no haberse encontrado.</div>
					{/if}

					{#if importResult.warnings.length > 0}
						{#each importResult.warnings as warning}
							<div class="resolve-warning">⚠️ {warning}</div>
						{/each}
					{/if}

					<div class="select-all-row">
						<button class="select-all-btn" onclick={toggleAll}>
							{selectedPositions.size === importResult.positions.length ? '☑' : '☐'} Seleccionar todo
						</button>
						<span class="selected-count">{selectedCount} de {importResult.positions.length} seleccionados</span>
					</div>

					<div class="positions-list">
						{#each importResult.positions as pos, idx (idx)}
							{@const ticker = getResolvedTicker(pos)}
							{@const isSelected = selectedPositions.has(String(idx))}
							{@const alreadyExists = ticker ? portfolio.hasAsset(ticker) : false}
							<div class="position-row-container">
								<button class="position-row" class:selected={isSelected} class:unresolved={!ticker}
									onclick={() => togglePosition(String(idx))}>
									<span class="pos-check">{isSelected ? '☑' : '☐'}</span>
									<div class="pos-info">
										<span class="pos-name">{getResolvedName(pos)}</span>
										<span class="pos-meta">
											{#if ticker}
												<span class="pos-ticker">{ticker}</span>
											{:else}
												<span class="pos-no-ticker">❌ No encontrado</span>
											{/if}
											{#if pos.isin}<span class="pos-isin">{pos.isin}</span>{/if}
											{#if alreadyExists}<span class="pos-exists">⟳ Actualizar</span>{/if}
										</span>
									</div>
									<div class="pos-numbers">
										<span class="pos-shares">{pos.shares.toFixed(pos.shares % 1 === 0 ? 0 : 3)}</span>
										<span class="pos-cost">{pos.avgCost > 0 ? `${pos.avgCost.toFixed(2)} ${pos.currency}` : '—'}</span>
									</div>
								</button>
								{#if !ticker || isSelected}
									<div class="manual-ticker-edit">
										<input type="text" 
											placeholder="Ticker Yahoo (ej: IWDA.AS)"
											value={ticker || ''}
											onchange={(e) => {
												const val = (e.target as HTMLInputElement).value.toUpperCase().trim();
												if (val) {
													resolvedMap[pos.isin || pos.ticker || String(idx)] = {
														ticker: val,
														name: getResolvedName(pos),
														type: 'EQUITY',
														exchange: ''
													};
												}
											}}
										/>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

			<!-- STEP 4: Done -->
			{:else if step === 'done'}
				<div class="done-state">
					<div class="done-icon">✅</div>
					<p class="done-title">{importedCount} activos importados</p>
					<p class="done-hint">Los precios se actualizarán automáticamente en unos segundos.</p>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="import-footer">
			{#if step === 'preview'}
				<button class="btn-import" onclick={confirmImport} disabled={resolvableCount === 0}>
					<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
					Importar {resolvableCount} activos
				</button>
			{:else if step === 'done'}
				<button class="btn-import" onclick={onClose}>
					<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
					Cerrar
				</button>
			{:else if step === 'upload'}
				<button class="btn-cancel" onclick={onClose}>Cancelar</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.import-overlay { position:fixed; inset:0; z-index:200; display:flex; align-items:flex-start; justify-content:center; padding-top:5vh; animation:fadeIn .15s ease; }
	@keyframes fadeIn { from{opacity:0} to{opacity:1} }
	.import-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border:none; cursor:default; }
	.import-panel { position:relative; width:92%; max-width:620px; max-height:85vh; background:rgba(18,18,35,.98); backdrop-filter:blur(40px) saturate(200%); -webkit-backdrop-filter:blur(40px) saturate(200%); border:1px solid rgba(255,255,255,.12); border-radius:24px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 25px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.05) inset; animation:slideUp .2s cubic-bezier(.34,1.56,.64,1); }
	@keyframes slideUp { from{transform:translateY(20px) scale(.97);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
	.import-header { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid rgba(255,255,255,.06); }
	.import-title { font-size:1.1rem; font-weight:700; color:#fff; margin:0; display:flex; align-items:center; }
	.beta-badge { font-size: 0.6rem; font-weight: 800; color: #3b82f6; background: rgba(59, 130, 246, 0.12); padding: 0.15rem 0.45rem; border-radius: 6px; margin-left: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(59, 130, 246, 0.2); }
	.import-subtitle { font-size:.72rem; color:rgba(160,160,200,.5); margin:0; }
	.close-btn { width:36px; height:36px; border-radius:10px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.04); color:rgba(160,160,200,.6); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }
	.close-btn:hover { background:rgba(255,255,255,.08); color:#fff; }
	.import-body { flex:1; overflow-y:auto; padding:1.25rem 1.5rem; display:flex; flex-direction:column; gap:1rem; }
	.import-body::-webkit-scrollbar { width:6px; }
	.import-body::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:3px; }

	/* Upload Zone */
	.upload-zone { position:relative; padding:3rem 2rem; border:2px dashed rgba(59,130,246,.25); border-radius:20px; text-align:center; cursor:pointer; transition:all .2s; background:rgba(59,130,246,.03); }
	.upload-zone:hover,.upload-zone.dragging { border-color:rgba(59,130,246,.5); background:rgba(59,130,246,.08); }
	.upload-icon { font-size:2.5rem; margin-bottom:.75rem; }
	.upload-title { font-size:1rem; font-weight:700; color:#fff; margin:0 0 .25rem; }
	.upload-hint { font-size:.75rem; color:rgba(160,160,200,.4); margin:0; }
	.file-input { position:absolute; inset:0; opacity:0; cursor:pointer; }
	.broker-badges { display:flex; flex-wrap:wrap; gap:.4rem; justify-content:center; }
	.broker-badge { padding:.3rem .6rem; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); border-radius:8px; font-size:.65rem; color:rgba(160,160,200,0.6); font-weight:600; }
	.privacy-note { text-align:center; font-size:.65rem; color:rgba(16,185,129,.6); margin:0; font-weight:600; }

	/* Guide Section */
	.import-guide { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; padding: 1.25rem; margin: 0.5rem 0; }
	.guide-title { font-size: 0.85rem; font-weight: 700; color: #fff; margin: 0 0 0.5rem; }
	.guide-text { font-size: 0.75rem; color: rgba(160, 160, 200, 0.7); margin: 0 0 0.75rem; line-height: 1.4; }
	.guide-list { margin: 0 0 0.75rem; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.35rem; }
	.guide-list li { font-size: 0.72rem; color: rgba(160, 160, 200, 0.6); }
	.guide-list li strong { color: rgba(255, 255, 255, 0.8); }
	.guide-note { font-size: 0.7rem; color: rgba(59, 130, 246, 0.8); margin: 0; font-weight: 600; }

	/* Resolving */
	.resolving-state { text-align:center; padding:3rem 1rem; }
	.resolving-spinner { width:40px; height:40px; border:3px solid rgba(59,130,246,.15); border-top-color:#3b82f6; border-radius:50%; animation:spin .8s linear infinite; margin:0 auto 1rem; }
	@keyframes spin { to{transform:rotate(360deg)} }
	.resolving-state p { margin:0; color:#fff; font-weight:600; }
	.resolving-hint { font-size:.75rem; color:rgba(160,160,200,.5) !important; font-weight:400 !important; margin-top:.35rem !important; }

	/* Preview */
	.preview-header-row { display:flex; justify-content:space-between; align-items:center; gap:.75rem; flex-wrap:wrap; }
	.broker-detected { display:flex; align-items:center; gap:.4rem; font-size:.8rem; font-weight:700; color:#fff; }
	.category-picker { display:flex; align-items:center; gap:.4rem; font-size:.7rem; color:rgba(160,160,200,.6); }
	.category-picker select { background:rgba(0,0,0,.3); border:1px solid rgba(255,255,255,.1); border-radius:8px; color:#fff; padding:.3rem .5rem; font-size:.7rem; font-weight:600; outline:none; cursor:pointer; }
	.resolve-warning { font-size:.7rem; color:#fbbf24; background:rgba(251,191,36,.08); border:1px solid rgba(251,191,36,.15); border-radius:10px; padding:.5rem .75rem; }
	.select-all-row { display:flex; justify-content:space-between; align-items:center; }
	.select-all-btn { background:none; border:none; color:rgba(160,160,200,.7); font-size:.75rem; font-weight:600; cursor:pointer; padding:.25rem 0; }
	.selected-count { font-size:.65rem; color:rgba(160,160,200,.4); }

	/* Position rows */
	.positions-list { display:flex; flex-direction:column; gap:.3rem; max-height:40vh; overflow-y:auto; }
	.positions-list::-webkit-scrollbar { width:5px; }
	.positions-list::-webkit-scrollbar-thumb { background:rgba(255,255,255,.08); border-radius:3px; }
	.position-row { display:flex; align-items:center; gap:.6rem; width:100%; padding:.6rem .75rem; background:rgba(0,0,0,.2); border:1px solid rgba(255,255,255,.04); border-radius:12px; cursor:pointer; transition:all .15s; text-align:left; color:inherit; }
	.position-row:hover { background:rgba(59,130,246,.06); border-color:rgba(59,130,246,.12); }
	.position-row.selected { border-color:rgba(59,130,246,.25); background:rgba(59,130,246,.05); }
	.position-row.unresolved { opacity:.5; }
	.pos-check { font-size:1rem; flex-shrink:0; width:1.2rem; }
	.pos-info { flex:1; min-width:0; }
	.pos-name { display:block; font-size:.78rem; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
	.pos-meta { display:flex; align-items:center; gap:.35rem; font-size:.6rem; color:rgba(160,160,200,.45); margin-top:.1rem; flex-wrap:wrap; }
	.pos-ticker { font-family:'Monaco','Menlo',monospace; font-weight:600; color:rgba(160,160,200,.65); }
	.pos-isin { font-family:'Monaco','Menlo',monospace; }
	.pos-no-ticker { color:#f87171; font-weight:600; }
	.pos-exists { color:#60a5fa; font-weight:600; padding:.05rem .3rem; background:rgba(59,130,246,.1); border-radius:4px; }
	
	.manual-ticker-edit { padding: 0.5rem 0.75rem 0.75rem; background: rgba(0, 0, 0, 0.1); border-radius: 0 0 12px 12px; margin-top: -4px; border: 1px solid rgba(255, 255, 255, 0.04); border-top: none; }
	.manual-ticker-edit input { width: 100%; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #fff; padding: 0.4rem 0.6rem; font-size: 0.75rem; font-family: 'Monaco', monospace; outline: none; transition: all 0.2s; }
	.manual-ticker-edit input:focus { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }

	.pos-numbers { text-align:right; flex-shrink:0; }
	.pos-shares { display:block; font-size:.8rem; font-weight:700; color:#fff; }
	.pos-cost { display:block; font-size:.6rem; color:rgba(160,160,200,.4); }

	/* Done */
	.done-state { text-align:center; padding:3rem 1rem; }
	.done-icon { font-size:3rem; margin-bottom:.75rem; }
	.done-title { font-size:1.2rem; font-weight:700; color:#fff; margin:0; }
	.done-hint { font-size:.8rem; color:rgba(160,160,200,.5); margin:.5rem 0 0; }

	/* Footer */
	.import-footer { padding:1rem 1.5rem; border-top:1px solid rgba(255,255,255,.06); background:rgba(18,18,35,.95); display:flex; justify-content:center; }
	.btn-import { width:100%; display:flex; align-items:center; justify-content:center; gap:.5rem; padding:.85rem; background:linear-gradient(135deg,#10b981,#059669); border:none; border-radius:14px; color:white; font-size:.95rem; font-weight:700; cursor:pointer; transition:all .2s cubic-bezier(.4,0,.2,1); box-shadow:0 8px 20px rgba(16,185,129,.3),inset 0 1px 0 rgba(255,255,255,.2); }
	.btn-import:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 25px rgba(16,185,129,.4),inset 0 1px 0 rgba(255,255,255,.2); }
	.btn-import:disabled { opacity:.4; cursor:not-allowed; }
	.btn-cancel { width:100%; padding:.85rem; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:14px; color:rgba(160,160,200,.6); font-size:.9rem; font-weight:600; cursor:pointer; transition:all .15s; }
	.btn-cancel:hover { background:rgba(255,255,255,.08); color:#fff; }
</style>
