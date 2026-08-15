<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';
	import { CHART_NEUTRAL, MAX_CHART_SLICES } from '$lib/constants';
	import { applyChartDefaults, tooltipStyle, motionAllowed, seguirTema, chartSurface } from '$lib/chart-theme';
	import { LL } from '$lib/i18n/i18n-svelte';

	Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

	interface ChartData {
		labels: string[];
		values: number[];
		colors: string[];
	}

	interface Props {
		data: ChartData;
		/**
		 * Qué poner en el hueco del donut.
		 *
		 * Con `cutout: '70%'` el agujero es el 49 % del área del gráfico, y estaba
		 * vacío. Es el sitio natural de la cifra que el anillo reparte —el total—,
		 * y es lo que distingue un donut cuidado de uno por defecto.
		 */
		center?: { label: string; value: string; blur?: boolean };
	}

	let { data, center }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart<'doughnut'> | null = null;
	/** Índice de la porción bajo el puntero, para enlazar leyenda y arco. */
	let hovered = $state<number | null>(null);

	const allowMotion = motionAllowed();

	/**
	 * Agrupa la cola en «Otros» y descarta las porciones sin valor.
	 *
	 * Un donut de doce porciones no se lee: las últimas son astillas de un píxel
	 * con su fila de leyenda cada una. La paleta categórica tiene seis tonos
	 * validados y la regla es que el séptimo no se inventa, así que lo que sobra
	 * se agrupa en un gris neutro. También caían aquí las posiciones a cero, que
	 * antes aparecían como filas de «0,00 %».
	 */
	const view = $derived.by(() => {
		const slices = data.labels
			.map((label, i) => ({ label, value: data.values[i], color: data.colors[i] }))
			.filter((slice) => slice.value > 0.005)
			.sort((a, b) => b.value - a.value);

		if (slices.length <= MAX_CHART_SLICES) return slices;

		/**
		 * ⚠️ **Se dibujan los seis tonos, no cinco.** Antes la cabeza era
		 * `MAX_CHART_SLICES - 1`, así que con nueve activos salían cinco porciones
		 * de color y una gris con el 18 % — o sea que **«Otros» era la segunda
		 * porción del gráfico**, y un cubo de descarte no puede ser lo segundo más
		 * grande de lo que estás mirando. La paleta tiene seis tonos validados y
		 * el gris es el séptimo elemento, no el sexto: usando los seis, esa misma
		 * cartera deja «Otros» en torno al 10 %.
		 */
		const head = slices.slice(0, MAX_CHART_SLICES);
		const tail = slices.slice(MAX_CHART_SLICES);
		return [
			...head,
			{
				label: $LL.charts.other_slices({ count: tail.length }),
				value: tail.reduce((sum, slice) => sum + slice.value, 0),
				color: CHART_NEUTRAL
			}
		];
	});

	function createChartConfig() {
		return {
			type: 'doughnut' as const,
			data: {
				labels: view.map((slice) => slice.label),
				datasets: [
					{
						data: view.map((slice) => slice.value),
						backgroundColor: view.map((slice) => slice.color),
						// El borde de cada arco es el hueco entre porciones, así que va del
						// color del lienzo: fijo a oscuro dibujaba un anillo negro alrededor
						// de cada porción en tema claro.
						borderColor: chartSurface(),
						borderWidth: 2,
						hoverBorderWidth: 2,
						hoverOffset: 10,
						// Separación de 2 px entre rellenos: es lo que permite distinguir
						// porciones contiguas sin depender solo del tono.
						spacing: 2,
						borderRadius: 4
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				cutout: '70%',
				layout: { padding: 12 },
				plugins: {
					legend: { display: false },
					// El estilo del tooltip vive en `chart-theme.ts`: éste era el único
					// de los cuatro lienzos que declaraba la fuente del proyecto, y los
					// otros tres salían con la sans del sistema.
					tooltip: {
						...tooltipStyle,
						displayColors: true,
						callbacks: {
							label: (ctx: { parsed: number }) => ` ${ctx.parsed.toFixed(2)}%`
						}
					}
				},
				animation: allowMotion
					? { animateRotate: true, duration: 520, easing: 'easeOutQuart' as const }
					: (false as const)
			}
		};
	}

	onMount(() => {
		applyChartDefaults();
		chart = new Chart(canvas, createChartConfig());
		const dejarDeSeguirTema = seguirTema(() => chart);
		return () => {
			dejarDeSeguirTema();
			chart?.destroy();
		};
	});

	$effect(() => {
		if (!chart) return;
		const config = createChartConfig();
		chart.data.labels = config.data.labels;
		chart.data.datasets[0].data = config.data.datasets[0].data;
		chart.data.datasets[0].backgroundColor = config.data.datasets[0].backgroundColor;
		chart.update();
	});

	/**
	 * Resalta el arco correspondiente al pasar por su fila de leyenda.
	 *
	 * La leyenda era puramente decorativa: se veía el color pero no se podía
	 * relacionar con el arco de un donut de seis porciones sin contarlas. Se usa
	 * la API de elementos activos de Chart.js, que es la misma que emplea su
	 * propio hover, así que el efecto es idéntico al de pasar por el gráfico.
	 */
	function highlight(index: number | null) {
		hovered = index;
		if (!chart) return;
		chart.setActiveElements(
			index === null ? [] : [{ datasetIndex: 0, index }]
		);
		chart.update();
	}
</script>

<div class="donut-wrapper">
	<!--
		El canvas queda oculto para lectores de pantalla y la lista de abajo es la
		alternativa textual: lleva etiqueta y valor de cada porción, así que la
		identidad nunca depende solo del color. Es preferible a un `aria-label` que
		resuma el gráfico, porque la lista da los datos y no una descripción.
	-->
	<div class="chart-container" aria-hidden="true">
		<canvas bind:this={canvas}></canvas>
		{#if center}
			<!-- Encima del lienzo, sin capturar el ratón: el hover de los arcos
			     tiene que seguir llegando al canvas que hay debajo. -->
			<div class="chart-center">
				<span class="center-label">{center.label}</span>
				<span class="center-value" class:privacy-blur={center.blur}>{center.value}</span>
			</div>
		{/if}
	</div>

	<ul class="chart-legend" aria-label={$LL.charts.donut_aria({ count: view.length })}>
		{#each view as slice, i (slice.label)}
			<li>
				<button
					type="button"
					class="legend-item"
					class:is-hovered={hovered === i}
					onmouseenter={() => highlight(i)}
					onmouseleave={() => highlight(null)}
					onfocus={() => highlight(i)}
					onblur={() => highlight(null)}
				>
					<span class="legend-dot" style="--dot: {slice.color}"></span>
					<span class="legend-label">{slice.label}</span>
					<span class="legend-value">{slice.value.toFixed(2)}%</span>
				</button>
			</li>
		{/each}
	</ul>
</div>

<style>
	.donut-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
	}

	@media (min-width: 1024px) {
		.donut-wrapper {
			flex-direction: row;
			justify-content: center;
			gap: 1.25rem;
			/* Arriba, para que todos los donuts de la fila empiecen a la misma altura */
			align-items: flex-start;
		}
	}

	.chart-container {
		position: relative;
		width: 100%;
		max-width: 170px;
		aspect-ratio: 1;
		flex-shrink: 0;
	}

	.chart-center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.1rem;
		pointer-events: none;
		text-align: center;
		padding: 0 18%;
	}

	.center-label {
		/* El más pequeño de toda la app: 8,8 px medidos. Ver `--text-micro`. */
		font-size: var(--text-micro);
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	.center-value {
		font-size: 0.92rem;
		font-weight: 800;
		color: var(--text-primary);
		letter-spacing: -0.01em;
		line-height: 1.15;
	}

	.chart-legend {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		width: 100%;
		max-width: 190px;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		width: 100%;
		padding: 0.35rem 0.5rem;
		background: none;
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: default;
		text-align: left;
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}

	.legend-item.is-hovered {
		background: var(--bg-card-hover);
		border-color: var(--border-subtle);
	}

	.legend-dot {
		width: 9px;
		height: 9px;
		border-radius: 3px;
		flex-shrink: 0;
		background: var(--dot);
	}

	.legend-label {
		font-size: 0.72rem;
		/* El texto lleva tinta de texto, no el color de la serie: el color lo
		   carga el punto de al lado. */
		color: var(--text-secondary);
		font-weight: 600;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.legend-value {
		font-size: 0.72rem;
		color: var(--text-primary);
		font-weight: 700;
		/* Sin `font-family` propia a propósito: `layout.css` ya le aplica
		   `tabular-nums` sobre la fuente del proyecto. Antes forzaba
		   `Monaco, monospace`, que solo existe en macOS. */
	}
</style>
