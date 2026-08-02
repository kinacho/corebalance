import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioStore } from './portfolio.svelte';
import type { Asset } from '$lib/types';
import { startOfUTCDay, DAY_MS } from '$lib/history';

vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$lib/db', () => ({
	storageProvider: { isLocal: true, onAuthStateChanged: vi.fn(), saveHoldingEdits: vi.fn() }
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const VWCE: Asset = {
	ticker: 'VWCE',
	name: 'Vanguard FTSE All-World',
	isin: 'IE00BK5BQT80',
	targetWeight: 1,
	color: '#3b82f6',
	icon: '🌍',
	ter: 0.0022,
	category: 'core'
};

/** 30 días de precios planos a 80 €, que es lo que espera la reconstrucción. */
const FLAT_SPARKLINE = new Array(30).fill(80);

describe('PortfolioStore - performanceSeries', () => {
	let store: PortfolioStore;

	beforeEach(() => {
		vi.clearAllMocks();
		store = new PortfolioStore();
		store.transactions = [];
		store.holdingEdits = [];
		store.history = [];
		store.satelliteAssets = [];
		store.stockAssets = [];
		store.coreAssets = [VWCE];
		store.holdings = { VWCE: { shares: 500, avgCost: 70, useLedger: false } };
		store.prices = {
			VWCE: { name: 'Vanguard FTSE All-World', price: 80, currency: 'EUR', change: 0, sparkline: FLAT_SPARKLINE }
		};
	});

	it('el último punto coincide con el patrimonio de cabecera', () => {
		const points = store.performanceSeries.points;
		expect(points[points.length - 1].total).toBeCloseTo(store.globalCapital, 6);
	});

	it('devuelve un punto por día de la ventana', () => {
		expect(store.performanceSeries.points).toHaveLength(30);
	});

	it('sin ediciones toda la ventana es estimada y no hay flujos', () => {
		const series = store.performanceSeries;
		expect(series.points.every((p) => p.estimated)).toBe(true);
		expect(series.points.every((p) => p.netFlow === 0)).toBe(true);
		expect(series.firstMeasuredIndex).toBe(-1);
	});

	it('una venta registrada baja el patrimonio pero deja la rentabilidad plana', () => {
		// El caso que motivó todo: 500 → 200 participaciones, precio plano.
		const yesterday = startOfUTCDay(new Date()) - DAY_MS;
		store.holdingEdits = [
			{
				id: 'e1',
				ticker: 'VWCE',
				date: yesterday,
				sharesBefore: 500,
				sharesAfter: 200,
				reason: 'sale',
				priceBase: 80,
				createdAt: yesterday
			}
		];
		store.holdings = { VWCE: { shares: 200, avgCost: 70, useLedger: false } };

		const series = store.performanceSeries;
		const points = series.points;

		expect(points[points.length - 3].total).toBeCloseTo(40000, 6);
		expect(points[points.length - 1].total).toBeCloseTo(16000, 6);
		// El flujo se atribuye al día de la venta.
		expect(points[points.length - 2].netFlow).toBeCloseTo(-24000, 6);
		// Y la rentabilidad no se mueve: es justo el escalón falso que sobraba.
		expect(series.twrPeriod).toBeCloseTo(0, 9);
	});

	it('una corrección reescribe la ventana sin generar flujo ni pérdida', () => {
		const yesterday = startOfUTCDay(new Date()) - DAY_MS;
		store.holdingEdits = [
			{
				id: 'e1',
				ticker: 'VWCE',
				date: yesterday,
				sharesBefore: 500,
				sharesAfter: 200,
				reason: 'correction',
				priceBase: 80,
				createdAt: yesterday
			}
		];
		store.holdings = { VWCE: { shares: 200, avgCost: 70, useLedger: false } };

		const series = store.performanceSeries;
		expect(series.points.every((p) => p.netFlow === 0)).toBe(true);
		expect(series.points[0].total).toBeCloseTo(16000, 6);
		expect(series.twrPeriod).toBeCloseTo(0, 9);
	});

	it('un cambio sin clasificar se comporta como corrección, no como venta', () => {
		const yesterday = startOfUTCDay(new Date()) - DAY_MS;
		store.holdingEdits = [
			{
				id: 'e1',
				ticker: 'VWCE',
				date: yesterday,
				sharesBefore: 500,
				sharesAfter: 200,
				reason: 'unclassified',
				priceBase: 80,
				createdAt: yesterday
			}
		];
		store.holdings = { VWCE: { shares: 200, avgCost: 70, useLedger: false } };

		expect(store.performanceSeries.points.every((p) => p.netFlow === 0)).toBe(true);
		expect(store.performanceSeries.points[0].total).toBeCloseTo(16000, 6);
	});

	it('el modo ledger produce la misma estructura sin log de ediciones', () => {
		store.holdings = { VWCE: { shares: 0, avgCost: 0, useLedger: true } };
		const yesterday = startOfUTCDay(new Date()) - DAY_MS;
		store.transactions = [
			{ id: 't1', ticker: 'VWCE', type: 'buy', shares: 100, price: 80, date: yesterday, currency: 'EUR', fees: 0, fxRate: 1 }
		];

		const points = store.performanceSeries.points;
		expect(points[points.length - 2].netFlow).toBeCloseTo(8000, 6);
		expect(points[points.length - 1].total).toBeCloseTo(store.globalCapital, 6);
	});

	it('la escalera de invertido termina en el invertido actual', () => {
		const series = store.performanceSeries;
		expect(series.invested[series.invested.length - 1]).toBeCloseTo(store.globalInvested, 6);
	});
});

describe('PortfolioStore - commitHoldingEdit', () => {
	let store: PortfolioStore;

	beforeEach(() => {
		vi.clearAllMocks();
		store = new PortfolioStore();
		store.transactions = [];
		store.holdingEdits = [];
		store.satelliteAssets = [];
		store.stockAssets = [];
		store.coreAssets = [VWCE];
		store.holdings = { VWCE: { shares: 500, avgCost: 70, useLedger: false } };
		store.prices = {
			VWCE: { name: 'Vanguard FTSE All-World', price: 80, currency: 'EUR', change: 0, sparkline: FLAT_SPARKLINE }
		};
		// Simula un usuario que ya tiene pasado, para que no se aplique la
		// excepción del alta inicial.
		store.history = [{ date: '2026-01-01', value: 40000 }];
	});

	it('registra el cambio como pendiente de clasificar', () => {
		const edit = store.commitHoldingEdit('VWCE', 500, 200);

		expect(edit).not.toBeNull();
		expect(edit!.reason).toBe('unclassified');
		expect(edit!.sharesBefore).toBe(500);
		expect(edit!.sharesAfter).toBe(200);
		expect(store.unclassifiedEdits).toHaveLength(1);
		expect(store.pendingEditByTicker['VWCE'].id).toBe(edit!.id);
	});

	it('valora el flujo con el precio base del activo', () => {
		const edit = store.commitHoldingEdit('VWCE', 500, 200);
		expect(edit!.priceBase).toBeCloseTo(80, 6);
	});

	it('ignora un cambio nulo', () => {
		expect(store.commitHoldingEdit('VWCE', 500, 500)).toBeNull();
		expect(store.holdingEdits).toHaveLength(0);
	});

	it('no registra nada en modo ledger, que ya tiene su propio libro', () => {
		store.holdings = { VWCE: { shares: 500, avgCost: 70, useLedger: true } };
		expect(store.commitHoldingEdit('VWCE', 500, 200)).toBeNull();
	});

	it('no pregunta durante el alta inicial de una posición', () => {
		store.history = [];
		store.holdingEdits = [];
		expect(store.commitHoldingEdit('VWCE', 0, 500)).toBeNull();
	});

	it('sí pregunta al añadir una posición cuando ya hay historia', () => {
		const edit = store.commitHoldingEdit('VWCE', 0, 500);
		expect(edit).not.toBeNull();
		expect(edit!.sharesAfter).toBe(500);
	});

	it('classifyEdit convierte el pendiente en un flujo real', () => {
		const edit = store.commitHoldingEdit('VWCE', 500, 200)!;
		store.holdings = { VWCE: { shares: 200, avgCost: 70, useLedger: false } };

		store.classifyEdit(edit.id, 'sale');

		expect(store.unclassifiedEdits).toHaveLength(0);
		const points = store.performanceSeries.points;
		expect(points[points.length - 1].netFlow).toBeCloseTo(-24000, 6);
		expect(store.performanceSeries.twrPeriod).toBeCloseTo(0, 9);
	});

	it('classifyEdit revalora el flujo si cambia la fecha', () => {
		const rising = new Array(30).fill(0).map((_, i) => 40 + i * 2); // acaba en 98
		store.prices = {
			VWCE: { name: 'V', price: 98, currency: 'EUR', change: 0, sparkline: rising }
		};
		const edit = store.commitHoldingEdit('VWCE', 500, 400)!;
		const tenDaysAgo = startOfUTCDay(new Date()) - 10 * DAY_MS;

		store.classifyEdit(edit.id, 'sale', { date: tenDaysAgo });

		const updated = store.holdingEdits.find((e) => e.id === edit.id)!;
		expect(updated.date).toBe(tenDaysAgo);
		// El precio de hace 10 días es menor que el de hoy, así que el flujo
		// también: valorar la venta al precio de hoy la habría inflado.
		expect(updated.priceBase!).toBeLessThan(edit.priceBase!);
	});

	it('classifyAllPending resuelve de golpe los cambios de un activo', () => {
		store.commitHoldingEdit('VWCE', 500, 400);
		store.commitHoldingEdit('VWCE', 400, 300);
		expect(store.unclassifiedEdits).toHaveLength(2);

		store.classifyAllPending('correction', 'VWCE');

		expect(store.unclassifiedEdits).toHaveLength(0);
		expect(store.holdingEdits.every((e) => e.reason === 'correction')).toBe(true);
	});
});
