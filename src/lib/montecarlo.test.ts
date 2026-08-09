import { describe, it, expect } from 'vitest';
import { simulateScenarios, percentile } from './montecarlo';

const base = {
	initial: 10000,
	monthlyContribution: 0,
	years: 20,
	annualReturn: 0.07,
	annualVolatility: 0.15
};

describe('percentile', () => {
	it('interpola entre los dos vecinos', () => {
		expect(percentile([0, 10], 0.5)).toBe(5);
		expect(percentile([0, 10, 20, 30], 0.5)).toBe(15);
	});

	it('devuelve los extremos en 0 y 1', () => {
		expect(percentile([3, 7, 11], 0)).toBe(3);
		expect(percentile([3, 7, 11], 1)).toBe(11);
	});

	it('aguanta muestras degeneradas', () => {
		expect(percentile([], 0.5)).toBe(0);
		expect(percentile([42], 0.9)).toBe(42);
	});
});

describe('simulateScenarios', () => {
	it('es reproducible: la misma semilla da exactamente lo mismo', () => {
		expect(simulateScenarios({ ...base, seed: 7 })).toEqual(simulateScenarios({ ...base, seed: 7 }));
	});

	it('semillas distintas dan resultados distintos, pero del mismo orden', () => {
		const a = simulateScenarios({ ...base, seed: 1 }).at(-1)!;
		const b = simulateScenarios({ ...base, seed: 2 }).at(-1)!;
		expect(a.p50).not.toBe(b.p50);
		expect(Math.abs(a.p50 / b.p50 - 1)).toBeLessThan(0.1);
	});

	it('los percentiles van en orden en todos los años', () => {
		for (const banda of simulateScenarios({ ...base, monthlyContribution: 500 })) {
			expect(banda.p10).toBeLessThanOrEqual(banda.p25);
			expect(banda.p25).toBeLessThanOrEqual(banda.p50);
			expect(banda.p50).toBeLessThanOrEqual(banda.p75);
			expect(banda.p75).toBeLessThanOrEqual(banda.p90);
		}
	});

	it('empieza en el capital inicial, sin abanico todavía', () => {
		const primera = simulateScenarios(base)[0];
		expect(primera.year).toBe(0);
		expect(primera.p10).toBe(base.initial);
		expect(primera.p90).toBe(base.initial);
	});

	it('devuelve un punto por año, del 0 al horizonte', () => {
		const bandas = simulateScenarios({ ...base, years: 12 });
		expect(bandas).toHaveLength(13);
		expect(bandas.map((b) => b.year)).toEqual([...Array(13).keys()]);
	});

	/**
	 * ⚠️ La propiedad que define el contrato del deslizador: **`annualReturn` es
	 * la mediana**. Con log-rendimientos normales de deriva `ln(1+r)/12`, la
	 * mediana del capital compone exactamente a `(1+r)^años`. Si algún día se
	 * cambia a media aritmética, la línea central deja de crecer al 7 % y este
	 * test lo dice.
	 */
	it('la mediana compone al rendimiento anual pedido', () => {
		const bandas = simulateScenarios({ ...base, paths: 4000, seed: 11 });
		const esperado = base.initial * Math.pow(1 + base.annualReturn, 20);
		expect(bandas.at(-1)!.p50 / esperado).toBeCloseTo(1, 1);
	});

	/** El capital aportado es aritmética pura: no debe llevar ruido ninguno. */
	it('el capital aportado es exacto y no simulado', () => {
		const bandas = simulateScenarios({ ...base, monthlyContribution: 500, years: 3 });
		expect(bandas.map((b) => b.contributed)).toEqual([10000, 16000, 22000, 28000]);
	});

	/**
	 * Con volatilidad cero el abanico tiene que colapsar en la línea de siempre,
	 * no romperse: es el caso al que degenera el gráfico y hay que poder pedirlo.
	 */
	it('sin volatilidad los cinco percentiles coinciden y valen lo determinista', () => {
		const bandas = simulateScenarios({ ...base, annualVolatility: 0, years: 10 });
		const ultima = bandas.at(-1)!;
		expect(ultima.p10).toBeCloseTo(ultima.p90, 6);
		expect(ultima.p50).toBeCloseTo(base.initial * Math.pow(1.07, 10), 4);
	});

	it('más volatilidad abre el abanico, no lo mueve', () => {
		const estrecho = simulateScenarios({ ...base, annualVolatility: 0.08, seed: 3 }).at(-1)!;
		const ancho = simulateScenarios({ ...base, annualVolatility: 0.22, seed: 3 }).at(-1)!;
		expect(ancho.p90 - ancho.p10).toBeGreaterThan(estrecho.p90 - estrecho.p10);
	});

	it('las aportaciones periódicas suben todo el abanico', () => {
		const sin = simulateScenarios({ ...base, monthlyContribution: 0, seed: 5 }).at(-1)!;
		const con = simulateScenarios({ ...base, monthlyContribution: 500, seed: 5 }).at(-1)!;
		expect(con.p10).toBeGreaterThan(sin.p10);
		expect(con.p90).toBeGreaterThan(sin.p90);
	});

	it('nunca produce un capital negativo', () => {
		for (const b of simulateScenarios({ ...base, annualVolatility: 0.4, seed: 9 })) {
			expect(b.p10).toBeGreaterThan(0);
		}
	});

	it('con horizonte cero devuelve solo el punto de partida', () => {
		const bandas = simulateScenarios({ ...base, years: 0 });
		expect(bandas).toHaveLength(1);
		expect(bandas[0].p50).toBe(base.initial);
	});

	it('termina en un tiempo razonable con el horizonte máximo del panel', () => {
		const t0 = performance.now();
		simulateScenarios({ ...base, years: 50, monthlyContribution: 500 });
		expect(performance.now() - t0).toBeLessThan(500);
	});
});
