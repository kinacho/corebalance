import { describe, it, expect } from 'vitest';
import { squarify, type TreemapItem, type TreemapRect } from './treemap';

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
