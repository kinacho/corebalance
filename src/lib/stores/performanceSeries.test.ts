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

	/**
	 * La ventana de la reconstrucción, que **la decide el dato y no una constante**.
	 *
	 * ⚠️ Ampliarla sin más no añade historia: las participaciones de una fecha pasada salen
	 * del libro o del log de ediciones, y sin ninguno de los dos `sharesAt()` devuelve las de
	 * hoy para todo el pasado y lo marca `estimated`. Es decir, se agrandaría el tramo
	 * inventado — el mismo que se excluyó del cálculo de rentabilidades por contaminarlas.
	 */
	/**
	 * Los ETF de referencia de índice, que sirven para reconstruir los días sin valor
	 * liquidativo del fondo. Ver `priceProxyOf` y `alignPriceSeriesWithProxy`.
	 */
	describe('proxies de índice', () => {
		it('pide el proxy del índice que replica la cartera', () => {
			// VWCE replica el FTSE All-World, cuyo proxy declarado es VWCE.DE.
			store.coreAssets = [{ ...VWCE, ticker: 'IE00BK5BQT80', indexKey: 'ftse-all-world' }];
			expect(store.proxyTickers).toContain('VWCE.DE');
		});

		/**
		 * ⚠️ Un proxy **no es una posición**: si entrara en la cartera aparecería como un activo
		 * que el usuario no tiene, con su peso y su desviación.
		 */
		it('el proxy no entra en los tickers del usuario', () => {
			store.coreAssets = [{ ...VWCE, ticker: 'IE00BK5BQT80', indexKey: 'ftse-all-world' }];
			expect(store.allUserTickers).not.toContain('VWCE.DE');
		});

		/** Si el proxy ya es un activo del usuario no se pide dos veces. */
		it('no duplica un proxy que ya está en la cartera', () => {
			store.coreAssets = [{ ...VWCE, ticker: 'VWCE.DE', indexKey: 'ftse-all-world' }];
			expect(store.proxyTickers).not.toContain('VWCE.DE');
		});

		/** Sin índice declarado no hay proxy que pedir, y no se inventa ninguno. */
		it('un activo sin índice no arrastra proxy', () => {
			store.coreAssets = [{ ...VWCE, ticker: 'RARO.XX', name: 'Algo sin índice', indexKey: undefined }];
			expect(store.proxyTickers).toEqual([]);
		});

		/**
		 * ⚠️ **El eslabón que los cuatro tests de arriba NO cubren**, y lo demostró su control
		 * negativo: calculan `proxyTickers`, pero ninguno se enteraba de que los proxies dejaran
		 * de viajar en la petición. Sin eso el derivado seguiría bien, el empalme no tendría
		 * precios y el gráfico volvería al relleno plano **sin un error de por medio** — la firma
		 * exacta de defecto que este proyecto persigue.
		 */
		it('el proxy viaja de verdad en la petición de precios', async () => {
			store.coreAssets = [{ ...VWCE, ticker: 'IE00BK5BQT80', indexKey: 'ftse-all-world' }];

			const urls: string[] = [];
			vi.stubGlobal('fetch', vi.fn(async (url: string) => {
				urls.push(url);
				return { ok: true, json: async () => ({ prices: {}, timestamp: new Date().toISOString() }) };
			}));

			await store.fetchPrices();

			const pedidos = decodeURIComponent(urls[0]);
			expect(pedidos).toContain('IE00BK5BQT80');
			expect(pedidos).toContain('VWCE.DE');

			vi.unstubAllGlobals();
		});
	});

	describe('ventana histórica', () => {
		it('sin libro ni ediciones se queda en los 30 días de siempre', () => {
			store.transactions = [];
			store.holdingEdits = [];
			expect(store.ventanaHistorica).toBe(PortfolioStore.HISTORY_DAYS);
		});

		it('con una operación antigua alcanza hasta ella', () => {
			const haceCienDias = startOfUTCDay(new Date()) - 100 * DAY_MS;
			store.transactions = [
				{ id: 't1', ticker: 'VWCE', type: 'buy', date: haceCienDias, shares: 500, price: 70, currency: 'EUR', fees: 0, fxRate: 1 }
			];

			expect(store.ventanaHistorica).toBe(101);
		});

		it('el log de ediciones cuenta igual que el libro', () => {
			const haceCincuenta = startOfUTCDay(new Date()) - 50 * DAY_MS;
			store.transactions = [];
			store.holdingEdits = [
				{ id: 'e1', ticker: 'VWCE', sharesBefore: 0, sharesAfter: 500, date: haceCincuenta, reason: 'purchase' } as never
			];

			expect(store.ventanaHistorica).toBe(51);
		});

		it('una operación reciente no encoge la ventana por debajo del mínimo', () => {
			store.transactions = [
				{ id: 't1', ticker: 'VWCE', type: 'buy', date: Date.now(), shares: 1, price: 70, currency: 'EUR', fees: 0, fxRate: 1 }
			];

			expect(store.ventanaHistorica).toBe(PortfolioStore.HISTORY_DAYS);
		});

		/**
		 * El techo existe porque el histórico de Yahoo tampoco es infinito y porque la serie
		 * viaja en la respuesta de precios: pedir diez años sería pedir un array que nadie va
		 * a dibujar.
		 */
		it('una operación de hace diez años se queda en el techo', () => {
			const haceDiezAnios = startOfUTCDay(new Date()) - 3650 * DAY_MS;
			store.transactions = [
				{ id: 't1', ticker: 'VWCE', type: 'buy', date: haceDiezAnios, shares: 1, price: 70, currency: 'EUR', fees: 0, fxRate: 1 }
			];

			expect(store.ventanaHistorica).toBe(PortfolioStore.HISTORY_DAYS_MAX);
		});

		/**
		 * Y la consecuencia que se ve: con libro largo la serie deja de tener 30 puntos. El
		 * sparkline de este fixture sólo trae 30, así que los días sin precio los rellena la
		 * reconstrucción marcándolos —`paddedBefore`—, que es exactamente lo que debe pasar
		 * cuando el activo no tiene tanto histórico como el libro.
		 */
		/**
		 * ⚠️ **El mecanismo cuyo fallo es invisible durante treinta segundos.** El histórico
		 * largo se pide una sola vez —viaja en la respuesta de precios, que se sondea cada 30
		 * s—, y `this.prices = data.prices` reemplaza en bloque. Sin fusionar, la serie larga
		 * llegaba al cargar y el primer sondeo la dejaba otra vez en 30 puntos: el gráfico se
		 * encogía solo, sin ningún error de por medio y con el usuario mirando.
		 */
		it('el sondeo corto no pisa el histórico largo ya recibido', async () => {
			const haceNoventa = startOfUTCDay(new Date()) - 90 * DAY_MS;
			store.transactions = [
				{ id: 't1', ticker: 'VWCE', type: 'buy', date: haceNoventa, shares: 500, price: 70, currency: 'EUR', fees: 0, fxRate: 1 }
			];

			const urls: string[] = [];
			const respuestaCon = (puntos: number) => ({
				ok: true,
				json: async () => ({
					prices: {
						VWCE: {
							name: 'V', price: 80, currency: 'EUR', change: 0,
							sparkline: new Array(puntos).fill(80)
						}
					},
					timestamp: new Date().toISOString()
				})
			});

			let llamada = 0;
			vi.stubGlobal('fetch', vi.fn(async (url: string) => {
				urls.push(url);
				// La primera pide histórico; el sondeo siguiente ya no, y trae 30.
				return respuestaCon(++llamada === 1 ? 91 : 30);
			}));

			await store.fetchPrices();
			expect(urls[0]).toContain('historyDays=91');
			expect(store.prices.VWCE.sparkline).toHaveLength(91);

			await store.fetchPrices();
			expect(urls[1]).not.toContain('historyDays');
			// Lo que importa: sigue habiendo 91 puntos después del sondeo.
			expect(store.prices.VWCE.sparkline).toHaveLength(91);

			vi.unstubAllGlobals();
		});

		it('la serie de puntos crece con la ventana', () => {
			const haceNoventa = startOfUTCDay(new Date()) - 90 * DAY_MS;
			store.transactions = [
				{ id: 't1', ticker: 'VWCE', type: 'buy', date: haceNoventa, shares: 500, price: 70, currency: 'EUR', fees: 0, fxRate: 1 }
			];

			expect(store.performanceSeries.points).toHaveLength(91);
		});
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
