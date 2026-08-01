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
