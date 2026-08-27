<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR, formatShares } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { SAVINGS_TAX_YEAR } from '$lib/fiscal';
	import type { MoveKind, TransferMove } from '$lib/traspaso';
	import { planificarTraspaso, meritaApuntar } from '$lib/traspaso-libro';
	import { ui } from '$lib/stores/ui.svelte';
	import LeccionDelPanel from './LeccionDelPanel.svelte';
	import PanelHerramienta from './PanelHerramienta.svelte';

	/** Abierto/cerrado lo decide el padre: una herramienta abierta a la vez. */
	const { abierto, onAlternar }: { abierto: boolean; onAlternar: (abrir: boolean) => void } =
		$props();

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

	/**
	 * Si este movimiento se puede apuntar en el libro tal cual.
	 *
	 * ⚠️ Exige el **origen** en modo libro, porque de ahí sale el coste heredado: sin
	 * libro no hay lotes FIFO que leer y el destino nacería contando desde el precio
	 * de hoy, que es exactamente el defecto que el traspaso enlazado arregla. Del
	 * destino no se exige nada: `seedLedgerFromManual` lo siembra con su posición
	 * actual, que es lo que ya hace el formulario del libro.
	 */
	function apuntable(move: TransferMove): boolean {
		return portfolio.holdings[move.from.ticker]?.useLedger === true;
	}

	function apuntar(move: TransferMove) {
		const plan = planificarTraspaso({
			origen: move.from,
			destino: move.to,
			transacciones: portfolio.transactions,
			participacionesOrigen: portfolio.effectiveHoldings[move.from.ticker]?.shares ?? 0,
			precioOrigen: portfolio.pricesWithFx[move.from.ticker]?.price ?? 0,
			precioDestino: portfolio.pricesWithFx[move.to.ticker]?.price ?? 0,
			// El plan viene expresado en euros, que es la forma en la que el usuario ya lo
			// está leyendo en esta tarjeta.
			cuanto: { modo: 'importe', importe: move.amount },
			fecha: Date.now()
		});

		if (!meritaApuntar(plan)) return;

		if (!(portfolio.holdings[move.to.ticker]?.useLedger ?? false)) {
			portfolio.seedLedgerFromManual(move.to.ticker, plan.fecha);
		}
		portfolio.registrarTraspaso(plan);
		ui.addToast($LL.ledger.toast_traspaso_hecho(), 'success');
		ui.hapticFeedback('medium');
	}
</script>

<PanelHerramienta
	id="tour-tax"
	titulo={$LL.traspaso.title()}
	subtitulo={$LL.traspaso.subtitle()}
	objetivoTour="abrir-tax"
	{abierto}
	{onAlternar}
>
	{#snippet icono()}
		<!-- Un recibo: lo que Hacienda te cobraría por mover, o no. -->
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
			<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
			<path d="M9 8h6M9 12h6" />
		</svg>
	{/snippet}

	{#snippet cifra()}
		{#if plan.hasAnythingToDo}
			<!-- ⚠️ `privacy-blur`: es dinero, y le faltaba. Toda cifra monetaria lo lleva. -->
			<span class="cifra privacy-blur" class:libre={plan.totalEstimatedTax <= 0}>
				{plan.totalEstimatedTax <= 0 ? formatEUR(0) : formatEUR(plan.totalEstimatedTax)}
			</span>
		{/if}
	{/snippet}

	<!-- Dentro del contenido: la cabecera es un `<button>`. -->
	<LeccionDelPanel panel="tax" />
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
							<p class="warning-note">{$LL.traspaso.loss_blocked_window()}</p>
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
							<!--
								⚠️ `$LL.dashboard.percent()` y **no** `formatPercent()` de utils, que
								formatea con `toFixed` y por tanto con **punto decimal**: en una app en
								castellano pintaba «54.0%». Es el defecto que este repo ya tiene
								documentado y que un test de la ficha cazó en su día; aquí seguía vivo.
							-->
							{$LL.traspaso.summary_deviation({
									before: $LL.dashboard.percent(deviationBefore),
									after: $LL.dashboard.percent(deviationAfter)
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
						{$LL.traspaso.sources_label()}: {$LL.traspaso.sources_body()}
					</p>
				{/if}
</PanelHerramienta>

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

		<!--
			⚠️ Solo en los traspasos, y solo con las dos patas en modo libro.
			El plan se calculaba desde la 1.13 y **no se podía ejecutar**: había que
			abrir dos libros y apuntar dos movimientos a mano. Aquí ya está todo
			—`from`, `to`, `amount`— así que apuntarlo es mapear a `PlanDeTraspaso`.
			Se limita al traspaso porque un reembolso o una venta son una venta y una
			compra sueltas, no un par enlazado con coste heredado.
		-->
		{#if move.kind === 'traspaso' && apuntable(move)}
			<button class="apuntar-btn" onclick={() => apuntar(move)}>
				{$LL.traspaso.btn_apuntar()}
			</button>
		{/if}
	</div>
{/snippet}

<style>
	/* El armazón plegable vive en `PanelHerramienta.svelte`; aquí solo el contenido. */

	.empty {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin: 0;
		padding: 1rem;
		background: var(--bg-card-hover);
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
		color: var(--text-faint);
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
		background: var(--bg-card-hover);
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
		color: var(--text-faint);
		font-size: 1rem;
		flex-shrink: 0;
	}

	.move-numbers {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.6rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--border-subtle);
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

	/* `align-self` porque en una columna flex el hijo se estira, y sin él el botón
	   mide todo el ancho de la tarjeta — la lección de `LeccionDelPanel`. */
	.apuntar-btn {
		align-self: flex-start;
		margin-top: 0.6rem;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		border-radius: 8px;
		padding: 0.4rem 0.7rem;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.apuntar-btn:hover {
		border-color: var(--border-strong);
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
		color: var(--accent-green-ink);
	}

	.warning {
		padding: 0.85rem;
		background: rgba(244, 63, 94, 0.08);
		border: 1px solid rgba(244, 63, 94, 0.25);
		border-radius: 14px;
	}

	.warning strong {
		font-size: 0.8rem;
		color: var(--state-negative);
		display: block;
		margin-bottom: 0.35rem;
	}

	.warning p {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.5;
	}

	.warning-note {
		margin-top: 0.4rem !important;
		font-size: 0.68rem !important;
		color: var(--text-muted) !important;
	}

	.summary {
		padding: 0.85rem;
		background: var(--bg-card);
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
		color: var(--text-muted);
	}

	.summary-label {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.summary-figure {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--accent-orange-ink);
	}

	.summary-figure.zero {
		color: var(--accent-green-ink);
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
		color: var(--accent-orange-ink);
		margin: 0.5rem 0 0 0;
		line-height: 1.55;
	}

	.verdict.free {
		color: var(--accent-green-ink);
	}

	.footnote {
		font-size: 0.7rem;
		color: var(--text-muted);
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
		color: var(--text-muted);
		margin: 0;
		line-height: 1.55;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-subtle);
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
