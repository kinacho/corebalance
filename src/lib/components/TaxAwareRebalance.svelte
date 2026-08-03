<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR, formatPercent, formatShares } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { SAVINGS_TAX_YEAR } from '$lib/fiscal';
	import type { MoveKind, TransferMove } from '$lib/traspaso';

	let isOpen = $state(false);

	const plan = $derived(portfolio.taxAwareRebalance);
	const allMoves = $derived(plan.plans.flatMap((p) => p.moves));
	const freeMoves = $derived(allMoves.filter((m) => m.taxFree));
	const taxableMoves = $derived(allMoves.filter((m) => !m.taxFree));
	const blockedMoves = $derived(allMoves.filter((m) => m.lossBlocked !== null));
	const excludedTickers = $derived([...new Set(plan.plans.flatMap((p) => p.excludedTickers))]);

	/** La desviación que de verdad importa: la peor de todas las categorías. */
	const deviationBefore = $derived(
		plan.plans.reduce((max, p) => Math.max(max, p.maxDeviationBefore), 0)
	);
	const deviationAfter = $derived(
		plan.plans.reduce((max, p) => Math.max(max, p.maxDeviationAfter), 0)
	);

	const hasPrices = $derived(Object.keys(portfolio.prices).length > 0);

	function kindLabel(kind: MoveKind): string {
		if (kind === 'traspaso') return $LL.traspaso.kind_traspaso();
		if (kind === 'reembolso') return $LL.traspaso.kind_reembolso();
		if (kind === 'efectivo') return $LL.traspaso.kind_efectivo();
		return $LL.traspaso.kind_venta();
	}

	function kindHint(kind: MoveKind): string {
		if (kind === 'traspaso') return $LL.traspaso.kind_traspaso_hint();
		if (kind === 'reembolso') return $LL.traspaso.kind_reembolso_hint();
		if (kind === 'efectivo') return $LL.traspaso.kind_efectivo_hint();
		return $LL.traspaso.kind_venta_hint();
	}
</script>

<div class="panel" class:open={isOpen}>
	<button class="panel-header" onclick={() => (isOpen = !isOpen)} aria-expanded={isOpen}>
		<div class="panel-info">
			<div class="panel-icon">🧾</div>
			<div class="panel-text">
				<h2 class="panel-title">{$LL.traspaso.title()}</h2>
				<p class="panel-subtitle">{$LL.traspaso.subtitle()}</p>
			</div>
		</div>
		{#if plan.hasAnythingToDo}
			<span class="badge" class:free={plan.totalEstimatedTax <= 0}>
				{plan.totalEstimatedTax <= 0 ? formatEUR(0) : formatEUR(plan.totalEstimatedTax)}
			</span>
		{/if}
		<span class="chevron" class:rotated={!isOpen}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<path d="M6 9l6 6 6-6" />
			</svg>
		</span>
	</button>

	<div class="collapsible" class:collapsed={!isOpen}>
		<div class="wrapper">
			<div class="content">
				{#if !hasPrices}
					<p class="empty">{$LL.traspaso.no_prices()}</p>
				{:else if !plan.hasAnythingToDo}
					<p class="empty">{$LL.traspaso.balanced()}</p>
					<p class="footnote">{$LL.traspaso.band_note()}</p>
				{:else}
					{#if freeMoves.length > 0}
						<section class="moves">
							<h3 class="section-heading free">
								<span class="dot free"></span>
								{$LL.traspaso.free_heading()}
								<span class="heading-amount privacy-blur">{formatEUR(plan.taxFreeAmount)}</span>
							</h3>
							{#each freeMoves as move (move.from.ticker + move.to.ticker)}
								{@render moveRow(move)}
							{/each}
						</section>
					{/if}

					{#if taxableMoves.length > 0}
						<section class="moves">
							<h3 class="section-heading taxed">
								<span class="dot taxed"></span>
								{$LL.traspaso.taxable_heading()}
								<span class="heading-amount privacy-blur">{formatEUR(plan.taxableAmount)}</span>
							</h3>
							{#each taxableMoves as move (move.from.ticker + move.to.ticker)}
								{@render moveRow(move)}
							{/each}
						</section>
					{/if}

					{#each blockedMoves as move (move.from.ticker + move.to.ticker)}
						<div class="warning">
							<strong>⚠️ {$LL.traspaso.loss_blocked_title()}</strong>
							<p>
								{$LL.traspaso.loss_blocked_desc({
									ticker: move.from.name,
									months: move.lossBlocked!.windowMonths,
									days: move.lossBlocked!.daysUntilSafeRepurchase ?? 0
								})}
							</p>
						</div>
					{/each}

					<section class="summary">
						<div class="summary-row">
							<span class="summary-label">{$LL.traspaso.summary_tax()}</span>
							<span
								class="summary-figure privacy-blur"
								class:zero={plan.totalEstimatedTax <= 0}
							>
								{formatEUR(plan.totalEstimatedTax)}
							</span>
						</div>
						<div class="summary-row muted">
							<span class="summary-label">
								{$LL.traspaso.summary_deviation({
									before: formatPercent(deviationBefore, 1),
									after: formatPercent(deviationAfter, 1)
								})}
							</span>
						</div>
					</section>

					<section class="comparison">
						<h3 class="section-heading">{$LL.traspaso.comparison_heading()}</h3>
						{#if plan.contributionUsed <= 0}
							<p class="comparison-text">{$LL.traspaso.comparison_no_contribution()}</p>
						{:else if plan.monthsToConvergeByContribution === null}
							<p class="comparison-text">{$LL.traspaso.comparison_never()}</p>
						{:else if plan.monthsToConvergeByContribution === 1}
							<p class="comparison-text">
								{$LL.traspaso.comparison_month_one({
									contribution: formatEUR(plan.contributionUsed)
								})}
							</p>
						{:else}
							<p class="comparison-text">
								{$LL.traspaso.comparison_months({
									contribution: formatEUR(plan.contributionUsed),
									months: plan.monthsToConvergeByContribution
								})}
							</p>
						{/if}

						{#if plan.contributionUsed > 0 && plan.monthsToConvergeByContribution}
							<p class="verdict" class:free={plan.totalEstimatedTax <= 0}>
								{#if plan.totalEstimatedTax <= 0}
									{$LL.traspaso.comparison_free_verdict()}
								{:else}
									{$LL.traspaso.comparison_cost_verdict({
										tax: formatEUR(plan.totalEstimatedTax),
										months: plan.monthsToConvergeByContribution
									})}
								{/if}
							</p>
						{/if}
					</section>

					{#if excludedTickers.length > 0}
						<p class="footnote">
							{$LL.traspaso.excluded({ tickers: excludedTickers.join(', ') })}
						</p>
					{/if}

					<p class="disclaimer">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html $LL.traspaso.disclaimer({ year: SAVINGS_TAX_YEAR })}
					</p>
					<p class="footnote sources">
						{$LL.traspaso.sources_label()}: art. 94 LIRPF (traspasos), art. 37.2 (FIFO),
						art. 33.5.f (regla antiaplicación), art. 66 (tipos del ahorro).
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>

{#snippet moveRow(move: TransferMove)}
	<div class="move" class:taxed={!move.taxFree}>
		<div class="move-flow">
			<div class="move-side">
				<span class="move-emoji">{move.from.icon || '📈'}</span>
				<div class="move-meta">
					<span class="move-name">{move.from.name}</span>
					<span class="move-shares privacy-blur">
						{$LL.traspaso.sell_shares({ shares: formatShares(move.sharesToSell) })}
					</span>
				</div>
			</div>
			<span class="move-arrow" aria-hidden="true">→</span>
			<div class="move-side">
				<span class="move-emoji">{move.to.icon || '📈'}</span>
				<div class="move-meta">
					<span class="move-name">{move.to.name}</span>
					<span class="move-shares privacy-blur">
						{$LL.traspaso.buy_shares({ shares: formatShares(move.sharesToBuy) })}
					</span>
				</div>
			</div>
		</div>

		<div class="move-numbers">
			<span class="move-amount privacy-blur">{formatEUR(move.amount)}</span>
			<span class="move-kind" title={kindHint(move.kind)}>{kindLabel(move.kind)}</span>
		</div>

		{#if !move.taxFree}
			<div class="move-tax">
				<span class="tax-item">
					{move.realizedGain >= 0 ? $LL.traspaso.gain_label() : $LL.traspaso.loss_label()}
					<strong class="privacy-blur" class:negative={move.realizedGain < 0}>
						{formatEUR(Math.abs(move.realizedGain))}
					</strong>
				</span>
				<span class="tax-item">
					{$LL.traspaso.tax_label()}
					<strong class="privacy-blur">{formatEUR(move.estimatedTax)}</strong>
				</span>
			</div>
			{#if move.gainIsPartial}
				<p class="footnote inline">{$LL.traspaso.partial_gain()}</p>
			{/if}
		{/if}
	</div>
{/snippet}

<style>
	.panel {
		width: 100%;
		background: var(--bg-card);
		backdrop-filter: blur(24px) saturate(200%);
		-webkit-backdrop-filter: blur(24px) saturate(200%);
		border: 1px solid var(--border-subtle);
		border-radius: 24px;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.panel:hover {
		border-color: rgba(255, 255, 255, 0.15);
	}

	.panel-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 1.25rem;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.panel-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		min-width: 0;
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
		flex-shrink: 0;
	}

	.panel-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		letter-spacing: -0.01em;
	}

	.panel-subtitle {
		font-size: 0.75rem;
		color: rgba(160, 160, 200, 0.6);
		margin: 0.1rem 0 0 0;
	}

	.badge {
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		background: rgba(245, 158, 11, 0.15);
		color: var(--accent-orange);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.badge.free {
		background: rgba(16, 185, 129, 0.15);
		color: var(--accent-green);
	}

	.chevron {
		color: rgba(255, 255, 255, 0.3);
		transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.chevron.rotated {
		transform: rotate(-90deg);
	}

	.collapsible {
		display: grid;
		grid-template-rows: 1fr;
		transition:
			grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1),
			opacity 0.3s ease;
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
		gap: 1.25rem;
	}

	.empty {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin: 0;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 12px;
	}

	.section-heading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0 0 0.75rem 0;
	}

	.heading-amount {
		margin-left: auto;
		font-size: 0.8rem;
		text-transform: none;
		letter-spacing: normal;
		color: var(--text-primary);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.dot.free {
		background: var(--accent-green);
	}

	.dot.taxed {
		background: var(--accent-orange);
	}

	.moves {
		display: flex;
		flex-direction: column;
	}

	.move {
		padding: 0.85rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(16, 185, 129, 0.2);
		border-radius: 14px;
		margin-bottom: 0.5rem;
	}

	.move.taxed {
		border-color: rgba(245, 158, 11, 0.25);
	}

	.move-flow {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.move-side {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
	}

	.move-emoji {
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	.move-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.move-name {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.move-shares {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.move-arrow {
		color: rgba(255, 255, 255, 0.3);
		font-size: 1rem;
		flex-shrink: 0;
	}

	.move-numbers {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.6rem;
		padding-top: 0.6rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.move-amount {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.move-kind {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		cursor: help;
		border-bottom: 1px dotted rgba(255, 255, 255, 0.2);
	}

	.move-tax {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
		flex-wrap: wrap;
	}

	.tax-item {
		font-size: 0.7rem;
		color: var(--text-muted);
		display: flex;
		gap: 0.35rem;
	}

	.tax-item strong {
		color: var(--text-primary);
		font-weight: 700;
	}

	.tax-item strong.negative {
		color: var(--accent-green);
	}

	.warning {
		padding: 0.85rem;
		background: rgba(244, 63, 94, 0.08);
		border: 1px solid rgba(244, 63, 94, 0.25);
		border-radius: 14px;
	}

	.warning strong {
		font-size: 0.8rem;
		color: #fda4af;
		display: block;
		margin-bottom: 0.35rem;
	}

	.warning p {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.5;
	}

	.summary {
		padding: 0.85rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 14px;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.summary-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.summary-row.muted .summary-label {
		font-size: 0.7rem;
		color: rgba(160, 160, 200, 0.6);
	}

	.summary-label {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.summary-figure {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--accent-orange);
	}

	.summary-figure.zero {
		color: var(--accent-green);
	}

	.comparison-text {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.55;
	}

	.verdict {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--accent-orange);
		margin: 0.5rem 0 0 0;
		line-height: 1.55;
	}

	.verdict.free {
		color: var(--accent-green);
	}

	.footnote {
		font-size: 0.7rem;
		color: rgba(160, 160, 200, 0.55);
		margin: 0;
		line-height: 1.5;
	}

	.footnote.inline {
		margin-top: 0.4rem;
	}

	.footnote.sources {
		font-size: 0.65rem;
	}

	.disclaimer {
		font-size: 0.7rem;
		color: rgba(160, 160, 200, 0.6);
		margin: 0;
		line-height: 1.55;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	@media (max-width: 480px) {
		.move-flow {
			flex-direction: column;
			align-items: stretch;
			gap: 0.35rem;
		}

		.move-arrow {
			transform: rotate(90deg);
			align-self: center;
		}
	}
</style>
