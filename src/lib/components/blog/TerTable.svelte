<script lang="ts">
	import data from '$lib/data/ter-myinvestor.json';
	import { SITE_URL } from '$lib/i18n/routing';
	import { AUTHOR } from '$lib/seo/author';

	/**
	 * Tabla citable de gastos corrientes (TER) de los indexados y ETFs del catálogo
	 * de MyInvestor, con la clase exacta, el ISIN y la fecha del DFI de cada uno.
	 *
	 * Mismo patrón que `BacktestTable.svelte`: los números salen de un JSON que es
	 * la fuente única, se sirven además en una URL pública y el schema `Dataset` se
	 * construye del mismo objeto, así que la tabla y el dato declarado no pueden
	 * contradecirse.
	 *
	 * ⚠️ La diferencia con el backtest es que aquí **no hay script que regenere
	 * nada**: los gastos corrientes no están en ninguna API pública fiable y se
	 * copian a mano del DFI/KID de cada gestora. Actualizar = editar
	 * `src/lib/data/ter-myinvestor.json` y subir la `kidDate` de la fila tocada y
	 * el `compiledAt`. Nunca rellenar una cifra de memoria: son datos financieros
	 * con los que alguien cursa una orden real.
	 */
	let { lang = 'es' }: { lang?: 'es' | 'en' } = $props();

	const isEs = $derived(lang === 'es');

	type Fund = (typeof data.funds)[number];

	const funds = data.funds as Fund[];
	const indexFunds = funds.filter((f) => f.vehicle === 'fund');
	const etfs = funds.filter((f) => f.vehicle === 'etf');

	const cheapest = funds.reduce((a, b) => (b.ongoingCharges < a.ongoingCharges ? b : a));
	const priciest = funds.reduce((a, b) => (b.ongoingCharges > a.ongoingCharges ? b : a));

	/** Coste anual de cada extremo sobre una cartera de referencia, en euros. */
	const REFERENCE_CAPITAL = 10000;
	const cheapestCost = (REFERENCE_CAPITAL * cheapest.ongoingCharges) / 100;
	const priciestCost = (REFERENCE_CAPITAL * priciest.ongoingCharges) / 100;

	const t = $derived(
		isEs
			? {
					caption: `Gastos corrientes de los indexados y ETFs de ${data.broker}`,
					fund: 'Fondo',
					shareClass: 'Clase',
					isin: 'ISIN',
					charges: 'Gastos corrientes',
					kid: 'Fecha del DFI',
					groupFunds: 'Fondos indexados (traspasables sin tributar)',
					groupEtfs: 'ETFs (no traspasables)',
					readTitle: 'Cómo leer estos números',
					methodTitle: 'Metodología y fuentes',
					sourceLabel: 'Fuente',
					compiledLabel: 'Datos recopilados el',
					datasetLabel: 'Datos en bruto (JSON)',
					toolLabel: 'Calcula el TER medio de tu cartera'
				}
			: {
					caption: `Ongoing charges of the index funds and ETFs on ${data.broker}`,
					fund: 'Fund',
					shareClass: 'Share class',
					isin: 'ISIN',
					charges: 'Ongoing charges',
					kid: 'KID date',
					groupFunds: 'Index funds (transferable tax-free in Spain)',
					groupEtfs: 'ETFs (not transferable)',
					readTitle: 'How to read these numbers',
					methodTitle: 'Methodology and sources',
					sourceLabel: 'Source',
					compiledLabel: 'Data compiled on',
					datasetLabel: 'Raw data (JSON)',
					toolLabel: "Work out your portfolio's weighted TER"
				}
	);

	const reading = $derived(
		isEs
			? `El rango va del <strong>${pct(cheapest.ongoingCharges)}</strong> del ${cheapest.manager} ${cheapest.name} al <strong>${pct(priciest.ongoingCharges)}</strong> del ${priciest.manager} ${priciest.name}. Sobre ${fmtEur(REFERENCE_CAPITAL)} invertidos eso son <strong>${fmtEur(cheapestCost)} frente a ${fmtEur(priciestCost)} al año</strong>: una diferencia real, pero mucho menor que la que separa a cualquiera de estos productos de un fondo de gestión activa, donde el 1,5%–2% sigue siendo la norma. Ojo con comparar peras con manzanas: el fondo más barato de la tabla replica sólo mercados desarrollados, y los de emergentes cuestan más porque replicar esos mercados cuesta más.`
			: `The range runs from <strong>${pct(cheapest.ongoingCharges)}</strong> for the ${cheapest.manager} ${cheapest.name} to <strong>${pct(priciest.ongoingCharges)}</strong> for the ${priciest.manager} ${priciest.name}. On ${fmtEur(REFERENCE_CAPITAL)} invested that is <strong>${fmtEur(cheapestCost)} against ${fmtEur(priciestCost)} a year</strong>: a real difference, but far smaller than the gap between any of these and an actively managed fund, where 1.5%–2% is still the norm. Do not compare apples with oranges, though: the cheapest fund here tracks developed markets only, and the emerging-market ones cost more because tracking those markets costs more.`
	);

	/**
	 * Siempre dos decimales y con el separador que toca según el idioma. El cero
	 * final no es decorativo: el DFI declara "0,10%" y un "0,1%" invita a dudar de
	 * si falta una cifra o el dato está redondeado.
	 */
	function pct(value: number) {
		const fixed = value.toFixed(2);
		return `${isEs ? fixed.replace('.', ',') : fixed}%`;
	}

	function fmtEur(value: number) {
		return `${value.toLocaleString(isEs ? 'es-ES' : 'en-GB')} €`;
	}

	/** `2026-03-24` → `24/03/2026` en español, `24 Mar 2026` en inglés. */
	function fmtDate(iso: string) {
		const [y, m, d] = iso.split('-');
		if (isEs) return `${d}/${m}/${y}`;
		return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC'
		});
	}

	function fullName(f: Fund) {
		return `${f.manager} ${f.name}`;
	}

	/** URL pública del dataset, para que la cifra se pueda comprobar y citar. */
	const DATASET_URL = `${SITE_URL}/data/ter-myinvestor.json`;

	/** El enlace a la herramienta tiene que apuntar al gemelo del idioma del post. */
	const TER_TOOL_PATH = $derived(`${isEs ? '' : '/en'}/herramientas/calculadora-ter`);

	/**
	 * Schema `Dataset`. Va aquí, junto a los datos, para que schema y tabla salgan
	 * del mismo JSON. Cada fondo se declara como un `PropertyValue` con su ISIN en
	 * `identifier`: es lo que permite citar una cifra concreta y no "una tabla".
	 */
	const datasetSchema = $derived({
		'@context': 'https://schema.org',
		'@type': 'Dataset',
		'@id': `${DATASET_URL}#dataset`,
		name: isEs
			? `Gastos corrientes (TER) de los fondos indexados y ETFs de ${data.broker}`
			: `Ongoing charges (TER) of the index funds and ETFs available on ${data.broker}`,
		description: isEs
			? `Gastos corrientes declarados en el DFI/KID de ${funds.length} fondos indexados y ETFs del catálogo de ${data.broker} (${[...new Set(funds.map((f) => f.manager))].join(', ')}), con la clase exacta, el ISIN y la fecha del documento del que sale cada cifra.`
			: `Ongoing charges as declared in the KID of ${funds.length} index funds and ETFs available on ${data.broker} (${[...new Set(funds.map((f) => f.manager))].join(', ')}), with the exact share class, the ISIN and the date of the document each figure comes from.`,
		dateModified: data.compiledAt,
		inLanguage: lang,
		isAccessibleForFree: true,
		creator: { '@id': `${SITE_URL}${AUTHOR.path}#person` },
		publisher: { '@id': `${SITE_URL}/#org` },
		measurementTechnique: data.source[lang],
		variableMeasured: funds.map((f) => ({
			'@type': 'PropertyValue',
			name: isEs
				? `Gastos corrientes de ${fullName(f)} ${f.shareClass}`
				: `Ongoing charges of ${fullName(f)} ${f.shareClass}`,
			value: f.ongoingCharges,
			unitText: 'PERCENT',
			identifier: {
				'@type': 'PropertyValue',
				propertyID: 'ISIN',
				value: f.isin
			}
		})),
		distribution: {
			'@type': 'DataDownload',
			encodingFormat: 'application/json',
			contentUrl: DATASET_URL
		}
	});

	const datasetSchemaString = $derived(JSON.stringify(datasetSchema));
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${datasetSchemaString}</script>`}
</svelte:head>

<figure class="ter-table">
	<figcaption>{t.caption}</figcaption>

	<div class="table-scroll">
		<table>
			<thead>
				<tr>
					<th scope="col">{t.fund}</th>
					<th scope="col">{t.shareClass}</th>
					<th scope="col">{t.isin}</th>
					<th scope="col" class="numeric">{t.charges}</th>
					<th scope="col" class="numeric">{t.kid}</th>
				</tr>
			</thead>
			{#each [{ label: t.groupFunds, rows: indexFunds }, { label: t.groupEtfs, rows: etfs }] as group}
				<tbody>
					<tr class="group">
						<th scope="colgroup" colspan="5">{group.label}</th>
					</tr>
					{#each group.rows as fund}
						<tr>
							<th scope="row">{fullName(fund)}</th>
							<td>{fund.shareClass}</td>
							<td><code>{fund.isin}</code></td>
							<td class="numeric charges">{pct(fund.ongoingCharges)}</td>
							<td class="numeric muted">{fmtDate(fund.kidDate)}</td>
						</tr>
					{/each}
				</tbody>
			{/each}
		</table>
	</div>

	<div class="reading">
		<h4>{t.readTitle}</h4>
		<p>{@html reading}</p>
	</div>

	<details class="method">
		<summary>{t.methodTitle}</summary>
		<ul>
			<li><strong>{t.sourceLabel}:</strong> {data.source[lang]}.</li>
			{#each data.caveats[lang] as caveat}
				<li>{caveat}</li>
			{/each}
			<li>
				<strong>{t.datasetLabel}:</strong>
				<a href="/data/ter-myinvestor.json">/data/ter-myinvestor.json</a>
			</li>
			<li><strong>{t.compiledLabel}:</strong> {fmtDate(data.compiledAt)}</li>
			<li><a href={TER_TOOL_PATH}>{t.toolLabel}</a></li>
		</ul>
	</details>
</figure>

<style>
	.ter-table {
		margin: 2.5rem 0;
		padding: 1.5rem;
		border-radius: 18px;
		border: 1px solid rgba(52, 211, 153, 0.22);
		background: linear-gradient(135deg, rgba(52, 211, 153, 0.06) 0%, rgba(59, 130, 246, 0.03) 100%);
	}

	figcaption {
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--state-positive);
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
		min-width: 620px;
	}

	thead th {
		text-align: left;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
		padding: 0 0.75rem 0.6rem;
		border-bottom: 1px solid var(--border-subtle);
		font-weight: 700;
	}

	.group th {
		text-align: left;
		padding: 1rem 0.75rem 0.4rem;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--state-positive);
		border-bottom: none;
	}

	tbody th[scope='row'] {
		text-align: left;
		font-weight: 500;
		color: var(--text-secondary);
	}

	tbody th,
	tbody td {
		padding: 0.6rem 0.75rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	tbody td {
		color: var(--text-primary);
		font-weight: 600;
	}

	.numeric {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.charges {
		color: var(--state-positive);
	}

	.muted {
		color: var(--text-secondary);
		font-weight: 500;
	}

	code {
		font-size: 0.82rem;
		letter-spacing: 0.01em;
		color: var(--text-secondary);
		background: var(--bg-card-hover);
		padding: 0.1rem 0.4rem;
		border-radius: 5px;
	}

	tbody:last-child tr:last-child th,
	tbody:last-child tr:last-child td {
		border-bottom: none;
	}

	.reading {
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border-subtle);
	}

	.reading h4 {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 0.5rem;
	}

	.reading p {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.method {
		margin-top: 1.25rem;
		font-size: 0.85rem;
	}

	.method summary {
		cursor: pointer;
		color: var(--accent-violet-ink);
		font-weight: 600;
	}

	.method ul {
		margin: 0.75rem 0 0;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	@media (max-width: 640px) {
		.ter-table {
			padding: 1.15rem;
		}
	}
</style>
