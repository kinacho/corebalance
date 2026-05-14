import { describe, it, expect } from 'vitest';
import { calculatePortfolioState, calculateRebalance } from './rebalance';
import type { Asset, HoldingsMap, PriceData } from './types';

// --- Shared test fixtures ---
const assets: Asset[] = [
	{ ticker: 'AAPL', name: 'Apple', isin: 'US0378331005', targetWeight: 0.6, ter: 0.002, color: '#ff0000', icon: '🍎', category: 'core' },
	{ ticker: 'MSFT', name: 'Microsoft', isin: 'US5949181045', targetWeight: 0.4, ter: 0.001, color: '#00ff00', icon: '💻', category: 'core' }
];

const holdings: HoldingsMap = {
	'AAPL': { shares: 10, avgCost: 100 },
	'MSFT': { shares: 10, avgCost: 50 }
};

const prices: Record<string, PriceData> = {
	'AAPL': { price: 150, change: 1.5, currency: 'USD', name: 'Apple Inc.' },
	'MSFT': { price: 100, change: -1, currency: 'USD', name: 'Microsoft Corp.' }
};

// --- Tests ---
describe('rebalance.ts', () => {

	describe('calculatePortfolioState', () => {
		it('calculates total capital and profit correctly', () => {
			const state = calculatePortfolioState(assets, holdings, prices);
			// AAPL: 10 * 150 = 1500, cost = 1000
			// MSFT: 10 * 100 = 1000, cost = 500
			expect(state.totalCapital).toBe(2500);
			expect(state.totalInvested).toBe(1500);
			expect(state.totalProfit).toBe(1000);
			expect(state.totalProfitPercent).toBeCloseTo(0.6667, 4);
		});

		it('calculates weights and deviations correctly', () => {
			const state = calculatePortfolioState(assets, holdings, prices);
			expect(state.positions[0].currentWeight).toBe(0.6);
			expect(state.positions[0].deviation).toBe(0);
			expect(state.positions[1].currentWeight).toBe(0.4);
			expect(state.positions[1].deviation).toBe(0);
		});

		it('handles empty holdings gracefully', () => {
			const state = calculatePortfolioState(assets, {}, prices);
			expect(state.totalCapital).toBe(0);
			expect(state.totalInvested).toBe(0);
			expect(state.totalProfit).toBe(0);
			expect(state.positions.every(p => p.currentWeight === 0)).toBe(true);
		});

		it('handles missing prices gracefully', () => {
			const state = calculatePortfolioState(assets, holdings, {});
			expect(state.totalCapital).toBe(0);
			expect(state.totalInvested).toBe(1500);
			expect(state.totalProfit).toBe(-1500);
		});

		it('calculates TER costs correctly', () => {
			const state = calculatePortfolioState(assets, holdings, prices);
			// AAPL: 1500 * 0.002 = 3
			// MSFT: 1000 * 0.001 = 1
			expect(state.totalAnnualCost).toBe(4);
			expect(state.weightedAverageTer).toBeCloseTo(4 / 2500, 6);
		});

		it('calculates daily change values', () => {
			const state = calculatePortfolioState(assets, holdings, prices);
			// AAPL: 1500 * (1.5/100) = 22.5
			// MSFT: 1000 * (-1/100) = -10
			expect(state.dailyChangeValue).toBeCloseTo(12.5);
		});
	});

	describe('calculateRebalance', () => {
		it('returns zero allocations with 0 contribution', () => {
			const result = calculateRebalance(assets, holdings, prices, 0);
			expect(result.allocations[0].amountToInvest).toBe(0);
			expect(result.allocations[1].amountToInvest).toBe(0);
			expect(result.totalContribution).toBe(0);
		});

		it('distributes according to target weights when balanced', () => {
			const result = calculateRebalance(assets, holdings, prices, 1000);
			expect(result.allocations[0].amountToInvest).toBe(600);
			expect(result.allocations[1].amountToInvest).toBe(400);
			expect(result.newTotalCapital).toBe(3500);
		});

		it('distributes to correct deficits when unbalanced', () => {
			const unbalancedHoldings: HoldingsMap = {
				'AAPL': { shares: 10, avgCost: 100 }, // value 1500
				'MSFT': { shares: 5, avgCost: 50 }    // value 500
			};
			const result = calculateRebalance(assets, unbalancedHoldings, prices, 1000);
			expect(result.allocations[0].amountToInvest).toBeCloseTo(300);
			expect(result.allocations[1].amountToInvest).toBeCloseTo(700);
		});

		it('handles assets with targetWeight = 0', () => {
			const assetsWithZero: Asset[] = [
				{ ...assets[0], targetWeight: 1.0 },
				{ ...assets[1], targetWeight: 0 }
			];
			const result = calculateRebalance(assetsWithZero, holdings, prices, 1000);
			// All contribution should go to AAPL
			expect(result.allocations[0].amountToInvest).toBeCloseTo(1000);
			expect(result.allocations[1].amountToInvest).toBe(0);
		});

		it('calculates sharesToBuy correctly', () => {
			const result = calculateRebalance(assets, holdings, prices, 1000);
			// AAPL: 600 / 150 = 4.000
			expect(result.allocations[0].sharesToBuy).toBeCloseTo(4, 3);
			// MSFT: 400 / 100 = 4.000
			expect(result.allocations[1].sharesToBuy).toBeCloseTo(4, 3);
		});

		it('handles empty portfolio with contribution', () => {
			const result = calculateRebalance(assets, {}, prices, 10000);
			// Should distribute by target weights: 6000 / 4000
			expect(result.allocations[0].amountToInvest).toBeCloseTo(6000);
			expect(result.allocations[1].amountToInvest).toBeCloseTo(4000);
		});

		it('produces resulting weights that match targets', () => {
			const result = calculateRebalance(assets, {}, prices, 10000);
			expect(result.allocations[0].resultingWeight).toBeCloseTo(0.6, 2);
			expect(result.allocations[1].resultingWeight).toBeCloseTo(0.4, 2);
		});

		it('handles very small contribution correctly', () => {
			const result = calculateRebalance(assets, holdings, prices, 1);
			const totalAllocated = result.allocations.reduce((s, a) => s + a.amountToInvest, 0);
			expect(totalAllocated).toBeCloseTo(1, 1);
		});

		it('handles three assets with different deviations', () => {
			const threeAssets: Asset[] = [
				{ ticker: 'A', name: 'A', isin: '', targetWeight: 0.5, ter: 0, color: '', icon: '', category: 'core' },
				{ ticker: 'B', name: 'B', isin: '', targetWeight: 0.3, ter: 0, color: '', icon: '', category: 'core' },
				{ ticker: 'C', name: 'C', isin: '', targetWeight: 0.2, ter: 0, color: '', icon: '', category: 'core' }
			];
			const h: HoldingsMap = {
				'A': { shares: 10, avgCost: 10 }, // value 100
				'B': { shares: 5, avgCost: 10 },  // value 50
				'C': { shares: 0, avgCost: 0 }     // value 0
			};
			const p: Record<string, PriceData> = {
				'A': { price: 10, change: 0, currency: 'EUR', name: 'A' },
				'B': { price: 10, change: 0, currency: 'EUR', name: 'B' },
				'C': { price: 10, change: 0, currency: 'EUR', name: 'C' }
			};
			const result = calculateRebalance(threeAssets, h, p, 150);
			// New total: 300. Targets: A=150, B=90, C=60
			// Deficits: A=50, B=40, C=60. Total=150
			expect(result.allocations[0].amountToInvest).toBeCloseTo(50);
			expect(result.allocations[1].amountToInvest).toBeCloseTo(40);
			expect(result.allocations[2].amountToInvest).toBeCloseTo(60);
		});
	});
});
