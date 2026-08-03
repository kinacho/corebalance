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
