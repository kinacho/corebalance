<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { buildComposition, compositionScaleMax, TOLERANCE_BAND_PP } from '$lib/composition';
	import { DEVIATION_OVER, DEVIATION_UNDER, DEVIATION_ON_TARGET } from '$lib/constants';
	import { formatEUR } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';

	/**
	 * El panel que sustituye a los donuts «Estrategia actual» y «Detalle global».
	 *
	 * En HTML y no en SVG, al revés que los dos mapas, y es deliberado: aquí no
	 * hay que medir texto ni repartir un lienzo. El navegador trunca los nombres
	 * con `text-overflow`, los números heredan `tabular-nums` de `layout.css` y
	 * cada fila es texto de verdad, así que la identidad nunca depende del color
	 * y un lector de pantalla la lee sin capa alternativa. La lección de
	 * `approximateTextWidth` en el treemap fue precisamente que medir texto a
	 * mano es una fuente de defectos; si no hace falta, no se hace.
	 *
	 * ⚠️ **El color de la barra es el del activo, no el de la desviación.** El
	 * sistema separa identidad de estado, y una barra es identidad. El estado va
	 * en dos canales que no son el tono de la barra: **la posición** —el extremo
	 * cae dentro o fuera del rectángulo de la banda— y **la cifra en pp**, que sí
	 * lleva color de estado y además un signo. Pintar la barra de ámbar diría
	 * «este activo es ámbar» a la vez que «este activo está alto».
	 */

	interface Props {
		/** Ancho de la banda en puntos porcentuales sobre el bloque. */
		bandPp?: number;
	}

	let { bandPp = TOLERANCE_BAND_PP }: Props = $props();

	const blocks = $derived(
		buildComposition(
			{
				core: portfolio.portfolioState,
				stocks: portfolio.stockState,
				satellite: portfolio.satelliteState
			},
			bandPp
		)
	);

	const scaleMax = $derived(compositionScaleMax(blocks));
	const hasTargets = $derived(blocks.some((b) => b.measured));

	/** De tanto por uno del patrimonio a porcentaje del ancho de la pista. */
	const track = (weightOfTotal: number) =>
		scaleMax > 0 ? Math.min(100, (weightOfTotal / scaleMax) * 100) : 0;

	const blockLabel = (key: string) =>
		key === 'core'
			? $LL.db.reclassify_core()
			: key === 'stocks'
				? $LL.db.reclassify_stocks()
				: $LL.db.reclassify_satellite();

	const pct = (v: number, d = 2) =>
		v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

	/** Color de la cifra de desviación: estado, no identidad. */
	const stateColor = (row: { deviationPp: number | null; inBand: boolean | null }) =>
		row.inBand ? DEVIATION_ON_TARGET : (row.deviationPp ?? 0) > 0 ? DEVIATION_OVER : DEVIATION_UNDER;
</script>

<div class="composition">
	{#if blocks.length === 0}
		<p class="empty">{$LL.db.composition_empty()}</p>
	{:else}
		{#each blocks as block (block.key)}
			<div class="block">
				<div class="block-head">
					<span class="block-name">{blockLabel(block.key)}</span>
					<span class="block-weight">{pct(block.weightOfTotal * 100)} %</span>
				</div>

				{#each block.rows as row (row.ticker)}
					{@const barWidth = track(row.weightOfTotal)}
					<div
						class="row"
						title={portfolio.isPrivate
							? row.name
							: $LL.db.composition_row_title({
									name: row.name,
									value: formatEUR(row.value),
									weight: `${pct(row.weightOfTotal * 100)} %`
								})}
					>
						<span class="row-name">{row.name}</span>

						{#if row.deviationPp !== null}
							<span class="row-dev" style="color: {stateColor(row)}">
								{#if row.inBand}
									{$LL.db.composition_in_band()}
								{:else}
									<!-- Signo y flecha además del color: el estado nunca va solo en el tono. -->
									{row.deviationPp > 0 ? '▲' : '▼'}
									{row.deviationPp > 0 ? '+' : '−'}{pct(Math.abs(row.deviationPp), 1)} pp
								{/if}
							</span>
						{:else}
							<span class="row-dev"></span>
						{/if}

						<div class="row-track">
							{#if row.target !== null}
								{@const bandStart = track(
									Math.max(0, (row.target * 100 - bandPp) / 100) * block.weightOfTotal
								)}
								{@const bandEnd = track(((row.target * 100 + bandPp) / 100) * block.weightOfTotal)}
								<span
									class="band"
									style="left: {bandStart}%; width: {Math.max(0.8, bandEnd - bandStart)}%"
								></span>
							{/if}

							<span class="bar" style="width: {Math.max(0.6, barWidth)}%; background: {row.color}"></span>

							{#if row.target !== null}
								<span class="tick" style="left: {track(row.target * block.weightOfTotal)}%"></span>
							{/if}
						</div>

						<span class="row-pct">{pct(row.weightOfTotal * 100)} %</span>
					</div>
				{/each}
			</div>
		{/each}

		{#if hasTargets}
			<div class="legend">
				<span><i class="sw band-sw"></i>{$LL.db.band_legend({ pp: bandPp })}</span>
				<span><i class="sw tick-sw"></i>{$LL.db.composition_legend_target()}</span>
			</div>
		{/if}
	{/if}
</div>

<style>
	.composition {
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
		width: 100%;
	}

	.block {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.block-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.block-name {
		font-size: 0.64rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-faint);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.block-weight {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	/*
	 * Dos columnas y dos filas: arriba nombre y desviación, abajo la pista y el
	 * porcentaje. La columna derecha es fija para que todos los números queden
	 * en la misma vertical — que es medio motivo de haber pasado de donut a
	 * barras.
	 */
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 5.2rem;
		gap: 0.15rem 0.7rem;
		align-items: center;
	}

	.row-name {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.row-dev {
		font-size: 0.68rem;
		font-weight: 700;
		text-align: right;
		white-space: nowrap;
	}

	.row-track {
		position: relative;
		height: 11px;
		border-radius: 4px;
		background: var(--bg-card-hover);
	}

	.band {
		position: absolute;
		top: -3px;
		height: 17px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.11);
	}

	.bar {
		position: absolute;
		top: 0;
		left: 0;
		height: 11px;
		border-radius: 4px;
		/* Sin degradado ni halo: el relleno es el dato. */
	}

	.tick {
		position: absolute;
		top: -4px;
		width: 2px;
		height: 19px;
		border-radius: 1px;
		background: #ffffff;
		transform: translateX(-1px);
	}

	.row-pct {
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--text-primary);
		text-align: right;
		white-space: nowrap;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1rem;
		padding-top: 0.2rem;
	}

	.legend span {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.66rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.sw {
		flex-shrink: 0;
	}

	.band-sw {
		width: 14px;
		height: 10px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.11);
	}

	.tick-sw {
		width: 2px;
		height: 12px;
		border-radius: 1px;
		background: #ffffff;
	}

	.empty {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-muted);
	}
</style>
