import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioStore } from './portfolio.svelte';
import type { Asset } from '$lib/types';

vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$lib/db', () => ({ storageProvider: { isLocal: true, onAuthStateChanged: vi.fn() } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

/**
 * El doble cambio de divisa no estaba en `calculatePortfolioState`, que siempre
 * respetó su contrato, sino en lo que el store le pasaba: precios ya convertidos
 * *y* el multiplicador para convertirlos. La función pura pasaba sus tests y la
 * app mostraba cifras mal, así que la red hay que ponerla aquí.
 */
function stockAsset(ticker: string): Asset {
	return {
		ticker,
		name: ticker,
		isin: '',
		targetWeight: 1,
		color: '#fff',
		icon: '',
		ter: 0,
		category: 'stocks'
	};
}

describe('PortfolioStore - conversión de divisa', () => {
	let store: PortfolioStore;

	beforeEach(() => {
		vi.clearAllMocks();
		store = new PortfolioStore();
		store.transactions = [];
		store.holdingEdits = [];
		store.history = [];
		store.coreAssets = [];
		store.satelliteAssets = [];
	});

	it('valora una posición en dólares al cambio, no al cambio dos veces', () => {
		store.stockAssets = [stockAsset('MSFT')];
		store.holdings = { MSFT: { shares: 15, avgCost: 320.5, useLedger: false } };
		store.prices = {
			MSFT: { name: 'Microsoft', price: 415.2, currency: 'USD', change: 0 },
			'EURUSD=X': { name: 'EUR/USD', price: 1.08, currency: 'USD', change: 0 }
		};

		expect(store.globalCapital).toBeCloseTo((15 * 415.2) / 1.08, 2); // 5766,67 €
		expect(store.globalInvested).toBeCloseTo((15 * 320.5) / 1.08, 2); // 4451,39 €
		expect(store.globalProfit).toBeCloseTo(1315.28, 2);
	});

	it('valora una posición en libras al cambio, cuyo error tenía el signo opuesto', () => {
		store.stockAssets = [stockAsset('ULVR.L')];
		store.holdings = { 'ULVR.L': { shares: 100, avgCost: 40, useLedger: false } };
		store.prices = {
			'ULVR.L': { name: 'Unilever', price: 45, currency: 'GBP', change: 0 },
			'EURGBP=X': { name: 'EUR/GBP', price: 0.85, currency: 'GBP', change: 0 }
		};

		expect(store.globalCapital).toBeCloseTo((100 * 45) / 0.85, 2); // 5294,12 €
	});

	it('no toca los activos denominados en la divisa base', () => {
		store.stockAssets = [stockAsset('IWDA.AS')];
		store.holdings = { 'IWDA.AS': { shares: 500, avgCost: 70, useLedger: false } };
		store.prices = {
			'IWDA.AS': { name: 'iShares Core MSCI World', price: 124.23, currency: 'EUR', change: 0 }
		};

		expect(store.globalCapital).toBeCloseTo(500 * 124.23, 2);
		expect(store.pricesWithFx['IWDA.AS'].fxRate).toBe(1);
	});

	it('deja el precio en la divisa del activo y expone solo el multiplicador', () => {
		store.stockAssets = [stockAsset('MSFT')];
		store.holdings = { MSFT: { shares: 1, avgCost: 1, useLedger: false } };
		store.prices = {
			MSFT: { name: 'Microsoft', price: 415.2, currency: 'USD', change: 0 },
			'EURUSD=X': { name: 'EUR/USD', price: 1.08, currency: 'USD', change: 0 }
		};

		// Si alguien vuelve a convertir aquí, el doble cambio regresa.
		expect(store.pricesWithFx['MSFT'].price).toBe(415.2);
		expect(store.pricesWithFx['MSFT'].fxRate).toBeCloseTo(1 / 1.08, 9);
	});

	it('reparte la aportación con el valor correcto de cada divisa', () => {
		// Dos posiciones que valen lo mismo en euros: 5.400 € cada una.
		store.coreAssets = [
			{ ...stockAsset('EURF.AS'), category: 'core', targetWeight: 0.5 },
			{ ...stockAsset('USDF.US'), category: 'core', targetWeight: 0.5 }
		];
		store.stockAssets = [];
		store.holdings = {
			'EURF.AS': { shares: 54, avgCost: 100, useLedger: false },
			'USDF.US': { shares: 54, avgCost: 100, useLedger: false }
		};
		store.prices = {
			'EURF.AS': { name: 'Euro fund', price: 100, currency: 'EUR', change: 0 },
			'USDF.US': { name: 'Dollar fund', price: 108, currency: 'USD', change: 0 },
			'EURUSD=X': { name: 'EUR/USD', price: 1.08, currency: 'USD', change: 0 }
		};
		store.contribution = 1000;

		const result = store.rebalanceResult!;
		expect(result).not.toBeNull();

		// Ya están equilibradas, así que la aportación se parte por la mitad.
		const [eur, usd] = result.allocations;
		expect(eur.amountToInvest).toBeCloseTo(500, 1);
		expect(usd.amountToInvest).toBeCloseTo(500, 1);
		// 500 € en un fondo que cuesta 100 € por participación → 5 participaciones.
		expect(eur.sharesToBuy).toBeCloseTo(5, 2);
		expect(usd.sharesToBuy).toBeCloseTo(5, 2);
	});
});
