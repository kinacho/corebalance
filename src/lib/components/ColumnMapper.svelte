<script lang="ts">
	import type { MappingConfig } from '$lib/importers';
	import { normalizeHeader, analyzeColumns, suggestMappingFromAnalysis } from '$lib/importers/csv-utils';
	import { LL } from '$lib/i18n/i18n-svelte';

	interface Props {
		headers: string[];
		rows: string[][];
		onConfirm: (mapping: MappingConfig) => void;
		onBack: () => void;
		initialMapping?: Partial<MappingConfig>;
		mappingScore?: number;      // 0..1, score global
	}

	let { headers, rows, onConfirm, onBack, initialMapping, mappingScore }: Props = $props();

	let mapping = $state<MappingConfig>({
		shares: -1,
		isin: -1,
		ticker: -1,
		name: -1,
		avgCost: -1,
		currency: -1,
		date: -1,
		type: -1
	});

	$effect(() => {
		// 1. Obtener sugerencia del motor analítico
		const analysis = analyzeColumns(headers, rows);
		const suggestion = suggestMappingFromAnalysis(analysis);

		// 2. Aplicar sugerencias o valores predeterminados (priorizando initialMapping de props si existe)
		if (mapping.shares === -1) mapping.shares = initialMapping?.shares ?? suggestion.shares ?? -1;
		if (mapping.isin === -1) mapping.isin = initialMapping?.isin ?? suggestion.isin ?? -1;
		if (mapping.ticker === -1) mapping.ticker = initialMapping?.ticker ?? suggestion.ticker ?? -1;
		if (mapping.name === -1) mapping.name = initialMapping?.name ?? suggestion.name ?? -1;
		if (mapping.avgCost === -1) mapping.avgCost = initialMapping?.avgCost ?? suggestion.avgCost ?? -1;
		if (mapping.currency === -1) mapping.currency = initialMapping?.currency ?? suggestion.currency ?? -1;
		if (mapping.date === -1) mapping.date = initialMapping?.date ?? suggestion.date ?? -1;
		if (mapping.type === -1) mapping.type = initialMapping?.type ?? suggestion.type ?? -1;
	});

	const calculatedScore = $derived.by(() => {
		if (mappingScore !== undefined) return mappingScore;
		
		const analysis = analyzeColumns(headers, rows);
		let totalScore = 0;
		let count = 0;

		const checkScore = (role: 'quantity' | 'isin' | 'ticker' | 'name' | 'price' | 'currency' | 'date' | 'type', colIdx: number | undefined) => {
			if (colIdx !== undefined && colIdx !== -1 && colIdx < analysis.length) {
				totalScore += analysis[colIdx].roleScores[role] || 0;
				count++;
			}
		};

		checkScore('quantity', mapping.shares);
		checkScore('isin', mapping.isin);
		checkScore('ticker', mapping.ticker);
		checkScore('name', mapping.name);
		checkScore('price', mapping.avgCost);
		checkScore('currency', mapping.currency);
		checkScore('date', mapping.date);
		checkScore('type', mapping.type);

		return count > 0 ? totalScore / count : 0;
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
				currency: mapping.currency === -1 ? undefined : mapping.currency,
				date: mapping.date === -1 ? undefined : mapping.date,
				type: mapping.type === -1 ? undefined : mapping.type
			};
			onConfirm(finalMapping);
		}
	}
</script>

<div class="mapper-container">
	<div class="mapper-info">
		<p class="mapper-hint">{$LL.import.mapper_hint()}</p>
		
		{#if calculatedScore > 0}
			<div class="score-indicator" class:low={calculatedScore < 0.6} class:high={calculatedScore >= 0.8}>
				{@html $LL.import.mapper_coverage({ score: Math.round(calculatedScore * 100) })} 
				{#if calculatedScore < 0.6}
					{$LL.import.mapper_warning()}
				{:else}
					{$LL.import.mapper_success()}
				{/if}
			</div>
		{/if}
	</div>

	<div class="mapping-grid">
		<div class="mapping-field" class:required={true} class:active={mapping.isin !== -1}>
			<label for="col-isin">{$LL.import.col_isin()}</label>
			<select id="col-isin" bind:value={mapping.isin}>
				<option value={-1}>{$LL.import.col_not_available()}</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:active={mapping.ticker !== -1}>
			<label for="col-ticker">{$LL.import.col_ticker()}</label>
			<select id="col-ticker" bind:value={mapping.ticker}>
				<option value={-1}>{$LL.import.col_not_available()}</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:required={true} class:active={mapping.shares !== -1}>
			<label for="col-shares">{$LL.import.col_shares()}</label>
			<select id="col-shares" bind:value={mapping.shares}>
				<option value={-1}>{$LL.import.col_select()}</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:active={mapping.name !== -1}>
			<label for="col-name">{$LL.import.col_name()}</label>
			<select id="col-name" bind:value={mapping.name}>
				<option value={-1}>{$LL.import.col_auto_generate()}</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:active={mapping.avgCost !== -1}>
			<label for="col-cost">{$LL.import.col_cost()}</label>
			<select id="col-cost" bind:value={mapping.avgCost}>
				<option value={-1}>{$LL.import.col_not_available_zero()}</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:active={mapping.currency !== -1}>
			<label for="col-currency">{$LL.import.col_currency()}</label>
			<select id="col-currency" bind:value={mapping.currency}>
				<option value={-1}>{$LL.import.col_auto_eur()}</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:active={mapping.date !== -1}>
			<label for="col-date">{$LL.import.col_date()}</label>
			<select id="col-date" bind:value={mapping.date}>
				<option value={-1}>{$LL.import.col_not_available_simple()}</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>

		<div class="mapping-field" class:active={mapping.type !== -1}>
			<label for="col-type">{$LL.import.col_type()}</label>
			<select id="col-type" bind:value={mapping.type}>
				<option value={-1}>{$LL.import.col_auto_buy()}</option>
				{#each headers as header, i}
					<option value={i}>{header}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="preview-table-container">
		<p class="preview-title">{$LL.import.preview_title()}</p>
		<div class="preview-scroll">
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
	</div>

	<div class="mapper-actions">
		<button class="btn-secondary" onclick={onBack}>{$LL.import.btn_back()}</button>
		<button class="btn-primary" onclick={handleConfirm} disabled={!isValid}>
			{$LL.import.btn_continue()}
		</button>
	</div>
</div>

<style>
	.mapper-container { display: flex; flex-direction: column; gap: 1.25rem; }
	.mapper-hint { font-size: 0.8rem; color: rgba(160, 160, 200, 0.6); line-height: 1.4; margin: 0; }
	
	.score-indicator {
		font-size: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		margin-top: 0.5rem;
		background: rgba(251, 191, 36, 0.08);
		border: 1px solid rgba(251, 191, 36, 0.2);
		color: #fbbf24;
	}
	.score-indicator.high {
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.2);
		color: #34d399;
	}
	.score-indicator.low {
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		color: #f87171;
	}

	.mapping-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
	.mapping-field { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.75rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; transition: all 0.2s; }
	.mapping-field.active { border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.05); }
	.mapping-field.required label::after { content: ' *'; color: #f87171; }
	
	label { font-size: 0.65rem; font-weight: 700; color: rgba(160, 160, 200, 0.8); text-transform: uppercase; letter-spacing: 0.02em; }
	select { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #fff; padding: 0.45rem; font-size: 0.8rem; outline: none; cursor: pointer; }
	select:focus { border-color: #3b82f6; }

	.preview-table-container { background: rgba(0, 0, 0, 0.2); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 0.75rem; }
	.preview-scroll { overflow-x: auto; }
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
