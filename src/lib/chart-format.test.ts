import { describe, it, expect } from 'vitest';
import {
	formatCompactCurrency,
	formatAxisPercent,
	formatEstimate,
	niceTicks,
	stepFromTicks
} from './chart-format';

/**
 * El espacio que `Intl` mete delante del símbolo de divisa es `U+00A0`, no un
 * espacio normal. Se normaliza para que las aserciones se lean, pero **no** se
 * quitan los espacios: que `117k €` lleve separación y `€117k` no es parte de
 * lo que se está comprobando.
 */
const n = (s: string) => s.replace(/ /g, ' ');

describe('formatCompactCurrency', () => {
	it('escribe los miles con k y sin céntimos', () => {
		expect(n(formatCompactCurrency(117000, 'EUR', 1000, 'es-ES'))).toBe('117k €');
	});

	it('escribe los millones con M', () => {
		expect(n(formatCompactCurrency(1_200_000, 'EUR', 100_000, 'es-ES'))).toBe('1,2M €');
	});

	it('deja los importes de menos de mil tal cual, sin sufijo', () => {
		expect(n(formatCompactCurrency(850, 'EUR', 100, 'es-ES'))).toBe('850 €');
	});

	/**
	 * El caso que justifica el parámetro `step`. Con los decimales decididos por
	 * la magnitud —que es lo intuitivo— las tres marcas dirían `116k €` y el eje
	 * no distinguiría nada. Este test falla si se quita `step` del cálculo.
	 */
	it('añade decimales cuando el paso de la rejilla es menor que la escala', () => {
		const marcas = [116_000, 116_100, 116_200].map((v) =>
			n(formatCompactCurrency(v, 'EUR', 100, 'es-ES'))
		);
		expect(marcas).toEqual(['116,0k €', '116,1k €', '116,2k €']);
		expect(new Set(marcas).size).toBe(3);
	});

	it('no pasa de dos decimales aunque el paso sea diminuto', () => {
		const texto = n(formatCompactCurrency(116_000, 'EUR', 0.5, 'es-ES'));
		expect(texto).toBe('116,00k €');
	});

	it('pone el símbolo delante en inglés y detrás en español', () => {
		expect(n(formatCompactCurrency(117000, 'EUR', 1000, 'en-US'))).toBe('€117k');
		expect(n(formatCompactCurrency(117000, 'EUR', 1000, 'es-ES'))).toBe('117k €');
	});

	it('conserva el signo de los negativos', () => {
		expect(n(formatCompactCurrency(-25_000, 'EUR', 5000, 'es-ES'))).toBe('-25k €');
	});

	it('respeta la divisa que se le pasa', () => {
		expect(n(formatCompactCurrency(50_000, 'USD', 10_000, 'en-US'))).toBe('$50k');
	});

	it('escribe el cero sin sufijo', () => {
		expect(n(formatCompactCurrency(0, 'EUR', 1000, 'es-ES'))).toBe('0 €');
	});
});

describe('stepFromTicks', () => {
	it('mide el paso entre las dos primeras marcas', () => {
		expect(stepFromTicks([{ value: 100 }, { value: 250 }, { value: 400 }])).toBe(150);
	});

	it('devuelve undefined cuando no hay paso que medir', () => {
		expect(stepFromTicks(undefined)).toBeUndefined();
		expect(stepFromTicks([{ value: 100 }])).toBeUndefined();
		expect(stepFromTicks([{ value: 100 }, { value: 100 }])).toBeUndefined();
	});

	it('mide en positivo aunque el eje venga descendente', () => {
		expect(stepFromTicks([{ value: 400 }, { value: 250 }])).toBe(150);
	});
});

describe('formatAxisPercent', () => {
	it('quita el decimal cuando el paso es de un punto o más', () => {
		expect(n(formatAxisPercent(2, 1, 'es-ES'))).toBe('2 %');
	});

	it('lo mantiene cuando el paso es menor que un punto', () => {
		expect(n(formatAxisPercent(2, 0.5, 'es-ES'))).toBe('2,0 %');
	});
});

describe('niceTicks', () => {
	it('elige un paso redondo y llega por encima del máximo', () => {
		const { ticks, max, step } = niceTicks(702_854, 4);
		expect(step).toBe(200_000);
		expect(ticks).toEqual([0, 200_000, 400_000, 600_000, 800_000]);
		expect(max).toBe(800_000);
	});

	it('la última marca coincide siempre con el máximo del eje', () => {
		for (const valor of [1, 37, 940, 12_345, 702_854, 9_900_000]) {
			const { ticks, max } = niceTicks(valor, 4);
			expect(ticks.at(-1)).toBe(max);
			expect(max).toBeGreaterThanOrEqual(valor);
		}
	});

	it('empieza en cero y sube', () => {
		const { ticks } = niceTicks(50_000, 4);
		expect(ticks[0]).toBe(0);
		for (let i = 1; i < ticks.length; i++) expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
	});

	/** El error de coma flotante se comía la última marca con pasos decimales. */
	it('no pierde la última marca con pasos que no son enteros', () => {
		const { ticks, max } = niceTicks(0.9, 4);
		expect(ticks.at(-1)).toBe(max);
		expect(max).toBeGreaterThanOrEqual(0.9);
	});

	it('devuelve algo dibujable con un máximo inválido o vacío', () => {
		expect(niceTicks(0).ticks).toEqual([0]);
		expect(niceTicks(-5).ticks).toEqual([0]);
		expect(niceTicks(NaN).ticks).toEqual([0]);
	});
});

describe('formatEstimate', () => {
	/**
	 * Una proyección a veinte años depende de acertar el interés; darla al
	 * céntimo es precisión inventada.
	 */
	it('redondea al euro', () => {
		expect(n(formatEstimate(702_854.19, 'EUR', 'es-ES'))).toBe('702.854 €');
	});

	it('no arrastra decimales en inglés tampoco', () => {
		expect(n(formatEstimate(702_854.19, 'EUR', 'en-US'))).toBe('€702,854');
	});
});
