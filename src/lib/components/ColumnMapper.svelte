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

	/**
	 * El análisis de columnas se calculaba **dos veces** —aquí y dentro de
	 * `calculatedScore`— sobre las mismas cabeceras y las mismas filas.
	 */
	const analysis = $derived(analyzeColumns(headers, rows));

	/**
	 * ⚠️ **Esto era un `$effect`, y por serlo el usuario no podía desasignar una
	 * columna.** El efecto leía los ocho campos que él mismo escribía
	 * (`if (mapping.shares === -1) mapping.shares = …`), así que `mapping` era su
	 * propia dependencia. Y `-1` no es un estado transitorio: es una **opción
	 * elegible** en los ocho desplegables («No disponible», «Auto-generar»,
	 * «Auto (EUR)», «No disponible (Posición simple)»…). En cuanto elegías una de
	 * ellas en un campo para el que el analizador tenía sugerencia, el efecto se
	 * auto-disparaba, veía `=== -1` y te volvía a meter la sugerencia: el
	 * desplegable rebotaba solo. En el importador, que es por donde entra la
	 * mayoría de las carteras reales.
	 *
	 * No era un efecto, era una **inicialización**. `ColumnMapper` se monta dentro
	 * de `{:else if step === 'mapping'}` en `ImportModal` y volver atrás lo
	 * desmonta, así que `headers`/`rows` no cambian mientras vive: calcularlo una
	 * vez al construir el estado es exactamente equivalente, y ya no hay nada que
	 * pueda pisar lo que el usuario elija después.
	 */
	function mapeoInicial(): MappingConfig {
		const sugerencia = suggestMappingFromAnalysis(analysis);
		const de = (campo: keyof MappingConfig) => initialMapping?.[campo] ?? sugerencia[campo] ?? -1;
		return {
			shares: de('shares'),
			isin: de('isin'),
			ticker: de('ticker'),
			name: de('name'),
			avgCost: de('avgCost'),
			currency: de('currency'),
			date: de('date'),
			type: de('type')
		};
	}

	let mapping = $state<MappingConfig>(mapeoInicial());

	const calculatedScore = $derived.by(() => {
		if (mappingScore !== undefined) return mappingScore;

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
	.mapper-hint { font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; margin: 0; }
	
	.score-indicator {
		font-size: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		margin-top: 0.5rem;
		background: rgba(251, 191, 36, 0.08);
		border: 1px solid rgba(251, 191, 36, 0.2);
		color: var(--accent-orange-ink);
	}
	.score-indicator.high {
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.2);
		color: var(--state-positive);
	}
	.score-indicator.low {
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		color: var(--state-negative);
	}

	.mapping-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
	.mapping-field { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.75rem; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; transition: all 0.2s; }
	.mapping-field.active { border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.05); }
	.mapping-field.required label::after { content: ' *'; color: var(--state-negative); }
	
	label { font-size: 0.65rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.02em; }
	select { background: var(--bg-card-hover); border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-primary); padding: 0.45rem; font-size: 0.8rem; outline: none; cursor: pointer; }
	select:focus { border-color: var(--accent-blue); }

	.preview-table-container { background: var(--bg-card-hover); border-radius: 12px; border: 1px solid var(--border-subtle); padding: 0.75rem; }
	.preview-scroll { overflow-x: auto; }
	.preview-title { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); margin: 0 0 0.5rem; text-transform: uppercase; }
	.preview-table { width: 100%; border-collapse: collapse; font-size: 0.7rem; color: var(--text-secondary); }
	.preview-table th { text-align: left; padding: 0.4rem; color: var(--text-faint); border-bottom: 1px solid var(--border-subtle); }
	.preview-table td { padding: 0.4rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; border-bottom: 1px solid var(--border-subtle); }

	.mapper-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
	.btn-primary { flex: 1; padding: 0.85rem; background: var(--accent-blue); border: none; border-radius: 12px; color: var(--text-on-accent); font-weight: 700; cursor: pointer; transition: all 0.2s; }
	.btn-primary:hover:not(:disabled) { background: var(--accent-blue); transform: translateY(-1px); }
	.btn-primary:disabled { opacity: 0.4; cursor:not-allowed; }
	.btn-secondary { padding: 0.85rem 1.5rem; background: var(--bg-card-hover); border: 1px solid var(--border-subtle); border-radius: 12px; color: var(--text-primary); font-weight: 600; cursor: pointer; }
</style>
