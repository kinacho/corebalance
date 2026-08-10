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

	/**
	 * ⚠️ **Este test medía un castigo inventado, y pasaba por ruido numérico.** Su
	 * escenario era `[1000, 2000 (+1000), 1800]`: se aporta y a continuación *todo* el
	 * dinero —el viejo y el nuevo— come entera la caída del último tramo, así que no hay
	 * ninguna decisión de calendario que juzgar y las dos rentabilidades deben coincidir.
	 * Salía `mwr < twr` porque el MWR fechaba los flujos un día más tarde que el TWR (ver
	 * `flowTime`), y una vez alineados la diferencia medida es de **−3,2e−13**: la
	 * aserción seguía en verde por la tolerancia de la bisección, no por el fenómeno.
	 *
	 * Reescrito con la forma en que el timing sí existe: el dinero entra **después** de un
	 * tramo bueno y antes de uno malo, de modo que la parte nueva está expuesta a menos
	 * subida y a la misma bajada.
	 */
	it('penaliza aportar tras una subida y justo antes de una caída', () => {
		const points = [point(1000), point(1100), point(2100, 1000), point(1890)];
		const twr = periodReturn(twrIndex(points));
		const mwr = moneyWeightedReturn(points);

		expect(mwr).not.toBeNull();
		expect(mwr!).toBeLessThan(twr);
		// Y la distancia es de puntos porcentuales, no de ruido de coma flotante.
		expect(twr - mwr!).toBeGreaterThan(0.01);
	});

	it('premia aportar tras una caída, justo antes de la recuperación', () => {
		const points = [point(1000), point(900), point(1900, 1000), point(2090)];
		const twr = periodReturn(twrIndex(points));
		const mwr = moneyWeightedReturn(points);

		expect(mwr).not.toBeNull();
		expect(mwr!).toBeGreaterThan(twr);
	});

	/**
	 * El contrato que hace comparables a las dos métricas, y el que faltaba: un flujo
	 * cuenta **al inicio de su día** en las dos. En `twrIndex` siempre fue así
	 * (`base = begin + inflow`); el MWR lo colocaba en el cierre, un día más tarde, y esa
	 * asimetría se presentaba al usuario como «el coste de tu timing».
	 *
	 * Cuando todo el dinero está expuesto exactamente al mismo tramo no hay timing que
	 * medir, así que ambas cifras deben ser la misma con precisión de cálculo, no
	 * parecidas.
	 */
	it('fecha los flujos igual que el TWR, así que sin timing ambas coinciden', () => {
		const points = [point(1000), point(2000, 1000), point(1800)];
		const twr = periodReturn(twrIndex(points));
		const mwr = moneyWeightedReturn(points);

		expect(mwr).not.toBeNull();
		expect(mwr!).toBeCloseTo(twr, 9);
		expect(mwr!).toBeCloseTo(-0.1, 9);
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

	/**
	 * ⚠️ **Las dos rentabilidades incluían los días estimados**, que son los que la
	 * reconstrucción no puede ver y rellena con una estimación. El gráfico los dibuja
	 * distinto y lo advierte; estas cifras los metían en la aritmética en silencio, y son
	 * las que la interfaz presenta como «lo que rindieron tus activos».
	 *
	 * El número de este caso es el que hay que recordar: **13,33 % contra 2,00 %**. Once
	 * puntos de rentabilidad inventada. `firstMeasuredIndex` ya existía y ya estaba
	 * probado; lo que faltaba era que alguien lo leyera.
	 */
	it('mide las rentabilidades desde el primer día real, no desde el estimado', () => {
		const points = [
			{ ...point(9000), estimated: true },
			{ ...point(9500), estimated: true },
			point(10000),
			point(10200)
		];
		const series = buildPerformanceSeries(points, 9000);

		// 10.200 / 10.000 − 1, y no 10.200 / 9.000 − 1.
		expect(series.twrPeriod).toBeCloseTo(0.02, 6);
		expect(series.measuredDays).toBe(2);
	});

	it('con toda la ventana estimada no inventa cifras: el panel se apaga', () => {
		const points = [
			{ ...point(1000), estimated: true },
			{ ...point(1500, 400), estimated: true }
		];
		const series = buildPerformanceSeries(points, 1000);

		expect(series.twrPeriod).toBe(0);
		expect(series.mwrPeriod).toBeNull();
		expect(series.timingCostPp).toBeNull();
		expect(series.measuredDays).toBe(0);
	});

	it('`measuredDays` cuenta los días medidos, que es lo que el pie declara', () => {
		const todosReales = buildPerformanceSeries([point(100), point(110), point(120)], 100);
		expect(todosReales.measuredDays).toBe(3);
	});

	/**
	 * La fecha más antigua guardada viaja con la serie porque el gráfico no puede saberla:
	 * la reconstrucción se corta en 30 días y sin este dato no distingue «esto es todo lo
	 * que tienes» de «hay más y no cabe». Ver `range.ts`.
	 */
	it('propaga la fecha guardada más antigua, y por defecto es null', () => {
		expect(buildPerformanceSeries([point(100), point(110)], 100).oldestKnownDate).toBeNull();
		expect(
			buildPerformanceSeries([point(100), point(110)], 100, '2024-03-01').oldestKnownDate
		).toBe('2024-03-01');
	});

	it('una venta no genera pérdida en la rentabilidad pero sí baja el patrimonio', () => {
		// El caso que motivó todo el módulo: 500 → 200 participaciones.
		const points = [point(40000), point(16000, -24000)];
		const series = buildPerformanceSeries(points, 16000);

		expect(series.twrPeriod).toBeCloseTo(0, 9);
		expect(series.points[1].total).toBeLessThan(series.points[0].total);
	});
});
