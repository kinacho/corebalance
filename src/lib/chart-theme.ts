/**
 * El cromo compartido de los gráficos de Chart.js.
 *
 * Existe porque los tres lienzos de la app (histórico, proyecciones, simulador
 * de crisis) llevaban cada uno su propia copia del estilo del tooltip, del color
 * de la rejilla y del tamaño de los ticks, y las tres copias habían divergido.
 * Sólo el tooltip del donut declaraba la fuente del proyecto; los demás salían
 * con la sans del sistema, que en Windows es Segoe UI — o sea que **los ejes de
 * los gráficos no iban en la tipografía de la app**, que es de las cosas que más
 * se notan sin saber por qué.
 *
 * No es un módulo de datos: aquí no se decide nada del dominio, sólo cómo se
 * dibuja. La aritmética de los ejes vive en `chart-format.ts`.
 */

import { Chart } from 'chart.js';

/** La fuente del proyecto, autoalojada en `static/fonts/`. */
export const CHART_FONT = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

/** Espejo en JS de los tokens de `layout.css`; Chart.js recibe cadenas, no variables. */
export const CHART_GRID = 'rgba(255, 255, 255, 0.05)';
export const CHART_AXIS_INK = 'rgba(255, 255, 255, 0.45)';
export const CHART_SURFACE = '#0d0d12';

/**
 * Aplica la tipografía y la tinta por defecto a **todos** los gráficos del
 * proceso. Es idempotente, así que puede llamarse desde cada componente sin
 * coordinar quién arranca primero.
 */
export function applyChartDefaults(): void {
	Chart.defaults.font.family = CHART_FONT;
	Chart.defaults.font.weight = 600;
	Chart.defaults.color = CHART_AXIS_INK;
	// Los puntos de datos se dibujan a mano donde hacen falta; por defecto, ninguno.
	Chart.defaults.elements.point.radius = 0;
}

/**
 * Estilo único de tooltip.
 *
 * `usePointStyle` y las cajas de 8 px vienen del donut, que era el único que las
 * tenía bien. El radio de 12 px es el del resto de tarjetas de la app.
 */
export const tooltipStyle = {
	backgroundColor: 'rgba(13, 13, 18, 0.96)',
	titleColor: '#ffffff',
	bodyColor: 'rgba(255, 255, 255, 0.8)',
	footerColor: 'rgba(255, 255, 255, 0.55)',
	borderColor: 'rgba(255, 255, 255, 0.12)',
	borderWidth: 1,
	cornerRadius: 12,
	padding: 12,
	titleFont: { family: CHART_FONT, weight: 700 as const, size: 13 },
	bodyFont: { family: CHART_FONT, weight: 600 as const, size: 12 },
	footerFont: { family: CHART_FONT, weight: 500 as const, size: 11 },
	usePointStyle: true,
	boxWidth: 8,
	boxHeight: 8,
	boxPadding: 6
};

/** Eje de categorías (el temporal): sin rejilla, sin borde, pocas marcas. */
export const categoryAxis = {
	grid: { display: false },
	border: { display: false },
	ticks: {
		color: CHART_AXIS_INK,
		font: { family: CHART_FONT, size: 11, weight: 600 as const },
		maxRotation: 0,
		autoSkip: true,
		autoSkipPadding: 16,
		maxTicksLimit: 7
	}
};

/** Eje de valores: rejilla recesiva, sin borde, con aire respecto al lienzo. */
export const valueAxis = {
	grid: { color: CHART_GRID, drawTicks: false },
	border: { display: false },
	ticks: {
		color: CHART_AXIS_INK,
		font: { family: CHART_FONT, size: 11, weight: 600 as const },
		padding: 10,
		maxTicksLimit: 6
	}
};

/**
 * **Tu dinero contra el del mercado**, en dos pasos del mismo azul.
 *
 * No son dos categorías que compiten, son las dos partes de un total, así que
 * la rampa es secuencial y no categórica. Y viven aquí, compartidos, porque la
 * misma distinción aparece dos veces: en el histórico —lo que ya pusiste contra
 * lo que el mercado puso encima— y en la proyección —lo que aportarás contra lo
 * que podría añadir—. Que el pasado y el futuro usen tonos distintos para la
 * misma idea es el defecto que este módulo existe para no repetir.
 *
 * Medidos con el validador de `dataviz` contra `#0d0d12`: ΔE 34,5 en visión
 * normal, 32,2 con protanopia. El oscuro se queda a 2,89:1 de contraste, por
 * debajo de 3:1, y por eso los dos gráficos que los usan llevan leyenda con
 * rótulos.
 */
export const CONTRIBUTED_FILL = '#1d4ed8';
export const MARKET_FILL = '#93c5fd';

/**
 * ¿Toca animar?
 *
 * Se consulta una vez por componente. Devuelve `false` cuando el sistema pide
 * menos movimiento **y también** durante el renderizado en servidor, donde
 * `matchMedia` no existe.
 */
export function motionAllowed(): boolean {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
