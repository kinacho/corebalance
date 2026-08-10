<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Filler,
		Tooltip
	} from 'chart.js';

	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

	import { portfolio } from '$lib/stores/portfolio.svelte';
	import { formatEUR } from '$lib/utils';
	import { formatCompactCurrency, formatAxisPercent, stepFromTicks } from '$lib/chart-format';
	import {
		applyChartDefaults,
		tooltipStyle,
		categoryAxis,
		valueAxis,
		motionAllowed,
		CHART_SURFACE,
		CONTRIBUTED_FILL,
		MARKET_FILL,
		TREND_UP,
		TREND_DOWN
	} from '$lib/chart-theme';
	import { CATEGORY_COLORS } from '$lib/constants';
	import { clipNoticeFor, type RangeId } from '$lib/history/range';
	import { ui } from '$lib/stores/ui.svelte';
	import { LL, locale } from '$lib/i18n/i18n-svelte';

	/**
	 * Tres modos, tres preguntas distintas, nunca en el mismo eje:
	 *
	 * - `value`  — ¿cuánto tengo? Vender **debe** hacerla bajar.
	 * - `twr`    — ¿cómo se han comportado mis activos? Ni vender ni aportar la mueven.
	 * - `gain`   — ¿cuánto he ganado sobre lo aportado?
	 *
	 * Mezclar la primera con la segunda es lo que convertía una venta en una
	 * pérdida aparente del 40 %.
	 */
	type ViewMode = 'value' | 'twr' | 'gain' | 'split';

	let canvas: HTMLCanvasElement;
	let chart: Chart;
	/** El degradado del área. Se crea en `onMount`, cuando ya hay contexto 2D. */
	let areaFill: CanvasGradient | string = 'transparent';

	/**
	 * ⚠️ **Los rangos eran 7D / 14D / 30D y eso contradecía a la propia app.**
	 * `CLAUDE.md` dice, sobre el mapa de desviación, que colorear por cambio
	 * diario «enseña al usuario a mirar todos los días y reaccionar, que es justo
	 * el hábito que la app existe para evitar» — y un selector cuyo horizonte más
	 * largo es un mes dice exactamente eso con otras palabras. Para un inversor
	 * indexado la ventana relevante es el año, no la quincena.
	 *
	 * Por defecto **todo el historial**: es el encuadre honesto, y además el único
	 * que no miente cuando aún hay tres días de datos.
	 */
	let currentRange = $state<RangeId>('ALL');
	let viewMode = $state<ViewMode>('value');

	const allowMotion = motionAllowed();

	const ranges = $derived([
		{ id: '1M' as const, label: '1M', days: 30 },
		{ id: '3M' as const, label: '3M', days: 90 },
		{ id: 'YTD' as const, label: $LL.db.chart_range_ytd(), days: null },
		{ id: '1Y' as const, label: '1A', days: 365 },
		{ id: 'ALL' as const, label: $LL.db.chart_range_all(), days: null }
	]);

	// Por defecto solo la línea principal; las categorías se activan a mano. Las
	// claves siguen en español porque son las que ya hay guardadas en el
	// `localStorage` de quien usa la app desde antes.
	let hiddenDatasets = $state<string[]>(['Principal', 'Acciones', 'Conservadora', 'Invertido']);

	onMount(() => {
		const saved = localStorage.getItem('corebalance_hidden_history_lines');
		if (saved) {
			try {
				hiddenDatasets = JSON.parse(saved);
			} catch (e) {
				console.error('Error loading hidden lines', e);
			}
		}
	});

	$effect(() => {
		localStorage.setItem('corebalance_hidden_history_lines', JSON.stringify(hiddenDatasets));
	});

	function toggleDataset(label: string) {
		if (hiddenDatasets.includes(label)) {
			hiddenDatasets = hiddenDatasets.filter((l) => l !== label);
		} else {
			hiddenDatasets = [...hiddenDatasets, label];
		}
	}

	const series = $derived(portfolio.performanceSeries);

	/**
	 * Primer índice visible según el rango.
	 *
	 * `YTD` se resuelve por fecha y no por número de días, que es lo que la hace
	 * distinta de «12 meses»: en marzo son 90 días y en diciembre 365.
	 */
	const startIndex = $derived.by(() => {
		const all = series.points;
		if (all.length === 0) return 0;

		if (currentRange === 'ALL') return 0;

		if (currentRange === 'YTD') {
			const year = new Date().getFullYear();
			const first = all.findIndex((p) => new Date(p.date).getFullYear() === year);
			return first === -1 ? Math.max(0, all.length - 1) : first;
		}

		const days = ranges.find((r) => r.id === currentRange)?.days ?? all.length;
		return Math.max(0, all.length - days);
	});

	/**
	 * Cuando el rango pedido es más largo que el historial guardado se enseña lo
	 * que hay, y se dice. Sin esto, pulsar «1A» con tres semanas de datos deja la
	 * misma imagen que «1M» y parece que el botón no hace nada.
	 *
	 * ⚠️ **Se compara por fechas, no por `days`, porque `YTD` y `Todo` valen `null` y con
	 * la comprobación anterior (`days !== null && points.length < days`) esos dos rangos
	 * no avisaban nunca.** Y ese es justo el agujero que importa: la serie no puede pasar
	 * de `HISTORY_DAYS` (30) porque la reconstrucción vive del sparkline de Yahoo, así que
	 * **«Todo» —que además es el rango por defecto— enseñaba un mes llamándolo todo el
	 * historial**, aunque hubiera años de snapshots guardados, y sin una palabra.
	 *
	 * La decisión vive en `$lib/history/range.ts`, fuera del componente, porque decide algo
	 * y aquí no la miraba nadie. Distingue dos situaciones que el código anterior
	 * confundía: `short` («todavía no llevas tanto tiempo», no falta nada) y `capped`
	 * («hay historial anterior que la reconstrucción no alcanza»), donde el texto de
	 * `short` sería mentira porque los datos sí existen.
	 */
	const clipNotice = $derived(
		clipNoticeFor({
			range: currentRange,
			firstShownDate: series.points[0]?.date ?? null,
			oldestKnownDate: series.oldestKnownDate,
			today: new Date()
		})
	);

	/** La ventana visible, con el índice TWR rebasado a su primer día. */
	const view = $derived.by(() => {
		const all = series.points;
		const start = startIndex;
		const points = all.slice(start);
		const rawTwr = series.twr.slice(start);
		const twrBase = rawTwr[0] > 0 ? rawTwr[0] : 100;

		return {
			points,
			twrPct: rawTwr.map((v) => (v / twrBase - 1) * 100),
			invested: series.invested.slice(start),
			gain: series.gain.slice(start),
			estimated: points.map((p) => p.estimated),
			hasEstimated: points.some((p) => p.estimated),
			hasGaps: points.some((p) => !p.hasBreakdown),
			flows: points.map((p) => p.netFlow)
		};
	});

	const isPercentMode = $derived(viewMode === 'twr');
	/**
	 * ⚠️ **La pregunta que ningún gráfico de patrimonio contesta: ¿esto sube o
	 * simplemente he metido más?** El modo divide la serie en dos franjas
	 * apiladas —abajo lo aportado, arriba la revalorización— y con eso se ve de
	 * un vistazo. El dato ya estaba en el store (`invested` y `gain`); lo que
	 * había era una quinta línea escalonada que salía apagada por defecto, o sea
	 * la respuesta escondida detrás de un interruptor.
	 */
	const isSplitMode = $derived(viewMode === 'split');

	/**
	 * En los días sin desglose por categoría se devuelve `null` para que el
	 * gráfico deje un hueco. Los snapshots de versiones anteriores solo guardaban
	 * el total, y dibujar una categoría inventada sería peor que no dibujarla.
	 */
	function categorySeries(key: 'core' | 'stocks' | 'satellite'): (number | null)[] {
		return view.points.map((p) => (p.hasBreakdown ? p[key] : null));
	}

	function flowLabel(amount: number): string {
		return amount > 0 ? $LL.db.chart_flow_in() : $LL.db.chart_flow_out();
	}

	/**
	 * Formato del eje temporal. Con más de tres meses en pantalla el día sobra y
	 * lo que se quiere leer es el mes; por debajo, al revés.
	 */
	function axisDate(iso: string, span: number): string {
		const loc = $locale === 'es' ? 'es-ES' : 'en-US';
		const opts: Intl.DateTimeFormatOptions =
			span > 120 ? { month: 'short', year: '2-digit' } : { day: '2-digit', month: 'short' };
		return new Date(iso).toLocaleDateString(loc, opts).replace('.', '');
	}

	/** Volcado de la serie al gráfico. */
	function syncChart() {
		if (!chart) return;

		const span = view.points.length;
		chart.data.labels = view.points.map((p) => axisDate(p.date, span));

		chart.data.datasets[0].label =
			viewMode === 'twr'
				? $LL.db.chart_label_return()
				: viewMode === 'gain'
					? $LL.db.chart_label_gain()
					: isSplitMode
						? $LL.db.chart_label_market()
						: $LL.db.chart_label_total();
		chart.data.datasets[1].label = $LL.db.chart_label_core();
		chart.data.datasets[2].label = $LL.db.chart_label_stocks();
		chart.data.datasets[3].label = $LL.db.chart_label_satellite();
		chart.data.datasets[4].label = isSplitMode
			? $LL.db.chart_label_contributed()
			: $LL.db.chart_label_invested();

		chart.data.datasets[0].data =
			viewMode === 'twr'
				? view.twrPct
				: viewMode === 'gain'
					? view.gain
					: view.points.map((p) => p.total);
		chart.data.datasets[0].hidden = hiddenDatasets.includes('Total');

		// Las categorías solo tienen sentido en euros: el desglose por categoría de
		// la rentabilidad exigiría repartir los flujos por categoría, que es
		// precisión que ahora mismo no se tiene.
		const showCategories = viewMode === 'value';
		chart.data.datasets[1].data = categorySeries('core');
		chart.data.datasets[1].hidden = !showCategories || hiddenDatasets.includes('Principal');
		chart.data.datasets[2].data = categorySeries('stocks');
		chart.data.datasets[2].hidden = !showCategories || hiddenDatasets.includes('Acciones');
		chart.data.datasets[3].data = categorySeries('satellite');
		chart.data.datasets[3].hidden = !showCategories || hiddenDatasets.includes('Conservadora');

		// El capital aportado es una escalera real, no el invertido de hoy repetido
		// hacia atrás como si nunca hubieras aportado nada.
		chart.data.datasets[4].data = view.invested;
		// En modo split lo aportado no es opcional: es la mitad de abajo del
		// gráfico, así que ignora el interruptor de la leyenda.
		chart.data.datasets[4].hidden = isSplitMode
			? false
			: !showCategories || hiddenDatasets.includes('Invertido');

		/**
		 * ⚠️ Las dos franjas se montan **reconfigurando datasets que ya existen**,
		 * no añadiendo otros: Chart.js resuelve `fill: { target }` por índice, así
		 * que insertar uno delante rompería el relleno de forma silenciosa. El 0
		 * (total) se rellena hasta el 4 (aportado) y el 4 hasta el origen.
		 */
		const d0 = chart.data.datasets[0] as unknown as Record<string, unknown>;
		const d4 = chart.data.datasets[4] as unknown as Record<string, unknown>;

		d0.fill = isSplitMode ? { target: 4 } : true;
		d0.backgroundColor = isSplitMode ? MARKET_FILL : areaFill;
		d0.borderColor = isSplitMode ? 'rgba(255,255,255,0.85)' : '#ffffff';

		d4.fill = isSplitMode ? 'origin' : false;
		d4.backgroundColor = isSplitMode ? CONTRIBUTED_FILL : 'transparent';
		d4.borderColor = isSplitMode ? 'rgba(255,255,255,0.35)' : 'rgba(255, 255, 255, 0.32)';
		d4.borderDash = isSplitMode ? [] : [6, 4];

		/**
		 * ⚠️ **En modo apilado el eje ARRANCA EN CERO, y no es una preferencia.**
		 * Con el eje empezando en 60k —que es lo correcto para una línea, porque
		 * ahí lo que se lee es la forma— las dos franjas dejan de ser
		 * proporcionales a lo que valen: lo aportado quedaba como una tira de
		 * 10 px bajo una mancha enorme, sugiriendo que el 95 % del patrimonio lo
		 * puso el mercado cuando son 64.265 € de 116.052 €. Un área apilada cuyo
		 * eje no llega al cero no es un gráfico impreciso, es un gráfico que dice
		 * otra cosa. Salió al mirar la captura.
		 */
		const yScale = chart.options.scales?.y as { beginAtZero?: boolean; min?: number } | undefined;
		if (yScale) {
			yScale.beginAtZero = isSplitMode;
			yScale.min = isSplitMode ? 0 : undefined;
		}

		if (chart.options.scales?.y) {
			const yAxis = chart.options.scales.y as any;
			/**
			 * ⚠️ El paso de la rejilla llega por el tercer argumento del callback y
			 * hay que usarlo: sin él, una cartera que se mueve entre 116.000 y
			 * 116.500 escribe `116k €` en las seis marcas. Ver `chart-format.ts`.
			 */
			if (isPercentMode) {
				yAxis.ticks.callback = (value: number, _i: number, ticks: { value: number }[]) =>
					portfolio.isPrivate ? '****' : formatAxisPercent(value, stepFromTicks(ticks));
			} else {
				yAxis.ticks.callback = (value: number, _i: number, ticks: { value: number }[]) =>
					portfolio.isPrivate
						? '****'
						: formatCompactCurrency(value, ui.baseCurrency, stepFromTicks(ticks));
			}
		}

		chart.update();
	}

	$effect(() => {
		// `view` se lee antes de cualquier guarda para que el efecto quede suscrito
		// a ella aunque el gráfico todavía no exista. Comprobar `chart` primero
		// cortocircuitaba la lectura, el efecto no registraba la dependencia y el
		// lienzo se quedaba en blanco hasta el siguiente tick de precios.
		const hasData = view.points.length > 0;
		// Modo y visibilidad también son dependencias del volcado.
		void viewMode;
		void hiddenDatasets;
		void currentRange;
		if (hasData) syncChart();
	});

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		applyChartDefaults();

		/**
		 * El degradado de área. Antes era blanco al 10 % sobre una malla oscura, o
		 * sea invisible: ocupaba código y no se veía. A 0,16 sí lee como volumen
		 * bajo la línea, que es lo que le da cuerpo al gráfico.
		 */
		areaFill = ctx.createLinearGradient(0, 0, 0, 320);
		(areaFill as CanvasGradient).addColorStop(0, 'rgba(255, 255, 255, 0.16)');
		(areaFill as CanvasGradient).addColorStop(1, 'rgba(255, 255, 255, 0)');

		/** Discontinuo en los tramos que la app no observó, solo reconstruyó. */
		const dashEstimated = (c: any) => (view.estimated[c.p1DataIndex] ? [4, 4] : undefined);

		/**
		 * ⚠️ **Un punto relleno es una entrada de dinero y un punto hueco una
		 * salida — la diferencia es la forma, no el color, y es deliberado.**
		 * Antes la salida se pintaba de ámbar, que en este tablero significa «por
		 * encima del objetivo», y sobre todo se leía como una advertencia. Pero
		 * este gráfico tiene un pie de tooltip escrito expresamente para decir que
		 * **una venta no es una pérdida**; pintarla de color de alarma dice lo
		 * contrario en el mismo sitio y más alto.
		 */
		const flowAt = (c: any) => view.flows[c.dataIndex] ?? 0;

		/**
		 * El color de la línea principal: verde por encima de lo aportado, rojo por debajo.
		 *
		 * Se colorea **por tramos** y no la línea entera según el estado de hoy, que es la
		 * diferencia entre informar y decorar: así se ve *cuándo* estuviste en pérdidas, que es
		 * justo lo que un patrimonio de un solo color esconde.
		 *
		 * La referencia depende del modo, porque «positivo» no significa lo mismo en los tres:
		 * en euros es estar por encima del capital aportado, y en rentabilidad o ganancia es
		 * estar por encima de cero. En el modo apilado no se aplica: ahí la línea es el borde
		 * de una banda cuyo significado ya lo dan los dos rellenos, y pintarla de rojo diría
		 * dos cosas con un canal.
		 */
		const referenciaEn = (i: number) =>
			viewMode === 'value' ? (view.invested[i] ?? 0) : 0;
		const valorEn = (i: number) =>
			viewMode === 'twr' ? (view.twrPct[i] ?? 0)
			: viewMode === 'gain' ? (view.gain[i] ?? 0)
			: (view.points[i]?.total ?? 0);

		const colorDeTramo = (c: any) => {
			if (isSplitMode) return undefined; // que mande el color base del dataset
			const i = c.p1DataIndex ?? c.p0DataIndex ?? 0;
			return valorEn(i) >= referenciaEn(i) ? TREND_UP : TREND_DOWN;
		};

		// @ts-ignore - Chart.js types are too strict for this configuration
		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: [],
				datasets: [
					{
						label: 'Total',
						data: [],
						borderColor: '#ffffff',
						backgroundColor: areaFill,
						fill: true,
						// ⚠️ Sin suavizado. Estaba en 0,45 y una spline no interpola: se
						// pasa de largo. En un gráfico de patrimonio eso son picos y
						// valles de dinero que nunca existieron, dibujados por el motor
						// de curvas. Un patrimonio diario real es dentado.
						tension: 0,
						borderWidth: 2,
						borderCapStyle: 'round',
						borderJoinStyle: 'round',
						segment: { borderDash: dashEstimated, borderColor: colorDeTramo },
						pointRadius: (c: any) => (flowAt(c) ? 4 : 0),
						pointHoverRadius: (c: any) => (flowAt(c) ? 6 : 4),
						pointBackgroundColor: (c: any) => (flowAt(c) > 0 ? '#ffffff' : CHART_SURFACE),
						pointBorderColor: '#ffffff',
						pointBorderWidth: 2
					},
					{
						label: 'Principal',
						data: [],
						borderColor: CATEGORY_COLORS.core,
						fill: false,
						tension: 0,
						pointRadius: 0,
						borderWidth: 2,
						borderCapStyle: 'round',
						borderJoinStyle: 'round',
						segment: { borderDash: dashEstimated },
						spanGaps: false
					},
					{
						label: 'Acciones',
						data: [],
						borderColor: CATEGORY_COLORS.stocks,
						fill: false,
						tension: 0,
						pointRadius: 0,
						borderWidth: 2,
						borderCapStyle: 'round',
						borderJoinStyle: 'round',
						segment: { borderDash: dashEstimated },
						spanGaps: false
					},
					{
						label: 'Conservadora',
						data: [],
						borderColor: CATEGORY_COLORS.satellite,
						fill: false,
						tension: 0,
						pointRadius: 0,
						borderWidth: 2,
						borderCapStyle: 'round',
						borderJoinStyle: 'round',
						segment: { borderDash: dashEstimated },
						spanGaps: false
					},
					{
						label: 'Invertido',
						data: [],
						borderColor: 'rgba(255, 255, 255, 0.32)',
						borderDash: [6, 4],
						borderWidth: 1.5,
						pointRadius: 0,
						fill: false,
						stepped: true,
						borderCapStyle: 'round',
						borderJoinStyle: 'round'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { display: false },
					tooltip: {
						...tooltipStyle,
						itemSort: (a: any, b: any) => (b.raw as number) - (a.raw as number),
						callbacks: {
							label: (context: any) => {
								const label = context.dataset.label || '';
								if (portfolio.isPrivate) return ` ${label}: ****`;
								const yValue = context.parsed.y ?? 0;
								const value = isPercentMode ? yValue.toFixed(2) + '%' : formatEUR(yValue);
								return ` ${label}: ${value}`;
							},
							/**
							 * La pieza que evita el susto: cuando el patrimonio baja por
							 * una venta, el tooltip lo dice con palabras en lugar de
							 * dejar que el usuario lo lea como una pérdida.
							 */
							footer: (items: any[]) => {
								const index = items[0]?.dataIndex ?? -1;
								const flow = view.flows[index] ?? 0;
								const lines: string[] = [];
								if (flow && !portfolio.isPrivate) {
									lines.push(
										`${flowLabel(flow)}: ${formatEUR(flow)} — ${$LL.db.chart_flow_not_loss()}`
									);
								}
								if (view.estimated[index]) lines.push($LL.db.chart_estimated_short());
								return lines;
							}
						}
					}
				},
				/**
				 * ⚠️ Antes había una animación «a mano alzada» que retrasaba cada
				 * punto 20 ms respecto al anterior: en una serie de 30 días eso son
				 * seis décimas hasta poder leer la cifra, para no contar nada. El
				 * dato aparece; lo que se atenúa es la entrada.
				 */
				animation: allowMotion ? { duration: 320, easing: 'easeOutQuart' as const } : false,
				scales: {
					x: { ...categoryAxis },
					y: {
						...valueAxis,
						beginAtZero: false,
						position: 'right'
					}
				}
			} as any
		});

		// Primer pintado sin esperar al siguiente tick de precios.
		syncChart();
	});

	onDestroy(() => {
		if (chart) chart.destroy();
	});

	/** Las cinco entradas de leyenda, para no repetir el mismo bloque cinco veces. */
	/**
	 * El color del último tramo dibujado, que es el estado de hoy. Lo usa la muestra de la
	 * leyenda; la línea lo decide tramo a tramo en `colorDeTramo`, dentro del gráfico.
	 */
	const colorActual = $derived.by(() => {
		const i = view.points.length - 1;
		if (i < 0) return '#ffffff';
		const valor =
			viewMode === 'twr' ? (view.twrPct[i] ?? 0)
			: viewMode === 'gain' ? (view.gain[i] ?? 0)
			: (view.points[i]?.total ?? 0);
		const referencia = viewMode === 'value' ? (view.invested[i] ?? 0) : 0;
		return valor >= referencia ? TREND_UP : TREND_DOWN;
	});

	const legendItems = $derived([
		{
			key: 'Total',
			swatch: 'dot' as const,
			/**
			 * ⚠️ **La muestra tiene que decir lo que la línea está pintando.** Se quedó en
			 * blanco al colorear la línea por tramos, así que la leyenda enseñaba un punto
			 * blanco junto a una línea verde o roja — la misma contradicción leyenda-gráfico
			 * que ya pasó con la banda de «lo que pusiste», y otra vez encontrada mirando la
			 * captura y no leyendo el código.
			 *
			 * Lleva el color del **último tramo**, que es el estado de hoy: es lo que hace
			 * legible el par sin explicarlo, porque la cifra de la cabecera dice lo mismo con
			 * signo. En el modo apilado la línea vuelve a su color base y la muestra también.
			 */
			color: isSplitMode ? MARKET_FILL : colorActual,
			label:
				viewMode === 'twr'
					? $LL.db.chart_label_return()
					: viewMode === 'gain'
						? $LL.db.chart_label_gain()
						: isSplitMode
							? $LL.db.chart_label_market()
							: $LL.db.chart_label_total()
		},
		{ key: 'Principal', swatch: 'dot' as const, color: CATEGORY_COLORS.core, label: $LL.db.chart_label_core() },
		{ key: 'Acciones', swatch: 'dot' as const, color: CATEGORY_COLORS.stocks, label: $LL.db.chart_label_stocks() },
		{
			key: 'Conservadora',
			swatch: 'dot' as const,
			color: CATEGORY_COLORS.satellite,
			label: $LL.db.chart_label_satellite()
		},
		{
			key: 'Invertido',
			swatch: isSplitMode ? ('dot' as const) : ('line' as const),
			color: isSplitMode ? CONTRIBUTED_FILL : 'rgba(255,255,255,0.32)',
			label: isSplitMode ? $LL.db.chart_label_contributed() : $LL.db.chart_label_invested()
		}
	]);
</script>

<div class="chart-container">
	<div class="chart-header">
		<div class="legend">
			{#each legendItems as item (item.key)}
				{#if isSplitMode ? item.key === 'Total' || item.key === 'Invertido' : item.key === 'Total' || viewMode === 'value'}
					<!--
						En modo apilado las dos franjas no son opcionales —son el gráfico—,
						así que la fila ni se apaga ni responde al clic. Sin esto, «lo que
						pusiste» salía con la muestra hueca (sigue marcada como oculta en
						`localStorage`) mientras su banda se dibujaba abajo: la leyenda
						contradiciendo al gráfico.
					-->
					<button
						class="legend-item"
						class:is-off={!isSplitMode && hiddenDatasets.includes(item.key)}
						aria-pressed={isSplitMode || !hiddenDatasets.includes(item.key)}
						disabled={isSplitMode}
						onclick={() => toggleDataset(item.key)}
					>
						<!--
							Apagada, la muestra se vacía en lugar de teñirse de gris. Antes
							era `opacity: .3` + `grayscale(1)` + tachado, o sea tres señales
							para lo mismo y una fila casi invisible; como cuatro de las cinco
							salen apagadas por defecto, la leyenda entera parecía rota.
						-->
						<span
							class="swatch"
							class:is-line={item.swatch === 'line'}
							style="--swatch: {item.color}"
						></span>
						<span class="label">{item.label}</span>
					</button>
				{/if}
			{/each}
		</div>

		<div class="controls-group">
			<div class="view-toggle">
				<button
					class="toggle-btn"
					class:active={viewMode === 'value'}
					onclick={() => (viewMode = 'value')}
					title={$LL.db.chart_mode_value_title()}>€</button
				>
				<button
					class="toggle-btn"
					class:active={viewMode === 'twr'}
					onclick={() => (viewMode = 'twr')}
					title={$LL.db.chart_mode_twr_title()}>%</button
				>
				<button
					class="toggle-btn"
					class:active={viewMode === 'gain'}
					onclick={() => (viewMode = 'gain')}
					title={$LL.db.chart_mode_gain_title()}>±</button
				>
				<button
					class="toggle-btn"
					class:active={viewMode === 'split'}
					onclick={() => (viewMode = 'split')}
					title={$LL.db.chart_mode_split_title()}
					aria-label={$LL.db.chart_mode_split_title()}
				>
					<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
						<rect x="1" y="8" width="14" height="6" rx="1" fill="currentColor" opacity="0.45" />
						<rect x="1" y="3" width="14" height="4" rx="1" fill="currentColor" />
					</svg>
				</button>
			</div>

			<div class="range-selector">
				{#each ranges as range (range.id)}
					<button
						class="range-btn"
						class:active={currentRange === range.id}
						onclick={() => (currentRange = range.id)}
					>
						{range.label}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="canvas-wrapper">
		<canvas bind:this={canvas}></canvas>
	</div>

	<div class="chart-notes">
		{#if viewMode === 'twr'}
			<p class="note accent">{$LL.db.chart_twr_hint()}</p>
		{/if}
		{#if isSplitMode}
			<p class="note accent">{$LL.db.chart_split_hint()}</p>
		{/if}
		{#if clipNotice === 'short'}
			<p class="note">{$LL.db.chart_range_short()}</p>
		{:else if clipNotice === 'capped'}
			<p class="note">{$LL.db.chart_range_capped({ days: series.points.length })}</p>
		{/if}
		{#if view.hasEstimated}
			<!--
				Dos avisos porque son dos causas distintas, y el viejo se volvió falso al llegar
				el libro de operaciones: decía «asumiendo que ya tenías esas participaciones»,
				y con libro la app **sí** sabe las participaciones de cada día — lo que le falta
				es el valor liquidativo. Cuando ese hueco se ha rellenado con el índice, hay que
				decirlo: una estimación sin procedencia es indistinguible de un dato.
			-->
			<p class="note">
				{series.reconstructedWithIndexDays > 0
					? $LL.db.chart_estimated_note_index()
					: $LL.db.chart_estimated_note()}
			</p>
		{/if}
		{#if view.hasGaps && viewMode === 'value'}
			<p class="note">{$LL.db.chart_gaps_note()}</p>
		{/if}
	</div>
</div>

<style>
	.chart-container {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		height: 100%;
		padding: 0.5rem;
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.controls-group {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.view-toggle,
	.range-selector {
		display: flex;
		background: rgba(255, 255, 255, 0.04);
		padding: 3px;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.toggle-btn,
	.range-btn {
		border-radius: 8px;
		font-size: 0.72rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.45);
		transition:
			background 0.18s ease,
			color 0.18s ease;
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.toggle-btn {
		padding: 0.4rem 0.7rem;
		min-width: 32px;
	}

	.range-btn {
		padding: 0.4rem 0.7rem;
	}

	.toggle-btn:hover,
	.range-btn:hover {
		color: #ffffff;
	}

	.toggle-btn.active {
		background: #ffffff;
		color: #05050a;
	}

	.range-btn.active {
		background: rgba(255, 255, 255, 0.1);
		color: #ffffff;
	}

	.legend {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
		border-radius: 6px;
		transition: background 0.18s ease;
	}

	.legend-item:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
	}

	.legend-item:disabled {
		cursor: default;
	}

	.swatch {
		width: 9px;
		height: 9px;
		border-radius: 3px;
		background: var(--swatch);
		border: 1.5px solid var(--swatch);
		flex-shrink: 0;
		/* Sin `box-shadow` de halo: el resplandor de neón alrededor de cada punto
		   era lo que más envejecía el tablero. */
	}

	.swatch.is-line {
		width: 12px;
		height: 0;
		border-radius: 0;
		border-width: 0 0 2px 0;
		border-style: dashed;
		background: none;
	}

	.legend-item.is-off .swatch {
		background: transparent;
	}

	.legend-item.is-off .swatch.is-line {
		opacity: 0.4;
	}

	.label {
		font-size: 0.7rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.55);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.legend-item.is-off .label {
		color: rgba(255, 255, 255, 0.32);
	}

	.canvas-wrapper {
		flex: 1;
		min-height: 300px;
		height: 300px;
		position: relative;
	}

	.chart-notes {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.note {
		font-size: 0.7rem;
		line-height: 1.4;
		color: var(--text-muted);
		margin: 0;
	}

	.note.accent {
		color: rgba(255, 255, 255, 0.65);
	}

	@media (max-width: 640px) {
		.chart-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.controls-group {
			width: 100%;
			justify-content: space-between;
		}

		.canvas-wrapper {
			min-height: 230px;
			height: 230px;
		}
	}
</style>
