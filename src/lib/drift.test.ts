import { describe, it, expect } from 'vitest';
import { buildDriftSeries, driftAxisMax, type DriftAsset } from './drift';
import type { DailyPoint } from './history/types';

function day(date: string, byTicker?: Record<string, number>): DailyPoint {
	const total = byTicker ? Object.values(byTicker).reduce((a, b) => a + b, 0) : 0;
	return {
		date,
		total,
		core: total,
		satellite: 0,
		stocks: 0,
		netFlow: 0,
		estimated: false,
		hasBreakdown: true,
		byTicker
	};
}

const BLOQUE = ['A', 'B'];
const activos: DriftAsset[] = [
	{ ticker: 'A', name: 'Fondo A', color: '#d97706', target: 0.8, block: BLOQUE },
	{ ticker: 'B', name: 'Fondo B', color: '#2563eb', target: 0.2, block: BLOQUE }
];

describe('buildDriftSeries', () => {
	it('mide la desviación dentro del bloque, en puntos porcentuales', () => {
		// 76 / 24: el A está 4 pp por debajo de su 80 y el B 4 por encima de su 20.
		const r = buildDriftSeries([day('2026-08-01', { A: 76, B: 24 })], activos, 5);
		expect(r.series[0].values[0]).toBeCloseTo(-4, 10);
		expect(r.series[1].values[0]).toBeCloseTo(4, 10);
	});

	/**
	 * ⚠️ El bloque, no el patrimonio. Si sube un bloque que no tiene objetivos,
	 * el 80/10/10 del core no se ha descuadrado: solo pesa menos sobre el total.
	 * Medirlo sobre el total inventaría una desviación en cada movimiento ajeno.
	 */
	it('no se inmuta porque crezca un activo de fuera del bloque', () => {
		const sinRuido = buildDriftSeries([day('2026-08-01', { A: 76, B: 24 })], activos, 5);
		const conRuido = buildDriftSeries(
			[day('2026-08-01', { A: 76, B: 24, ACCION: 900 })],
			activos,
			5
		);
		expect(conRuido.series[0].values[0]).toBeCloseTo(sinRuido.series[0].values[0]!, 10);
	});

	it('sigue la deriva día a día', () => {
		const r = buildDriftSeries(
			[
				day('2026-08-01', { A: 80, B: 20 }),
				day('2026-08-02', { A: 84, B: 16 }),
				day('2026-08-03', { A: 88, B: 12 })
			],
			activos,
			5
		);
		// `toEqual` no vale aquí: 84/100 − 0,8 da 3,9999999999999925.
		for (const [i, esperado] of [0, 4, 8].entries()) {
			expect(r.series[0].values[i]).toBeCloseTo(esperado, 9);
		}
		expect(r.dates).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
	});

	it('deja hueco, y no cero, donde no hay desglose por activo', () => {
		const r = buildDriftSeries([day('2026-08-01'), day('2026-08-02', { A: 80, B: 20 })], activos, 5);
		expect(r.series[0].values[0]).toBeNull();
		expect(r.series[0].values[1]).toBe(0);
	});

	it('deja hueco si el bloque vale cero ese día', () => {
		const r = buildDriftSeries([day('2026-08-01', { A: 0, B: 0 })], activos, 5);
		expect(r.series[0].values[0]).toBeNull();
	});

	it('deja hueco los días en los que el activo aún no estaba', () => {
		const r = buildDriftSeries([day('2026-08-01', { B: 20 })], activos, 5);
		expect(r.series[0].values[0]).toBeNull();
		expect(r.series[1].values[0]).toBeCloseTo(80, 10);
	});

	it('cuenta los días en los que alguien se salió de banda', () => {
		const r = buildDriftSeries(
			[
				day('2026-08-01', { A: 80, B: 20 }), // 0 pp
				day('2026-08-02', { A: 87, B: 13 }), // +7 pp → fuera
				day('2026-08-03', { A: 83, B: 17 }) // +3 pp → dentro
			],
			activos,
			5
		);
		expect(r.daysOutOfBand).toBe(1);
	});

	/**
	 * La cifra que contesta «¿cuánto llevo así?». Se cuenta desde el final hacia
	 * atrás: lo que importa es la racha viva, no la más larga del historial.
	 */
	it('cuenta la racha viva de días fuera, no la más larga', () => {
		const r = buildDriftSeries(
			[
				day('2026-08-01', { A: 90, B: 10 }), // fuera
				day('2026-08-02', { A: 90, B: 10 }), // fuera
				day('2026-08-03', { A: 90, B: 10 }), // fuera
				day('2026-08-04', { A: 80, B: 20 }), // dentro: corta la racha
				day('2026-08-05', { A: 87, B: 13 }) // fuera
			],
			activos,
			5
		);
		expect(r.daysOutOfBand).toBe(4);
		expect(r.currentStreakOutOfBand).toBe(1);
	});

	it('la racha es cero cuando hoy está dentro', () => {
		const r = buildDriftSeries(
			[day('2026-08-01', { A: 90, B: 10 }), day('2026-08-02', { A: 80, B: 20 })],
			activos,
			5
		);
		expect(r.currentStreakOutOfBand).toBe(0);
	});

	/**
	 * ⚠️ Este test encontró un defecto real, no una manía de precisión: por el
	 * lado de A la cuenta da 4,999999999999993 y sale dentro, y por el de B da
	 * −5,000000000000002 y salía fuera. O sea que estar en el borde exacto
	 * dependía del signo. Lo arregla `isWithinBand`.
	 */
	it('el borde exacto de la banda cuenta como dentro por los dos lados', () => {
		const r = buildDriftSeries([day('2026-08-01', { A: 85, B: 15 })], activos, 5);
		expect(r.series[0].values[0]).toBeCloseTo(5, 9);
		expect(r.series[1].values[0]).toBeCloseTo(-5, 9);
		expect(r.daysOutOfBand).toBe(0);
		expect(r.currentStreakOutOfBand).toBe(0);
	});

	it('devuelve el máximo absoluto para escalar el eje', () => {
		const r = buildDriftSeries(
			[day('2026-08-01', { A: 92, B: 8 }), day('2026-08-02', { A: 80, B: 20 })],
			activos,
			5
		);
		expect(r.maxAbsPp).toBeCloseTo(12, 10);
	});

	it('aguanta una serie vacía sin romperse', () => {
		const r = buildDriftSeries([], activos, 5);
		expect(r.dates).toEqual([]);
		expect(r.maxAbsPp).toBe(0);
		expect(r.currentStreakOutOfBand).toBe(0);
	});
});

describe('driftAxisMax', () => {
	/**
	 * ⚠️ El caso que obliga a este suelo: una cartera perfectamente en objetivo
	 * tiene un máximo de 0,2 pp. Escalando a los datos, el eje sería ±0,23 y la
	 * banda de ±5 se saldría del lienzo por arriba y por abajo — la cartera más
	 * tranquila posible dibujada como la más alarmante.
	 */
	it('nunca queda por debajo de la banda', () => {
		expect(driftAxisMax(0.2, 5)).toBeGreaterThan(5);
		expect(driftAxisMax(0, 5)).toBeGreaterThan(5);
	});

	it('crece con los datos cuando la deriva supera la banda', () => {
		expect(driftAxisMax(12, 5)).toBeCloseTo(13.8, 6);
	});

	it('nunca devuelve un eje degenerado', () => {
		expect(driftAxisMax(0, 0)).toBeGreaterThanOrEqual(1);
	});
});
