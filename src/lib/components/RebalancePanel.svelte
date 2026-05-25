<script lang="ts">
	import type { RebalanceResult } from '$lib/types';
	import { formatEUR, formatPercent, formatShares } from '$lib/utils';
	import { portfolio } from '$lib/stores/portfolio.svelte';

	interface Props {
		contribution: number;
		result: RebalanceResult | null;
		onContributionChange: (value: number) => void;
	}

	let { contribution, result, onContributionChange }: Props = $props();

	let isOpen = $state(false);
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

<div id="tour-rebalance" class="panel" class:open={isOpen}>
	<button class="panel-header" onclick={() => isOpen = !isOpen} aria-expanded={isOpen}>

		<div class="panel-info">
			<div class="panel-icon">💰</div>
			<div class="panel-text">
				<h2 class="panel-title">Rebalanceo por Aportación</h2>
				<p class="panel-subtitle">Distribuye tu nueva inversión</p>
			</div>
		</div>
		<span class="chevron" class:rotated={!isOpen}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<path d="M6 9l6 6 6-6" />
			</svg>
		</span>
	</button>

	<div class="collapsible" class:collapsed={!isOpen}>
		<div class="wrapper">
			<div class="content">
				<div class="input-section">
					<label class="input-label" for="contribution-input">
						Nueva Aportación Mensual
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
						<p class="hint">Introduce una cantidad para calcular</p>
					{/if}
				</div>

				{#if result && result.totalContribution > 0}
					<div class="results-section">
						<h3 class="section-heading">Distribución Recomendada</h3>

						<div class="alloc-list">
							{#each result.allocations as alloc}
								<div class="alloc-row" style="--accent: {alloc.asset.color}">
									<div class="alloc-left">
										<span class="alloc-emoji">{alloc.asset.icon || '📈'}</span>
										<div class="alloc-meta">

											<span class="alloc-name">{alloc.asset.name}</span>
											<span class="alloc-shares privacy-blur">
												+{formatShares(alloc.sharesToBuy)} títulos
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
							<h4 class="comparison-heading">Convergencia de Pesos</h4>
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
								<span class="legend-item"><span class="legend-dot before"></span>Actual</span>
								<span class="legend-item"><span class="legend-dot after"></span>Tras aportación</span>
								<span class="legend-item"><span class="legend-line"></span>Objetivo</span>
							</div>
						</div>

						<div class="total-summary">
							<span class="total-label">Nuevo Capital Total</span>
							<span class="total-value privacy-blur">{formatEUR(result.newTotalCapital)}</span>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.panel {
		width: 100%;
		background: rgba(255, 255, 255, 0.03);

		backdrop-filter: blur(24px) saturate(200%);
		-webkit-backdrop-filter: blur(24px) saturate(200%);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 24px;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.panel:hover {
		border-color: rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.05);
	}

	.panel-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 0.2s ease;
	}

	.panel-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.panel-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		font-size: 1.25rem;
	}

	.panel-title {
		font-size: 1rem;
		font-weight: 700;
		color: #ffffff;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.panel-subtitle {
		font-size: 0.75rem;
		color: rgba(160, 160, 200, 0.6);
		margin: 0.1rem 0 0 0;
	}

	.chevron {
		color: rgba(255, 255, 255, 0.3);
		transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		width: 20px;
		height: 20px;
	}

	.chevron.rotated {
		transform: rotate(-90deg);
	}

	.collapsible {
		display: grid;
		grid-template-rows: 1fr;
		transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
		opacity: 1;
	}

	.collapsible.collapsed {
		grid-template-rows: 0fr;
		opacity: 0;
		pointer-events: none;
	}

	.wrapper {
		overflow: hidden;
	}

	.content {
		padding: 0 1.25rem 1.25rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.input-section {
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.input-label {
		font-size: 0.65rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.3);
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
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 0.75rem 1rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: #ffffff;
		transition: all 0.2s ease;
	}

	.contribution-input:focus {
		outline: none;
		border-color: #3b82f6;
		background: rgba(255, 255, 255, 0.06);
	}

	.currency {
		position: absolute;
		right: 1rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.2);
	}

	.hint {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.3);
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
		color: rgba(255, 255, 255, 0.4);
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
		background: rgba(255, 255, 255, 0.02);
		border-radius: 12px;
		border-left: 3px solid var(--accent);
		transition: transform 0.2s ease;
	}

	.alloc-row:hover {
		transform: translateX(4px);
		background: rgba(255, 255, 255, 0.04);
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
		color: #ffffff;
	}

	.alloc-shares {
		font-size: 0.7rem;
		color: rgba(160, 160, 200, 0.6);
	}

	.alloc-right {
		text-align: right;
		display: flex;
		flex-direction: column;
	}

	.alloc-value {
		font-size: 0.9rem;
		font-weight: 700;
		color: #10b981;
	}

	.alloc-percent {
		font-size: 0.7rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.3);
	}

	.total-summary {
		margin-top: 0.5rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.total-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.4);
	}

	.total-value {
		font-size: 0.9rem;
		font-weight: 700;
		color: #ffffff;
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
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 16px;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.comparison-heading {
		font-size: 0.65rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.35);
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
		box-shadow: 0 0 4px currentColor;
	}

	.comparison-name {
		font-size: 0.7rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
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
		background: rgba(255, 255, 255, 0.04);
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
		color: rgba(255, 255, 255, 0.35);
		white-space: nowrap;
	}

	.convergence-label.improved {
		color: #34d399;
	}

	.convergence-label.perfect {
		color: #10b981;
	}

	.comparison-legend {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		margin-top: 0.25rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.58rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.3);
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
		background: #3b82f6;
		opacity: 0.7;
	}

	.legend-line {
		width: 8px;
		height: 2px;
		background: rgba(255, 255, 255, 0.4);
		border-radius: 1px;
	}
</style>
