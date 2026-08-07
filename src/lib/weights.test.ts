import { describe, it, expect } from 'vitest';
import {
	roundWeight,
	settleToExactTotal,
	redistributeWeights,
	equalizeWeights,
	type WeightedAsset
} from './weights';

/**
 * Esta aritmética vivía dentro de `ManageAssets.svelte`, así que no tenía tests ni
 * mutación pese a decidir los `targetWeight` — que son la entrada de
 * `calculateRebalance()`. Un error aquí no se ve como un fallo de interfaz: se ve
 * como una recomendación de aportación equivocada.
 *
 * El invariante que lo gobierna todo es uno: **la suma cierra en 1 exacto**. Si no
 * cierra, el motor reparte una aportación sobre objetivos que no suman el 100 % y
 * todas las desviaciones salen sesgadas.
 */

const activos = (...pares: Array<[string, number]>): WeightedAsset[] =>
	pares.map(([ticker, targetWeight]) => ({ ticker, targetWeight }));

const suma = (w: Record<string, number>) => Object.values(w).reduce((s, v) => s + v, 0);

describe('roundWeight', () => {
	it('redondea a cuatro decimales, que es como se guardan los pesos', () => {
		expect(roundWeight(0.123456)).toBe(0.1235);
		expect(roundWeight(0.99995)).toBe(1);
	});

	it('acepta otra precisión, que es la que usa el tope de bloqueados', () => {
		expect(roundWeight(12.345, 2)).toBe(12.35);
	});

	it('no inventa decimales en un número que ya es exacto', () => {
		expect(roundWeight(0.25)).toBe(0.25);
		expect(roundWeight(0)).toBe(0);
	});
});

describe('redistributeWeights', () => {
	it('reparte el resto en proporción a lo que cada uno ya tenía', () => {
		// A sube a 50; B y C tenían 30 y 20, o sea 60/40 del resto: se quedan 30 y 20.
		const { weights } = redistributeWeights(activos(['A', 0.5], ['B', 0.3], ['C', 0.2]), 'A', 50);

		expect(weights.A).toBeCloseTo(0.5, 6);
		expect(weights.B).toBeCloseTo(0.3, 6);
		expect(weights.C).toBeCloseTo(0.2, 6);
	});

	it('subir uno baja a los demás manteniendo su proporción relativa', () => {
		const { weights } = redistributeWeights(activos(['A', 0.4], ['B', 0.4], ['C', 0.2]), 'A', 70);

		expect(weights.A).toBeCloseTo(0.7, 6);
		// B y C tenían 2:1 y siguen teniéndolo sobre el 30 % que queda.
		expect(weights.B / weights.C).toBeCloseTo(2, 4);
		expect(suma(weights)).toBeCloseTo(1, 9);
	});

	it('la suma cierra en 1 exacto aunque el reparto no sea redondo', () => {
		const { weights } = redistributeWeights(
			activos(['A', 0.3333], ['B', 0.3333], ['C', 0.3334]),
			'A',
			37
		);
		expect(suma(weights)).toBeCloseTo(1, 9);
	});

	describe('candados', () => {
		it('respeta el peso de un activo bloqueado', () => {
			const { weights } = redistributeWeights(
				activos(['A', 0.4], ['B', 0.3], ['C', 0.3]),
				'A',
				50,
				{ B: true }
			);

			expect(weights.B).toBe(0.3);
			expect(weights.A).toBeCloseTo(0.5, 6);
			expect(weights.C).toBeCloseTo(0.2, 6);
		});

		/**
		 * El tope: si hay un 60 % bloqueado, pedir el 80 % es imposible. Se recorta al
		 * máximo disponible en vez de dejar la suma por encima de 1 — que es lo que haría
		 * que el motor repartiera sobre objetivos imposibles.
		 */
		it('recorta lo que se pide al máximo que dejan los bloqueados', () => {
			const { weights } = redistributeWeights(
				activos(['A', 0.2], ['B', 0.6], ['C', 0.2]),
				'A',
				80,
				{ B: true }
			);

			expect(weights.B).toBe(0.6);
			expect(weights.A).toBeCloseTo(0.4, 4);
			expect(suma(weights)).toBeCloseTo(1, 9);
		});

		it('un porcentaje negativo se trata como cero', () => {
			const { weights } = redistributeWeights(activos(['A', 0.5], ['B', 0.5]), 'A', -20);
			expect(weights.A).toBe(0);
			expect(weights.B).toBeCloseTo(1, 6);
		});

		/**
		 * Sin nadie libre a quien quitarle peso, no se toca nada y se avisa. Repartir
		 * igualmente significaría romper un candado que el usuario puso a propósito.
		 */
		it('si no queda nadie libre, no reparte y lo dice', () => {
			const r = redistributeWeights(activos(['A', 0.5], ['B', 0.5]), 'A', 70, { B: true });

			expect(r.error).toBe('no-free-assets');
			expect(r.weights).toEqual({});
		});
	});

	/**
	 * El caso que rompería un reparto proporcional a secas: si todos los libres están a
	 * cero, multiplicar por su proporción los deja a cero para siempre y la suma no
	 * cierra nunca. Es la cartera recién importada de un CSV, donde todo nace a 0.
	 */
	it('con todos los demás a cero reparte a partes iguales', () => {
		const { weights } = redistributeWeights(activos(['A', 0], ['B', 0], ['C', 0]), 'A', 40);

		expect(weights.A).toBeCloseTo(0.4, 6);
		expect(weights.B).toBeCloseTo(0.3, 4);
		expect(weights.C).toBeCloseTo(0.3, 4);
		expect(suma(weights)).toBeCloseTo(1, 9);
	});

	it('con un solo activo se lo lleva todo', () => {
		expect(redistributeWeights(activos(['A', 0.3]), 'A', 25).weights).toEqual({ A: 1.0 });
	});

	it('sin activos no devuelve nada, en vez de reventar', () => {
		expect(redistributeWeights([], 'A', 25).weights).toEqual({});
	});
});

describe('equalizeWeights', () => {
	it('reparte a partes iguales', () => {
		const w = equalizeWeights(activos(['A', 0.7], ['B', 0.2], ['C', 0.1]));
		expect(w.B).toBeCloseTo(1 / 3, 4);
		expect(suma(w)).toBeCloseTo(1, 9);
	});

	/**
	 * Tres tercios de 1 no caben en cuatro decimales: 0,3333 × 3 son 0,9999. El
	 * sobrante tiene que ir a parar a alguien o el objetivo total deja de ser el 100 %.
	 */
	it('el sobrante del redondeo no se pierde: la suma cierra igual', () => {
		for (const n of [3, 6, 7, 9, 11]) {
			const lista = activos(...Array.from({ length: n }, (_, i) => [`T${i}`, 0] as [string, number]));
			expect(suma(equalizeWeights(lista)), `con ${n} activos`).toBeCloseTo(1, 9);
		}
	});

	it('sin activos devuelve vacío', () => {
		expect(equalizeWeights([])).toEqual({});
	});
});

describe('settleToExactTotal', () => {
	it('no toca nada si ya cierra', () => {
		const lista = activos(['A', 0.5], ['B', 0.5]);
		expect(settleToExactTotal(lista, { A: 0.5, B: 0.5 })).toEqual({ A: 0.5, B: 0.5 });
	});

	it('echa el sobrante sobre el primer activo libre', () => {
		const lista = activos(['A', 0], ['B', 0]);
		const w = settleToExactTotal(lista, { A: 0.4, B: 0.5 }, { A: true });
		expect(w.A).toBe(0.4); // bloqueado, intacto
		expect(w.B).toBeCloseTo(0.6, 6);
	});

	/**
	 * ⚠️ Si todos están bloqueados el sobrante cae igualmente en el primero. Cuadrar
	 * importa más que respetar un candado en una diezmilésima: una cartera cuyos
	 * objetivos no suman 100 % sesga todas las desviaciones.
	 */
	it('con todos bloqueados cuadra igualmente, en el primero', () => {
		const lista = activos(['A', 0], ['B', 0]);
		const w = settleToExactTotal(lista, { A: 0.4, B: 0.4 }, { A: true, B: true });
		expect(suma(w)).toBeCloseTo(1, 9);
	});

	it('nunca deja un peso negativo, aunque el sobrante sea a la baja', () => {
		const lista = activos(['A', 0], ['B', 0]);
		const w = settleToExactTotal(lista, { A: 0.05, B: 1.5 });
		expect(Object.values(w).every((v) => v >= 0)).toBe(true);
	});

	it('sin activos devuelve lo que le den', () => {
		expect(settleToExactTotal([], { A: 0.5 })).toEqual({ A: 0.5 });
	});
});
