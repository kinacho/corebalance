<script lang="ts">
	import type { MappingConfig } from '$lib/importers';

	interface Props {
		headers: string[];
		rows: string[][];
		onConfirm: (mapping: MappingConfig) => void;
		onBack: () => void;
	}

	let { headers, rows, onConfirm, onBack }: Props = $props();

	let mapping = $state<MappingConfig>({
		shares: -1,
		isin: -1,
		ticker: -1,
		name: -1,
		avgCost: -1,
		currency: -1
	});

	// Intento de auto-mapeo inicial basado en nombres comunes
	import { normalizeHeader } from '$lib/importers/csv-utils';
	
	$effect(() => {
		const normalized = headers.map(normalizeHeader);
		
		const findIdx = (names: string[]) => {
			return normalized.findIndex(h => names.some(n => h.includes(normalizeHeader(n))));
		};

		if (mapping.shares === -1) mapping.shares = findIdx(['cantidad', 'shares', 'units', 'participaciones', 'posicion']);
		if (mapping.isin === -1) mapping.isin = findIdx(['isin', 'codigo']);
		if (mapping.ticker === -1) mapping.ticker = findIdx(['ticker', 'symbol', 'simbolo', 'codigo']);
		if (mapping.name === -1) mapping.name = findIdx(['nombre', 'name', 'producto', 'descripcion']);
		if (mapping.avgCost === -1) mapping.avgCost = findIdx(['precio medio', 'avg cost', 'coste', 'price']);
		if (mapping.currency === -1) mapping.currency = findIdx(['moneda', 'currency', 'divisa']);
	});

	const isValid = $derived(mapping.shares !== -1 && (mapping.isin !== -1 || mapping.ticker !== -1));

	function handleConfirm() {
		if (isValid) {
			// Convertir -1 a undefined para el parser
			const finalMapping: MappingConfig = {
				shares: mapping.shares,
				isin: mapping.isin === -1 ? undefined : mapping.isin,
				ticker: mapping.ticker === -1 ? undefined : mapping.ticker,
				name: mapping.name === -1 ? undefined : mapping.name,
				avgCost: mapping.avgCost === -1 ? undefined : mapping.avgCost,
				currency: mapping.currency === -1 ? undefined : mapping.currency
			};
			onConfirm(finalMapping);
		}
	}
</script>

<div class="mapper-container">
	<div class="mapper-info">
		<p class="mapper-hint">Asigna cada campo a una columna de tu archivo para que podamos importar los datos correctamente.</p>
	</div>

	<div class="mapping-grid">
		<div class="mapping-field" class:required={true} class:active={mapping.isin !== -1}>
			<label for="col-isin">ISIN</label>
			<select id="col-isin" bind:value={mapping.isin}>
				<option value={-1}>No disponible</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:active={mapping.ticker !== -1}>
			<label for="col-ticker">Ticker / Símbolo</label>
			<select id="col-ticker" bind:value={mapping.ticker}>
				<option value={-1}>No disponible</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:required={true} class:active={mapping.shares !== -1}>
			<label for="col-shares">Cantidad (Acciones)</label>
			<select id="col-shares" bind:value={mapping.shares}>
				<option value={-1}>Seleccionar columna...</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:active={mapping.name !== -1}>
			<label for="col-name">Nombre Activo</label>
			<select id="col-name" bind:value={mapping.name}>
				<option value={-1}>Auto-generar</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:active={mapping.avgCost !== -1}>
			<label for="col-cost">Precio Medio / Coste</label>
			<select id="col-cost" bind:value={mapping.avgCost}>
				<option value={-1}>No disponible (0)</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:active={mapping.currency !== -1}>
			<label for="col-currency">Divisa</label>
			<select id="col-currency" bind:value={mapping.currency}>
				<option value={-1}>Auto (EUR)</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="preview-table-container">
		<p class="preview-title">Vista previa de los datos:</p>
		<table class="preview-table">
			<thead>
				<tr>
					{#each headers as header}
						<th>{header}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows.slice(0, 3) as row}
					<tr>
						{#each row as cell}
							<td>{cell}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="mapper-actions">
		<button class="btn-secondary" onclick={onBack}>Atrás</button>
		<button class="btn-primary" onclick={handleConfirm} disabled={!isValid}>
			Continuar
		</button>
	</div>
</div>

<style>
	.mapper-container { display: flex; flex-direction: column; gap: 1.25rem; }
	.mapper-hint { font-size: 0.8rem; color: rgba(160, 160, 200, 0.6); line-height: 1.4; margin: 0; }
	
	.mapping-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
	.mapping-field { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.75rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; transition: all 0.2s; }
	.mapping-field.active { border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.05); }
	.mapping-field.required label::after { content: ' *'; color: #f87171; }
	
	label { font-size: 0.65rem; font-weight: 700; color: rgba(160, 160, 200, 0.8); text-transform: uppercase; letter-spacing: 0.02em; }
	select { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #fff; padding: 0.45rem; font-size: 0.8rem; outline: none; cursor: pointer; }
	select:focus { border-color: #3b82f6; }

	.preview-table-container { overflow-x: auto; background: rgba(0, 0, 0, 0.2); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 0.75rem; }
	.preview-title { font-size: 0.7rem; font-weight: 700; color: rgba(160, 160, 200, 0.5); margin: 0 0 0.5rem; text-transform: uppercase; }
	.preview-table { width: 100%; border-collapse: collapse; font-size: 0.7rem; color: rgba(255, 255, 255, 0.7); }
	.preview-table th { text-align: left; padding: 0.4rem; color: rgba(160, 160, 200, 0.4); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
	.preview-table td { padding: 0.4rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); }

	.mapper-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
	.btn-primary { flex: 1; padding: 0.85rem; background: #3b82f6; border: none; border-radius: 12px; color: #fff; font-weight: 700; cursor: pointer; transition: all 0.2s; }
	.btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
	.btn-primary:disabled { opacity: 0.4; cursor:not-allowed; }
	.btn-secondary { padding: 0.85rem 1.5rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; color: #fff; font-weight: 600; cursor: pointer; }
</style>
