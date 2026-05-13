<script lang="ts">
	import type { RebalanceResult } from '$lib/types';
	import { formatEUR, formatPercent, formatShares } from '$lib/utils';

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
										<span class="alloc-emoji">{alloc.asset.icon}</span>
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
</style>
