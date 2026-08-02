import { describe, it, expect } from 'vitest';
import {
	buildPerformanceSeries,
	investedSeries,
	moneyWeightedReturn,
	periodReturn,
	twrIndex
} from './performance';
import type { DailyPoint } from './types';

function point(total: number, netFlow = 0): DailyPoint {
	return {
		date: '2026-01-01',
		total,
		core: total,
		satellite: 0,
		stocks: 0,
		netFlow,
		estimated: false,
		hasBreakdown: true
	};
}

describe('twrIndex', () => {
	it('vender no mueve la rentabilidad', () => {
		// 500 participaciones a 80 € = 40.000 €. Se venden 300 (24.000 €) sin que
		// el precio se mueva, así que quedan 16.000 € y la rentabilidad es plana.
		const index = twrIndex([point(40000), point(16000, -24000)]);
		expect(index[1]).toBeCloseTo(100, 9);
	});

	it('comprar no mueve la rentabilidad', () => {
		const index = twrIndex([point(40000), point(50000, 10000)]);
		expect(index[1]).toBeCloseTo(100, 9);
	});

	it('sin flujos reproduce la variación de precio', () => {
		const index = twrIndex([point(40000), point(41000), point(40590)]);
		expect(index[1]).toBeCloseTo(102.5, 9);
		expect(index[2]).toBeCloseTo(101.475, 9);
	});

	it('separa el movimiento de precio del flujo del mismo día', () => {
		// Entra dinero al inicio del día y el mercado sube un 1 %.
		const index = twrIndex([point(40000), point(50500, 10000)]);
		expect(index[1]).toBeCloseTo(101, 9);
	});

	it('una venta con caída de mercado refleja solo la caída', () => {
		// 40.000 € que caen un 2 % serían 39.200; se venden 20.000 → 19.200.
		const index = twrIndex([point(40000), point(19200, -20000)]);
		expect(index[1]).toBeCloseTo(98, 9);
	});

	it('sobrevive a una cartera que se vacía y se vuelve a llenar', () => {
		const index = twrIndex([point(10000), point(0, -10000), point(5000, 5000)]);
		expect(index.every((v) => isFinite(v) && v > 0)).toBe(true);
		expect(index[1]).toBeCloseTo(100, 9);
		expect(index[2]).toBeCloseTo(100, 9);
	});

	it('arranca en 100 y devuelve un valor por día', () => {
		const index = twrIndex([point(1), point(2), point(3)]);
		expect(index[0]).toBe(100);
		expect(index).toHaveLength(3);
	});

	it('con una serie vacía no revienta', () => {
		expect(twrIndex([])).toEqual([]);
	});
});

describe('investedSeries', () => {
	it('se ancla en el invertido actual y camina hacia atrás', () => {
		// Hoy hay 30.000 € invertidos y ayer entraron 10.000: antes eran 20.000.
		const invested = investedSeries([point(0), point(0, 10000)], 30000);
		expect(invested).toEqual([20000, 30000]);
	});

	it('una venta reduce el invertido sin dejarlo negativo', () => {
		const invested = investedSeries([point(0), point(0, -5000)], 0);
		expect(invested).toEqual([5000, 0]);
	});

	it('sin flujos es una línea plana', () => {
		const invested = investedSeries([point(0), point(0), point(0)], 1000);
		expect(invested).toEqual([1000, 1000, 1000]);
	});
});

describe('moneyWeightedReturn', () => {
	it('sin flujos coincide con la rentabilidad simple', () => {
		const mwr = moneyWeightedReturn([point(1000), point(1100)]);
		expect(mwr).toBeCloseTo(0.1, 6);
	});

	it('sin flujos coincide con el TWR', () => {
		const points = [point(1000), point(1050), point(1100)];
		const mwr = moneyWeightedReturn(points);
		expect(mwr).toBeCloseTo(periodReturn(twrIndex(points)), 6);
	});

	it('penaliza aportar justo antes de una caída', () => {
		// Los activos acaban planos, pero el dinero entró antes del tramo malo.
		const points = [point(1000), point(2000, 1000), point(1800)];
		const twr = periodReturn(twrIndex(points));
		const mwr = moneyWeightedReturn(points);
		expect(mwr).not.toBeNull();
		expect(mwr!).toBeLessThan(twr);
	});

	it('devuelve null cuando no hay dinero al principio ni al final', () => {
		expect(moneyWeightedReturn([point(0), point(0)])).toBeNull();
	});

	it('devuelve null con menos de dos puntos', () => {
		expect(moneyWeightedReturn([point(1000)])).toBeNull();
	});

	it('ignora flujos irrelevantes de céntimos', () => {
		const mwr = moneyWeightedReturn([point(1000), point(1100, 0.001)]);
		expect(mwr).toBeCloseTo(0.1, 6);
	});
});

describe('buildPerformanceSeries', () => {
	it('empaqueta las tres series con la misma longitud', () => {
		const points = [point(1000), point(1100, 50)];
		const series = buildPerformanceSeries(points, 900);

		expect(series.twr).toHaveLength(2);
		expect(series.invested).toHaveLength(2);
		expect(series.gain).toHaveLength(2);
		expect(series.invested[1]).toBe(900);
		expect(series.gain[1]).toBe(200);
	});

	it('el coste del timing es la diferencia entre MWR y TWR', () => {
		const points = [point(1000), point(2000, 1000), point(1800)];
		const series = buildPerformanceSeries(points, 2000);

		expect(series.mwrPeriod).not.toBeNull();
		expect(series.timingCostPp).toBeCloseTo(
			(series.mwrPeriod! - series.twrPeriod) * 100,
			9
		);
		expect(series.timingCostPp!).toBeLessThan(0);
	});

	it('localiza el primer día medido', () => {
		const points = [
			{ ...point(1000), estimated: true },
			{ ...point(1100), estimated: true },
			point(1200)
		];
		expect(buildPerformanceSeries(points, 1000).firstMeasuredIndex).toBe(2);
	});

	it('devuelve -1 si toda la ventana es estimada', () => {
		const points = [{ ...point(1000), estimated: true }];
		expect(buildPerformanceSeries(points, 1000).firstMeasuredIndex).toBe(-1);
	});

	it('una venta no genera pérdida en la rentabilidad pero sí baja el patrimonio', () => {
		// El caso que motivó todo el módulo: 500 → 200 participaciones.
		const points = [point(40000), point(16000, -24000)];
		const series = buildPerformanceSeries(points, 16000);

		expect(series.twrPeriod).toBeCloseTo(0, 9);
		expect(series.points[1].total).toBeLessThan(series.points[0].total);
	});
});
