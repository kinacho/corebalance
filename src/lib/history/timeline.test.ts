import { describe, it, expect } from 'vitest';
import { buildTimelineFromEdits, buildTimelineFromLedger, sharesAt, isEstimatedAt } from './timeline';
import type { EditReason, HoldingEdit } from './types';
import type { Transaction } from '$lib/types';

const DAY = 86400000;
const D1 = Date.UTC(2026, 6, 10);
const D2 = Date.UTC(2026, 6, 20);
const D3 = Date.UTC(2026, 6, 25);

let seq = 0;
function edit(
	date: number,
	sharesBefore: number,
	sharesAfter: number,
	reason: EditReason,
	priceBase = 80
): HoldingEdit {
	return {
		id: `e${++seq}`,
		ticker: 'VWCE',
		date,
		sharesBefore,
		sharesAfter,
		reason,
		priceBase,
		createdAt: date
	};
}

function tx(date: number, type: Transaction['type'], shares: number, price: number): Transaction {
	return {
		id: `t${++seq}`,
		ticker: 'VWCE',
		type,
		date,
		shares,
		price,
		currency: 'EUR',
		fees: 0,
		fxRate: 1
	};
}

describe('buildTimelineFromEdits', () => {
	it('sin ediciones deja un único tramo semilla con las participaciones actuales', () => {
		const timeline = buildTimelineFromEdits('VWCE', 500, []);
		expect(timeline.segments).toEqual([
			{ from: null, to: null, shares: 500, source: 'seed' }
		]);
		expect(timeline.flows).toEqual([]);
	});

	it('una venta parte el tramo y registra un flujo de salida', () => {
		const timeline = buildTimelineFromEdits('VWCE', 200, [edit(D2, 500, 200, 'sale')]);

		expect(timeline.segments).toEqual([
			{ from: null, to: D2, shares: 500, source: 'seed' },
			{ from: D2, to: null, shares: 200, source: 'edit' }
		]);
		expect(timeline.flows).toEqual([
			{ date: D2, ticker: 'VWCE', shares: -300, amount: -24000, kind: 'sale' }
		]);
	});

	it('una corrección reescribe el pasado y no mueve dinero', () => {
		const timeline = buildTimelineFromEdits('VWCE', 200, [edit(D2, 500, 200, 'correction')]);

		expect(timeline.segments).toEqual([
			{ from: null, to: null, shares: 200, source: 'seed' }
		]);
		expect(timeline.flows).toEqual([]);
	});

	it('una corrección posterior a una compra conserva la compra', () => {
		const timeline = buildTimelineFromEdits('VWCE', 300, [
			edit(D1, 500, 600, 'purchase'),
			edit(D2, 600, 300, 'correction')
		]);

		expect(timeline.segments).toEqual([
			{ from: null, to: D1, shares: 200, source: 'seed' },
			{ from: D1, to: null, shares: 300, source: 'edit' }
		]);
		// El +100 de la compra sobrevive al desplazamiento hacia atrás.
		expect(timeline.segments[1].shares - timeline.segments[0].shares).toBe(100);
		expect(timeline.flows).toHaveLength(1);
		expect(timeline.flows[0].kind).toBe('purchase');
		expect(timeline.flows[0].amount).toBe(8000);
	});

	it('un cambio sin clasificar se trata como corrección, nunca como venta', () => {
		const timeline = buildTimelineFromEdits('VWCE', 200, [edit(D2, 500, 200, 'unclassified')]);

		expect(timeline.flows).toEqual([]);
		expect(timeline.segments).toHaveLength(1);
		expect(timeline.segments[0].shares).toBe(200);
	});

	it('una corrección no deja participaciones negativas', () => {
		const timeline = buildTimelineFromEdits('VWCE', 0, [
			edit(D1, 100, 400, 'purchase'),
			edit(D2, 400, 0, 'correction')
		]);
		expect(timeline.segments.every((s) => s.shares >= 0)).toBe(true);
	});

	it('las participaciones actuales mandan sobre el último tramo', () => {
		const timeline = buildTimelineFromEdits('VWCE', 777, [edit(D2, 500, 200, 'sale')]);
		expect(timeline.segments[timeline.segments.length - 1].shares).toBe(777);
	});

	it('ignora ediciones de otros activos y las de delta cero', () => {
		const other = { ...edit(D1, 10, 20, 'purchase'), ticker: 'MSFT' };
		const timeline = buildTimelineFromEdits('VWCE', 500, [other, edit(D2, 500, 500, 'sale')]);
		expect(timeline.flows).toEqual([]);
		expect(timeline.segments).toHaveLength(1);
	});

	it('ordena por fecha aunque lleguen desordenadas', () => {
		const timeline = buildTimelineFromEdits('VWCE', 400, [
			edit(D3, 300, 400, 'purchase'),
			edit(D1, 500, 300, 'sale')
		]);
		expect(timeline.segments.map((s) => s.shares)).toEqual([500, 300, 400]);
		expect(timeline.flows.map((f) => f.date)).toEqual([D1, D3]);
	});

	it('fusiona dos flujos en el mismo instante en lugar de crear un tramo vacío', () => {
		const timeline = buildTimelineFromEdits('VWCE', 100, [
			edit(D2, 500, 300, 'sale'),
			edit(D2, 300, 100, 'sale')
		]);
		expect(timeline.segments).toHaveLength(2);
		expect(timeline.segments[1].shares).toBe(100);
		expect(timeline.flows).toHaveLength(2);
	});
});

describe('buildTimelineFromLedger', () => {
	it('sin transacciones deja un tramo a cero', () => {
		const timeline = buildTimelineFromLedger('VWCE', []);
		expect(timeline.segments).toEqual([
			{ from: null, to: null, shares: 0, source: 'ledger' }
		]);
	});

	it('acumula participaciones compra a compra y venta a venta', () => {
		const timeline = buildTimelineFromLedger('VWCE', [
			tx(D1, 'buy', 100, 80),
			tx(D2, 'sell', 40, 90)
		]);

		expect(timeline.segments.map((s) => s.shares)).toEqual([0, 100, 60]);
		expect(timeline.flows).toEqual([
			{ date: D1, ticker: 'VWCE', shares: 100, amount: 8000, kind: 'purchase' },
			{ date: D2, ticker: 'VWCE', shares: -40, amount: -3600, kind: 'sale' }
		]);
	});

	it('no permite vender más de lo que hay', () => {
		const timeline = buildTimelineFromLedger('VWCE', [
			tx(D1, 'buy', 50, 80),
			tx(D2, 'sell', 500, 90)
		]);
		expect(timeline.segments[timeline.segments.length - 1].shares).toBe(0);
	});

	it('un dividendo saca dinero sin cambiar las participaciones', () => {
		const timeline = buildTimelineFromLedger('VWCE', [
			tx(D1, 'buy', 100, 80),
			tx(D2, 'dividend', 100, 1.5)
		]);

		expect(timeline.segments.map((s) => s.shares)).toEqual([0, 100]);
		expect(timeline.flows[1]).toEqual({
			date: D2,
			ticker: 'VWCE',
			shares: 0,
			amount: -150,
			kind: 'sale'
		});
	});

	it('aplica el tipo de cambio a los importes', () => {
		const usd = { ...tx(D1, 'buy', 10, 100), currency: 'USD', fxRate: 0.9 };
		const timeline = buildTimelineFromLedger('VWCE', [usd]);
		expect(timeline.flows[0].amount).toBeCloseTo(900, 6);
	});

	it('suma las comisiones al coste de una compra', () => {
		const withFees = { ...tx(D1, 'buy', 10, 100), fees: 5 };
		const timeline = buildTimelineFromLedger('VWCE', [withFees]);
		expect(timeline.flows[0].amount).toBe(1005);
	});
});

describe('sharesAt / isEstimatedAt', () => {
	const timeline = buildTimelineFromEdits('VWCE', 200, [edit(D2, 500, 200, 'sale')]);

	it('lee el tramo correcto en cada instante', () => {
		expect(sharesAt(timeline, D1)).toBe(500);
		expect(sharesAt(timeline, D2 - 1)).toBe(500);
		expect(sharesAt(timeline, D2)).toBe(200);
		expect(sharesAt(timeline, D2 + DAY)).toBe(200);
	});

	it('marca como estimado solo el tramo semilla', () => {
		expect(isEstimatedAt(timeline, D1)).toBe(true);
		expect(isEstimatedAt(timeline, D2)).toBe(false);
	});
});

/**
 * ⚠️ **Las dos patas de un traspaso, que hasta la 1.23.1 este módulo no conocía.**
 *
 * `transfer_out` nació en la 1.22.0 y el `if` que decide el signo se quedó comparando
 * solo contra `'sell'`, así que una salida caía en el `else` y **sumaba**. El daño es el
 * mismo «error al doble» que el importador ya tiene documentado, y aquí sale por dos
 * sitios a la vez: `sharesAt()` devuelve de más —así que todo el patrimonio pasado se
 * dibuja inflado— y el flujo se apunta como `purchase`, o sea que la línea de «lo que
 * has aportado» da un escalón hacia arriba con dinero que nunca entró.
 */
describe('buildTimelineFromLedger con traspasos', () => {
	it('una salida de traspaso resta participaciones, como una venta', () => {
		const timeline = buildTimelineFromLedger('VWCE', [
			tx(D1, 'buy', 100, 10),
			tx(D2, 'transfer_out', 40, 12)
		]);

		// Con el defecto daba 140: 100 + 40 en vez de 100 − 40.
		expect(sharesAt(timeline, D2 + DAY)).toBe(60);
	});

	it('y su flujo sale de la cartera en vez de entrar', () => {
		const timeline = buildTimelineFromLedger('VWCE', [
			tx(D1, 'buy', 100, 10),
			tx(D2, 'transfer_out', 40, 12)
		]);

		expect(timeline.flows.map((f) => f.kind)).toEqual(['purchase', 'sale']);
		// −40 × 12 = −480: es lo que sale, no una aportación de 480 €.
		expect(timeline.flows[1].amount).toBe(-480);
	});

	it('una entrada de traspaso suma, como una compra', () => {
		const timeline = buildTimelineFromLedger('VWCE', [tx(D1, 'transfer_in', 50, 13)]);

		expect(sharesAt(timeline, D1 + DAY)).toBe(50);
		expect(timeline.flows[0].kind).toBe('purchase');
	});

	/**
	 * El alias de las carteras guardadas antes de la 1.22.0 significaba entrada, así que
	 * tiene que seguir sumando. Va aquí porque es el caso que un `esSalidaDeTraspaso`
	 * escrito a mano —comparando contra `'transfer'`— rompería en silencio.
	 */
	it("el alias `'transfer'` sigue sumando", () => {
		const timeline = buildTimelineFromLedger('VWCE', [tx(D1, 'transfer', 50, 13)]);
		expect(sharesAt(timeline, D1 + DAY)).toBe(50);
	});
});
