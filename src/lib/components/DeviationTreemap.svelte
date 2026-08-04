<script lang="ts">
	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { squarify, labelFits, truncateToWidth } from '$lib/treemap';
	import { formatEUR, formatPercent } from '$lib/utils';
	import { LL } from '$lib/i18n/i18n-svelte';
	import { DEVIATION_BAND } from '$lib/traspaso';
	import {
		BLOCK_HUES,
		CHART_NEUTRAL,
		DEVIATION_ON_TARGET,
		DEVIATION_OVER,
		DEVIATION_UNDER,
		UNTARGETED_FILL,
		UNTARGETED_STRIPE
	} from '$lib/constants';
	import type { PortfolioPosition } from '$lib/types';
	import MapFrame from './MapFrame.svelte';

	/**
	 * Mapa de cartera al estilo de los mapas de mercado, con tres diferencias
	 * deliberadas.
	 *
	 * La primera: **colorea por desviación respecto al objetivo, no por el cambio
	 * del día**. El color diario enseña a mirar la cartera todos los días y a
	 * reaccionar, que es el hábito que esta app existe para evitar.
	 *
	 * La segunda: **está seccionado por bloque de estrategia**, porque los
	 * objetivos son cosa de la cartera principal y el resto no los tiene como tal.
	 * Ver la nota larga en `blocks`, que es de donde sale todo lo demás.
	 *
	 * La tercera: la escala es **divergente**, azul ← verde apagado → ámbar. El
	 * punto medio fue gris durante un tiempo, y el gris no dice «esto está bien»;
	 * pero un tono saturado en el punto medio de una divergente sí es un
	 * anti-patrón, porque compite con los polos. El verde de `DEVIATION_ON_TARGET`
	 * está medido para caer en medio: por debajo del suelo de croma categórico
	 * —sigue funcionando como casi-neutro— y a la vez tres veces más cromático que
	 * el gris que sustituye. Y **la rampa sigue mezclándose desde el gris**, no
	 * desde el verde, porque una rampa pasa por su origen y verde → ámbar da oliva.
	 */

	interface Props {
		/**
		 * El carrusel de gráficos pone su propia etiqueta encima de cada panel, así
		 * que ahí el título propio del mapa sobraría. El subtítulo se queda en los
		 * dos casos: explica qué significa el color, que no es evidente.
		 */
		showTitle?: boolean;
		/**
		 * Sube al dashboard, que es quien puede ensanchar el carril de la rejilla.
		 * Aquí no hace falta para nada más: el tamaño de letra y la proporción del
		 * lienzo salen del ancho medido, así que se recalculan solos.
		 */
		expanded?: boolean;
	}

	let { showTitle = true, expanded = $bindable(false) }: Props = $props();

	/**
	 * El ancho real del contenedor, no el de la ventana.
	 *
	 * Es la corrección importante: en su carril del carrusel este mapa mide unos
	 * 340 px **también en escritorio**, igual que en móvil, y con el tamaño de
	 * letra atado a una media query salían rótulos de 9 px en pantalla grande. El
	 * cuerpo de letra tiene que derivarse de los píxeles que hay de verdad.
	 */
	let containerWidth = $state(0);

	const VIEW_W = 100;

	/** Píxeles reales por unidad del viewBox. */
	const pxPerUnit = $derived(containerWidth > 0 ? containerWidth / VIEW_W : 3.4);

	/**
	 * Un lienzo apaisado solo cuando hay ancho para ello; si no, casi cuadrado,
	 * porque con poco ancho una tira apaisada deja celdas de 40 px de alto.
	 */
	const viewH = $derived(containerWidth >= 560 ? 58 : 88);

	/** Cuerpo de letra en unidades del viewBox para un tamaño objetivo en píxeles. */
	function unitsFor(targetPx: number): number {
		return targetPx / pxPerUnit;
	}

	// En píxeles, no en unidades: el objetivo es que el rótulo se lea igual mida el
	// carril 340 px o 1100.
	const fontTicker = $derived(unitsFor(13));
	const fontFigure = $derived(unitsFor(11));
	const pad = $derived(unitsFor(6));

	/**
	 * El mapa se secciona por bloque de estrategia, y no es cosmética.
	 *
	 * **Los objetivos son cosa de la cartera principal**; satélite y acciones no
	 * los tienen como tal. Mezclando las tres carteras en un solo lienzo, el mapa
	 * acababa marcando como excepción —«sin objetivo»— a dos tercios de los
	 * activos, cuando ésos estructuralmente no pueden tener objetivo. De ahí venían
	 * todos sus problemas: primero seis de nueve celdas invisibles, luego una
	 * plancha gris, y una leyenda con una entrada que no debería existir. No era un
	 * problema de color.
	 *
	 * Y `measured` se decide por los datos, no por el nombre del bloque: si algún
	 * día se ponen pesos objetivo en el satélite, ese bloque pasa a llevar escala
	 * divergente él solo, sin tocar nada aquí.
	 */
	const blocks = $derived.by(() =>
		[
			{
				key: 'core' as const,
				label: $LL.db.reclassify_core(),
				source: portfolio.portfolioState.positions
			},
			{
				key: 'stocks' as const,
				label: $LL.db.reclassify_stocks(),
				source: portfolio.stockState.positions
			},
			{
				key: 'satellite' as const,
				label: $LL.db.reclassify_satellite(),
				source: portfolio.satelliteState.positions
			}
		]
			.map(({ key, label, source }) => {
				const held = source.filter((p) => p.totalValue > 0);
				return {
					key,
					label,
					positions: held,
					value: held.reduce((sum, p) => sum + p.totalValue, 0),
					measured: held.some((p) => p.asset.targetWeight > 0)
				};
			})
			.filter((block) => block.value > 0)
	);

	const totalValue = $derived(blocks.reduce((sum, b) => sum + b.value, 0));

	/** Si hay algún bloque medido; decide si la leyenda de la escala tiene sentido. */
	const hasScale = $derived(blocks.some((b) => b.measured));

	/**
	 * Hueco entre bloques y alto de su cabecera, en unidades del viewBox.
	 *
	 * El hueco es generoso —14 px— porque la separación entre bloques es ahora el
	 * recurso estructural principal del mapa: es lo que hace que el tono de un
	 * bloque sin escala no se lea como un valor de la escala del bloque de al lado.
	 * Con 7 px las secciones no se leían como secciones. Se reparte mitad y mitad a
	 * cada lado, así que entre dos bloques hay un hueco completo y en el borde del
	 * lienzo medio.
	 */
	const blockGap = $derived(unitsFor(14));
	const fontBlock = $derived(unitsFor(10));
	const headerH = $derived(fontBlock * 1.7);

	/**
	 * Reparto en dos niveles: primero el lienzo entre los bloques por valor, después
	 * cada bloque entre sus activos.
	 *
	 * `squarify` coloca siempre desde el origen, así que los rectángulos interiores
	 * se trasladan al hueco de su bloque. Es exacto —son geometría pura— y evita
	 * añadirle a `squarify` un parámetro de origen que solo usaría este componente.
	 *
	 * El hueco entre bloques se descuenta del rectángulo, así que el área ya no es
	 * *exactamente* proporcional al valor. Es el precio conocido de un treemap
	 * anidado y a cambio da lo único que hace legible la sección: que se vea dónde
	 * acaba un bloque y empieza el otro.
	 */
	const layout = $derived.by(() => {
		const outer = squarify(
			blocks.map((b) => ({ key: b.key, value: b.value })),
			VIEW_W,
			viewH
		);

		return outer.map((slot) => {
			const block = blocks.find((b) => b.key === slot.key)!;

			// ⚠️ El hueco se limita a un cuarto del lado, **por bloque y por eje**. Con
			// `slot - blockGap` a secas, un bloque más estrecho que el hueco se quedaba
			// en cero y desaparecía del mapa entero: su valor seguía contando en el
			// total y su nombre seguía en la leyenda, pero no había nada que mirar. Pasa
			// con una cuenta remunerada testimonial al lado de una cartera grande. Un
			// activo pequeño tiene que salir pequeño, nunca ausente.
			const gapX = Math.min(blockGap, slot.w / 4);
			const gapY = Math.min(blockGap, slot.h / 4);
			const bx = slot.x + gapX / 2;
			const by = slot.y + gapY / 2;
			const bw = slot.w - gapX;
			const bh = slot.h - gapY;

			// La cabecera solo si cabe y si deja sitio de sobra para las celdas: un
			// bloque del 4 % del patrimonio es una tira estrecha, y ahí el nombre lo
			// dice la leyenda (ver `unlabelledBlocks`).
			//
			// ⚠️ **Se mide ya en mayúsculas.** Iba en `text-transform: uppercase` por
			// CSS y se medía la cadena original: las mayúsculas son más anchas, así que
			// la estimación se quedaba corta, y el recorte —que es la garantía dura—
			// cortaba a media palabra: «ACCIONES INDIVIDUALE». La regla general es que
			// el CSS no puede cambiar los glifos después de medirlos.
			const label = truncateToWidth(block.label.toUpperCase(), fontBlock, bw, pad * 2);
			const showHeader = label !== '' && bh >= headerH * 2.6;

			const contentY = by + (showHeader ? headerH : 0);
			const contentH = Math.max(0, bh - (showHeader ? headerH : 0));

			const cells = squarify(
				block.positions.map((p) => ({ key: p.asset.ticker, value: p.totalValue })),
				bw,
				contentH
			).map((rect) => {
				const position = block.positions.find((p) => p.asset.ticker === rect.key)!;
				const placed = { ...rect, x: rect.x + bx, y: rect.y + contentY };

				// El peso se mide sobre el patrimonio entero, no sobre el bloque: el
				// `currentWeight` de la posición es relativo a su categoría, y el mapa
				// compara toda la cartera junta aunque la dibuje por secciones.
				const weight = totalValue > 0 ? position.totalValue / totalValue : 0;

				// Qué cabe se decide celda a celda, midiendo **ancho y alto por
				// separado**. Decidirlo por área dejaba pasar celdas altas y estrechas,
				// que escupían el rótulo encima de la vecina.
				const ticker = truncateToWidth(position.asset.ticker, fontTicker, placed.w, pad * 2);
				const showTicker = ticker !== '' && placed.h >= fontTicker * 1.6;
				const weightText = formatPercent(weight, 1);
				const showWeight =
					showTicker &&
					placed.h >= fontTicker * 1.5 + fontFigure * 1.5 &&
					labelFits(weightText, fontFigure, placed.w, pad * 2);

				// La tercera línea existe solo donde significa algo. En un bloque que no
				// se mide **no se escribe nada**: era el «sin objetivo» repetido en dos
				// tercios de las celdas, informando de una ausencia que nadie esperaba
				// que estuviera. Dentro de un bloque medido sí, porque ahí es un hueco
				// real en los datos.
				const hasTarget = position.asset.targetWeight > 0;
				const anomaly = block.measured && !hasTarget;
				const deviationText = !block.measured
					? ''
					: hasTarget
						? `${position.deviation >= 0 ? '+' : ''}${formatPercent(position.deviation, 1)}`
						: $LL.treemap.legend_no_target();
				const showDeviation =
					deviationText !== '' &&
					showWeight &&
					placed.h >= fontTicker * 1.5 + fontFigure * 3 &&
					labelFits(deviationText, fontFigure * 0.9, placed.w, pad * 2);

				return {
					rect: placed,
					position,
					weight,
					ticker,
					showTicker,
					weightText,
					showWeight,
					deviationText,
					showDeviation,
					hasTarget,
					anomaly,
					measured: block.measured,
					fill: fillFor(block, position)
				};
			});

			return { block, bx, by, bw, bh, label, showHeader, cells };
		});
	});

	/** Todas las celdas de todos los bloques, para lo que no depende de la sección. */
	const cells = $derived(layout.flatMap((section) => section.cells));

	/**
	 * Las muestras de los dos polos, como **degradado y no como cuadrado plano**.
	 *
	 * El mapa nunca pinta el polo puro salvo a partir de diez puntos de desviación:
	 * lo que pinta es la rampa `mix(neutro, polo, 0.6 … 1)`. Una muestra con el polo
	 * puro era por tanto más saturada que cualquier celda de la pantalla, y eso es
	 * exactamente lo que se ve al comparar leyenda y mapa. El degradado enseña el
	 * rango que el mapa sí puede pintar: del suelo del 60 % al polo.
	 */
	const rampFloor = 0.6;
	const underRamp = $derived(
		`linear-gradient(135deg, ${mix(CHART_NEUTRAL, DEVIATION_UNDER, rampFloor)}, ${DEVIATION_UNDER})`
	);
	const overRamp = $derived(
		`linear-gradient(135deg, ${mix(CHART_NEUTRAL, DEVIATION_OVER, rampFloor)}, ${DEVIATION_OVER})`
	);

	/**
	 * ¿Hay alguna celda anómala? Solo entonces se declara el rayado y solo entonces
	 * la leyenda gana esa entrada. En la mayoría de carteras no hay ninguna.
	 */
	const hasAnomaly = $derived(cells.some((c) => c.anomaly));

	/**
	 * Bloques sin escala **cuya cabecera no cupo**: la leyenda dice solo lo que el
	 * mapa no ha podido decir en su sitio.
	 *
	 * Pasa de verdad: la cartera conservadora es un 4 % del patrimonio, y en el
	 * carril estrecho su bloque no tiene alto para una cabecera y una celda a la
	 * vez. Sin esto quedaba una celda violeta suelta debajo de las acciones, sin
	 * nada que dijera de qué bloque era —y en móvil no hay tooltip que lo salve.
	 *
	 * Los bloques medidos no entran aquí aunque les falte la cabecera: sus celdas
	 * las explica la escala, que ya tiene sus tres entradas.
	 */
	const unlabelledBlocks = $derived(
		layout.filter((section) => !section.showHeader && !section.block.measured)
	);

	/** Muestra rayada para la leyenda, con el mismo paso que el patrón del SVG. */
	const anomalySwatch = `repeating-linear-gradient(45deg, ${UNTARGETED_FILL} 0 2.4px, ${UNTARGETED_STRIPE} 2.4px 3.6px)`;

	/**
	 * Tres casos, y cada uno responde a una pregunta distinta.
	 *
	 * En un bloque **que no se mide** el color solo dice de qué bloque es la celda:
	 * un tono plano por bloque, sin escala, porque no hay nada contra lo que medir.
	 * En un bloque **medido** manda la escala divergente: azul por debajo, verde
	 * apagado dentro de banda, ámbar por encima. Y un activo sin objetivo dentro de
	 * un bloque medido es lo único que queda rayado, porque es lo único que de
	 * verdad es una anomalía.
	 *
	 * La intensidad crece con la desviación pero se satura a los diez puntos: sin
	 * el tope, una posición muy desviada aplasta visualmente al resto y el mapa
	 * deja de distinguir «algo desviado» de «bastante desviado».
	 */
	function fillFor(
		block: { key: keyof typeof BLOCK_HUES; measured: boolean },
		position: PortfolioPosition
	): string {
		if (!block.measured) return BLOCK_HUES[block.key];
		if (position.asset.targetWeight <= 0) return `url(#${UNTARGETED_PATTERN_ID})`;

		const deviation = position.deviation;
		if (Math.abs(deviation) <= DEVIATION_BAND) return DEVIATION_ON_TARGET;

		const intensity = Math.min(1, Math.abs(deviation) / 0.1);
		// Se mezcla con el neutro en lugar de bajar la opacidad: con alfa sobre un
		// fondo oscuro el tono pierde chroma y los extremos se acercan entre sí.
		//
		// El suelo de la mezcla es alto —60 %— a propósito: si arranca bajo, una
		// desviación que acaba de salirse de la banda queda casi gris y el mapa
		// entero parece apagado. Fuera de banda significa «hay algo que mirar», y
		// eso tiene que verse de color desde el primer punto porcentual.
		// ⚠️ La mezcla arranca de `CHART_NEUTRAL`, **no** de `DEVIATION_ON_TARGET`,
		// aunque el punto medio sea ahora ese verde. La rampa pasa por su origen, y
		// `mix(verde, ámbar, 0.6)` sale oliva sucio. Ver la nota en `constants.ts`.
		const base = deviation > 0 ? DEVIATION_OVER : DEVIATION_UNDER;
		return mix(CHART_NEUTRAL, base, rampFloor + intensity * (1 - rampFloor));
	}

	/** Mezcla dos hex en el espacio sRGB. Suficiente para una rampa de dos pasos. */
	function mix(from: string, to: string, amount: number): string {
		const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
		const [r1, g1, b1] = parse(from);
		const [r2, g2, b2] = parse(to);
		const channel = (a: number, b: number) => Math.round(a + (b - a) * amount);
		return `rgb(${channel(r1, r2)}, ${channel(g1, g2)}, ${channel(b1, b2)})`;
	}

	/**
	 * Dos mensajes en lugar de uno con relleno.
	 *
	 * Antes se metía «sin objetivo» en el hueco `{target}` de «…objetivo
	 * {target}», y salía «objetivo sin objetivo». Componer frases inyectando
	 * frases produce eso; una plantilla por caso, no.
	 */
	function tooltipFor(weight: number, targetWeight: number, name: string): string {
		if (targetWeight <= 0) {
			return $LL.treemap.tooltip_no_target({ name, weight: formatPercent(weight, 1) });
		}
		return $LL.treemap.tooltip({
			name,
			weight: formatPercent(weight, 1),
			target: formatPercent(targetWeight, 1)
		});
	}

	/**
	 * El id de recorte se deriva del **índice**, no del ticker.
	 *
	 * Sanear el ticker a `[A-Za-z0-9_]` colisiona: `BRK.B` y `BRK-B` dan el mismo
	 * id, y entonces dos celdas comparten recorte y una de ellas escupe su rótulo
	 * fuera de su cuadro. El índice es único por construcción.
	 */
	function clipId(index: number): string {
		return `dev-clip-${index}`;
	}

	/**
	 * Y la cabecera de bloque necesita el suyo, por el mismo motivo que las celdas.
	 *
	 * `truncateToWidth` ya decide si el nombre cabe, pero eso es la estimación; el
	 * recorte es la garantía dura. Sin él, «Cartera Conservadora» en el bloque
	 * estrecho del 4 % se pinta encima del bloque de al lado. El test lo cazó.
	 */
	function blockClipId(key: string): string {
		return `dev-block-clip-${key}`;
	}

	/**
	 * Rayado diagonal de las celdas sin objetivo.
	 *
	 * El paso se deriva de `unitsFor()` como todo lo demás del mapa, y no se fija en
	 * unidades de `viewBox`: en el carril estrecho una unidad son unos 4 px y
	 * ampliado casi 13, así que un paso fijo daría un rayado fino en el carril y
	 * bandas gruesas al ampliar. Así mide siempre lo mismo en pantalla.
	 *
	 * El `rotate(45)` mantiene los 45° reales porque el SVG escala igual en los dos
	 * ejes: el `aspect-ratio` en línea le impone exactamente la razón del
	 * `viewBox`, de modo que `preserveAspectRatio="none"` no llega a deformar nada.
	 */
	const UNTARGETED_PATTERN_ID = 'dev-untargeted';
	const stripePeriod = $derived(unitsFor(9));
</script>

<MapFrame
	title={$LL.treemap.title()}
	subtitle={$LL.treemap.subtitle()}
	{showTitle}
	canExpand={cells.length > 0}
	bind:expanded
	bind:contentWidth={containerWidth}
>
	{#if cells.length === 0}
		<p class="empty">{$LL.treemap.empty()}</p>
	{:else}
		<svg
			class="treemap"
			viewBox="0 0 {VIEW_W} {viewH}"
			style="aspect-ratio: {VIEW_W} / {viewH}"
			preserveAspectRatio="none"
			role="img"
			aria-label={$LL.treemap.title()}
		>
			<defs>
				<!-- `userSpaceOnUse` y no `objectBoundingBox`: así el rayado es una
				     única textura continua bajo todo el mapa en vez de reescalarse
				     dentro de cada celda, donde una celda alargada lo estiraría y dos
				     celdas vecinas tendrían rayas de distinto grosor. -->
				{#if hasAnomaly}
					<pattern
						id={UNTARGETED_PATTERN_ID}
						width={stripePeriod}
						height={stripePeriod}
						patternUnits="userSpaceOnUse"
						patternTransform="rotate(45)"
					>
						<rect width={stripePeriod} height={stripePeriod} fill={UNTARGETED_FILL} />
						<rect width={stripePeriod * 0.34} height={stripePeriod} fill={UNTARGETED_STRIPE} />
					</pattern>
				{/if}

				{#each layout as section (section.block.key)}
					<clipPath id={blockClipId(section.block.key)}>
						<rect x={section.bx} y={section.by} width={section.bw} height={headerH} />
					</clipPath>
				{/each}

				<!-- Un recorte por celda. Es la garantía dura de que ningún rótulo
				     invada a su vecina, independientemente de lo que estime el
				     cálculo de anchos de arriba. -->
				{#each cells as cell, i (cell.position.asset.ticker)}
					<clipPath id={clipId(i)}>
						<rect x={cell.rect.x} y={cell.rect.y} width={cell.rect.w} height={cell.rect.h} />
					</clipPath>
				{/each}
			</defs>

			<!-- Una cabecera por bloque. Es lo que convierte «sin objetivo» de excepción
			     a contexto: con «Acciones Individuales» escrito encima, nadie espera
			     encontrar un objetivo ahí y no hace falta decir que falta. -->
			{#each layout as section (section.block.key)}
				{#if section.showHeader}
					<g clip-path="url(#{blockClipId(section.block.key)})">
						<text
							class="block-label"
							x={section.bx + pad}
							y={section.by + fontBlock}
							font-size={fontBlock}>{section.label}</text
						>
					</g>
				{/if}
			{/each}

			{#each cells as cell, i (cell.position.asset.ticker)}
				<g>
					<title>
						{tooltipFor(cell.weight, cell.position.asset.targetWeight, cell.position.asset.name)}
					</title>
					<rect
						x={cell.rect.x}
						y={cell.rect.y}
						width={cell.rect.w}
						height={cell.rect.h}
						fill={cell.fill}
						stroke="rgba(5, 5, 10, 0.9)"
						stroke-width={unitsFor(2)}
						rx={unitsFor(3)}
					/>
					<g clip-path="url(#{clipId(i)})">
						{#if cell.showTicker}
							<text
								class="cell-ticker"
								x={cell.rect.x + pad}
								y={cell.rect.y + pad + fontTicker * 0.85}
								font-size={fontTicker}
							>
								{cell.ticker}
							</text>
						{/if}
						{#if cell.showWeight}
							<text
								class="cell-weight"
								x={cell.rect.x + pad}
								y={cell.rect.y + pad + fontTicker * 0.85 + fontFigure * 1.25}
								font-size={fontFigure}
							>
								{cell.weightText}
							</text>
						{/if}
						{#if cell.showDeviation}
							<text
								class="cell-deviation"
								class:is-untargeted={cell.anomaly}
								x={cell.rect.x + pad}
								y={cell.rect.y + pad + fontTicker * 0.85 + fontFigure * 2.5}
								font-size={fontFigure * 0.9}
							>
								{cell.deviationText}
							</text>
						{/if}
					</g>
				</g>
			{/each}
		</svg>

		<!--
			La leyenda solo explica la escala, y solo si hay algún bloque que se mida.

			Los tonos de bloque no llevan entrada aquí porque ya llevan su nombre
			escrito encima, dentro del mapa: repetirlo en la leyenda sería decir dos
			veces lo mismo. Y las muestras de los polos van en **degradado** porque el
			mapa nunca pinta el polo puro salvo a partir de diez puntos de desviación:
			lo que pinta es la rampa. Con el polo plano, la muestra era más saturada
			que cualquier celda de la pantalla, y de ahí venía que la leyenda no
			cuadrara con el mapa.
		-->
		<div class="legend">
			{#if hasScale}
				<span class="legend-item">
					<i class="swatch" style="background: {underRamp}"></i>{$LL.treemap.legend_under()}
				</span>
				<span class="legend-item">
					<i class="swatch" style="background: {DEVIATION_ON_TARGET}"></i>{$LL.treemap.legend_on()}
				</span>
				<span class="legend-item">
					<i class="swatch" style="background: {overRamp}"></i>{$LL.treemap.legend_over()}
				</span>
			{/if}
			{#each unlabelledBlocks as section (section.block.key)}
				<span class="legend-item">
					<i class="swatch" style="background: {BLOCK_HUES[section.block.key]}"></i
					>{section.block.label}
				</span>
			{/each}
			{#if hasAnomaly}
				<span class="legend-item">
					<i class="swatch" style="background: {anomalySwatch}"></i>{$LL.treemap.legend_no_target()}
				</span>
			{/if}
			<span class="legend-total privacy-blur">{formatEUR(totalValue)}</span>
		</div>
	{/if}
</MapFrame>

<style>
	.treemap {
		width: 100%;
		height: auto;
		border-radius: 10px;
		overflow: hidden;
		display: block;
	}

	/*
	 * Las etiquetas no capturan el puntero: el `<title>` del grupo es el que
	 * atiende el hover, y un `<text>` por encima lo robaría.
	 */
	.treemap :global(text) {
		pointer-events: none;
		user-select: none;
		font-variant-numeric: tabular-nums;
	}

	/* La cabecera de bloque va sobre el fondo del panel, no sobre una celda, así
	   que lleva tinta apagada: nombra la sección, no compite con los datos. */
	.block-label {
		fill: rgba(255, 255, 255, 0.5);
		font-weight: 700;
		letter-spacing: 0.04em;
		/* Sin `text-transform`: las mayúsculas las pone el guion antes de medir el
		   ancho. Ver la nota en el cálculo del rótulo. */
	}

	.cell-ticker {
		fill: #ffffff;
		font-weight: 700;
	}

	.cell-weight {
		fill: rgba(255, 255, 255, 0.85);
		font-weight: 600;
	}

	.cell-deviation {
		fill: rgba(255, 255, 255, 0.6);
	}

	/* «Sin objetivo» es una etiqueta de estado, no una cifra, así que se distingue
	   del peso de encima con la **cursiva** y no bajando la opacidad. Bajarla era
	   lo que hacía antes, y funcionaba mientras estas celdas eran gris oscuro; en
	   cuanto pasaron a llevar tono, un blanco al 45 % sobre esmeralda o cian se
	   volvió ilegible. Mismo caso que la rampa divergente: sobre color, el alfa
	   engaña. */
	.cell-deviation.is-untargeted {
		fill: rgba(255, 255, 255, 0.9);
		font-style: italic;
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		flex-wrap: wrap;
		font-size: 0.68rem;
		color: var(--text-muted);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.swatch {
		width: 9px;
		height: 9px;
		border-radius: 3px;
		display: inline-block;
		flex-shrink: 0;
	}

	.legend-total {
		margin-left: auto;
		font-weight: 700;
		color: var(--text-primary);
	}

	.empty {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin: 0;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 12px;
	}

	@media (max-width: 640px) {
		.legend {
			gap: 0.6rem;
			font-size: 0.65rem;
		}

		.legend-total {
			/* En una sola columna estrecha, el total en su propia línea se lee
			   mejor que apretado contra la leyenda. */
			margin-left: 0;
			width: 100%;
		}
	}
</style>
