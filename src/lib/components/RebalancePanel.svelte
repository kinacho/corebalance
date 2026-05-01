<script lang="ts">
	import type { RebalanceResult } from '$lib/types';
	import { formatEUR, formatPercent, formatShares } from '$lib/utils';

	interface Props {
		contribution: number;
		result: RebalanceResult | null;
		onContributionChange: (value: number) => void;
	}

	let { contribution, result, onContributionChange }: Props = $props();

	let isEditing = $state(false);
	let editValue = $state('');

	const displayValue = $derived(contribution > 0 ? contribution.toString() : '');

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

<div class="rebalance-panel">
	<div class="panel-header">
		<div class="panel-icon">💰</div>
		<div>
			<h2 class="panel-title">Rebalanceo por Aportación</h2>
			<p class="panel-subtitle">Calcula cómo distribuir tu nueva aportación mensual</p>
		</div>
	</div>

	<div class="contribution-input-group">
		<label class="contribution-label" for="contribution-input">
			Nueva Aportación Mensual
		</label>
		<div class="input-wrapper">
			<input
				id="contribution-input"
				type="number"
				class="contribution-input no-privacy-blur"
				value={isEditing ? editValue : displayValue}
				oninput={handleInput}
				onblur={handleBlur}
				onfocus={handleFocus}
				min="0"
				step="50"
				placeholder="500"
				inputmode="decimal"
			/>
			<span class="input-currency">€</span>
		</div>
	</div>

	{#if result && result.totalContribution > 0}
		<div class="allocations">
			<h3 class="allocations-title">Distribución Recomendada</h3>

			{#each result.allocations as alloc}
				<div class="allocation-row" style="--accent: {alloc.asset.color}">
					<div class="alloc-left">
						<span class="alloc-icon">{alloc.asset.icon}</span>
						<div>
							<span class="alloc-name">{alloc.asset.name}</span>
							<span class="alloc-shares privacy-blur">
								{formatShares(alloc.sharesToBuy)} participaciones
							</span>
						</div>
					</div>
					<div class="alloc-right">
						<span class="alloc-amount privacy-blur">{formatEUR(alloc.amountToInvest)}</span>
						<span class="alloc-weight">→ {formatPercent(alloc.resultingWeight)}</span>
					</div>
				</div>
			{/each}

			<div class="result-summary">
				<div class="summary-row">
					<span>Capital resultante</span>
					<span class="summary-value privacy-blur">{formatEUR(result.newTotalCapital)}</span>
				</div>
			</div>
		</div>
	{:else if contribution > 0}
		<div class="empty-state">
			<p>Introduce tus participaciones actuales para calcular el rebalanceo</p>
		</div>
	{:else}
		<div class="empty-state">
			<p>Introduce una cantidad para ver cómo distribuirla</p>
		</div>
	{/if}
</div>

<style>
	.rebalance-panel {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
		backdrop-filter: blur(24px) saturate(180%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 24px;
		padding: 1.75rem;
		position: relative;
		overflow: hidden;
		box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
	}

	.rebalance-panel::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(90deg, #3b82f6, #10b981, #f59e0b);
		opacity: 0.5;
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		margin-bottom: 1.5rem;
	}

	.panel-icon {
		font-size: 1.75rem;
		line-height: 1;
	}

	.panel-title {
		font-size: 1.15rem;
		font-weight: 600;
		color: #f0f0ff;
		margin: 0;
		line-height: 1.3;
	}

	.panel-subtitle {
		font-size: 0.8rem;
		color: rgba(160, 160, 200, 0.6);
		margin: 0;
	}

	.contribution-input-group {
		margin-bottom: 1.5rem;
	}

	.contribution-label {
		display: block;
		font-size: 0.75rem;
		color: rgba(160, 160, 200, 0.6);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin-bottom: 0.4rem;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.contribution-input {
		width: 100%;
		padding: 0.75rem 2.5rem 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		color: #f0f0ff;
		font-size: 1.25rem;
		font-weight: 600;
		font-family: 'Inter', sans-serif;
		outline: none;
		transition: all 0.2s ease;
		box-sizing: border-box;
	}

	.contribution-input:focus {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	.contribution-input::placeholder {
		color: rgba(160, 160, 200, 0.3);
		font-weight: 400;
	}

	.contribution-input::-webkit-outer-spin-button,
	.contribution-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.contribution-input[type='number'] {
		-moz-appearance: textfield;
	}

	.input-currency {
		position: absolute;
		right: 1rem;
		color: rgba(160, 160, 200, 0.5);
		font-size: 1.1rem;
		font-weight: 600;
		pointer-events: none;
	}

	.allocations {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.allocations-title {
		font-size: 0.75rem;
		color: rgba(160, 160, 200, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 0 0 0.25rem 0;
		font-weight: 500;
	}

	.allocation-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-left: 3px solid var(--accent);
		border-radius: 10px;
		transition: all 0.2s ease;
	}

	.allocation-row:hover {
		background: rgba(0, 0, 0, 0.3);
		border-color: rgba(255, 255, 255, 0.08);
		border-left-color: var(--accent);
	}

	.alloc-left {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.alloc-icon {
		font-size: 1.3rem;
		line-height: 1;
	}

	.alloc-name {
		display: block;
		font-size: 0.9rem;
		font-weight: 600;
		color: #f0f0ff;
	}

	.alloc-shares {
		display: block;
		font-size: 0.75rem;
		color: rgba(160, 160, 200, 0.6);
		margin-top: 0.1rem;
	}

	.alloc-right {
		text-align: right;
	}

	.alloc-amount {
		display: block;
		font-size: 1rem;
		font-weight: 700;
		color: var(--accent);
	}

	.alloc-weight {
		display: block;
		font-size: 0.72rem;
		color: rgba(160, 160, 200, 0.5);
		margin-top: 0.1rem;
	}

	.result-summary {
		margin-top: 0.5rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		color: rgba(200, 200, 220, 0.7);
	}

	.summary-value {
		font-weight: 700;
		color: #f0f0ff;
		font-size: 0.95rem;
	}

	.empty-state {
		text-align: center;
		padding: 1.5rem 1rem;
		color: rgba(160, 160, 200, 0.4);
		font-size: 0.85rem;
	}
</style>
