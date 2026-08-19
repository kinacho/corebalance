<script lang="ts">
	import type { RebalanceResult } from '$lib/types';
	import { formatEUR, formatPercent, formatShares } from '$lib/utils';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { LL } from '$lib/i18n/i18n-svelte';
	import LeccionDelPanel from './LeccionDelPanel.svelte';
	import PanelHerramienta from './PanelHerramienta.svelte';

	interface Props {
		contribution: number;
		result: RebalanceResult | null;
		onContributionChange: (value: number) => void;
		/**
		 * ⚠️ Abierto/cerrado ya no vive aquí, y el motivo es el que el comentario que
		 * había en su sitio explicaba a medias: el tutorial abre este panel con
		 * `abrir-rebalance` porque señalar una cabecera plegada —86 px medidos— mientras
		 * el globo habla de «cuánto comprar este mes» es señalar a un sitio correcto que
		 * no enseña nada. Ese listener sigue existiendo; lo escucha la concha, y quien
		 * decide es el padre, porque la columna abre **una herramienta a la vez** y eso
		 * no puede decidirlo un panel que no sabe de sus hermanos.
		 */
		abierto: boolean;
		onAlternar: (abrir: boolean) => void;
	}

	let { contribution, result, onContributionChange, abierto, onAlternar }: Props = $props();

	let isEditing = $state(false);
	let editValue = $state('');

	const displayValue = $derived(contribution > 0 ? contribution.toString() : '');

	const currentWeightMap = $derived.by(() => {
		const map = new Map<string, number>();
		portfolio.portfolioState.positions.forEach(pos => {
			map.set(pos.asset.ticker, pos.currentWeight);
		});
		return map;
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		editValue = target.value;
		isEditing = true;
		const parsed = parseFloat(target.value);
		if (!isNaN(parsed) && parsed >= 0) {
			onContributionChange(parsed);
		} else if (target.value === '' || target.value === '0') {
			onContributionChange(0);
		}
	}

	function handleBlur() {
		isEditing = false;
	}

	function handleFocus(e: Event) {
		const target = e.target as HTMLInputElement;
		editValue = target.value;
		isEditing = true;
	}
</script>

<PanelHerramienta
	id="tour-rebalance"
	titulo={$LL.rebalance_panel.title()}
	subtitulo={$LL.rebalance_panel.subtitle()}
	objetivoTour="abrir-rebalance"
	{abierto}
	{onAlternar}
>
	{#snippet icono()}
		<!-- Dos flechas cruzadas: mover dinero de donde sobra a donde falta. -->
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
			<path d="M4 8h13l-3-3" />
			<path d="M20 16H7l3 3" />
		</svg>
	{/snippet}

	{#snippet cifra()}
		<!--
			La aportación puesta, que es un dato **persistido** y es la única respuesta que
			este panel puede dar en cerrado. Deliberadamente no `newTotalCapital` (ya está en
			el héroe) ni el número de compras (un recuento sin significado).
		-->
		{#if contribution > 0}
			<span class="cifra privacy-blur">{formatEUR(contribution)}</span>
		{/if}
	{/snippet}

	<!-- Dentro del contenido y no en la cabecera: la cabecera es un `<button>`, y un
	     enlace dentro de un botón es HTML inválido y además le roba el clic. -->
	<LeccionDelPanel panel="rebalance" />
				<div class="input-section">
					<label class="input-label" for="contribution-input">
						{$LL.rebalance_panel.input_label()}
					</label>
					<div class="input-container">
						<input
							id="contribution-input"
							type="number"
							class="contribution-input no-privacy-blur"
							value={isEditing ? editValue : displayValue}
							oninput={handleInput}
							onblur={handleBlur}
							onfocus={handleFocus}
							onwheel={(e) => e.preventDefault()}
							min="0"
							step="50"
							placeholder="0"
							inputmode="decimal"
						/>
						<span class="currency">€</span>
					</div>
					{#if !result || result.totalContribution === 0}
						<p class="hint">{$LL.rebalance_panel.input_placeholder()}</p>
					{/if}
				</div>

				{#if result && result.totalContribution > 0}
					<div class="results-section">
						<h3 class="section-heading">{$LL.rebalance_panel.recommended_heading()}</h3>

						<div class="alloc-list">
							{#each result.allocations as alloc}
								<div class="alloc-row" style="--accent: {alloc.asset.color}">
									<div class="alloc-left">
										<span class="alloc-emoji">{alloc.asset.icon || '📈'}</span>
										<div class="alloc-meta">

											<span class="alloc-name">{alloc.asset.name}</span>
											<span class="alloc-shares privacy-blur">
												{$LL.rebalance_panel.shares_to_buy({ shares: formatShares(alloc.sharesToBuy) })}
											</span>
										</div>
									</div>
									<div class="alloc-right">
										<span class="alloc-value privacy-blur">{formatEUR(alloc.amountToInvest)}</span>
										<span class="alloc-percent">→ {formatPercent(alloc.resultingWeight)}</span>
									</div>
								</div>
							{/each}
						</div>

						<!-- Weight Comparison: Before vs After -->
						<div class="weight-comparison">
							<h4 class="comparison-heading">{$LL.rebalance_panel.convergence_heading()}</h4>
							{#each result.allocations as alloc}
								{@const currentW = currentWeightMap.get(alloc.asset.ticker) ?? 0}
								{@const targetW = alloc.asset.targetWeight}
								{@const resultW = alloc.resultingWeight}
								{@const deviationBefore = Math.abs(currentW - targetW)}
								{@const deviationAfter = Math.abs(resultW - targetW)}
								{@const improvement = deviationBefore > 0 ? ((deviationBefore - deviationAfter) / deviationBefore) * 100 : 0}
								<div class="comparison-row">
									<div class="comparison-label">
										<span class="comparison-dot" style="background: {alloc.asset.color};"></span>
										<span class="comparison-name" title={alloc.asset.name}>{alloc.asset.name}</span>
									</div>
									<div class="comparison-bars">
										<div class="bar-track">
											<!-- Target line -->
											<div class="target-line" style="left: {Math.min(targetW * 100, 100)}%;"></div>
											<!-- Before bar -->
											<div class="bar-before" style="width: {Math.min(currentW * 100, 100)}%;"></div>
											<!-- After bar -->
											<div class="bar-after" style="width: {Math.min(resultW * 100, 100)}%; background: {alloc.asset.color};"></div>
										</div>
									</div>
									<div class="convergence-info">
										{#if deviationBefore > 0.001}
											<span class="convergence-label" class:improved={improvement > 0}>
												{improvement > 0 ? '→' : ''} {Math.abs(resultW * 100).toFixed(1)}%
											</span>
										{:else}
											<span class="convergence-label perfect">✓</span>
										{/if}
									</div>
								</div>
							{/each}
							<div class="comparison-legend">
								<span class="legend-item"><span class="legend-dot before"></span>{$LL.rebalance_panel.legend_actual()}</span>
								<span class="legend-item"><span class="legend-dot after"></span>{$LL.rebalance_panel.legend_after()}</span>
								<span class="legend-item"><span class="legend-line"></span>{$LL.rebalance_panel.legend_target()}</span>
							</div>
						</div>

						<div class="total-summary">
							<span class="total-label">{$LL.rebalance_panel.new_capital()}</span>
							<span class="total-value privacy-blur">{formatEUR(result.newTotalCapital)}</span>
						</div>
					</div>
				{/if}
</PanelHerramienta>

<style>
	/* El armazón plegable vive en `PanelHerramienta.svelte`; aquí solo el contenido. */

	.input-section {
		padding: 1rem;
		background: var(--bg-card-hover);
		border-radius: 16px;
		border: 1px solid var(--border-subtle);
	}

	.input-label {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--text-faint);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
		display: block;
	}

	.input-container {
		position: relative;
		display: flex;
		align-items: center;
	}

	.contribution-input {
		width: 100%;
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 0.75rem 1rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		transition: all 0.2s ease;
	}

	.contribution-input:focus {
		outline: none;
		border-color: var(--accent-blue);
		background: var(--bg-card-hover);
	}

	.currency {
		position: absolute;
		right: 1rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-faint);
	}

	.hint {
		font-size: 0.7rem;
		color: var(--text-faint);
		text-align: center;
		margin-top: 0.75rem;
	}

	.results-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-heading {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--text-faint);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.alloc-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.alloc-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		background: var(--bg-card);
		border-radius: 12px;
		border-left: 3px solid var(--accent);
		transition: transform 0.2s ease;
	}

	.alloc-row:hover {
		transform: translateX(4px);
		background: var(--bg-card);
	}

	.alloc-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.alloc-emoji {
		font-size: 1.25rem;
	}

	.alloc-meta {
		display: flex;
		flex-direction: column;
	}

	.alloc-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.alloc-shares {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.alloc-right {
		text-align: right;
		display: flex;
		flex-direction: column;
	}

	.alloc-value {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--state-positive);
	}

	.alloc-percent {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-faint);
	}

	.total-summary {
		margin-top: 0.5rem;
		padding: 1rem;
		background: var(--bg-card);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.total-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-faint);
	}

	.total-value {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	/* Remove arrows from number input */
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	input[type=number] {
		-moz-appearance: textfield;
		appearance: textfield;
	}

	/* === Weight Comparison Section === */
	.weight-comparison {
		margin-top: 1rem;
		padding: 1rem;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.comparison-heading {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--text-faint);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.25rem 0;
	}

	.comparison-row {
		display: grid;
		grid-template-columns: 140px 1fr 45px;
		align-items: center;
		gap: 0.5rem;
	}

	.comparison-label {
		display: flex;
		align-items: center;
		gap: 0.75rem; /* Aumentado ligeramente para más aire */
		overflow: hidden;
		padding-left: 0.25rem; /* Margen extra para el punto */
	}

	.comparison-dot {
		width: 8px; /* Punto ligeramente más grande y visible */
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.comparison-name {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.comparison-bars {
		position: relative;
	}

	.bar-track {
		position: relative;
		height: 14px;
		background: var(--bg-card);
		border-radius: 4px;
		overflow: visible;
	}

	.bar-before {
		position: absolute;
		top: 0;
		left: 0;
		height: 6px;
		background: rgba(255, 255, 255, 0.12);
		border-radius: 3px 3px 0 0;
		transition: width 0.3s ease;
	}

	.bar-after {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 6px;
		border-radius: 0 0 3px 3px;
		opacity: 0.7;
		transition: width 0.3s ease;
	}

	.target-line {
		position: absolute;
		top: -2px;
		bottom: -2px;
		width: 2px;
		background: rgba(255, 255, 255, 0.4);
		border-radius: 1px;
		z-index: 2;
		transform: translateX(-1px);
	}

	.target-line::after {
		content: '';
		position: absolute;
		top: -1px;
		left: -1px;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.5);
	}

	.convergence-info {
		text-align: right;
	}

	.convergence-label {
		font-size: 0.62rem;
		font-weight: 700;
		color: var(--text-faint);
		white-space: nowrap;
	}

	.convergence-label.improved {
		color: var(--state-positive);
	}

	.convergence-label.perfect {
		color: var(--state-positive);
	}

	.comparison-legend {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		margin-top: 0.25rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-subtle);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.58rem;
		font-weight: 600;
		color: var(--text-faint);
	}

	.legend-dot {
		width: 8px;
		height: 4px;
		border-radius: 2px;
	}

	.legend-dot.before {
		background: rgba(255, 255, 255, 0.15);
	}

	.legend-dot.after {
		background: var(--accent-blue);
		opacity: 0.7;
	}

	.legend-line {
		width: 8px;
		height: 2px;
		background: rgba(255, 255, 255, 0.4);
		border-radius: 1px;
	}

	/* Comparison row adaptable en pantallas estrechas */
	@media (max-width: 420px) {
		.comparison-row {
			grid-template-columns: 100px 1fr 40px;
		}

		.comparison-name {
			font-size: 0.62rem;
		}
	}
</style>
