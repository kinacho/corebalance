<script lang="ts">
	import data from '$lib/data/backtest-8020.json';

	/**
	 * Tabla de datos propios sobre una cartera 80/20 con y sin rebalanceo.
	 *
	 * Las cifras las calcula `scripts/backtest-8020.mjs` con series reales de Yahoo
	 * Finance y se guardan en el JSON que importa este componente, así que la tabla
	 * y su fecha se actualizan juntas: no hay números cableados que puedan quedar
	 * desmentidos por el pie de la tabla.
	 *
	 * El objetivo es tener un dato citable: los motores generativos citan cifras con
	 * fuente y metodología, no explicaciones genéricas.
	 */
	let { lang = 'es' }: { lang?: 'es' | 'en' } = $props();

	const isEs = $derived(lang === 'es');
	const never = data.scenarios.never;
	const annual = data.scenarios.annual;

	const t = $derived(
		isEs
			? {
					caption: `Cartera ${data.targetAllocation.equity}/${data.targetAllocation.bonds} con y sin rebalanceo, ${data.period.from} → ${data.period.to}`,
					metric: 'Métrica',
					never: 'Sin rebalancear',
					annual: 'Rebalanceo anual',
					rows: [
						['Capital inicial', fmtEur(data.initialCapital), fmtEur(data.initialCapital)],
						['Capital final', fmtEur(never.finalValue), fmtEur(annual.finalValue)],
						['Rentabilidad anualizada (CAGR)', pct(never.cagr), pct(annual.cagr)],
						['Caída máxima', pct(never.maxDrawdown), pct(annual.maxDrawdown)],
						['Peso final en renta variable', pct(never.finalEquityWeight), pct(annual.finalEquityWeight)],
						['Peso máximo alcanzado en renta variable', pct(never.maxEquityWeight), pct(annual.maxEquityWeight)],
						['Número de rebalanceos', String(never.rebalances), String(annual.rebalances)]
					],
					readTitle: 'Cómo leer estos números',
					read: `Sin rebalancear se acabó con <strong>${fmtEur(Math.abs(data.difference.finalValue))} más</strong>, pero con una cartera que ya no era una ${data.targetAllocation.equity}/${data.targetAllocation.bonds}: la renta variable había subido hasta el <strong>${pct(never.finalEquityWeight)}</strong>, <strong>${num(data.difference.equityWeightDrift)} puntos</strong> por encima de la cartera rebalanceada. En un periodo tan bueno para la bolsa como este, dejar correr la parte de acciones paga más. Lo que compras rebalanceando no es rentabilidad: es seguir en el nivel de riesgo que elegiste.`,
					methodTitle: 'Metodología',
					sourceLabel: 'Fuente',
					updatedLabel: 'Datos descargados el',
					reproLabel: 'Reproducible con'
				}
			: {
					caption: `A ${data.targetAllocation.equity}/${data.targetAllocation.bonds} portfolio with and without rebalancing, ${data.period.from} → ${data.period.to}`,
					metric: 'Metric',
					never: 'Never rebalanced',
					annual: 'Rebalanced yearly',
					rows: [
						['Initial capital', fmtEur(data.initialCapital), fmtEur(data.initialCapital)],
						['Final value', fmtEur(never.finalValue), fmtEur(annual.finalValue)],
						['Annualised return (CAGR)', pct(never.cagr), pct(annual.cagr)],
						['Maximum drawdown', pct(never.maxDrawdown), pct(annual.maxDrawdown)],
						['Final equity weight', pct(never.finalEquityWeight), pct(annual.finalEquityWeight)],
						['Peak equity weight reached', pct(never.maxEquityWeight), pct(annual.maxEquityWeight)],
						['Number of rebalances', String(never.rebalances), String(annual.rebalances)]
					],
					readTitle: 'How to read these numbers',
					read: `Never rebalancing ended with <strong>${fmtEur(Math.abs(data.difference.finalValue))} more</strong>, but with a portfolio that was no longer a ${data.targetAllocation.equity}/${data.targetAllocation.bonds}: equities had drifted up to <strong>${pct(never.finalEquityWeight)}</strong>, <strong>${num(data.difference.equityWeightDrift)} points</strong> above the rebalanced portfolio. Over a stretch this good for stocks, letting equities run pays more. What rebalancing buys you is not return: it is staying at the risk level you chose.`,
					methodTitle: 'Methodology',
					sourceLabel: 'Source',
					updatedLabel: 'Data downloaded on',
					reproLabel: 'Reproducible with'
				}
	);

	function fmtEur(value: number) {
		// En español el separador de miles no se usa con cuatro cifras (3474, no
		// 3.474); `toLocaleString` ya aplica esa regla, así que se delega en Intl.
		return `${value.toLocaleString(isEs ? 'es-ES' : 'en-GB')} €`;
	}

	/** Decimal con la coma o el punto que toca según el idioma. */
	function num(value: number) {
		return isEs ? String(value).replace('.', ',') : String(value);
	}

	function pct(value: number) {
		return `${num(value)}%`;
	}
</script>

<figure class="backtest">
	<figcaption>{t.caption}</figcaption>

	<div class="table-scroll">
		<table>
			<thead>
				<tr>
					<th scope="col">{t.metric}</th>
					<th scope="col">{t.never}</th>
					<th scope="col" class="highlight">{t.annual}</th>
				</tr>
			</thead>
			<tbody>
				{#each t.rows as [label, a, b]}
					<tr>
						<th scope="row">{label}</th>
						<td>{a}</td>
						<td class="highlight">{b}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="reading">
		<h4>{t.readTitle}</h4>
		<p>{@html t.read}</p>
	</div>

	<details class="method">
		<summary>{t.methodTitle}</summary>
		<ul>
			<li>
				<strong>{t.sourceLabel}:</strong> {data.source} — {data.instruments.equity.ticker}
				({data.instruments.equity.name}) y {data.instruments.bonds.ticker}
				({data.instruments.bonds.name}).
			</li>
			{#each data.assumptions as assumption}
				<li>{assumption}</li>
			{/each}
			<li><strong>{t.reproLabel}:</strong> <code>npm run backtest</code></li>
			<li><strong>{t.updatedLabel}:</strong> {data.generatedAt}</li>
		</ul>
	</details>
</figure>

<style>
	.backtest {
		margin: 2.5rem 0;
		padding: 1.5rem;
		border-radius: 18px;
		border: 1px solid rgba(59, 130, 246, 0.22);
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.06) 0%, rgba(139, 92, 246, 0.03) 100%);
	}

	figcaption {
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #60a5fa;
		margin-bottom: 1.25rem;
	}

	.table-scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.92rem;
		min-width: 460px;
	}

	thead th {
		text-align: left;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(160, 160, 200, 0.85);
		padding: 0 0.75rem 0.6rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		font-weight: 700;
	}

	tbody th {
		text-align: left;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.72);
	}

	tbody th,
	tbody td {
		padding: 0.6rem 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	tbody td {
		color: #fff;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.highlight {
		background: rgba(59, 130, 246, 0.07);
	}

	tbody tr:last-child th,
	tbody tr:last-child td {
		border-bottom: none;
	}

	.reading {
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.07);
	}

	.reading h4 {
		font-size: 0.95rem;
		font-weight: 700;
		color: #fff;
		margin: 0 0 0.5rem;
	}

	.reading p {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.8);
	}

	.method {
		margin-top: 1.25rem;
		font-size: 0.85rem;
	}

	.method summary {
		cursor: pointer;
		color: #a78bfa;
		font-weight: 600;
	}

	.method ul {
		margin: 0.75rem 0 0;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		color: rgba(160, 160, 200, 0.85);
		line-height: 1.6;
	}

	.method code {
		background: rgba(255, 255, 255, 0.07);
		padding: 0.1rem 0.4rem;
		border-radius: 5px;
		font-size: 0.82rem;
	}

	@media (max-width: 640px) {
		.backtest {
			padding: 1.15rem;
		}
	}
</style>
