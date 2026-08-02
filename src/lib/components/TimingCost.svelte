<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { LL, locale } from '$lib/i18n/i18n-svelte';

	/**
	 * La métrica diferencial: la distancia entre lo que rindieron tus activos
	 * (time-weighted, ciega a los flujos) y lo que rindió tu dinero
	 * (money-weighted, sensible a cuándo lo pusiste).
	 *
	 * Portfolio Performance muestra las dos cifras sin explicarlas y Ghostfolio
	 * muestra solo una, con lo que la gente no entiende por qué su cartera marca
	 * −10 % teniendo más dinero del que puso. Aquí la diferencia se cuenta con
	 * palabras.
	 *
	 * No se anualiza: con ventanas de 30 días, anualizar convierte un −2 % del mes
	 * en un −22 % que el usuario no reconoce como suyo.
	 */
	const series = $derived(portfolio.performanceSeries);
	const twr = $derived(series.twrPeriod);
	const mwr = $derived(series.mwrPeriod);
	const deltaPp = $derived(series.timingCostPp);

	const hasFlows = $derived(series.points.some((p) => Math.abs(p.netFlow) > 0.01));
	const isComparable = $derived(hasFlows && mwr !== null && deltaPp !== null);
	const isNeutral = $derived(isComparable && Math.abs(deltaPp!) < 0.05);

	// Se usa el mismo formateador que el resto del panel para que los decimales
	// lleven coma en español, no punto.
	const signed = (value: number) => (value > 0 ? '+' : '') + $LL.dashboard.percent(value);
	const deltaLabel = $derived.by(() => {
		if (deltaPp === null) return '';
		const abs = Math.abs(deltaPp).toLocaleString($locale === 'es' ? 'es-ES' : 'en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
		return `${abs} pp`;
	});
</script>

<div class="timing-card">
	<div class="card-head">
		<h4 class="title">{$LL.db.timing_title()}</h4>
	</div>

	{#if !isComparable}
		<p class="explainer muted">{$LL.db.timing_unavailable()}</p>
	{:else}
		<div class="figures">
			<div class="figure">
				<span class="figure-label">{$LL.db.timing_assets()}</span>
				<span class="figure-value metric-value" class:positive={twr > 0} class:negative={twr < 0}>
					{portfolio.isPrivate ? '****' : signed(twr)}
				</span>
			</div>
			<div class="figure">
				<span class="figure-label">{$LL.db.timing_you()}</span>
				<span class="figure-value metric-value" class:positive={mwr! > 0} class:negative={mwr! < 0}>
					{portfolio.isPrivate ? '****' : signed(mwr!)}
				</span>
			</div>
			<div class="figure delta" class:cost={deltaPp! < 0} class:gain={deltaPp! > 0}>
				<span class="figure-label">Δ</span>
				<span class="figure-value metric-value">
					{portfolio.isPrivate ? '****' : (deltaPp! > 0 ? '+' : '−') + deltaLabel}
				</span>
			</div>
		</div>

		<p class="explainer">
			{#if isNeutral}
				{$LL.db.timing_neutral()}
			{:else if deltaPp! < 0}
				{$LL.db.timing_cost({
					assets: signed(twr),
					you: signed(mwr!),
					delta: deltaLabel
				})}
			{:else}
				{$LL.db.timing_gain({
					assets: signed(twr),
					you: signed(mwr!),
					delta: deltaLabel
				})}
			{/if}
		</p>
		<p class="footnote">{$LL.db.timing_period_note()}</p>
	{/if}
</div>

<style>
	.timing-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.card-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.title {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.figures {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6rem;
	}

	.figure {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.65rem 0.75rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.figure.delta.cost {
		background: rgba(244, 63, 94, 0.1);
		border-color: rgba(244, 63, 94, 0.28);
	}

	.figure.delta.gain {
		background: rgba(16, 185, 129, 0.1);
		border-color: rgba(16, 185, 129, 0.28);
	}

	.figure-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}

	.figure-value {
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.figure-value.positive { color: var(--accent-green); }
	.figure-value.negative { color: #f43f5e; }

	.explainer {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--text-primary);
	}

	.explainer.muted {
		color: var(--text-muted);
	}

	.footnote {
		margin: 0;
		font-size: 0.68rem;
		color: var(--text-muted);
	}

	@media (max-width: 520px) {
		.figures {
			grid-template-columns: 1fr;
		}
	}
</style>
