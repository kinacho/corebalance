import { describe, it, expect } from 'vitest';
import {
	squarify,
	labelFits,
	truncateToWidth,
	approximateTextWidth,
	type TreemapItem,
	type TreemapRect
} from './treemap';

const W = 100;
const H = 60;

function area(rect: TreemapRect): number {
	return rect.w * rect.h;
}

function overlaps(a: TreemapRect, b: TreemapRect): boolean {
	const epsilon = 1e-9;
	return (
		a.x + a.w > b.x + epsilon &&
		b.x + b.w > a.x + epsilon &&
		a.y + a.h > b.y + epsilon &&
		b.y + b.h > a.y + epsilon
	);
}

describe('squarify', () => {
	it('devuelve un rectángulo por elemento', () => {
		const items: TreemapItem[] = [
			{ key: 'a', value: 50 },
			{ key: 'b', value: 30 },
			{ key: 'c', value: 20 }
		];
		const rects = squarify(items, W, H);
		expect(rects).toHaveLength(3);
		expect(rects.map((r) => r.key).sort()).toEqual(['a', 'b', 'c']);
	});

	it('reparte toda el área sin dejar huecos', () => {
		const items: TreemapItem[] = [
			{ key: 'a', value: 40 },
			{ key: 'b', value: 30 },
			{ key: 'c', value: 20 },
			{ key: 'd', value: 10 }
		];
		const total = squarify(items, W, H).reduce((sum, r) => sum + area(r), 0);
		expect(total).toBeCloseTo(W * H, 6);
	});

	it('el área de cada rectángulo es proporcional a su valor', () => {
		const items: TreemapItem[] = [
			{ key: 'a', value: 60 },
			{ key: 'b', value: 30 },
			{ key: 'c', value: 10 }
		];
		const rects = squarify(items, W, H);
		const totalValue = 100;
		for (const rect of rects) {
			const expected = (items.find((i) => i.key === rect.key)!.value / totalValue) * W * H;
			expect(area(rect)).toBeCloseTo(expected, 6);
		}
	});

	it('ningún rectángulo se solapa con otro', () => {
		const items: TreemapItem[] = Array.from({ length: 9 }, (_, i) => ({
			key: `k${i}`,
			value: (i + 1) * 3
		}));
		const rects = squarify(items, W, H);
		for (let i = 0; i < rects.length; i++) {
			for (let j = i + 1; j < rects.length; j++) {
				expect(overlaps(rects[i], rects[j]), `${rects[i].key} vs ${rects[j].key}`).toBe(false);
			}
		}
	});

	it('todo queda dentro del lienzo', () => {
		const items: TreemapItem[] = Array.from({ length: 7 }, (_, i) => ({
			key: `k${i}`,
			value: i + 1
		}));
		for (const rect of squarify(items, W, H)) {
			expect(rect.x).toBeGreaterThanOrEqual(-1e-9);
			expect(rect.y).toBeGreaterThanOrEqual(-1e-9);
			expect(rect.x + rect.w).toBeLessThanOrEqual(W + 1e-9);
			expect(rect.y + rect.h).toBeLessThanOrEqual(H + 1e-9);
		}
	});

	it('no se cuelga con un elemento que domina el total', () => {
		// El caso que rompe una división binaria ingenua: si el primer elemento ya
		// pasa de la mitad, el grupo puede quedarse vacío y recursar sin fin.
		const items: TreemapItem[] = [
			{ key: 'gigante', value: 9999 },
			{ key: 'mota', value: 1 }
		];
		const rects = squarify(items, W, H);
		expect(rects).toHaveLength(2);
		expect(rects.reduce((sum, r) => sum + area(r), 0)).toBeCloseTo(W * H, 6);
	});

	it('ignora los valores nulos y negativos', () => {
		const rects = squarify(
			[
				{ key: 'a', value: 100 },
				{ key: 'cero', value: 0 },
				{ key: 'negativo', value: -50 }
			],
			W,
			H
		);
		expect(rects).toHaveLength(1);
		expect(rects[0].key).toBe('a');
		expect(area(rects[0])).toBeCloseTo(W * H, 6);
	});

	it('devuelve vacío en los casos degenerados en vez de reventar', () => {
		expect(squarify([], W, H)).toEqual([]);
		expect(squarify([{ key: 'a', value: 10 }], 0, H)).toEqual([]);
		expect(squarify([{ key: 'a', value: 10 }], W, 0)).toEqual([]);
	});

	it('es determinista: dos llamadas iguales dan el mismo reparto', () => {
		const items: TreemapItem[] = [
			{ key: 'a', value: 33 },
			{ key: 'b', value: 33 },
			{ key: 'c', value: 34 }
		];
		expect(squarify(items, W, H)).toEqual(squarify(items, W, H));
	});

	it('un solo elemento ocupa todo el lienzo', () => {
		const rects = squarify([{ key: 'solo', value: 42 }], W, H);
		expect(rects).toEqual([{ key: 'solo', x: 0, y: 0, w: W, h: H }]);
	});
});

describe('rótulos que no se pisan', () => {
	it('el ancho estimado crece con el texto y con el cuerpo de letra', () => {
		expect(approximateTextWidth('abc', 2)).toBeLessThan(approximateTextWidth('abcdef', 2));
		expect(approximateTextWidth('abc', 2)).toBeLessThan(approximateTextWidth('abc', 4));
	});

	it('las mayúsculas cuentan más que las minúsculas', () => {
		// Un solo ancho medio daba `CASH-DEP` un 15 % más estrecho de lo que mide y
		// el rótulo se salía de la celda. Los tickers son todo mayúsculas.
		expect(approximateTextWidth('MMMM', 3)).toBeGreaterThan(approximateTextWidth('mmmm', 3));
		expect(approximateTextWidth('IIII', 3)).toBeGreaterThan(approximateTextWidth('llll', 3));
	});

	it('un ticker en mayúsculas no se declara más estrecho de lo que es', () => {
		// El caso concreto que desbordaba en móvil: celda de 22,8 de ancho con 4,4
		// de cuerpo y 4,4 de margen total.
		expect(labelFits('CASH-DEP', 4.4, 22.8, 4.4)).toBe(false);
	});

	it('un nombre largo no cabe en una celda estrecha', () => {
		// El caso real: «Consumo discrecional» en una celda de 12 unidades. Antes
		// se dibujaba igual y se pintaba encima de la celda vecina.
		expect(labelFits('Consumo discrecional', 2.5, 12)).toBe(false);
		expect(labelFits('EEUU', 2.5, 12)).toBe(true);
	});

	it('recorta con puntos suspensivos cuando hay sitio para media palabra', () => {
		const cut = truncateToWidth('Consumo discrecional', 2.5, 18);
		expect(cut.endsWith('…')).toBe(true);
		expect(cut.length).toBeLessThan('Consumo discrecional'.length);
		// Y lo recortado sí cabe, que es el objetivo de todo esto.
		expect(labelFits(cut, 2.5, 18)).toBe(true);
	});

	it('no recorta lo que ya cabe, aunque sea largo', () => {
		// Con 30 unidades de ancho «Consumo discrecional» entra entero: recortarlo
		// sería perder información sin motivo.
		expect(truncateToWidth('Consumo discrecional', 2.5, 30)).toBe('Consumo discrecional');
	});

	it('devuelve vacío en vez de un muñón ilegible', () => {
		// Con sitio para dos caracteres, «Co…» no informa de nada: mejor dejar la
		// celda con solo su cifra.
		expect(truncateToWidth('Consumo discrecional', 3, 6)).toBe('');
	});

	it('no toca el texto que ya cabe', () => {
		expect(truncateToWidth('Japón', 2.5, 60)).toBe('Japón');
	});

	it('el margen se descuenta del ancho disponible', () => {
		// Un texto que cabría justo al milímetro no cabe con margen, porque
		// pegado al borde de la celda se lee mal y parece desbordado.
		const width = approximateTextWidth('Japón', 2.5) + 1;
		expect(labelFits('Japón', 2.5, width, 0)).toBe(true);
		expect(labelFits('Japón', 2.5, width, 4)).toBe(false);
	});
});

/**
 * Casos escritos leyendo el informe de mutación (7-ago-2026, 76,98 % en este
 * fichero). No son casos nuevos inventados: son las **señales que se probaban en
 * bloque** y por eso podían desaparecer de una en una sin que nada fallara. Cada
 * guarda degenerada tenía su mutante vivo porque el único test que las tocaba las
 * comprobaba las tres a la vez.
 */
describe('las guardas de squarify, una por una', () => {
	const UNO = [{ key: 'a', value: 10 }];

	it('sin elementos no dibuja nada', () => {
		expect(squarify([], 100, 100)).toEqual([]);
	});

	it('con ancho cero o negativo no dibuja nada', () => {
		expect(squarify(UNO, 0, 100)).toEqual([]);
		expect(squarify(UNO, -5, 100)).toEqual([]);
	});

	it('con alto cero o negativo no dibuja nada', () => {
		expect(squarify(UNO, 100, 0)).toEqual([]);
		expect(squarify(UNO, 100, -5)).toEqual([]);
	});

	it('con lienzo válido y un elemento válido sí dibuja: el control de las tres anteriores', () => {
		expect(squarify(UNO, 100, 100)).toHaveLength(1);
	});

	/**
	 * El reparto elige un punto de corte acumulando hasta la mitad del total. Las dos
	 * protecciones de ese bucle —que el primer grupo nunca quede vacío y que nunca se
	 * lo lleve todo— son las que evitan la recursión infinita, y cada una necesita su
	 * propia forma de datos para verse.
	 */
	it('un elemento que se lleva casi todo el total no deja grupos vacíos', () => {
		const items = [
			{ key: 'gigante', value: 1000 },
			{ key: 'b', value: 1 },
			{ key: 'c', value: 1 }
		];
		const out = squarify(items, 200, 100);
		expect(out).toHaveLength(3);
		expect(out.every((r) => r.w > 0 && r.h > 0)).toBe(true);
	});

	it('muchos elementos iguales se reparten sin perder ninguno', () => {
		const items = Array.from({ length: 12 }, (_, i) => ({ key: `k${i}`, value: 10 }));
		const out = squarify(items, 400, 300);
		expect(out).toHaveLength(12);
		expect(new Set(out.map((r) => r.key)).size).toBe(12);
	});
});

describe('approximateTextWidth, una señal por caso', () => {
	const F = 10;

	it('un carácter ancho mide más que uno normal', () => {
		expect(approximateTextWidth('W', F)).toBeGreaterThan(approximateTextWidth('o', F));
		expect(approximateTextWidth('8', F)).toBeGreaterThan(approximateTextWidth('o', F));
	});

	/**
	 * La rama estrecha tenía mutantes vivos: sin un caso propio, borrarla no rompía
	 * nada y las `i` y los puntos pasaban a medir como una `o`. Es lo que hace que un
	 * rótulo se declare más ancho de lo que es y se recorte sin necesidad.
	 */
	it('un carácter estrecho mide menos que uno normal', () => {
		expect(approximateTextWidth('i', F)).toBeLessThan(approximateTextWidth('o', F));
		expect(approximateTextWidth('.', F)).toBeLessThan(approximateTextWidth('o', F));
	});

	/**
	 * ⚠️ El espaciado se suma **detrás de cada carácter, incluido el último**, que es lo
	 * que hace CSS. Contar uno menos parece inocente y es el error que ya se coló una
	 * vez por la puerta de al lado: infraestimar el ancho y recortar a mitad de palabra.
	 */
	it('el espaciado entre letras cuenta también el último carácter', () => {
		const sin = approximateTextWidth('abc', F, 0);
		const con = approximateTextWidth('abc', F, 0.1);
		expect(con - sin).toBeCloseTo(3 * 0.1 * F, 6);
	});

	it('el ancho escala con el cuerpo de letra', () => {
		expect(approximateTextWidth('abc', 20)).toBeCloseTo(approximateTextWidth('abc', 10) * 2, 6);
	});

	it('el texto vacío no mide nada', () => {
		expect(approximateTextWidth('', F)).toBe(0);
		expect(approximateTextWidth('', F, 0.5)).toBe(0);
	});
});
