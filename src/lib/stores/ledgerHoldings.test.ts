import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioStore } from './portfolio.svelte';
import type { Transaction } from '$lib/types';

// Mock dynamic environment variables and other dependencies
vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$lib/db', () => ({ storageProvider: { isLocal: true, onAuthStateChanged: vi.fn() } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

describe('PortfolioStore - ledgerHoldings logic', () => {
	let store: PortfolioStore;

	beforeEach(() => {
		vi.clearAllMocks();
		store = new PortfolioStore();
		// Reset state
		store.transactions = [];
		store.holdings = {};
	});

	it('Compra simple: 10 participaciones a 100€ → avgCost = 100, shares = 10', () => {
		store.transactions = [
			{ id: '1', ticker: 'AAPL', type: 'buy', shares: 10, price: 100, date: 1716656400000, currency: 'EUR', fees: 0, fxRate: 1 }
		];
		store.holdings = { 'AAPL': { shares: 0, avgCost: 0, useLedger: true } };
		
		expect(store.ledgerHoldings['AAPL'].shares).toBe(10);
		expect(store.ledgerHoldings['AAPL'].avgCost).toBe(100);
	});

	it('Dos compras consecutivas: 10@100 + 10@120 → avgCost = 110, shares = 20', () => {
		store.transactions = [
			{ id: '1', ticker: 'AAPL', type: 'buy', shares: 10, price: 100, date: 1716656400000, currency: 'EUR', fees: 0, fxRate: 1 },
			{ id: '2', ticker: 'AAPL', type: 'buy', shares: 10, price: 120, date: 1716742800000, currency: 'EUR', fees: 0, fxRate: 1 }
		];
		store.holdings = { 'AAPL': { shares: 0, avgCost: 0, useLedger: true } };

		expect(store.ledgerHoldings['AAPL'].shares).toBe(20);
		expect(store.ledgerHoldings['AAPL'].avgCost).toBe(110);
	});

	it('Venta parcial: después de 10@100, vender 4 → shares = 6, avgCost se mantiene', () => {
		store.transactions = [
			{ id: '1', ticker: 'AAPL', type: 'buy', shares: 10, price: 100, date: 1716656400000, currency: 'EUR', fees: 0, fxRate: 1 },
			{ id: '2', ticker: 'AAPL', type: 'sell', shares: 4, price: 150, date: 1716742800000, currency: 'EUR', fees: 0, fxRate: 1 }
		];
		store.holdings = { 'AAPL': { shares: 0, avgCost: 0, useLedger: true } };

		expect(store.ledgerHoldings['AAPL'].shares).toBe(6);
		expect(store.ledgerHoldings['AAPL'].avgCost).toBe(100);
	});

	it('Venta total: después de 10@100, vender 10 → shares ≈ 0', () => {
		store.transactions = [
			{ id: '1', ticker: 'AAPL', type: 'buy', shares: 10, price: 100, date: 1716656400000, currency: 'EUR', fees: 0, fxRate: 1 },
			{ id: '2', ticker: 'AAPL', type: 'sell', shares: 10, price: 150, date: 1716742800000, currency: 'EUR', fees: 0, fxRate: 1 }
		];
		store.holdings = { 'AAPL': { shares: 0, avgCost: 0, useLedger: true } };

		expect(store.ledgerHoldings['AAPL'].shares).toBe(0);
	});

	it('Venta que supera las shares disponibles (no debe quedar negativa)', () => {
		store.transactions = [
			{ id: '1', ticker: 'AAPL', type: 'buy', shares: 10, price: 100, date: 1716656400000, currency: 'EUR', fees: 0, fxRate: 1 },
			{ id: '2', ticker: 'AAPL', type: 'sell', shares: 15, price: 150, date: 1716742800000, currency: 'EUR', fees: 0, fxRate: 1 }
		];
		store.holdings = { 'AAPL': { shares: 0, avgCost: 0, useLedger: true } };

		expect(store.ledgerHoldings['AAPL'].shares).toBe(0);
	});

	it('Compra → venta parcial → nueva compra: verifica que el avgCost se recalcula correctamente', () => {
		store.transactions = [
			{ id: '1', ticker: 'AAPL', type: 'buy', shares: 10, price: 100, date: 1716656400000, currency: 'EUR', fees: 0, fxRate: 1 },
			{ id: '2', ticker: 'AAPL', type: 'sell', shares: 5, price: 150, date: 1716742800000, currency: 'EUR', fees: 0, fxRate: 1 },
			{ id: '3', ticker: 'AAPL', type: 'buy', shares: 5, price: 200, date: 1716829200000, currency: 'EUR', fees: 0, fxRate: 1 }
		];
		store.holdings = { 'AAPL': { shares: 0, avgCost: 0, useLedger: true } };

		// Coste tras venta parcial: 5 @ 100 = 500
		// Nueva compra: 5 @ 200 = 1000
		// Total: 10 @ (1500/10) = 150
		expect(store.ledgerHoldings['AAPL'].shares).toBe(10);
		expect(store.ledgerHoldings['AAPL'].avgCost).toBe(150);
	});

	it('Dividendo: reduce el totalCostRaw y recalcula avgCost', () => {
		store.transactions = [
			{ id: '1', ticker: 'AAPL', type: 'buy', shares: 10, price: 100, date: 1716656400000, currency: 'EUR', fees: 0, fxRate: 1 },
			{ id: '2', ticker: 'AAPL', type: 'dividend', shares: 10, price: 2, date: 1716742800000, currency: 'EUR', fees: 0, fxRate: 1 }
		];
		store.holdings = { 'AAPL': { shares: 0, avgCost: 0, useLedger: true } };

		// Coste inicial: 1000
		// Dividendo: 10 * 2 = 20
		// Nuevo coste: 1000 - 20 = 980
		// Nuevo avgCost: 980 / 10 = 98
		expect(store.ledgerHoldings['AAPL'].shares).toBe(10);
		expect(store.ledgerHoldings['AAPL'].avgCost).toBe(98);
	});

	it('Transacción de tipo initial_balance y transfer se trata igual que una compra', () => {
		store.transactions = [
			{ id: '1', ticker: 'AAPL', type: 'initial_balance', shares: 5, price: 100, date: 1716656400000, currency: 'EUR', fees: 0, fxRate: 1 },
			{ id: '2', ticker: 'AAPL', type: 'transfer', shares: 5, price: 120, date: 1716742800000, currency: 'EUR', fees: 0, fxRate: 1 }
		];
		store.holdings = { 'AAPL': { shares: 0, avgCost: 0, useLedger: true } };

		expect(store.ledgerHoldings['AAPL'].shares).toBe(10);
		expect(store.ledgerHoldings['AAPL'].avgCost).toBe(110);
	});

	it('Múltiples tickers independientes no se mezclan entre sí', () => {
		store.transactions = [
			{ id: '1', ticker: 'AAPL', type: 'buy', shares: 10, price: 100, date: 1716656400000, currency: 'EUR', fees: 0, fxRate: 1 },
			{ id: '2', ticker: 'MSFT', type: 'buy', shares: 10, price: 200, date: 1716742800000, currency: 'EUR', fees: 0, fxRate: 1 }
		];
		store.holdings = { 'AAPL': { shares: 0, avgCost: 0, useLedger: true }, 'MSFT': { shares: 0, avgCost: 0, useLedger: true } };

		expect(store.ledgerHoldings['AAPL'].shares).toBe(10);
		expect(store.ledgerHoldings['AAPL'].avgCost).toBe(100);
		expect(store.ledgerHoldings['MSFT'].shares).toBe(10);
		expect(store.ledgerHoldings['MSFT'].avgCost).toBe(200);
	});

	it('Las transacciones se procesan en orden cronológico (por date ascendente)', () => {
		store.transactions = [
			{ id: '2', ticker: 'AAPL', type: 'buy', shares: 10, price: 120, date: 1716742800000, currency: 'EUR', fees: 0, fxRate: 1 },
			{ id: '1', ticker: 'AAPL', type: 'buy', shares: 10, price: 100, date: 1716656400000, currency: 'EUR', fees: 0, fxRate: 1 }
		];
		store.holdings = { 'AAPL': { shares: 0, avgCost: 0, useLedger: true } };

		expect(store.ledgerHoldings['AAPL'].shares).toBe(20);
		expect(store.ledgerHoldings['AAPL'].avgCost).toBe(110);
	});

	it('Cálculo de intereses acumulados (accruedInterest) en activos con manualInterestRate', () => {
		const mockNow = 1716915600000; // 3 días después de la primera transacción
		const spy = vi.spyOn(Date, 'now').mockReturnValue(mockNow);

		store.satelliteAssets = [
			{ ticker: 'CASH-TEST', name: 'Cuenta de Ahorro', isin: '', targetWeight: 0, category: 'satellite', color: '#000', icon: '💰', ter: 0, manualInterestRate: 0.05 }
		];

		// 1000€ depositados en t0 (1716656400000)
		// 500€ depositados en t1 = t0 + 1 día (1716742800000)
		// Hoy es t2 = t0 + 3 días (1716915600000)
		store.transactions = [
			{ id: '1', ticker: 'CASH-TEST', type: 'buy', shares: 1000, price: 1, date: 1716656400000, currency: 'EUR', fees: 0, fxRate: 1 },
			{ id: '2', ticker: 'CASH-TEST', type: 'buy', shares: 500, price: 1, date: 1716742800000, currency: 'EUR', fees: 0, fxRate: 1 }
		];
		store.holdings = { 'CASH-TEST': { shares: 0, avgCost: 0, useLedger: true } };

		// Primer tramo: 1000€ por 1 día (de 1716656400000 a 1716742800000)
		// Interés tramo 1 = 1000 * (0.05 / 365) * 1 = 0.136986€
		// Segundo tramo: 1500€ por 2 días (de 1716742800000 a 1716915600000)
		// Interés tramo 2 = 1500 * (0.05 / 365) * 2 = 0.410958€
		// Total esperado = 0.136986 + 0.410958 = 0.547944 => redondeado a 3 decimales: 0.548
		expect(store.ledgerHoldings['CASH-TEST'].accruedInterest).toBe(0.548);

		spy.mockRestore();
	});
});

/**
 * Lo que la suite de arriba no cubría.
 *
 * Cubre compras, ventas, dividendos y el devengo de intereses, que es lo esencial. Estos
 * casos son los bordes que quedaban fuera y que **tienen consecuencias en euros**: las
 * comisiones, el tipo de cambio —y la distinción, poco evidente, entre el coste en divisa
 * del activo y el coste en divisa base—, y la fusión con las posiciones manuales.
 *
 * ⚠️ Ninguno de estos usa `Date.now()` sin mockear: el devengo de intereses es aritmética
 * de fechas, así que un test que dependa del reloj pasa hoy y falla en tres meses.
 */
describe('PortfolioStore · el ledger en sus bordes', () => {
	const T0 = 1716656400000;
	const DIA = 24 * 60 * 60 * 1000;
	let store: PortfolioStore;

	function conLedger(ticker: string) {
		return { [ticker]: { shares: 0, avgCost: 0, useLedger: true } };
	}

	function compra(partial: Partial<Transaction>): Transaction {
		return {
			id: Math.random().toString(36),
			ticker: 'AAPL',
			type: 'buy',
			shares: 0,
			price: 0,
			date: T0,
			currency: 'EUR',
			fees: 0,
			fxRate: 1,
			...partial
		};
	}

	beforeEach(() => {
		vi.clearAllMocks();
		store = new PortfolioStore();
		store.transactions = [];
		store.holdings = {};
	});

	describe('comisiones y divisa', () => {
		it('las comisiones de compra suben el coste medio', () => {
			// 10 títulos a 100 € con 20 € de comisión son 1.020 € de coste: 102 € por título.
			// Ignorar la comisión infla el beneficio que ve el usuario.
			store.transactions = [compra({ shares: 10, price: 100, fees: 20 })];
			store.holdings = conLedger('AAPL');

			expect(store.ledgerHoldings['AAPL'].avgCost).toBe(102);
			expect(store.ledgerHoldings['AAPL'].totalCostBase).toBe(1020);
		});

		it('un dividendo RESTA sus comisiones, al contrario que una compra', () => {
			// Es el signo contrario y es correcto: de un dividendo de 20 € con 2 € de gastos
			// llegan 18 €, y son 18 los que bajan el coste.
			store.transactions = [
				compra({ shares: 10, price: 100 }),
				compra({ type: 'dividend', shares: 10, price: 2, fees: 2, date: T0 + DIA })
			];
			store.holdings = conLedger('AAPL');

			// 1.000 − (20 − 2) = 982, entre 10 títulos.
			expect(store.ledgerHoldings['AAPL'].totalCostBase).toBe(982);
			expect(store.ledgerHoldings['AAPL'].avgCost).toBe(98.2);
		});

		it('el coste medio va en divisa del activo y el coste total en divisa base', () => {
			// Distinción que no es evidente y que la app necesita: `avgCost` se compara con el
			// precio de cotización (en dólares), mientras que `totalCostBase` alimenta el
			// patrimonio en euros. Aplicar el cambio a los dos, o a ninguno, rompe uno de los
			// dos usos.
			store.transactions = [compra({ shares: 10, price: 100, fxRate: 0.9 })];
			store.holdings = conLedger('AAPL');

			expect(store.ledgerHoldings['AAPL'].avgCost).toBe(100);
			expect(store.ledgerHoldings['AAPL'].totalCostBase).toBe(900);
		});

		it('una venta reduce el coste base sin tocar el coste medio', () => {
			// La regla documentada: proporcional en el total, intacto en el medio. Con divisa
			// se ve que las dos magnitudes se mantienen coherentes.
			store.transactions = [
				compra({ shares: 10, price: 100, fxRate: 0.9 }),
				compra({ type: 'sell', shares: 4, price: 150, date: T0 + DIA })
			];
			store.holdings = conLedger('AAPL');

			expect(store.ledgerHoldings['AAPL'].shares).toBe(6);
			expect(store.ledgerHoldings['AAPL'].avgCost).toBe(100);
			expect(store.ledgerHoldings['AAPL'].totalCostBase).toBe(540); // 900 × 0,6
		});
	});

	describe('guardas que evitan datos imposibles', () => {
		it('una compra de cero títulos no altera nada', () => {
			store.transactions = [
				compra({ shares: 10, price: 100 }),
				compra({ shares: 0, price: 9999, date: T0 + DIA })
			];
			store.holdings = conLedger('AAPL');

			expect(store.ledgerHoldings['AAPL'].shares).toBe(10);
			expect(store.ledgerHoldings['AAPL'].avgCost).toBe(100);
		});

		it('vender sin tener nada no deja el coste medio en NaN', () => {
			store.transactions = [compra({ type: 'sell', shares: 5, price: 100 })];
			store.holdings = conLedger('AAPL');

			const pos = store.ledgerHoldings['AAPL'];
			expect(pos.shares).toBe(0);
			expect(Number.isFinite(pos.avgCost)).toBe(true);
			expect(Number.isFinite(pos.totalCostBase)).toBe(true);
		});

		it('un dividendo sin posición abierta deja el coste medio en cero, no en Infinity', () => {
			// Pasa de verdad al importar: el dividendo de una posición ya vendida.
			store.transactions = [
				compra({ shares: 10, price: 100 }),
				compra({ type: 'sell', shares: 10, price: 150, date: T0 + DIA }),
				compra({ type: 'dividend', shares: 10, price: 2, date: T0 + 2 * DIA })
			];
			store.holdings = conLedger('AAPL');

			expect(store.ledgerHoldings['AAPL'].avgCost).toBe(0);
			expect(Number.isFinite(store.ledgerHoldings['AAPL'].avgCost)).toBe(true);
		});

		it('redondea a tres decimales, que es lo que la interfaz puede mostrar', () => {
			// Un tercio de título a 100,005 €: sin redondeo salen catorce decimales a pantalla.
			store.transactions = [compra({ shares: 1 / 3, price: 100.005 })];
			store.holdings = conLedger('AAPL');

			const pos = store.ledgerHoldings['AAPL'];
			for (const valor of [pos.shares, pos.avgCost, pos.totalCostBase, pos.accruedInterest]) {
				expect(valor).toBe(Math.round(valor * 1000) / 1000);
			}
		});
	});

	describe('devengo de intereses', () => {
		const cuenta = {
			ticker: 'CASH-DEP',
			name: 'Depósito',
			isin: '',
			targetWeight: 0,
			category: 'satellite' as const,
			color: '#000',
			icon: '💰',
			ter: 0,
			manualInterestRate: 0.0365
		};

		it('un activo sin tipo de interés no devenga nada', () => {
			// La misma cuenta sin `manualInterestRate`: el interés no se inventa.
			const spy = vi.spyOn(Date, 'now').mockReturnValue(T0 + 100 * DIA);
			store.satelliteAssets = [{ ...cuenta, manualInterestRate: undefined }];
			store.transactions = [compra({ ticker: 'CASH-DEP', shares: 1000, price: 1 })];
			store.holdings = conLedger('CASH-DEP');

			expect(store.ledgerHoldings['CASH-DEP'].accruedInterest).toBe(0);
			spy.mockRestore();
		});

		it('el interés se devenga sobre el saldo de cada periodo, no sobre el final', () => {
			// 1.000 € durante 10 días y 2.000 € durante otros 10. Con 3,65 % anual, el interés
			// diario es del 0,01 %: 1 € del primer tramo y 2 € del segundo. Calcularlo sobre el
			// saldo final daría 4 €.
			const spy = vi.spyOn(Date, 'now').mockReturnValue(T0 + 20 * DIA);
			store.satelliteAssets = [cuenta];
			store.transactions = [
				compra({ ticker: 'CASH-DEP', shares: 1000, price: 1 }),
				compra({ ticker: 'CASH-DEP', shares: 1000, price: 1, date: T0 + 10 * DIA })
			];
			store.holdings = conLedger('CASH-DEP');

			expect(store.ledgerHoldings['CASH-DEP'].accruedInterest).toBeCloseTo(3, 2);
			spy.mockRestore();
		});

		it('un reintegro reduce la base sobre la que se devenga', () => {
			// 2.000 € diez días, se retira la mitad, y los diez siguientes devengan sobre 1.000.
			const spy = vi.spyOn(Date, 'now').mockReturnValue(T0 + 20 * DIA);
			store.satelliteAssets = [cuenta];
			store.transactions = [
				compra({ ticker: 'CASH-DEP', shares: 2000, price: 1 }),
				compra({ ticker: 'CASH-DEP', type: 'sell', shares: 1000, price: 1, date: T0 + 10 * DIA })
			];
			store.holdings = conLedger('CASH-DEP');

			// 2.000 × 0,0001 × 10 = 2 €, más 1.000 × 0,0001 × 10 = 1 €.
			expect(store.ledgerHoldings['CASH-DEP'].accruedInterest).toBeCloseTo(3, 2);
			spy.mockRestore();
		});

		it('una cuenta vaciada deja de devengar', () => {
			const spy = vi.spyOn(Date, 'now').mockReturnValue(T0 + 400 * DIA);
			store.satelliteAssets = [cuenta];
			store.transactions = [
				compra({ ticker: 'CASH-DEP', shares: 1000, price: 1 }),
				compra({ ticker: 'CASH-DEP', type: 'sell', shares: 1000, price: 1, date: T0 + 10 * DIA })
			];
			store.holdings = conLedger('CASH-DEP');

			// Solo el primer tramo: 1.000 × 0,0001 × 10 = 1 €. Los 390 días restantes, cero.
			expect(store.ledgerHoldings['CASH-DEP'].accruedInterest).toBeCloseTo(1, 2);
			spy.mockRestore();
		});
	});

	describe('fusión con las posiciones manuales', () => {
		it('solo se sustituyen los tickers marcados con useLedger', () => {
			// Los dos tienen transacciones, pero solo uno delega en el ledger: el otro conserva
			// lo que el usuario escribió a mano. Es lo que permite convivir importación y
			// edición manual.
			store.transactions = [
				compra({ ticker: 'DEL-LEDGER', shares: 10, price: 100 }),
				compra({ ticker: 'A-MANO', shares: 10, price: 100 })
			];
			store.holdings = {
				'DEL-LEDGER': { shares: 0, avgCost: 0, useLedger: true },
				'A-MANO': { shares: 7, avgCost: 55, useLedger: false }
			};

			expect(store.effectiveHoldings['DEL-LEDGER'].shares).toBe(10);
			expect(store.effectiveHoldings['DEL-LEDGER'].avgCost).toBe(100);
			expect(store.effectiveHoldings['A-MANO'].shares).toBe(7);
			expect(store.effectiveHoldings['A-MANO'].avgCost).toBe(55);
		});

		it('un ticker con transacciones pero sin entrada en holdings no aparece', () => {
			// Sin la entrada no hay `useLedger`, así que el ledger no lo inyecta: es la forma de
			// tener transacciones de un activo que ya no se sigue.
			store.transactions = [compra({ ticker: 'HUERFANO', shares: 10, price: 100 })];
			store.holdings = {};

			expect(store.effectiveHoldings['HUERFANO']).toBeUndefined();
			// Pero el ledger sí lo ha calculado, por si algún día se activa.
			expect(store.ledgerHoldings['HUERFANO'].shares).toBe(10);
		});

		it('el interés acumulado viaja a las posiciones efectivas', () => {
			// Es el dato que `calculatePortfolioState` usa para el valor y el beneficio de un
			// depósito: si se queda por el camino, la cuenta remunerada sale sin intereses.
			const spy = vi.spyOn(Date, 'now').mockReturnValue(T0 + 365 * DIA);
			store.satelliteAssets = [
				{
					ticker: 'CASH-DEP',
					name: 'Depósito',
					isin: '',
					targetWeight: 0,
					category: 'satellite',
					color: '#000',
					icon: '💰',
					ter: 0,
					manualInterestRate: 0.0365
				}
			];
			store.transactions = [compra({ ticker: 'CASH-DEP', shares: 1000, price: 1 })];
			store.holdings = conLedger('CASH-DEP');

			expect(store.effectiveHoldings['CASH-DEP'].accruedInterest).toBeCloseTo(36.5, 1);
			expect(store.effectiveHoldings['CASH-DEP'].useLedger).toBe(true);
			spy.mockRestore();
		});
	});
});
