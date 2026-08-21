<script lang="ts">
	import { tick } from 'svelte';
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { LL } from '$lib/i18n/i18n-svelte';
	import Sparkline from './Sparkline.svelte';
	import { tickerLabel } from '$lib/asset-label';
	import type { PortfolioPosition, PortfolioState } from '$lib/types';

	/**
	 * ⚠️ **Aquí había cuatro contadores animados y se han ido.** El *count-up*
	 * sobre una cifra de dinero es cliché de fintech de 2020 y aquí costaba dos
	 * cosas concretas: la cifra tardaba un segundo en ser cierta —arrancaba en 0,
	 * así que lo primero que veías de tu patrimonio era un número falso— y el
	 * baile de dígitos peleaba con el `tabular-nums` que `layout.css` aplica
	 * justo a estas clases para que no bailen.
	 */

	/**
	 * Las dos cajas que tienen una serie detrás la enseñan. Las otras dos no:
	 * «Cambio hoy» y el TER son cifras de un instante, y dibujarles una línea
	 * sería inventar una historia que no existe.
	 */
	const series = $derived(portfolio.performanceSeries);
	const SPARK_WINDOW = 30;

	const investedSpark = $derived(series.invested.slice(-SPARK_WINDOW));
	const gainSpark = $derived(series.gain.slice(-SPARK_WINDOW));

	/** Una sparkline necesita variación: una recta plana no informa, decora. */
	function worthDrawing(points: number[]): boolean {
		if (points.length < 3) return false;
		const min = Math.min(...points);
		const max = Math.max(...points);
		return max - min > Math.abs(max) * 1e-4;
	}

	/*
	 * ─────────────────────────────────────────────────────────────────────────────
	 * El cajón: las cifras de la cabecera, abiertas por cartera.
	 *
	 * No calcula nada nuevo. `portfolioState`, `satelliteState` y `stockState` son
	 * tres llamadas separadas a `calculatePortfolioState()`, y los globales de arriba
	 * son literalmente su suma (`portfolio.svelte.ts:264-271`). O sea que el desglose
	 * ya estaba calculado y se estaba tirando; esto solo lo enseña.
	 *
	 * Que los tres euros sumen la cabecera es por tanto una **propiedad y no una
	 * coincidencia**, y hay un test que la fija: es lo que separa una descomposición
	 * de tres cifras sueltas puestas debajo.
	 * ─────────────────────────────────────────────────────────────────────────────
	 */
	type Cajon = 'rentabilidad' | 'hoy';

	let cajonAbierto = $state<Cajon | null>(null);

	/**
	 * Qué contenido se dibuja, que **no** es lo mismo que qué cajón está abierto.
	 *
	 * El contenido sigue montado al cerrarse porque la animación de plegado necesita
	 * algo que plegar; si dependiera de `cajonAbierto`, al cerrar «hoy» el cajón
	 * cambiaría a las cifras de rentabilidad justo mientras se encoge. Así que esto
	 * solo se mueve al **abrir**.
	 */
	let cajonMostrado = $state<Cajon>('rentabilidad');

	interface Bloque {
		key: string;
		titulo: string;
		estado: PortfolioState;
	}

	/** Solo los bloques con capital: un bloque a cero es una fila de ceros. */
	const bloques: Bloque[] = $derived(
		[
			{ key: 'core', titulo: $LL.manage.title_core(), estado: portfolio.portfolioState },
			{ key: 'stocks', titulo: $LL.manage.title_stocks(), estado: portfolio.stockState },
			{ key: 'satellite', titulo: $LL.manage.title_satellite(), estado: portfolio.satelliteState }
		].filter((b) => b.estado.totalCapital > 0)
	);

	const MAX_MOVERS = 3;

	/**
	 * Las posiciones que más mueven el día, **por valor absoluto**: una bajada de
	 * 300 € manda sobre una subida de 20 €, porque la pregunta es qué explica la
	 * cifra de arriba y no quién va ganando.
	 */
	const movers: PortfolioPosition[] = $derived(
		bloques
			.flatMap((b) => b.estado.positions)
			.filter((p) => p.holdings > 0 && p.dailyChangeValue !== 0)
			.sort((a, b) => Math.abs(b.dailyChangeValue) - Math.abs(a.dailyChangeValue))
			.slice(0, MAX_MOVERS)
	);

	/**
	 * Una caja solo se vuelve pulsable si detrás hay algo que no esté ya arriba.
	 *
	 * Con un único bloque, «rentabilidad por cartera» es una fila que repite la
	 * cabecera —el mismo criterio con el que `.capital-breakdown` no se dibuja cuando
	 * no hay satélite ni acciones—. «Hoy» además abre los movers, así que le basta con
	 * que haya más de una posición moviéndose.
	 */
	const abribleRentabilidad = $derived(bloques.length > 1);
	const abribleHoy = $derived(bloques.length > 1 || movers.length > 1);

	let cajonEl: HTMLElement | undefined = $state();

	/** Un poco de aire bajo el cajón, para que no acabe pegado al borde. */
	const MARGEN_ASOMO = 12;

	async function alternar(cajon: Cajon) {
		if (cajonAbierto === cajon) {
			cajonAbierto = null;
			return;
		}
		cajonMostrado = cajon;
		cajonAbierto = cajon;
		await asomarCajon();
	}

	/**
	 * ⚠️ **En móvil el cajón se abre por debajo de la ventana, y eso lo dijo una medición
	 * y no una captura.** A 390 × 844 la cabecera ya ocupa 517 px cerrada, así que al
	 * carril del cajón le quedan ~257 y su contenido mide 360: medido, «hoy» acababa en el
	 * píxel **947 de una ventana de 844**, con la lista de movers entera fuera de
	 * pantalla. Tocas la caja, se abre algo, y lo que se abre no se ve — la misma forma de
	 * fallo que el selector de rangos del histórico: un control cuyo efecto no es
	 * observable.
	 *
	 * Se mide `.cajon-content` y no el envoltorio a propósito: el envoltorio tiene el alto
	 * animado (`grid-template-rows`), así que justo después del `tick()` reporta un valor
	 * intermedio. El contenido, dentro del `overflow: hidden`, ya tiene el definitivo.
	 *
	 * Y se desplaza **solo lo que sobra**: en escritorio no sobra nada y no se mueve nada,
	 * así que esto no es «hacer scroll al abrir», es no dejar nada fuera.
	 */
	async function asomarCajon() {
		await tick();
		if (!cajonEl) return;
		const sobra = cajonEl.getBoundingClientRect().bottom - window.innerHeight;
		if (sobra <= 0) return;
		const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollBy({ top: sobra + MARGEN_ASOMO, behavior: suave ? 'smooth' : 'auto' });
	}

	/**
	 * Las píldoras de peso, sin las posiciones que no se pueden valorar.
	 *
	 * ⚠️ Una posición sin cotización tiene `currentWeight` 0 —el peso se calcula sobre un
	 * capital del que no forma parte— así que su píldora decía **0,00 %**: la misma cifra
	 * inventada que este arreglo quita de la rentabilidad, un piso más arriba, y encima
	 * la que se lee como «de esto no tienes nada». El mapa de desviación ya las deja
	 * fuera por su filtro de valor; aquí hacía falta decirlo.
	 */
	const pildoras = $derived(portfolio.portfolioState.positions.filter((p) => !p.priceMissing));

	/** El signo se deriva una vez y no dos: antes estaba escrito en las dos expresiones. */
	function signo(valor: number): string {
		return valor > 0 ? '+' : '';
	}
</script>

<!--
	`onkeydown` va en la sección y no en cada botón: el evento burbujea desde el que
	tenga el foco, así que Escape cierra el cajón desde cualquiera de los dos.
-->
{#if !portfolio.loading || Object.keys(portfolio.prices).length > 0}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<section
		id="tour-global-summary"
		class="hero-summary"
		aria-label={$LL.dashboard.summary_aria()}
		onkeydown={(e) => {
			if (e.key === 'Escape') cajonAbierto = null;
		}}
	>
		<div class="hero-primary">

			<span class="summary-label">{$LL.dashboard.total_value_label()}</span>
			<div class="summary-value privacy-blur">{$LL.dashboard.currency(portfolio.globalCapital)}</div>
			{#if portfolio.satelliteState.totalCapital > 0 || portfolio.stockState.totalCapital > 0}
				<div class="capital-breakdown">
					<div class="breakdown-item">
						<span>{portfolio.targetLabel}:</span>
						<strong class="breakdown-value privacy-blur">{$LL.dashboard.currency(portfolio.portfolioState.totalCapital)}</strong>
					</div>
					{#if portfolio.stockState.totalCapital > 0}
						<span class="breakdown-divider">|</span>
						<div class="breakdown-item">
							<span>{$LL.db.cat_stocks_short()}:</span>
							<strong class="breakdown-value privacy-blur">{$LL.dashboard.currency(portfolio.stockState.totalCapital)}</strong>
						</div>
					{/if}
					{#if portfolio.satelliteState.totalCapital > 0}
						<span class="breakdown-divider">|</span>
						<div class="breakdown-item">
							<span>{$LL.db.cat_satellite_short()}:</span>
							<strong class="breakdown-value privacy-blur">{$LL.dashboard.currency(portfolio.satelliteState.totalCapital)}</strong>
						</div>
					{/if}
				</div>
			{/if}

			<!--
				⚠️ **El aviso va aquí, pegado al capital global, y no dentro del cajón.**
				Es la advertencia de *esta* cifra: una posición sin cotizar la baja, y con un
				solo bloque con capital las cajas no llegan a ser botones, así que dentro del
				cajón el aviso sería inalcanzable justo en la cartera más simple.
			-->
			{#if portfolio.globalUnpriced}
				<p class="aviso-sin-precio">
					{$LL.dashboard.unpriced_label({ count: portfolio.globalUnpriced.count })}
					<strong class="aviso-coste privacy-blur"
						>{$LL.dashboard.currency(portfolio.globalUnpriced.cost)}</strong
					>
				</p>
			{/if}
		</div>

		<!--
			⚠️ `.hero-metrics` y el cajón van dentro de un envoltorio, y no son dos hijos
			sueltos de `.hero-summary`, por un motivo muy concreto: `.hero-summary` tiene
			`gap` (1,25rem en móvil, 3rem en escritorio), y **un hijo plegado a 0 de alto
			sigue consumiendo su gap**. La cabecera crecería 20 px en móvil y 48 en
			escritorio con el cajón cerrado. Aquí el envoltorio no tiene gap y el aire lo
			pone el propio cajón por dentro, donde el `overflow: hidden` se lo lleva al
			plegarse. De paso el cajón queda alineado bajo las cuatro cajas, que es de
			quien es, en vez de a lo ancho de toda la barra.
		-->
		<div class="hero-metrics-col">
			<div class="hero-metrics">
				<div class="metric-card">
					<span class="metric-label">{$LL.dashboard.invested_label()}</span>
					<span class="metric-value privacy-blur">{$LL.dashboard.currency(portfolio.globalInvested)}</span>
					{#if worthDrawing(investedSpark)}
						<div class="metric-spark privacy-blur" aria-hidden="true">
							<!--
								⚠️ Aquí había `color="rgba(255,255,255,0.35)"`: un blanco a fuego
								pasado como **prop**, y en tema claro es blanco al 35 % sobre el
								`#ffffff` de `--bg-card`, o sea una línea que no se ve. Ninguna
								guarda lo alcanzaba — `contraste.mjs` lee los bloques `<style>` y el
								atributo `style=` del marcado, no una prop; y las guardas en vivo
								miden color de **texto**, y esto es el `stroke` de un SVG. Es la misma
								forma que el `style="color: #fff"` documentado más abajo, una prop más
								allá. Con el token lo resuelve el tema.
							-->
							<Sparkline data={investedSpark} color="var(--text-muted)" width={90} height={22} />
						</div>
					{/if}
				</div>

				<!--
					⚠️ `svelte:element` en vez de un `{#if}` con la caja escrita dos veces: lo
					único que cambia entre abrible y no abrible es la etiqueta y tres atributos,
					y duplicar el interior es exactamente cómo divergen dos copias de la misma
					cosa (la lección de `PanelHerramienta`, donde las divergencias del duplicado
					eran justo las reglas que hacían falta). Los atributos a `undefined` no se
					emiten, así que un `div` no se lleva un `aria-expanded` mintiendo.
				-->
				<!--
					svelte-ignore a11y_no_static_element_interactions
					--
					El compilador no puede saber que `this` es un `button` justo cuando hay
					`onclick`: las dos cosas dependen de la misma condición. Poner un
					`role="button"` para callarlo sería redundante en el botón de verdad y una
					mentira en el `div`, que no tiene manejador ni entra en la tabulación.
				-->
				<svelte:element
					this={abribleRentabilidad ? 'button' : 'div'}
					type={abribleRentabilidad ? 'button' : undefined}
					class="metric-card"
					class:interactiva={abribleRentabilidad}
					class:positive={portfolio.globalProfit > 0}
					class:negative={portfolio.globalProfit < 0}
					aria-expanded={abribleRentabilidad ? cajonAbierto === 'rentabilidad' : undefined}
					aria-controls={abribleRentabilidad ? 'hero-cajon' : undefined}
					onclick={abribleRentabilidad ? () => alternar('rentabilidad') : undefined}
				>
					<span class="metric-label">{$LL.dashboard.returns_label()}</span>
					<div class="metric-row">
						<span class="metric-value privacy-blur">{$LL.dashboard.currency(portfolio.globalProfit)}</span>
						<span class="metric-badge">{$LL.dashboard.percent(portfolio.globalProfitPercent)}</span>
						{#if abribleRentabilidad}
							<span
								class="metric-chevron"
								class:abierta={cajonAbierto === 'rentabilidad'}
								aria-hidden="true"
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
									<path d="M6 9l6 6 6-6" />
								</svg>
							</span>
						{/if}
					</div>
					{#if worthDrawing(gainSpark)}
						<div class="metric-spark privacy-blur" aria-hidden="true">
							<Sparkline data={gainSpark} width={90} height={22} filled />
						</div>
					{/if}
				</svelte:element>

				<!--
					svelte-ignore a11y_no_static_element_interactions
					--
					El compilador no puede saber que `this` es un `button` justo cuando hay
					`onclick`: las dos cosas dependen de la misma condición. Poner un
					`role="button"` para callarlo sería redundante en el botón de verdad y una
					mentira en el `div`, que no tiene manejador ni entra en la tabulación.
				-->
				<svelte:element
					this={abribleHoy ? 'button' : 'div'}
					type={abribleHoy ? 'button' : undefined}
					class="metric-card"
					class:interactiva={abribleHoy}
					class:positive={portfolio.globalDailyChangeValue > 0}
					class:negative={portfolio.globalDailyChangeValue < 0}
					aria-expanded={abribleHoy ? cajonAbierto === 'hoy' : undefined}
					aria-controls={abribleHoy ? 'hero-cajon' : undefined}
					onclick={abribleHoy ? () => alternar('hoy') : undefined}
				>
					<span class="metric-label">{$LL.dashboard.daily_change_label()}</span>
					<div class="metric-row">
						<span class="metric-value privacy-blur"
							>{signo(portfolio.globalDailyChangeValue)}{$LL.dashboard.currency(
								portfolio.globalDailyChangeValue
							)}</span
						>
						<span class="metric-badge"
							>{signo(portfolio.globalDailyChangeValue)}{$LL.dashboard.percent(
								portfolio.globalDailyChangePercent
							)}</span
						>
						{#if abribleHoy}
							<span class="metric-chevron" class:abierta={cajonAbierto === 'hoy'} aria-hidden="true">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
									<path d="M6 9l6 6 6-6" />
								</svg>
							</span>
						{/if}
					</div>
				</svelte:element>

				<div class="metric-card efficiency">
					<span class="metric-label">{$LL.dashboard.efficiency_label()}</span>
					<div class="metric-row">
						<span class="metric-value">{$LL.dashboard.percent(portfolio.globalWeightedAverageTer)}</span>
						<span class="metric-badge neutral privacy-blur">{$LL.dashboard.currency(portfolio.globalAnnualCost)}{$LL.dashboard.per_year()}</span>
					</div>
				</div>
			</div>

			<!--
				El contenido sigue montado con el cajón cerrado —hace falta para animar el
				plegado— así que se saca del árbol de accesibilidad y del orden de tabulación
				con `inert`. Sin eso un lector de pantalla lee tres carteras que no están en
				pantalla y el tabulador se para dentro de un cajón invisible.

				⚠️ Un booleano de verdad y no `cajonAbierto ? undefined : true`: Svelte pone
				`inert` como **propiedad** del DOM, y con `undefined` la propiedad queda en
				`undefined` en vez de en `false`. En un navegador da igual —el IDL lo
				convierte— pero en jsdom no, así que el test tendría que preguntar por algo
				distinto de lo que promete la palabra.
			-->
			<div class="hero-cajon" class:cerrado={!cajonAbierto} id="hero-cajon">
				<div class="cajon-wrapper" inert={!cajonAbierto}>
					<div class="cajon-content" bind:this={cajonEl}>
						<h3 class="cajon-titulo">
							{cajonMostrado === 'hoy'
								? $LL.dashboard.breakdown_today_title()
								: $LL.dashboard.breakdown_returns_title()}
						</h3>

						<div class="cajon-bloques">
							{#each bloques as bloque (bloque.key)}
								{@const cifra =
									cajonMostrado === 'hoy'
										? bloque.estado.dailyChangeValue
										: bloque.estado.totalProfit}
								{@const pct =
									cajonMostrado === 'hoy'
										? bloque.estado.dailyChangePercent
										: bloque.estado.totalProfitPercent}
								<div class="cajon-bloque">
									<span class="bloque-titulo">{bloque.titulo}</span>
									<div class="bloque-fila">
										<span
											class="bloque-cifra privacy-blur"
											class:positive={cifra > 0}
											class:negative={cifra < 0}>{signo(cifra)}{$LL.dashboard.currency(cifra)}</span
										>
										<span class="bloque-pct" class:positive={cifra > 0} class:negative={cifra < 0}
											>{signo(cifra)}{$LL.dashboard.percent(pct)}</span
										>
									</div>
									{#if cajonMostrado === 'rentabilidad'}
										<span class="bloque-aportado">
											{$LL.dashboard.breakdown_invested()}
											<strong class="bloque-aportado-valor privacy-blur"
												>{$LL.dashboard.currency(bloque.estado.totalInvested)}</strong
											>
										</span>
									{/if}
								</div>
							{/each}
						</div>

						{#if cajonMostrado === 'hoy' && movers.length > 0}
							<div class="cajon-movers">
								<span class="movers-titulo">{$LL.dashboard.movers_title()}</span>
								{#each movers as mover (mover.asset.ticker)}
									<div class="mover">
										<span class="mover-dot" style="--accent: {mover.asset.color}"></span>
										<!--
											`tickerLabel()` y no el ticker crudo ni el nombre truncado: para un
											fondo el ticker **es** su ISIN o su código `0P…`, y truncar el nombre
											colapsa «iShares Core MSCI World» y «iShares Core MSCI EM IMI» al
											mismo texto. Esa función ya resuelve las dos cosas.
										-->
										<span class="mover-nombre">{tickerLabel(mover.asset)}</span>
										<span
											class="mover-valor privacy-blur"
											class:positive={mover.dailyChangeValue > 0}
											class:negative={mover.dailyChangeValue < 0}
											>{signo(mover.dailyChangeValue)}{$LL.dashboard.currency(
												mover.dailyChangeValue
											)}</span
										>
										<span
											class="mover-pct"
											class:positive={mover.dailyChangeValue > 0}
											class:negative={mover.dailyChangeValue < 0}
											>{signo(mover.dailyChangeValue)}{$LL.dashboard.percent(
												mover.dailyChangePercent
											)}</span
										>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div class="hero-actions">
			{#if portfolio.hasAnyHoldings}
				<div class="asset-pills">
					{#each pildoras as pos}
						<div class="asset-pill" style="--accent: {pos.asset.color}">
							<span class="pill-dot"></span>
							<span class="pill-text">{$LL.dashboard.percent(pos.currentWeight)}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</section>
{/if}

<style>
	.hero-summary {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.5rem 1rem;
		margin-bottom: 1.5rem;
		border-radius: 28px;
		background: linear-gradient(165deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
		backdrop-filter: blur(32px) saturate(200%);
		-webkit-backdrop-filter: blur(32px) saturate(200%);
		border: 1px solid var(--border-subtle);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		position: relative;
	}

	.hero-summary::before {
		content: '';
		position: absolute;
		top: -20%;
		right: -10%;
		width: 60%;
		height: 60%;
		background: radial-gradient(circle, rgba(37, 99, 235, 0.16) 0%, transparent 70%);
		filter: blur(40px);
		pointer-events: none;
	}

	.hero-primary {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0;
		position: relative;
		z-index: 1;
	}

	.summary-label {
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--text-faint);
	}

	.summary-value {
		font-size: clamp(2rem, 9vw, 2.75rem);
		font-weight: 900;
		color: var(--text-primary);
		line-height: 1.1;
		letter-spacing: -0.03em;
		text-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
	}

	/* Ver el comentario del marcado: existe para que el cajón plegado no cobre `gap`. */
	.hero-metrics-col {
		display: flex;
		flex-direction: column;
		min-width: 0;
		position: relative;
		z-index: 1;
	}

	.hero-metrics {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.6rem;
	}

	.metric-card {
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 18px;
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		transition:
			background 0.2s ease,
			border-color 0.2s ease;
		min-width: 0;
		/*
		 * Dos de las cuatro cajas se dibujan como `<button>`, así que aquí va su reseteo:
		 * sin él heredan el centrado y la tipografía del agente de usuario. `position` es
		 * para el chevron, que se posiciona absoluto para no meterse en la columna del
		 * rótulo.
		 */
		position: relative;
		width: 100%;
		text-align: left;
		font: inherit;
		color: inherit;
	}

	.metric-card:hover {
		background: var(--bg-card-hover);
	}

	/*
	 * El borde solo se mueve en las cajas que se pueden abrir: es la señal de que hay
	 * algo detrás. Antes `:hover` declaraba el mismo `border-color` que el reposo, o sea
	 * que no hacía nada en ninguna de las cuatro.
	 */
	.metric-card.interactiva {
		cursor: pointer;
	}

	.metric-card.interactiva:hover {
		border-color: var(--border-strong);
	}

	.metric-card.interactiva:focus-visible {
		outline: 2px solid var(--accent-blue);
		outline-offset: 2px;
	}

	.metric-label {
		font-size: var(--text-micro);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/*
	 * ⚠️ **El chevron va en la fila de la cifra y no en la esquina, y eso lo decidió una
	 * captura.** Estaba `position: absolute` arriba a la derecha, con un
	 * `padding-right` en el rótulo para no pisarlo — y el rótulo tiene
	 * `text-overflow: ellipsis`, así que a 1440 px «RENTABILIDAD» se dibujaba
	 * «RENTABILID…». La caja tiene ~95 px de contenido y el rótulo ya ocupa ~92, o sea
	 * que no había 19 px que quitarle: el que sí sobra está en la línea de la cifra,
	 * donde la píldora del porcentaje deja hueco a su derecha. `margin-left: auto` lo
	 * pega al borde de la línea en la que caiga.
	 */
	.metric-chevron {
		display: flex;
		margin-left: auto;
		color: var(--text-faint);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.metric-chevron svg {
		width: 16px;
		height: 16px;
	}

	.metric-chevron.abierta {
		transform: rotate(180deg);
	}

	.metric-spark {
		margin-top: 0.35rem;
		opacity: 0.9;
	}

	.metric-row {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.metric-value {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.metric-badge {
		font-size: 0.65rem;
		font-weight: 800;
		padding: 0.1rem 0.35rem;
		border-radius: 6px;
		background: var(--bg-card-hover);
		white-space: nowrap;
	}

	.metric-card.positive .metric-value { color: var(--state-positive); }
	.metric-card.positive .metric-badge { color: var(--state-positive); background: var(--state-positive-soft); }

	.metric-card.negative .metric-value { color: var(--state-negative); }
	.metric-card.negative .metric-badge { color: var(--state-negative); background: var(--state-negative-soft); }

	.metric-card.efficiency .metric-badge.neutral {
		color: var(--text-muted);
		background: var(--bg-card-hover);
		font-weight: 600;
	}

	/*
	 * El plegado va con `grid-template-rows: 1fr → 0fr` y no con un `max-height` mágico,
	 * copiando `PanelHerramienta`: así el alto lo pone el contenido y la transición no
	 * depende de haber acertado una constante.
	 */
	.hero-cajon {
		display: grid;
		grid-template-rows: 1fr;
		transition:
			grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1),
			opacity 0.25s ease;
		opacity: 1;
	}

	.hero-cajon.cerrado {
		grid-template-rows: 0fr;
		opacity: 0;
	}

	.cajon-wrapper {
		overflow: hidden;
	}

	.cajon-content {
		margin-top: 0.6rem;
		padding: 0.85rem;
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: 18px;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.cajon-titulo {
		margin: 0;
		font-size: var(--text-micro);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-faint);
	}

	/*
	 * `auto-fit` y no un número de columnas: los bloques con capital son uno, dos o tres,
	 * y así la misma regla da tres columnas en escritorio y una fila por cartera a 390 px
	 * sin una media query que haya que mantener en paralelo. ⚠️ El mínimo es 170 px y no
	 * 200 medido: con 200 el carril de escritorio (~590 px) solo admite dos columnas y los
	 * tres bloques salían 2 + 1, con el borde inferior dentado. Con 170 caben los tres, y a
	 * 390 px siguen sin caber dos (2 × 170 + 8 > 329 de contenido), que es lo que mantiene
	 * la fila por cartera en móvil.
	 */
	.cajon-bloques {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 0.5rem;
	}

	.cajon-bloque {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.5rem 0.65rem;
		background: var(--bg-card-hover);
		border-radius: 12px;
		min-width: 0;
	}

	.bloque-titulo {
		font-size: var(--text-micro);
		font-weight: 700;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bloque-fila {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.bloque-cifra {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.bloque-pct {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.bloque-aportado {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.bloque-aportado-valor {
		color: var(--text-secondary);
		font-weight: 700;
	}

	.cajon-movers {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding-top: 0.6rem;
		border-top: 1px solid var(--border-subtle);
	}

	.movers-titulo {
		font-size: var(--text-micro);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-faint);
	}

	/*
	 * Rejilla y no flex: las dos cifras de la derecha se alinean entre filas, que es lo
	 * que permite comparar de un vistazo. `minmax(0, 1fr)` en el nombre porque un hijo de
	 * flex/grid nace con `min-width: auto` y sin esto los puntos suspensivos no se
	 * aplican nunca — el defecto que este repo ya pagó en `LeccionDelPanel`.
	 */
	.mover {
		display: grid;
		grid-template-columns: 8px minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 0.5rem;
	}

	.mover-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
	}

	.mover-nombre {
		font-size: 0.8rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.mover-valor {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-primary);
		white-space: nowrap;
	}

	.mover-pct {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-muted);
		white-space: nowrap;
	}

	/*
	 * El estado va en el color del texto con su signo delante, que es la única forma en
	 * la que este proyecto usa `--state-positive` / `--state-negative`: son la capa de
	 * «sube o baja», nunca el color de una entidad.
	 */
	.bloque-cifra.positive,
	.bloque-pct.positive,
	.mover-valor.positive,
	.mover-pct.positive {
		color: var(--state-positive);
	}

	.bloque-cifra.negative,
	.bloque-pct.negative,
	.mover-valor.negative,
	.mover-pct.negative {
		color: var(--state-negative);
	}

	.hero-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: 1rem;
		border-top: 1px solid var(--border-subtle);
	}

	.asset-pills {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.4rem;
	}

	.asset-pill {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.6rem;
		background: var(--bg-card-hover);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
	}

	.pill-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
		/* Sin halo. El resplandor de neón alrededor de cada punto de color es lo
		   que más envejece un tablero oscuro: es el look de app cripto de 2021. */
	}

	.pill-text {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.capital-breakdown {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.5rem 0.8rem;
		margin-top: 0.5rem;
		font-size: 0.7rem;
		color: var(--text-faint);
		padding: 0.35rem 0.6rem;
		background: var(--bg-card);
		border-radius: 12px;
		width: auto;
		max-width: 100%;
		border: 1px solid var(--border-subtle);
	}

	.breakdown-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		white-space: nowrap;
	}

	/**
	 * ⚠️ **Esto era `style="color: #fff"` en el marcado, y en tema claro dejaba las
	 * tres cifras en blanco sobre el `#ffffff` de `--bg-card`: 1,00:1 medido, es
	 * decir invisibles.** Lo reportó un usuario, no una guarda, y hay dos razones
	 * estructurales para eso, ninguna casual:
	 *
	 * 1. `scripts/contraste.mjs` solo lee los bloques `<style>`. Un color escrito en
	 *    el atributo `style=` del marcado no lo ve **por construcción** — la misma
	 *    forma que este repo ya tiene documentada para los colores que se escaparon
	 *    a JS en `CompositionBars` y `AssetCard`.
	 * 2. Las guardas en vivo (`contraste-vivo.mjs` y `e2e/tema.spec.ts`) se saltaban
	 *    todo `.privacy-blur`, y **todas** las cifras de dinero de la app lo llevan.
	 *
	 * El token correcto es `--text-primary` y no `#fff`: en oscuro vale exactamente
	 * lo mismo que había (20,34:1, la medición no se mueve) y en claro pasa a
	 * `#111118`. No es `--text-faint`, que es lo que hereda de `.capital-breakdown`,
	 * porque la cifra tiene que despegarse de su etiqueta.
	 */
	.breakdown-value {
		color: var(--text-primary);
	}

	.breakdown-divider {
		color: var(--text-faint);
		font-weight: 300;
	}

	/*
	 * Tinte de atención con los tokens que ya existen para eso (`--tint-warn` y su
	 * línea), y la tinta en `--accent-orange-ink`, que es la variante de **texto** del
	 * ámbar: `--accent-orange` es de relleno y como texto no llega a 4,5.
	 */
	.aviso-sin-precio {
		margin: 0.5rem 0 0;
		max-width: 100%;
		padding: 0.35rem 0.6rem;
		border-radius: 12px;
		background: var(--tint-warn);
		border: 1px solid var(--tint-warn-line);
		color: var(--accent-orange-ink);
		font-size: var(--text-micro);
		font-weight: 600;
		text-align: center;
	}

	.aviso-coste {
		font-weight: 800;
	}

	/* Tablet / Small Desktop */
	@media (min-width: 768px) {
		.hero-summary {
			padding: 2.5rem;
		}

		.hero-metrics {
			grid-template-columns: repeat(4, 1fr);
			gap: 1rem;
		}

		.metric-card {
			padding: 1.25rem;
		}

		.cajon-content {
			margin-top: 1rem;
			padding: 1.1rem 1.25rem;
		}
	}

	/* Large Desktop */
	@media (min-width: 1024px) {
		.hero-summary {
			/* Transform to a robust grid on desktop */
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) auto;
			align-items: center;
			gap: 3rem;
			padding: 3rem 3.5rem;
			border-radius: 32px;
		}

		.hero-primary {
			align-items: flex-start;
			padding: 0;
			min-width: 280px;
		}

		.summary-value {
			font-size: 3.5rem;
		}

		.hero-metrics {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 1.5rem;
		}

		.hero-actions {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
			border-top: none;
			border-left: 1px solid var(--border-subtle);
			padding-top: 0;
			padding-left: 3rem;
			justify-content: center;
			min-width: max-content;
		}

		.asset-pills {
			flex-direction: column;
			gap: 0.6rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-cajon,
		.metric-chevron {
			transition: none;
		}
	}
</style>
