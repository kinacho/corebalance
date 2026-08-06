/**
 * Reparto de un rectángulo en áreas proporcionales, para el mapa de cartera.
 *
 * Escrito a mano en lugar de traer un plugin de Chart.js por dos razones: el
 * treemap se dibuja en SVG, así que hereda el CSS de la app —incluido el
 * `.privacy-blur` y los tokens de color— sin puentes raros; y el algoritmo son
 * treinta líneas frente a un paquete extra en el bundle de una app que presume
 * de ligera.
 *
 * El algoritmo es el de división binaria: se ordena de mayor a menor, se parte
 * la lista en dos grupos de suma parecida y se corta el rectángulo por su lado
 * largo. No es el squarified canónico, pero da proporciones igual de legibles
 * con mucho menos código, y es determinista, que es lo que permite testearlo.
 */

export interface TreemapItem {
	key: string;
	value: number;
}

export interface TreemapRect {
	key: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Anchos por carácter, en múltiplos del cuerpo de letra.
 *
 * Un único ancho medio no sirve: los tickers son todo mayúsculas y los nombres
 * de sector casi todo minúsculas, así que una media los trata mal a los dos. Con
 * un solo factor de 0,55 em, `CASH-DEP` se estimaba un 15 % más estrecho de lo
 * que mide y se salía de su celda.
 */
const WIDE_CHARS = 0.63; // mayúsculas, dígitos, y las anchas de siempre
const NARROW_CHARS = 0.31; // i, l, j, t, f, puntuación y espacio
const DEFAULT_CHAR = 0.53; // minúsculas

/**
 * Ancho aproximado de un texto en unidades del viewBox.
 *
 * `<text>` en SVG no se ajusta ni se recorta solo: un rótulo largo en una celda
 * estrecha se sale y se pinta encima de la vecina. Medirlo de verdad exigiría
 * tocar el DOM, así que se estima. La estimación decide **si merece la pena
 * dibujar**; el `clipPath` por celda de los componentes es la garantía dura de
 * que nada se salga aunque la estimación falle.
 *
 * ⚠️ `letterSpacing` va en **em**, como en CSS, y hay que pasarlo siempre que el
 * `<text>` lleve `letter-spacing`. Es el mismo error que medir en minúsculas lo
 * que el CSS pinta en mayúsculas, un nivel más fino: la cabecera de bloque del
 * mapa de desviación lleva `letter-spacing: 0.04em` y se medía sin contarlo, así
 * que la estimación se quedaba corta —un 4 % del cuerpo por carácter— justo en el
 * rótulo más largo del mapa, el que ya iba al límite. La regla es la de siempre:
 * el CSS no puede cambiar el ancho de lo que ya has medido.
 */
export function approximateTextWidth(text: string, fontSize: number, letterSpacing = 0): number {
	let units = 0;
	for (const char of text) {
		if (/[A-ZÁÉÍÓÚÑÜ0-9@%&WMÆ]/.test(char)) units += WIDE_CHARS;
		else if (/[iljtfr.,;:'’!|¡  ]/.test(char)) units += NARROW_CHARS;
		else units += DEFAULT_CHAR;
	}
	// CSS añade el espaciado detrás de **cada** carácter, incluido el último.
	return (units + letterSpacing * [...text].length) * fontSize;
}

/** Si un rótulo cabe en un ancho dado, con un margen a cada lado. */
export function labelFits(
	text: string,
	fontSize: number,
	availableWidth: number,
	padding = 2.8,
	letterSpacing = 0
): boolean {
	return approximateTextWidth(text, fontSize, letterSpacing) <= availableWidth - padding;
}

/**
 * Recorta un rótulo al ancho disponible añadiendo puntos suspensivos.
 *
 * Crece carácter a carácter en lugar de dividir por un ancho medio, porque con
 * anchos por carácter la división ya no vale: «WWWW» y «llll» ocupan el doble el
 * uno que el otro con el mismo número de letras.
 *
 * Devuelve cadena vacía si no caben al menos cuatro caracteres útiles: media
 * palabra seguida de puntos es ruido, y la celda se lee mejor solo con su cifra.
 */
export function truncateToWidth(
	text: string,
	fontSize: number,
	availableWidth: number,
	padding = 2.8,
	letterSpacing = 0
): string {
	if (labelFits(text, fontSize, availableWidth, padding, letterSpacing)) return text;

	const usable = availableWidth - padding;
	const ellipsis = approximateTextWidth('…', fontSize, letterSpacing);

	let kept = '';
	for (const char of text) {
		const candidate = kept + char;
		if (approximateTextWidth(candidate, fontSize, letterSpacing) + ellipsis > usable) break;
		kept = candidate;
	}

	kept = kept.trimEnd();
	if (kept.length < 4) return '';
	return kept + '…';
}

export function squarify(items: TreemapItem[], width: number, height: number): TreemapRect[] {
	const usable = items.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
	const out: TreemapRect[] = [];
	if (usable.length === 0 || width <= 0 || height <= 0) return out;
	place(usable, 0, 0, width, height, out);
	return out;
}

function place(
	items: TreemapItem[],
	x: number,
	y: number,
	w: number,
	h: number,
	out: TreemapRect[]
): void {
	if (items.length === 0) return;
	if (items.length === 1) {
		out.push({ key: items[0].key, x, y, w, h });
		return;
	}

	const total = items.reduce((sum, item) => sum + item.value, 0);
	if (total <= 0) return;

	// Punto de corte: el primer índice en el que la suma acumulada alcanza la
	// mitad. El `i > 0` garantiza que el primer grupo nunca queda vacío, que es
	// lo que provocaría una recursión infinita con un elemento dominante.
	let accumulated = 0;
	let split = 0;
	for (let i = 0; i < items.length; i++) {
		if (i > 0 && accumulated + items[i].value > total / 2) break;
		accumulated += items[i].value;
		split = i + 1;
	}
	// Y este tope evita el otro extremo: que el primer grupo se lo lleve todo.
	if (split >= items.length) {
		split = items.length - 1;
		accumulated = items.slice(0, split).reduce((sum, item) => sum + item.value, 0);
	}

	const fraction = accumulated / total;
	const first = items.slice(0, split);
	const second = items.slice(split);

	if (w >= h) {
		place(first, x, y, w * fraction, h, out);
		place(second, x + w * fraction, y, w * (1 - fraction), h, out);
	} else {
		place(first, x, y, w, h * fraction, out);
		place(second, x, y + h * fraction, w, h * (1 - fraction), out);
	}
}
