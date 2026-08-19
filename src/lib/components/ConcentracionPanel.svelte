<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR, formatPercent } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';
	import LeccionDelPanel from './LeccionDelPanel.svelte';
	import PanelHerramienta from './PanelHerramienta.svelte';

	/**
	 * Solapamiento real: cuánto de la cartera acaba en la misma empresa sumando
	 * los fondos y las acciones sueltas.
	 *
	 * Vive aquí y no dentro del mapa del subyacente por dos razones. Ese mapa
	 * habla de regiones y sectores, y su lista de pares estaba recortada a tres
	 * filas dentro del segundo mapa, detrás de un plegado que en escritorio arranca
	 * cerrado. Y sus porcentajes van **sobre lo analizado** mientras aquí todo va
	 * sobre el patrimonio total: dos denominadores para frases parecidas en dos
	 * sitios distintos es pedir una contradicción a la vista.
	 */

	/**
	 * Abierto/cerrado lo decide el padre: la columna abre **una herramienta a la vez**, y
	 * eso no puede decidirlo un panel que no sabe de sus hermanos. El listener de
	 * `tour-step` —la vía por la que el tutorial, `e2e/tema.spec.ts` y
	 * `scripts/contraste-vivo.mjs` abren un panel plegado— vive ahora en la concha.
	 */
	const { abierto, onAlternar }: { abierto: boolean; onAlternar: (abrir: boolean) => void } =
		$props();

	let verTodas = $state(false);

	const datos = $derived(portfolio.concentracion);

	/** Cuántas filas antes de plegar. Seis es lo que cabe sin dominar la columna. */
	const TOPE = 6;
	const visibles = $derived(verTodas ? datos.empresas : datos.empresas.slice(0, TOPE));

	/**
	 * La barra es magnitud relativa a la mayor posición, no porcentaje del
	 * patrimonio: con exposiciones del 2 al 8 % una barra absoluta sería una
	 * astilla en todas las filas. El número exacto va al lado, así que la barra no
	 * tiene que cargar con la cifra.
	 */
	const mayor = $derived(datos.empresas[0]?.valor ?? 0);
	const anchoDe = (valor: number) => (mayor > 0 ? Math.max(2, (valor / mayor) * 100) : 0);
</script>

<PanelHerramienta
	id="tour-concentracion"
	titulo={$LL.concentracion.title()}
	subtitulo={$LL.concentracion.subtitle()}
	objetivoTour="abrir-concentracion"
	{abierto}
	{onAlternar}
>
	{#snippet icono()}
		<!-- Piezas que encajan: el panel dice cuánto de tu cartera es la misma empresa
		     por más de un camino. -->
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
			<path d="M4 5h6v4a2 2 0 0 0 4 0V5h6v6h-4a2 2 0 0 0 0 4h4v4h-6v-4a2 2 0 0 0-4 0v4H4z" />
		</svg>
	{/snippet}

	{#snippet cifra()}
		{#if datos.valorSolapado > 0}
			<span class="cifra privacy-blur">{formatPercent(datos.pesoSolapado, 1)}</span>
		{/if}
	{/snippet}

	<!-- Dentro del contenido: la cabecera es un `<button>` y un `<a>` ahí
	     dentro es HTML inválido, además de robarle el clic. -->
	<LeccionDelPanel panel="concentracion" />

				{#if datos.empresas.length === 0}
					<p class="empty">{$LL.concentracion.empty()}</p>
				{:else}
					{#if datos.valorSolapado > 0}
						<p class="titular">
							{$LL.concentracion.headline({
								amount: formatEUR(datos.valorSolapado),
								pct: formatPercent(datos.pesoSolapado, 1)
							})}
						</p>
					{:else}
						<p class="titular sin">{$LL.concentracion.headline_none()}</p>
					{/if}

					<section class="ranking">
						<h3 class="section-heading">{$LL.concentracion.ranking_heading()}</h3>
						<ol class="filas">
							{#each visibles as empresa (empresa.clave)}
								<li class="fila" class:solapada={empresa.solapada}>
									<div class="fila-cabeza">
										<span class="emp-nombre">{empresa.nombre}</span>
										<span class="emp-pct privacy-blur">
											{$LL.concentracion.at_least({ pct: formatPercent(empresa.peso, 1) })}
										</span>
									</div>
									<div class="fila-medida">
										<span class="emp-barra" aria-hidden="true">
											<i style="width: {anchoDe(empresa.valor).toFixed(1)}%"></i>
										</span>
										<span class="emp-valor privacy-blur">{formatEUR(empresa.valor)}</span>
									</div>
									{#if empresa.solapada}
										<p class="aviso">
											{empresa.directaYPorFondo
												? $LL.concentracion.badge_direct_and_fund()
												: $LL.concentracion.badge_two_funds()}
										</p>
										<ul class="fuentes">
											{#each empresa.fuentes as fuente (fuente.ticker + (fuente.indexKey ?? ''))}
												<li class="fuente">
													{#if fuente.indexKey === null}
														{$LL.concentracion.source_direct({ amount: formatEUR(fuente.valor) })}
													{:else}
														{$LL.concentracion.source_fund({
															amount: formatEUR(fuente.valor),
															ticker: fuente.ticker
														})}
													{/if}
												</li>
											{/each}
										</ul>
									{/if}
								</li>
							{/each}
						</ol>

						{#if datos.empresas.length > TOPE}
							<button class="mas" type="button" onclick={() => (verTodas = !verTodas)}>
								{verTodas
									? $LL.concentracion.show_less()
									: $LL.concentracion.show_all({ count: String(datos.empresas.length) })}
							</button>
						{/if}
					</section>

					{#if datos.solapamientosDeFondos.length > 0}
						<section class="pares">
							<h3 class="section-heading">{$LL.concentracion.funds_heading()}</h3>
							{#each datos.solapamientosDeFondos as par (par.tickerA + par.tickerB)}
								<p class="par">
									<!-- Una plantilla por caso: dos fondos de bonos soberanos no
									     comparten empresas, comparten emisiones de deuda. -->
									{par.esRentaFija
										? $LL.concentracion.fund_row_bonds({
												a: par.nameA,
												b: par.nameB,
												amount: formatEUR(par.duplicatedValue),
												pct: formatPercent(par.pesoSobrePatrimonio, 1)
											})
										: $LL.concentracion.fund_row({
												a: par.nameA,
												b: par.nameB,
												amount: formatEUR(par.duplicatedValue),
												pct: formatPercent(par.pesoSobrePatrimonio, 1)
											})}
									<span class="par-nota">
										{par.note === 'same-index' ? $LL.concentracion.fund_same_index() : par.note}
									</span>
								</p>
							{/each}
						</section>
					{/if}

					<!--
						La nota del suelo va FUERA del plegado a propósito: dice que toda
						cifra de arriba es un mínimo, y eso no puede depender de que al
						usuario le apetezca abrir un desplegable. El mismo criterio que el
						aviso de estimación del mapa del subyacente.
					-->
					<p class="nota suelo">{$LL.concentracion.floor_note()}</p>

					<details class="notas">
						<summary class="notas-summary">{$LL.concentracion.notes_summary()}</summary>
						<div class="notas-cuerpo">
							{#each datos.coberturaPorIndice as cobertura (cobertura.indexKey)}
								<p class="nota">
									{$LL.concentracion.coverage_row({
										index: cobertura.nombre,
										pct: formatPercent(cobertura.pctVisible / 100, 0)
									})}
								</p>
							{/each}
							{#if datos.valorSinDatosDeEmpresa > 0}
								<p class="nota">
									{$LL.concentracion.no_company_data({
										amount: formatEUR(datos.valorSinDatosDeEmpresa),
										tickers: datos.tickersSinDatosDeEmpresa.slice(0, 6).join(', ')
									})}
								</p>
							{/if}
							{#if datos.valorFueraDelAnalisis > 0}
								<p class="nota">
									{$LL.concentracion.outside({
										amount: formatEUR(datos.valorFueraDelAnalisis),
										tickers: datos.tickersFueraDelAnalisis.slice(0, 6).join(', ')
									})}
								</p>
							{/if}
							<p class="nota">{$LL.concentracion.as_of({ date: datos.asOf })}</p>
							<p class="nota">{$LL.concentracion.disclaimer()}</p>
						</div>
					</details>
				{/if}
</PanelHerramienta>

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

	.titular {
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--text-primary);
		margin: 0;
		padding: 0.9rem 1rem;
		background: var(--tint-warn);
		border: 1px solid var(--tint-warn-line);
		border-radius: 14px;
	}

	.titular.sin {
		background: var(--tint-ok);
		border-color: var(--tint-ok-line);
		color: var(--text-secondary);
	}

	.section-heading {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-faint);
		margin: 0 0 0.75rem 0;
	}

	.filas {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.fila {
		padding: 0.7rem 0.8rem;
		background: var(--bg-card-hover);
		border: 1px solid transparent;
		border-radius: 14px;
	}

	/* La fila solapada se marca con borde, no con otro color de texto: el color de
	   texto ya lo usa la escala de jerarquía. */
	.fila.solapada {
		border-color: var(--tint-warn-line);
	}

	.fila-cabeza {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.emp-nombre {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.emp-pct {
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.fila-medida {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.45rem;
	}

	.emp-barra {
		flex: 1;
		min-width: 0;
		height: 6px;
		background: var(--bg-elevated);
		border-radius: 999px;
		overflow: hidden;
	}

	.emp-barra i {
		display: block;
		height: 100%;
		background: var(--accent-blue);
		border-radius: 999px;
	}

	.emp-valor {
		font-size: 0.78rem;
		color: var(--text-secondary);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.aviso {
		font-size: var(--text-micro);
		font-weight: 600;
		color: var(--accent-orange-ink);
		margin: 0.55rem 0 0 0;
	}

	.fuentes {
		list-style: none;
		margin: 0.3rem 0 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.fuente {
		font-size: var(--text-micro);
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.pares {
		display: flex;
		flex-direction: column;
	}

	.par {
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--text-secondary);
		margin: 0 0 0.6rem 0;
		padding: 0.7rem 0.8rem;
		background: var(--bg-card-hover);
		border-radius: 12px;
	}

	.par-nota {
		display: block;
		font-size: var(--text-micro);
		color: var(--text-muted);
		margin-top: 0.25rem;
	}

	.mas {
		align-self: flex-start;
		margin-top: 0.7rem;
		padding: 0.4rem 0.8rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--accent-blue-ink);
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 999px;
		cursor: pointer;
	}

	.mas:hover {
		border-color: var(--border-strong);
	}

	.nota {
		font-size: 0.7rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.5;
	}

	.nota.suelo {
		color: var(--text-secondary);
	}

	.notas {
		border-top: 1px solid var(--border-subtle);
		padding-top: 0.8rem;
	}

	.notas-summary {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted);
		cursor: pointer;
	}

	.notas-cuerpo {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: 0.6rem;
	}
</style>
