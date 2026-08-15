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

/**
 * ⚠️ **El cromo se lee de los tokens de CSS en tiempo de ejecución, y ése es todo
 * el mecanismo del tema claro dentro de Chart.js.**
 *
 * Chart.js recibe cadenas, no variables, así que estos valores estaban escritos a
 * mano como espejo de `layout.css`. Un espejo de tema fijo: con dos temas, la
 * copia de JS seguiría pintando la rejilla blanca sobre fondo blanco.
 *
 * Leerlos del DOM en lugar de duplicarlos hace además que la duplicación
 * desaparezca — eran cuatro valores mantenidos en dos sitios, que es exactamente
 * la forma que este repo lleva documentada como fuente de defectos.
 *
 * `fallback` es lo que se devuelve fuera del navegador (SSR, jsdom sin estilos) y
 * es siempre el valor del tema oscuro, que es el que `:root` sirve.
 */
function cssVar(nombre: string, fallback: string): string {
	if (typeof document === 'undefined') return fallback;
	const v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
	return v || fallback;
}

export const chartGrid = () => cssVar('--chart-grid', 'rgba(255, 255, 255, 0.05)');
export const chartAxisInk = () => cssVar('--chart-axis', 'rgba(255, 255, 255, 0.6)');
export const chartInk = () => cssVar('--chart-ink', 'rgba(255, 255, 255, 0.75)');
export const chartSurface = () => cssVar('--chart-surface', '#0d0d12');
export const textPrimary = () => cssVar('--text-primary', '#ffffff');

/**
 * El evento con el que el store de tema avisa de un cambio.
 *
 * ⚠️ **Un evento del DOM y no un import, y la razón es el tamaño del bundle.** Lo
 * natural sería que `stores/theme.svelte.ts` llamara aquí directamente, pero
 * entonces el store —que lo usa el `<html>` de todas las páginas— arrastraría
 * Chart.js a las 72 páginas públicas prerenderizadas, que no dibujan ni un
 * gráfico. El evento deja el acoplamiento en cero: quien tiene un lienzo escucha,
 * y quien no, ni se entera.
 */
export const EVENTO_TEMA = 'corebalance:tema';

/**
 * Vuelve a pintar el cromo de un gráfico ya construido con los colores del tema
 * actual, sin destruirlo ni rehacer su configuración.
 *
 * Rehacer el gráfico sería más simple de escribir y peor de usar: los cuatro
 * lienzos se crean dentro de su `onMount` con la configuración en línea, así que
 * «rehacer» significaría extraer una función de creación en cada uno — cuatro
 * refactores en componentes que este trabajo no toca por lo demás. Y visualmente
 * un `update('none')` conserva el estado de la interacción; un `destroy()` lo
 * pierde.
 */
/**
 * El mínimo que esta función necesita de un gráfico. No es `Chart` a secas porque
 * los lienzos están tipados con su genérico (`Chart<'doughnut'>`) y esos tipos no
 * son asignables entre sí — el mismo motivo por el que dos de ellos declaran
 * `chart: any` con su propia nota.
 */
type GraficoConCromo = {
	options: unknown;
	update: (modo?: 'none') => void;
};

export function reaplicarCromo(chart: GraficoConCromo): void {
	const opts = chart.options as Record<string, any>;

	for (const escala of Object.values(opts.scales ?? {}) as Record<string, any>[]) {
		if (escala?.ticks) escala.ticks.color = chartAxisInk();
		if (escala?.grid?.color) escala.grid.color = chartGrid();
	}

	const tooltip = opts.plugins?.tooltip;
	if (tooltip) {
		tooltip.backgroundColor = chartSurface();
		tooltip.titleColor = textPrimary();
		tooltip.bodyColor = chartInk();
		tooltip.footerColor = chartAxisInk();
		tooltip.borderColor = cssVar('--border-subtle', 'rgba(255, 255, 255, 0.12)');
	}

	const leyenda = opts.plugins?.legend?.labels;
	if (leyenda) leyenda.color = chartAxisInk();

	Chart.defaults.color = chartAxisInk();
	chart.update('none');
}

/**
 * Suscribe un lienzo a los cambios de tema. Devuelve la función de baja, para
 * encadenarla al `return` del `onMount` que ya tiene cada componente.
 *
 * Toma un *getter* y no el gráfico: cuando se llama, dentro de `onMount`, la
 * variable `chart` puede reasignarse después.
 */
export function seguirTema(
	obtenerChart: () => GraficoConCromo | null | undefined
): () => void {
	if (typeof window === 'undefined') return () => {};
	const alCambiar = () => {
		const c = obtenerChart();
		if (c) reaplicarCromo(c);
	};
	window.addEventListener(EVENTO_TEMA, alCambiar);
	return () => window.removeEventListener(EVENTO_TEMA, alCambiar);
}

/**
 * Aplica la tipografía y la tinta por defecto a **todos** los gráficos del
 * proceso. Es idempotente, así que puede llamarse desde cada componente sin
 * coordinar quién arranca primero.
 */
export function applyChartDefaults(): void {
	Chart.defaults.font.family = CHART_FONT;
	Chart.defaults.font.weight = 600;
	Chart.defaults.color = chartAxisInk();
	// Los puntos de datos se dibujan a mano donde hacen falta; por defecto, ninguno.
	Chart.defaults.elements.point.radius = 0;
}

/**
 * Estilo único de tooltip.
 *
 * `usePointStyle` y las cajas de 8 px vienen del donut, que era el único que las
 * tenía bien. El radio de 12 px es el del resto de tarjetas de la app.
 *
 * ⚠️ **Los colores son propiedades *getter*, no valores, y eso es deliberado:
 * así el tema entra sin tocar un solo sitio de llamada.** Los cinco componentes
 * que usan este objeto lo hacen con `{...tooltipStyle}`, y un *spread* invoca los
 * getters **en el momento del spread** — que es cuando se construye el gráfico,
 * con el tema ya resuelto. La alternativa era convertirlo en función y cambiar
 * las cinco llamadas más los `...valueAxis.ticks` anidados.
 */
export const tooltipStyle = {
	get backgroundColor() {
		return chartSurface();
	},
	get titleColor() {
		return textPrimary();
	},
	get bodyColor() {
		return chartInk();
	},
	get footerColor() {
		return chartAxisInk();
	},
	get borderColor() {
		return cssVar('--border-subtle', 'rgba(255, 255, 255, 0.12)');
	},
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

/**
 * Eje de categorías (el temporal): sin rejilla, sin borde, pocas marcas.
 *
 * `ticks` es un getter por lo mismo que el tooltip: se usa como `{...categoryAxis}`
 * y como `{...valueAxis.ticks}`, y el getter devuelve el objeto ya resuelto al
 * tema del momento.
 */
export const categoryAxis = {
	grid: { display: false },
	border: { display: false },
	get ticks() {
		return {
			color: chartAxisInk(),
			font: { family: CHART_FONT, size: 11, weight: 600 as const },
			maxRotation: 0,
			autoSkip: true,
			autoSkipPadding: 16,
			maxTicksLimit: 7
		};
	}
};

/** Eje de valores: rejilla recesiva, sin borde, con aire respecto al lienzo. */
export const valueAxis = {
	get grid() {
		return { color: chartGrid(), drawTicks: false };
	},
	border: { display: false },
	get ticks() {
		return {
			color: chartAxisInk(),
			font: { family: CHART_FONT, size: 11, weight: 600 as const },
			padding: 10,
			maxTicksLimit: 6
		};
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
 * Verde y rojo para la **línea** del patrimonio: por encima o por debajo de lo aportado.
 *
 * ⚠️ **No son `STATE_POSITIVE`/`STATE_NEGATIVE`, y no puede ser un descuido.** Aquel par está
 * calibrado para *texto con signo* — su propio docblock en `constants.ts` dice que toda su
 * defensa es «sale en texto y distintivos, nunca como relleno de una celda o de un arco». Una
 * línea es una marca, así que esa defensa no aplica; y medido con el validador de `dataviz`
 * contra `#0d0d12`, `STATE_POSITIVE` (#34d399) **falla la banda de luminosidad** (L 0,773:
 * demasiado claro para pintar sobre el fondo oscuro). Reutilizarlo habría sido gratis de
 * escribir y falso de mirar.
 *
 * Estos dos pasan **las seis comprobaciones** junto a los tres colores de categoría que
 * pueden dibujarse a la vez en este gráfico (`CATEGORY_COLORS`): banda de luminosidad, suelo
 * de croma, separación CVD y contraste. Los números que importan, todos contra `#0d0d12`:
 *
 * - verde ↔ rojo: ΔE **8,4** con deuteranopia, muy por encima en visión normal.
 * - rojo ↔ el ámbar de «Acciones»: ΔE **18,8** normal. ⚠️ Aquí murieron los candidatos
 *   obvios: `#dc2626` se queda en **14,4**, por debajo del suelo de 15 que es fallo duro, y
 *   `#e11d48` cae a 5,8 en deuteranopia contra el verde.
 * - verde ↔ ámbar queda en 7,9 con protanopia, un WARN en la banda 6–8 que sólo es legal con
 *   codificación secundaria: la hay, porque este gráfico siempre lleva leyenda.
 *
 * ⚠️ Y algo que salió al medir y **no lo introduce este par**: `CATEGORY_COLORS.core` (azul) y
 * `.satellite` (violeta) están a ΔE **0,4 con deuteranopia y 12,4 en visión normal**, y las
 * dos se dibujan como líneas simultáneas aquí. Es un fallo duro preexistente, y `CLAUDE.md`
 * prohíbe esa pareja con esas mismas palabras para la paleta de activos. Queda anotado.
 */
/**
 * ⚠️ El verde **no puede ser `#059669`**, y eso costó una segunda vuelta: es exactamente
 * `ASSET_COLORS[2]`, la esmeralda con la que se pinta un activo. Reutilizarlo devolvería al
 * tablero el defecto que este proyecto ya arregló por subtracción —«el verde significaba seis
 * cosas a la vez»—, porque `CompositionBars` pinta activos con esa paleta en la fila de al
 * lado: el mismo tono querría decir «vas ganando» y «esmeralda, el tercer activo».
 * `#047857` es un paso más oscuro de la misma familia, está fuera de `ASSET_COLORS` y pasa
 * las seis comprobaciones igual (peor par: rojo↔verde ΔE 8,4 deutan).
 */
export const TREND_UP = '#047857';
export const TREND_DOWN = '#b91c1c';

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
