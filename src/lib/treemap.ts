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
