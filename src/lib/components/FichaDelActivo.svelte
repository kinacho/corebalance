<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { LL, locale } from '$lib/i18n/i18n-svelte';
	/*
	 * ⚠️ Los porcentajes van por `$LL.dashboard.percent()` y **no** por
	 * `formatPercent()` de utils, que es la trampa evidente. Aquella multiplica por
	 * 100 y formatea con `toFixed`, o sea con **punto decimal**: en una app en
	 * castellano eso pinta «0.12%». La de i18n recibe una **fracción** y la
	 * localiza. Aquí llegan las dos formas —el TER es fracción, los pesos del
	 * dataset van de 0 a 100—, así que hay que dividir donde toca. Lo cazó un test
	 * que esperaba «1,4» y encontró «140.00%».
	 */
	import { formatCurrency } from '$lib/utils';
	import { construirFicha, type FichaActivo } from '$lib/ficha-activo';
	import { etiquetasDeRegion, etiquetasDeSector } from '$lib/etiquetas-indice';
	import { SAVINGS_TAX_YEAR } from '$lib/fiscal';
	import type { Asset } from '$lib/types';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		asset: Asset;
		/** Para saltar al libro desde el aviso de «hace falta el libro». */
		onVerLibro: () => void;
	}

	let { asset, onVerLibro }: Props = $props();

	/**
	 * ⚠️ Los fundamentales se piden **aquí**, al abrir la ficha, y no al arrancar la
	 * app. Quien nunca abra una ficha no gasta ni una petición; quien abra cinco
	 * gasta una sola, porque la respuesta trae la cartera entera. El store se
	 * encarga de no repetirla mientras no cambien los tickers.
	 */
	onMount(() => {
		portfolio.asegurarFundamentales();
	});

	const posicion = $derived(portfolio.posicionDe(asset.ticker));

	const ficha: FichaActivo = $derived(
		construirFicha({
			asset,
			posicion,
			transacciones: portfolio.transactions,
			precioBasePorParticipacion: portfolio.perShareBase[asset.ticker] ?? 0,
			solapamientos: portfolio.lookThrough?.overlaps ?? [],
			concentracion: portfolio.concentracion ?? null,
			/*
			 * `Date.now()` aquí es correcto —es la interfaz, no un cálculo probado—;
			 * lo que no puede hacerlo es `construirFicha`, y por eso lo recibe.
			 */
			ahora: Date.now()
		})
	);

	const fundamentales = $derived(portfolio.fundamentals[asset.ticker]);
	const divisa = $derived(portfolio.prices[asset.ticker]?.currency ?? 'EUR');

	const regiones = $derived(etiquetasDeRegion($LL));
	const sectores = $derived(etiquetasDeSector($LL));

	const nombreTipo = $derived(
		{
			fund: $LL.ficha.tipo_fund(),
			etf: $LL.ficha.tipo_etf(),
			equity: $LL.ficha.tipo_equity(),
			cash: $LL.ficha.tipo_cash(),
			other: $LL.ficha.tipo_other()
		}[ficha.tipo]
	);

	const fecha = (ms: number) => new Date(ms).toLocaleDateString($locale === 'es' ? 'es-ES' : 'en-US');

	/** Los cinco primeros: la ficha resume, no reproduce el dataset entero. */
	const TOPE = 5;
</script>

<div class="ficha">
	<!-- Qué es -->
	<section class="bloque">
		<div class="tipo-fila">
			<span class="tipo-chip">{nombreTipo}</span>
			{#if ficha.tipo === 'fund' || ficha.tipo === 'etf' || ficha.tipo === 'equity'}
				<span class="traspaso" class:si={ficha.traspasable}>
					{ficha.traspasable ? $LL.ficha.traspasable_si() : $LL.ficha.traspasable_no()}
				</span>
			{:else if ficha.tipo === 'other'}
				<span class="traspaso">{$LL.ficha.traspasable_desconocido()}</span>
			{/if}
		</div>

		{#if ficha.ter > 0}
			<div class="coste">
				<span class="dato-clave">{$LL.ficha.coste_title()}</span>
				<span class="dato-valor">{$LL.dashboard.percent(ficha.ter)}</span>
				{#if ficha.terAnualEnEuros !== null}
					<span class="dato-nota privacy-blur">
						{formatCurrency(ficha.terAnualEnEuros, 'EUR')} · {$LL.ficha.coste_anual()}
					</span>
				{/if}
			</div>
		{/if}
	</section>

	<!-- Qué replica -->
	{#if ficha.indice}
		<section class="bloque">
			<h4>{$LL.ficha.indice_title()}</h4>
			<p class="indice-nombre">{ficha.indice.nombre}</p>
			<p class="indice-cobertura">{ficha.indice.cobertura}</p>

			{#if ficha.indice.fiabilidadRegiones === 'estimate'}
				<p class="aviso">{$LL.ficha.indice_estimado()}</p>
			{/if}

			{#if ficha.indice.regiones.length > 0}
				<h5>{$LL.ficha.regiones_title()}</h5>
				<ul class="pesos">
					{#each ficha.indice.regiones.slice(0, TOPE) as region (region.clave)}
						<li>
							<span class="peso-nombre">{regiones[region.clave] ?? region.nombre}</span>
							<span class="peso-valor">{$LL.dashboard.percent(region.peso / 100)}</span>
						</li>
					{/each}
				</ul>
			{/if}

			{#if ficha.indice.sectores && ficha.indice.sectores.length > 0}
				<h5>{$LL.ficha.sectores_title()}</h5>
				<ul class="pesos">
					{#each ficha.indice.sectores.slice(0, TOPE) as sector (sector.clave)}
						<li>
							<span class="peso-nombre">{sectores[sector.clave] ?? sector.nombre}</span>
							<span class="peso-valor">{$LL.dashboard.percent(sector.peso / 100)}</span>
						</li>
					{/each}
				</ul>
			{/if}

			{#if ficha.indice.mayoresPosiciones.length > 0}
				<h5>{$LL.ficha.mayores_title()}</h5>
				<ul class="pesos">
					{#each ficha.indice.mayoresPosiciones.slice(0, TOPE) as empresa (empresa.clave)}
						<li>
							<span class="peso-nombre">{empresa.nombre}</span>
							<span class="peso-valor">{$LL.dashboard.percent(empresa.peso / 100)}</span>
						</li>
					{/each}
				</ul>
				<p class="dato-nota">{$LL.ficha.mayores_nota()}</p>
				{#if ficha.indice.leidoDe}
					<p class="procedencia">
						{$LL.ficha.indice_fuente({
							fuente: ficha.indice.leidoDe,
							fecha: ficha.indice.fechaPosiciones
						})}
					</p>
				{/if}
			{/if}
		</section>
	{:else}
		<section class="bloque">
			<h4>{$LL.ficha.indice_title()}</h4>
			<p class="dato-nota">{$LL.ficha.sin_indice()}</p>
		</section>
	{/if}

	<!-- Si vendieras hoy -->
	<section class="bloque">
		<h4>{$LL.ficha.fiscal_title()}</h4>

		{#if ficha.fiscal.estado === 'sin-libro'}
			<p class="dato-nota">{$LL.ficha.fiscal_sin_libro()}</p>
			<button class="enlace-interno" onclick={onVerLibro}>{$LL.ficha.fiscal_sin_libro_cta()}</button>
		{:else}
			<div class="cifras">
				<div class="cifra-caja">
					<span class="dato-clave">
						{(ficha.fiscal.plusvalia ?? 0) >= 0
							? $LL.ficha.fiscal_plusvalia()
							: $LL.ficha.fiscal_perdida()}
					</span>
					<span
						class="dato-valor privacy-blur"
						class:positivo={(ficha.fiscal.plusvalia ?? 0) > 0}
						class:negativo={(ficha.fiscal.plusvalia ?? 0) < 0}
					>
						{formatCurrency(Math.abs(ficha.fiscal.plusvalia ?? 0), 'EUR')}
					</span>
				</div>
				<div class="cifra-caja">
					<span class="dato-clave">{$LL.ficha.fiscal_factura()}</span>
					<span class="dato-valor privacy-blur">
						{formatCurrency(ficha.fiscal.factura ?? 0, 'EUR')}
					</span>
				</div>
				<div class="cifra-caja">
					<span class="dato-clave">{$LL.ficha.fiscal_coste()}</span>
					<span class="dato-valor privacy-blur">
						{formatCurrency(ficha.fiscal.costeAdquisicion ?? 0, 'EUR')}
					</span>
				</div>
			</div>

			{#if ficha.fiscal.estado === 'parcial'}
				<p class="aviso">{$LL.ficha.fiscal_parcial()}</p>
			{/if}
			{#if ficha.fiscal.fechaLoteMasAntiguo}
				<p class="dato-nota">
					{$LL.ficha.fiscal_desde({ fecha: fecha(ficha.fiscal.fechaLoteMasAntiguo) })}
				</p>
			{/if}
			<p class="procedencia">{$LL.ficha.fiscal_estimacion({ anio: SAVINGS_TAX_YEAR })}</p>

			{#if ficha.fiscal.recompra}
				<div class="recompra" transition:slide>
					<h5>{$LL.ficha.recompra_title()}</h5>
					<p class="dato-nota">
						{$LL.ficha.recompra_ventana({ meses: ficha.fiscal.recompra.ventanaMeses })}
					</p>
					{#if ficha.fiscal.recompra.bloqueada}
						<p class="aviso">{$LL.ficha.recompra_bloqueada()}</p>
						{#if ficha.fiscal.recompra.diasParaRecomprar !== null}
							<p class="dato-nota">
								{$LL.ficha.recompra_dias({ dias: ficha.fiscal.recompra.diasParaRecomprar })}
							</p>
						{/if}
					{/if}
				</div>
			{/if}
		{/if}
	</section>

	<!-- Con qué se pisa -->
	{#if ficha.solapamiento.fondos.length > 0 || ficha.solapamiento.empresas.length > 0}
		<section class="bloque">
			<h4>{$LL.ficha.solape_title()}</h4>

			<!--
				⚠️ La frase larga va **debajo** del nombre y no en la columna de la
				derecha. Puesta a la derecha se lleva casi todo el ancho, y como el
				nombre vive en un `minmax(0, 1fr)` con puntos suspensivos, lo que se
				trunca es justo lo que hay que leer: «iShares Core S&P 5…». A la
				derecha solo va la cifra, que es corta y se alinea entre filas.
			-->
			{#if ficha.solapamiento.fondos.length > 0}
				<h5>{$LL.ficha.solape_fondos()}</h5>
				<ul class="lista">
					{#each ficha.solapamiento.fondos.slice(0, TOPE) as fondo (fondo.ticker)}
						<li>
							<span class="peso-nombre">{fondo.nombre}</span>
							<span class="peso-valor privacy-blur">
								{formatCurrency(fondo.valorDuplicado, 'EUR')}
							</span>
						</li>
					{/each}
				</ul>
				<p class="dato-nota">{$LL.ficha.solape_fondos_nota()}</p>
			{/if}

			{#if ficha.solapamiento.empresas.length > 0}
				<h5>{$LL.ficha.solape_empresas()}</h5>
				<ul class="lista">
					{#each ficha.solapamiento.empresas.slice(0, TOPE) as empresa (empresa.nombre)}
						<li class="con-detalle">
							<span class="peso-nombre">{empresa.nombre}</span>
							<span class="peso-valor privacy-blur">
								{formatCurrency(empresa.valorAqui, 'EUR')}
							</span>
							<span class="detalle">
								{$LL.ficha.solape_tambien({ donde: empresa.tambienPor.join(', ') })}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	<!-- Dividendos y resultados -->
	<section class="bloque">
		<h4>{$LL.ficha.datos_title()}</h4>

		{#if !fundamentales}
			<p class="dato-nota">{$LL.ficha.datos_cargando()}</p>
		{:else if !fundamentales.disponible}
			<p class="dato-nota">{$LL.ficha.datos_no_disponibles()}</p>
		{:else}
			<div class="cifras">
				{#if fundamentales.rentabilidadPorDividendo}
					<div class="cifra-caja">
						<span class="dato-clave">{$LL.ficha.dividendo_rentabilidad()}</span>
						<span class="dato-valor">{$LL.dashboard.percent(fundamentales.rentabilidadPorDividendo)}</span>
					</div>
				{/if}
				{#if fundamentales.dividendoAnual}
					<div class="cifra-caja">
						<span class="dato-clave">{$LL.ficha.dividendo_anual()}</span>
						<span class="dato-valor">{formatCurrency(fundamentales.dividendoAnual, divisa)}</span>
					</div>
				{/if}
				{#if fundamentales.ultimoDividendo}
					<div class="cifra-caja">
						<span class="dato-clave">{$LL.ficha.dividendo_ultimo()}</span>
						<span class="dato-valor">{fecha(fundamentales.ultimoDividendo)}</span>
					</div>
				{/if}
				<!--
					⚠️ Un fondo o un ETF no presentan resultados, así que esta caja no se
					dibuja para ellos. No es un dato que falte: es una pregunta que no
					aplica, y enseñarla vacía sería inventar una carencia.
				-->
				{#if fundamentales.proximosResultados}
					<div class="cifra-caja">
						<span class="dato-clave">{$LL.ficha.resultados_proximos()}</span>
						<span class="dato-valor">{fecha(fundamentales.proximosResultados)}</span>
					</div>
				{/if}
			</div>

			{#if fundamentales.proximosResultados && fundamentales.resultadosEsAproximado}
				<p class="procedencia">{$LL.ficha.resultados_aprox()}</p>
			{/if}

			{#if !fundamentales.rentabilidadPorDividendo && !fundamentales.dividendoAnual && !fundamentales.proximosResultados}
				<p class="dato-nota">{$LL.ficha.datos_no_disponibles()}</p>
			{:else}
				<!--
					⚠️ **La fuente va escrita, y solo en este bloque.** Esta ficha tiene
					cuatro procedencias distintas y atribuirlas todas a Yahoo sería
					falso: lo del índice se lee de un ETF de réplica física y ya lo dice
					con su ticker y su fecha; lo fiscal sale del libro del propio usuario
					y ya se rotula como estimación con FIFO; el solapamiento se calcula
					sobre el dataset curado a mano. Lo único que viene de Yahoo en vivo es
					esto, y es lo único que no lo decía.
				-->
				<p class="procedencia">{$LL.ficha.datos_fuente()}</p>
			{/if}
		{/if}
	</section>
</div>

<style>
	.ficha {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.bloque {
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		padding: 0.9rem 1rem;
	}

	h4 {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	h5 {
		margin: 0.8rem 0 0.35rem;
		font-size: var(--text-micro);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-faint);
	}

	.tipo-fila {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.tipo-chip {
		padding: 0.2rem 0.5rem;
		border-radius: 8px;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		font-size: var(--text-micro);
		font-weight: 700;
		color: var(--text-secondary);
	}

	/*
	 * El estado va en el texto y no en un fondo de color: «se puede traspasar» es
	 * una propiedad del activo, no un bien/mal, y este proyecto reserva el par de
	 * colores de estado para subir y bajar.
	 */
	.traspaso {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.traspaso.si {
		color: var(--accent-green-ink);
		font-weight: 600;
	}

	.coste {
		margin-top: 0.7rem;
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.indice-nombre {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.indice-cobertura {
		margin: 0.2rem 0 0;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.pesos,
	.lista {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.pesos li,
	.lista li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.5rem;
		align-items: baseline;
	}

	/* Una fila con su explicación debajo, ocupando las dos columnas. */
	.lista li.con-detalle {
		grid-template-areas: 'nombre valor' 'detalle detalle';
		row-gap: 0.1rem;
		margin-bottom: 0.25rem;
	}

	.lista li.con-detalle .peso-nombre {
		grid-area: nombre;
	}

	.lista li.con-detalle .peso-valor {
		grid-area: valor;
	}

	.detalle {
		grid-area: detalle;
		font-size: var(--text-micro);
		color: var(--text-muted);
	}

	.peso-nombre {
		font-size: 0.8rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.peso-valor {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.cifras {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
		gap: 0.6rem;
	}

	.cifra-caja {
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		padding: 0.55rem 0.6rem;
		text-align: center;
	}

	.dato-clave {
		display: block;
		font-size: var(--text-micro);
		color: var(--text-faint);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.15rem;
	}

	.dato-valor {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.dato-valor.positivo {
		color: var(--state-positive);
	}

	.dato-valor.negativo {
		color: var(--state-negative);
	}

	.dato-nota {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	/* La procedencia del dato, que es lo que permite recomprobarlo. */
	.procedencia {
		margin: 0.5rem 0 0;
		font-size: var(--text-micro);
		color: var(--text-faint);
	}

	.aviso {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		color: var(--accent-orange-ink);
	}

	.recompra {
		margin-top: 0.7rem;
		padding-top: 0.7rem;
		border-top: 1px solid var(--border-subtle);
	}

	.enlace-interno {
		margin-top: 0.5rem;
		background: none;
		border: none;
		padding: 0;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--accent-blue-ink);
		cursor: pointer;
		text-decoration: underline;
	}
</style>
