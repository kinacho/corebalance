import { describe, it, expect } from 'vitest';
import {
	alignPriceSeries,
	alignPriceSeriesWithProxy,
	overlaySnapshots,
	reconstructDailySeries
} from './reconstruct';
import { buildTimelineFromEdits } from './timeline';
import type { DailyPoint, HoldingEdit } from './types';

const DAY = 86400000;
const TODAY = new Date(Date.UTC(2026, 6, 30));
const todayStart = Date.UTC(2026, 6, 30);
const dayAgo = (n: number) => todayStart - n * DAY;

function edit(
	date: number,
	sharesBefore: number,
	sharesAfter: number,
	reason: HoldingEdit['reason'],
	priceBase = 80
): HoldingEdit {
	return {
		id: `e-${date}-${sharesAfter}`,
		ticker: 'VWCE',
		date,
		sharesBefore,
		sharesAfter,
		reason,
		priceBase,
		createdAt: date
	};
}

describe('alignPriceSeries', () => {
	it('recorta cuando sobran días', () => {
		const { series, paddedBefore } = alignPriceSeries([1, 2, 3, 4, 5], 3);
		expect(series).toEqual([3, 4, 5]);
		expect(paddedBefore).toBe(0);
	});

	it('rellena por la izquierda con el primer precio conocido, no con el de hoy', () => {
		const { series, paddedBefore } = alignPriceSeries([10, 20], 5);
		expect(series).toEqual([10, 10, 10, 10, 20]);
		expect(paddedBefore).toBe(3);
	});
});

/**
 * Rellenar el hueco inicial con **la forma del índice** en vez de con una recta.
 *
 * El caso real: el libro de operaciones llega año y medio atrás y la serie de precios del
 * fondo sólo un año, porque Yahoo no cubre esa clase antes. El relleno plano afirma **0 % de
 * variación** en los seis meses que faltan; sobre el tramo que lo motivó el mercado se movió
 * en torno a un 10 %, así que ése es el error que se venía a corregir. El del proxy es el
 * tracking difference más el TER: 0,06 % en seis meses.
 */
describe('alignPriceSeriesWithProxy', () => {
	it('arrastra el hueco con el ratio del proxy y empalma sin escalón', () => {
		// Un fondo con dos días conocidos (100, 110) y un proxy que sube desde 50 hasta 80.
		const { series, estimadoConProxy } = alignPriceSeriesWithProxy(
			[100, 110],
			5,
			[50, 60, 70, 75, 80]
		);

		// El día del empalme (índice 3) conserva EXACTAMENTE el precio real.
		expect(series[3]).toBe(100);
		expect(series[4]).toBe(110);
		// Y los tres anteriores llevan la forma del proxy, escalada a ese ancla: 100 × p/75.
		expect(series[0]).toBeCloseTo(100 * (50 / 75), 6);
		expect(series[1]).toBeCloseTo(100 * (60 / 75), 6);
		expect(series[2]).toBeCloseTo(100 * (70 / 75), 6);
		expect(estimadoConProxy).toBe(3);
	});

	/**
	 * Sólo se toma la **forma** del proxy, nunca su nivel: el ETF puede cotizar a 95 € y el
	 * fondo a 12 €. Si se sustituyera en vez de arrastrar, el patrimonio pasado se multiplicaría
	 * por ocho.
	 */
	it('no importa la escala del proxy, sólo su variación', () => {
		const barato = alignPriceSeriesWithProxy([12], 3, [5, 6, 7]);
		const caro = alignPriceSeriesWithProxy([12], 3, [500, 600, 700]);

		expect(barato.series).toEqual(caro.series);
		// Y ninguno se acerca al nivel del proxy.
		expect(barato.series[0]).toBeCloseTo(12 * (5 / 7), 6);
	});

	/**
	 * ⚠️ `paddedBefore` **no baja**, y es deliberado: es lo que marca el tramo como estimado
	 * —trazo discontinuo y aviso—, y un tramo reconstruido con un proxy sigue siendo una
	 * estimación. No es el valor liquidativo del fondo, es lo que hizo su índice.
	 */
	it('el tramo reconstruido sigue marcado como estimado', () => {
		const { paddedBefore } = alignPriceSeriesWithProxy([100, 110], 5, [50, 60, 70, 75, 80]);
		expect(paddedBefore).toBe(3);
	});

	it('sin proxy se comporta exactamente como antes', () => {
		const con = alignPriceSeriesWithProxy([10, 20], 5, undefined);
		const sin = alignPriceSeries([10, 20], 5);

		expect(con.series).toEqual(sin.series);
		expect(con.estimadoConProxy).toBe(0);
	});

	/**
	 * Si el proxy no llega más atrás que el propio activo no aporta forma alguna, y hay que
	 * dejarlo estar: inventar un arrastre con su relleno plano sería propagar el defecto en vez
	 * de arreglarlo.
	 */
	it('un proxy igual de corto no cambia nada', () => {
		const { series, estimadoConProxy } = alignPriceSeriesWithProxy([10, 20], 5, [7, 8]);

		expect(series).toEqual([10, 10, 10, 10, 20]);
		expect(estimadoConProxy).toBe(0);
	});

	it('un proxy que cubre sólo parte del hueco rellena esa parte', () => {
		// Hueco de 3 días; el proxy sólo tiene datos reales para los dos últimos.
		const { series, estimadoConProxy } = alignPriceSeriesWithProxy([100], 4, [60, 70, 75]);

		expect(estimadoConProxy).toBe(2);
		expect(series[3]).toBe(100);
		// El primer día queda con el relleno plano, porque ahí el proxy tampoco sabe nada.
		expect(series[0]).toBe(100);
	});

	it('sin ningún precio real del activo no hay ancla y no se inventa nada', () => {
		const { series, estimadoConProxy } = alignPriceSeriesWithProxy([], 3, [10, 20, 30]);

		expect(series).toEqual([0, 0, 0]);
		expect(estimadoConProxy).toBe(0);
	});

	it('descarta ceros, nulos e infinitos', () => {
		const { series } = alignPriceSeries([0, NaN, 10, Infinity, 20] as number[], 2);
		expect(series).toEqual([10, 20]);
	});

	it('sin datos devuelve ceros y marca toda la ventana como relleno', () => {
		const { series, paddedBefore } = alignPriceSeries(undefined, 3);
		expect(series).toEqual([0, 0, 0]);
		expect(paddedBefore).toBe(3);
	});
});

describe('reconstructDailySeries', () => {
	const base = {
		priceSeries: { VWCE: [90, 95, 100] },
		perShareBase: { VWCE: 100 },
		categoryOf: { VWCE: 'core' as const },
		days: 3,
		today: TODAY
	};

	it('con participaciones constantes aplica el ratio de precios', () => {
		const points = reconstructDailySeries({
			...base,
			timelines: [buildTimelineFromEdits('VWCE', 10, [])]
		});

		expect(points.map((p) => Math.round(p.total))).toEqual([900, 950, 1000]);
		expect(points.map((p) => p.date)).toEqual(['2026-07-28', '2026-07-29', '2026-07-30']);
	});

	it('el último punto coincide exactamente con el valor actual', () => {
		const points = reconstructDailySeries({
			...base,
			timelines: [buildTimelineFromEdits('VWCE', 10, [])]
		});
		expect(points[2].total).toBe(1000);
	});

	it('una venta a mitad de ventana baja el patrimonio y registra el flujo', () => {
		const timeline = buildTimelineFromEdits('VWCE', 4, [edit(dayAgo(1), 10, 4, 'sale', 95)]);
		const points = reconstructDailySeries({ ...base, timelines: [timeline] });

		// Antes de la venta valían 10 participaciones; después, 4.
		expect(Math.round(points[0].total)).toBe(900);
		expect(Math.round(points[1].total)).toBe(380);
		expect(points[2].total).toBe(400);
		// El flujo se atribuye al día de la venta, no a hoy.
		expect(points[1].netFlow).toBeCloseTo(-570, 6);
		expect(points[0].netFlow).toBe(0);
		expect(points[2].netFlow).toBe(0);
	});

	it('una corrección reescribe toda la ventana sin generar flujo', () => {
		const timeline = buildTimelineFromEdits('VWCE', 4, [
			edit(dayAgo(1), 10, 4, 'correction', 95)
		]);
		const points = reconstructDailySeries({ ...base, timelines: [timeline] });

		expect(Math.round(points[0].total)).toBe(360);
		expect(Math.round(points[1].total)).toBe(380);
		expect(points[2].total).toBe(400);
		expect(points.every((p) => p.netFlow === 0)).toBe(true);
	});

	it('reparte el valor por categorías', () => {
		const points = reconstructDailySeries({
			timelines: [
				buildTimelineFromEdits('VWCE', 10, []),
				buildTimelineFromEdits('MSFT', 5, [])
			],
			priceSeries: { VWCE: [100, 100, 100], MSFT: [100, 100, 100] },
			perShareBase: { VWCE: 100, MSFT: 40 },
			categoryOf: { VWCE: 'core', MSFT: 'stocks' },
			days: 3,
			today: TODAY
		});

		expect(points[2]).toMatchObject({ total: 1200, core: 1000, stocks: 200, satellite: 0 });
	});

	it('marca como estimados los días cubiertos por el tramo semilla', () => {
		const timeline = buildTimelineFromEdits('VWCE', 4, [edit(dayAgo(1), 10, 4, 'sale', 95)]);
		const points = reconstructDailySeries({ ...base, timelines: [timeline] });

		expect(points.map((p) => p.estimated)).toEqual([true, false, false]);
	});

	it('marca como estimados los días con precio rellenado', () => {
		const points = reconstructDailySeries({
			...base,
			timelines: [buildTimelineFromEdits('VWCE', 10, [])],
			paddedBefore: { VWCE: 2 }
		});
		expect(points.map((p) => p.estimated)).toEqual([true, true, true]);
	});

	it('sin serie de precios mantiene el valor plano en lugar de inventarlo', () => {
		const points = reconstructDailySeries({
			...base,
			priceSeries: {},
			timelines: [buildTimelineFromEdits('VWCE', 10, [])]
		});
		expect(points.map((p) => p.total)).toEqual([1000, 1000, 1000]);
	});

	it('una posición a cero hoy no aporta valor pero sí su historial de flujos', () => {
		const timeline = buildTimelineFromEdits('VWCE', 0, [edit(dayAgo(1), 10, 0, 'sale', 95)]);
		const points = reconstructDailySeries({
			...base,
			perShareBase: { VWCE: 0 },
			timelines: [timeline]
		});

		expect(points[2].total).toBe(0);
		expect(points[1].netFlow).toBeCloseTo(-950, 6);
	});
});

describe('overlaySnapshots', () => {
	function point(date: string, total: number): DailyPoint {
		return {
			date,
			total,
			core: total,
			satellite: 0,
			stocks: 0,
			netFlow: 0,
			estimated: false,
			hasBreakdown: true
		};
	}

	it('solo rellena los días que la reconstrucción no ve', () => {
		const points = [point('2026-07-28', 0), point('2026-07-29', 950)];
		const result = overlaySnapshots(points, [
			{ date: '2026-07-28', total: 800 },
			{ date: '2026-07-29', total: 12345 }
		]);

		expect(result[0].total).toBe(800);
		expect(result[0].observed).toBe(true);
		// El día reconstruido no se toca: mezclar las dos fuentes es lo que
		// producía el escalón falso.
		expect(result[1].total).toBe(950);
		expect(result[1].observed).toBeUndefined();
	});

	it('marca sin desglose los snapshots antiguos que solo tienen total', () => {
		const result = overlaySnapshots([point('2026-07-28', 0)], [
			{ date: '2026-07-28', total: 800 }
		]);
		expect(result[0].hasBreakdown).toBe(false);
	});

	it('conserva el desglose cuando el snapshot lo trae', () => {
		const result = overlaySnapshots([point('2026-07-28', 0)], [
			{ date: '2026-07-28', total: 800, core: 700, stocks: 100, satellite: 0 }
		]);
		expect(result[0]).toMatchObject({ hasBreakdown: true, core: 700, stocks: 100 });
	});

	it('sin snapshots devuelve la serie tal cual', () => {
		const points = [point('2026-07-28', 0)];
		expect(overlaySnapshots(points, [])).toBe(points);
	});
});
