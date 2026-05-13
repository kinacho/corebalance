import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import HeroSummary from './HeroSummary.svelte';

// Mock the global portfolio store to avoid Firebase and environment variable issues
vi.mock('$lib/stores/portfolio.svelte', () => {
	return {
		portfolio: {
			globalCapital: 10000,
			globalProfit: 500,
			globalProfitPercent: 0.05,
			globalInvested: 9500,
			globalDailyChangeValue: 100,
			globalDailyChangePercent: 0.01,
			globalAnnualCost: 50,
			globalWeightedAverageTer: 0.005,
			loading: false,
			isPrivate: false,
			targetLabel: 'Objetivo',
			hasAnyHoldings: true,
			portfolioState: { totalCapital: 7000, positions: [] },
			stockState: { totalCapital: 2000 },
			satelliteState: { totalCapital: 1000 },
			prices: { 'AAPL': {} } // Just to pass the `Object.keys(portfolio.prices).length > 0` condition
		}
	};
});

// Mock motion to execute immediately for testing without waiting for animations
vi.mock('svelte/motion', () => ({
	tweened: (initial: any) => {
		let value = initial;
		const subscribers: any[] = [];
		return {
			subscribe: (cb: any) => {
				subscribers.push(cb);
				cb(value);
				return () => {};
			},
			set: (newValue: any) => {
				value = newValue;
				subscribers.forEach(cb => cb(value));
				return Promise.resolve();
			}
		};
	}
}));

describe('HeroSummary.svelte', () => {
	it('renders total capital formatted', async () => {
		const { container } = render(HeroSummary);
		// The formatted currency uses the local format.
		expect(container.textContent).toMatch(/10\.?000/);
	});
});
