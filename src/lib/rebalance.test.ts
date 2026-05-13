import { describe, it, expect } from 'vitest';
import { calculatePortfolioState, calculateRebalance } from './rebalance';
import type { Asset, HoldingsMap, PriceData } from './types';

describe('rebalance.ts', () => {
	const assets: Asset[] = [
		{ ticker: 'AAPL', name: 'Apple', isin: 'US0378331005', targetWeight: 0.6, ter: 0, color: '#ff0000', icon: '🍎', category: 'core' },
		{ ticker: 'MSFT', name: 'Microsoft', isin: 'US5949181045', targetWeight: 0.4, ter: 0, color: '#00ff00', icon: '💻', category: 'core' }
	];


	const holdings: HoldingsMap = {
		'AAPL': { shares: 10, avgCost: 100 },
		'MSFT': { shares: 10, avgCost: 50 }
	};

	const prices: Record<string, PriceData> = {
		'AAPL': { price: 150, change: 1, currency: 'USD', name: 'Apple Inc.' },
		'MSFT': { price: 100, change: -1, currency: 'USD', name: 'Microsoft Corp.' }
	};


	describe('calculatePortfolioState', () => {
		it('calculates total capital and profit correctly', () => {
			const state = calculatePortfolioState(assets, holdings, prices);
			// AAPL: 10 * 150 = 1500, cost = 1000
			// MSFT: 10 * 100 = 1000, cost = 500
			// Total = 2500, Invested = 1500
			expect(state.totalCapital).toBe(2500);
			expect(state.totalInvested).toBe(1500);
			expect(state.totalProfit).toBe(1000);
			expect(state.totalProfitPercent).toBeCloseTo(0.6667, 4);
		});

		it('calculates weights and deviations correctly', () => {
			const state = calculatePortfolioState(assets, holdings, prices);
			// AAPL current weight: 1500 / 2500 = 0.6
			// target: 0.6, deviation: 0
			expect(state.positions[0].currentWeight).toBe(0.6);
			expect(state.positions[0].deviation).toBe(0);

			// MSFT current weight: 1000 / 2500 = 0.4
			// target: 0.4, deviation: 0
			expect(state.positions[1].currentWeight).toBe(0.4);
			expect(state.positions[1].deviation).toBe(0);
		});
	});

	describe('calculateRebalance', () => {
		it('distributes perfectly when 0 contribution', () => {
			const result = calculateRebalance(assets, holdings, prices, 0);
			expect(result.allocations[0].amountToInvest).toBe(0);
			expect(result.allocations[1].amountToInvest).toBe(0);
		});

		it('distributes according to target weights if portfolio is already perfectly balanced', () => {
			// Current portfolio is exactly 60/40.
			const result = calculateRebalance(assets, holdings, prices, 1000);
			// Expected: AAPL gets 600, MSFT gets 400
			expect(result.allocations[0].amountToInvest).toBe(600);
			expect(result.allocations[1].amountToInvest).toBe(400);
		});

		it('distributes to correct deficits when portfolio is unbalanced', () => {
			const unbalancedHoldings: HoldingsMap = {
				'AAPL': { shares: 10, avgCost: 100 }, // value 1500
				'MSFT': { shares: 5, avgCost: 50 }    // value 500
			};
			// Total current: 2000
			// Contribution: 1000 -> New Total: 3000
			// Target AAPL (0.6): 1800 -> Deficit: 1800 - 1500 = 300
			// Target MSFT (0.4): 1200 -> Deficit: 1200 - 500 = 700
			// Total deficit: 1000.
			// Since total deficit = contribution, it should match perfectly.
			const result = calculateRebalance(assets, unbalancedHoldings, prices, 1000);
			expect(result.allocations[0].amountToInvest).toBeCloseTo(300);
			expect(result.allocations[1].amountToInvest).toBeCloseTo(700);
		});
	});
});
